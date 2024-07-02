import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

// import { import_ } from '@brillout/import';
import { ethers } from 'ethers';
import { arrayify } from '@ethersproject/bytes';
import * as taskContractABI from '../contracts/taskContractABI.json';
import * as erc20ContractABI from '../contracts/erc20ContractABI.json';
import { createHash } from 'crypto';

import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import { PrismaService } from '../database/prisma.service';
import { Request, response } from 'express';
import axios from 'axios';
import { UtilsService } from '../utils/utils.service';
import {
  EditUserDTO,
  GetUserDTO,
} from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  //setting variables:
  web3UrlProvider = process.env.WEB3_URL_PROVIDER;
  web3Provider = new ethers.providers.JsonRpcProvider(this.web3UrlProvider);
  taskContractAddress = process.env.TASK_CONTRACT_ADDRESS;
  environment = process.env.ENVIRONMENT;
  usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS;
  usdtTokenAddress = process.env.USDT_TOKEN_ADDRESS;
  wEthTokenAddress = process.env.WETH_TOKEN_ADDRESS;

  statusOptions = ['open', 'active', 'completed'];

  //gets the user and also its tasks / applications
  async getUser(data: GetUserDTO) {
    const userExists = await this.prisma.user.findFirst({
      where: {
        address: data.address,
      },
      include: {
        VerifiedContributorSubmission: true,
      },
    });

    if (!userExists) {
      this.checkIfUserExistsOnTheChain(data.address);
      return userExists;
    } else {
      //if the user exists, searching for its applications tasks
      const applications = await this.prisma.application.findMany({
        where: {
          applicant: data.address,
        },
      });
      console.log('applica');
      console.log(applications);

      const taskIds = applications.map((application) => application.taskId);

      //getting the tasks and sorted:
      let orderBy = {};
      if (data.deadlineSorting && !data.estimatedBudgetSorting) {
        orderBy = {
          deadline: data.deadlineSorting === 'newest' ? 'desc' : 'asc',
        };
      }

      if (data.estimatedBudgetSorting) {
        orderBy = {
          estimatedBudget:
            data.estimatedBudgetSorting === 'greater' ? 'desc' : 'asc',
          ...orderBy, // Caso deadlineSorting também esteja definido, será de menor prioridade - agora
        };
      }

      const where = {
        taskId: {
          in: taskIds,
        },
      };
      if (data.status) {
        where['status'] = data.status;
      }

      console.log('tass');
      console.log(taskIds);
      const tasks = await this.prisma.task.findMany({
        orderBy,
        where,
      });

      // Function to obtain the counting of tasks
      const getTaskCountForStatus = async (status: string) => {
        return await this.prisma.task.count({
          where: {
            ...where,
            status: status,
          },
        });
      };
      const openTaskCount = await getTaskCountForStatus('0');
      const activeTaskCount = await getTaskCountForStatus('1');
      const completedTaskCount = await getTaskCountForStatus('2');

      const finalTasks = tasks.map((task) => {
        const { taskId, status, deadline, id, ...rest } = task;

        //here do the "days left" flow:
        let daysLeft;
        const now = Date.now();
        const deadlineDay = Number(task.deadline) * 1000;
        const distance = deadlineDay - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));

        if (days < 0) {
          daysLeft = 'ended';
        } else {
          if (days <= 1) {
            daysLeft = `${days} day left`;
          } else {
            daysLeft = `${days} days left`;
          }
        }

        return {
          id: Number(taskId),
          status: this.statusOptions[status],
          deadline,
          daysLeft,
          ...rest,
        };
      });

      // Incorporate the tasks into the response if needed
      userExists['tasks'] = finalTasks;

      let isVerifiedContributor = false;
      if (
        userExists.VerifiedContributorSubmission[0]?.status === 'approved' ||
        userExists.verifiedContributorToken
      ) {
        isVerifiedContributor = true;
      }
      userExists['isVerifiedContributor'] = isVerifiedContributor;

      //Incorporate the counting:
      userExists['counting'] = {
        open: openTaskCount,
        active: activeTaskCount,
        completed: completedTaskCount,
      };

      return userExists;
    }
  }

  //Function for when the user is not registered yet on the database
  //Getting when the user joined on the protocol through the first interaction he had with the protocol
  //If he does not have any interaction, nothing happens.
  async checkIfUserExistsOnTheChain(address: string) {
    const userExists = await this.prisma.user.findFirst({
      where: {
        address,
      },
    });
    if (!userExists) {
      const getEvents = await this.prisma.event.findMany({
        where: {
          address,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });
      if (getEvents.length > 0) {
        await this.prisma.user.create({
          data: {
            address,
            joinedSince: getEvents[0].timestamp,
          },
        });
      }
    }
  }

  //To edit a user profile, its mandatory to check if the data to change the profile was signed by the user (message signing) to assure that its the user who wants to change its profile.
  //We create a hash with the data the user sent, the updatesNonce from the user and verifies if the signed messages matches the hash (with the address of the signer)
  async editUser(data: EditUserDTO) {
    console.log('editing user');
    const userExists = await this.prisma.user.findFirst({
      where: {
        address: data.address,
      },
    });

    const { signature, ...verifyData } = data;
    if (!userExists) {
      console.log('user not found');
      console.log('data to be hashed');
      console.log(verifyData);
      console.log(JSON.stringify(verifyData));
      const hash = this.hashObject(verifyData);
      console.log(hash);
      const finalHash = `0x${hash}`;
      const isVerified = await this.verifiesSignedMessage(
        finalHash,
        data.address,
        data.signature,
      );
      if (!isVerified) {
        throw new BadRequestException('Invalid signature', {
          cause: new Error(),
          description: 'Invalid signature',
        });
      }
      console.log('message validated');
      const { signature, nonce, ...finalData } = data;
      console.log('the data');
      console.log(finalData);
      finalData['joinedSince'] = String(Math.floor(Date.now() / 1000));
      await this.prisma.user.create({
        data: finalData,
      });
    } else {
      console.log('user found');
      if (data.nonce !== userExists.updatesNonce) {
        console.log('invalid nonce');
        throw new BadRequestException('Invalid nonce', {
          cause: new Error(),
          description: 'Invalid nonce',
        });
      }
      console.log('data to be hashed');
      console.log(verifyData);
      console.log(JSON.stringify(verifyData));
      const hash = this.hashObject(verifyData);
      console.log('the hash');
      console.log(hash);
      const finalHash = `0x${hash}`;
      const isVerified = await this.verifiesSignedMessage(
        finalHash,
        data.address,
        data.signature,
      );
      if (!isVerified) {
        throw new BadRequestException('Invalid signature', {
          cause: new Error(),
          description: 'Invalid signature',
        });
      }
      console.log('message validated');
      const { signature, nonce, ...finalData } = data;
      finalData['updatesNonce'] = String(Number(userExists.updatesNonce) + 1);
      console.log('the data');
      console.log(finalData);
      await this.prisma.user.update({
        where: {
          id: userExists.id,
        },
        data: finalData,
      });
    }
  }

  async verifiesSignedMessage(hash: any, address: string, signature: string) {
    const signer = ethers.utils.verifyMessage(hash, signature);
    console.log('the signer');
    console.log(signer);
    return signer === address;
  }

  //returns a hash to be signed
  hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    const hash = createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
  }
}
