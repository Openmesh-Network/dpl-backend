import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

// import { import_ } from '@brillout/import';
import { ethers } from 'ethers';
import * as erc20ContractABI from '../contracts/erc20ContractABI.json';
import * as tasksDraftContractABI from '../contracts/tasksDraftContractABI.json';
import * as nftContractABI from '../contracts/nftContractABI.json';
import * as tokenListGovernanceABI from '../contracts/tokenListGovernanceABI.json';
import { TasksService } from '../tasks/tasks.service';

import { PrismaService } from '../database/prisma.service';
import { Request, response } from 'express';
import axios from 'axios';
import { UsersService } from 'src/users/users.service';
import { UpdatesGovernanceService } from 'src/tasks/updates-governance.service';

//This is the service to handle the contracts related to the creation of task drafts / departaments, voting and dao:
// TaskDrafts.sol
// TokenListGovernance.sol
// IDAO.sol
// MOCKERC721.sol

@Injectable()
export class EventsGovernanceHandlerService {
  //setting variables:
  web3UrlProvider = process.env.WEB3_URL_PROVIDER;
  web3Provider = new ethers.providers.JsonRpcProvider(this.web3UrlProvider);
  viewPrivateKey = process.env.VIEW_PRIVATE_KEY;
  taskContractAddress = process.env.TASK_CONTRACT_ADDRESS;
  ipfsBaseURL = process.env.IPFS_BASE_URL;
  walletEther = new ethers.Wallet(this.viewPrivateKey);
  connectedWallet = this.walletEther.connect(this.web3Provider);
  nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly updatesGovernanceService: UpdatesGovernanceService,
  ) {
    return;
    this.setupDraftListeners();
    this.setupNFTListeners();
    this.setupGovernanceListeners();
  }

  async setupDraftListeners() {
    const departaments = await this.prisma.departament.findMany();
    const contractAddresses = departaments.map(
      (departament) => departament.addressTaskDrafts,
    );

    contractAddresses.forEach((address, i) => {
      const contract = new ethers.Contract(
        address,
        tasksDraftContractABI,
        this.web3Provider,
      );

      // event TaskDraftCreated(        uint256 proposalId,        bytes metadata,        uint64 startDate,        uint64 endDate,        CreateTaskInfo taskInfo    );
      contract.on(
        'TaskDraftCreated',
        async (proposalId, metadata, startDate, endDate, taskInfo, event) => {
          console.log('new event');
          console.log('TaskDraftCreated');
          console.log(event);
          console.log('event event');
          console.log(event.event);
          //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
          await new Promise((resolve) => setTimeout(resolve, 4500));
          const block = await this.web3Provider.getBlock(event['blockNumber']);
          const timestamp =
            String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

          // Fetch the transaction using the transaction hash from the event
          const transaction = await this.web3Provider.getTransaction(
            event.transactionHash,
          );

          // The address that submitted the transaction
          const senderAddress = transaction.from;

          //storing on the "events" table
          const finalData = {
            event: event,
            contractAddress: event.address,
          };
          console.log(finalData);
          try {
            await this.prisma.event.create({
              data: {
                name: 'TaskDraftCreated',
                data: JSON.stringify(finalData),
                eventIndex: String(event.logIndex),
                transactionHash: event.transactionHash,
                blockNumber: String(event.blockNumber),
                taskId: String(proposalId),
                address: senderAddress,
                timestamp: timestamp,
              },
            });
          } catch (err) {
            console.log('error saving event');
          }
          const departament = await this.prisma.departament.findFirst({
            where: {
              addressTaskDrafts: event.address,
            },
          });
          console.log('the departament');
          console.log(departament);
          console.log('receveid from taskInfo');
          console.log(taskInfo);
          await this.updatesGovernanceService.updateSingleTaskDraftData(
            String(proposalId),
            metadata,
            String(startDate),
            String(endDate),
            taskInfo,
            senderAddress,
            departament.name,
          );
        },
      );
    });
  }

  async setupGovernanceListeners() {
    const departaments = await this.prisma.departament.findMany();
    const contractAddresses = departaments.map(
      (departament) => departament.addressTokenListGovernance,
    );

    contractAddresses.forEach((address, i) => {
      const contract = new ethers.Contract(
        address,
        tokenListGovernanceABI,
        this.web3Provider,
      );

      //     event VoteCast(        uint256 indexed proposalId,        uint256 indexed voter,        VoteOption voteOption,        uint256 votingPower    );
      contract.on(
        'VoteCast',
        async (proposalId, voter, voteOption, votingPower, event) => {
          console.log('new event');
          console.log('vote cast');
          console.log(event);
          console.log('event event');
          console.log(event.event);
          //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
          await new Promise((resolve) => setTimeout(resolve, 2500));
          const block = await this.web3Provider.getBlock(event['blockNumber']);
          const timestamp =
            String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

          // Fetch the transaction using the transaction hash from the event
          const transaction = await this.web3Provider.getTransaction(
            event.transactionHash,
          );

          // The address that submitted the transaction
          const senderAddress = transaction.from;

          //storing on the "events" table
          const finalData = {
            event: event,
            contractAddress: event.address,
          };
          console.log(finalData);
          try {
            await this.prisma.event.create({
              data: {
                name: 'VoteCast',
                data: JSON.stringify(finalData),
                eventIndex: String(event.logIndex),
                transactionHash: event.transactionHash,
                blockNumber: String(event.blockNumber),
                taskId: String(proposalId),
                address: senderAddress,
                timestamp: timestamp,
              },
            });
          } catch (err) {
            console.log('error saving event');
          }
          const departament = await this.prisma.departament.findFirst({
            where: {
              addressTokenListGovernance: event.address,
            },
          });
          const task = await this.prisma.task.findFirst({
            where: {
              departament: departament.name,
              proposalId: String(proposalId),
            },
          });
          const draftExists = await this.prisma.draftVote.findFirst({
            where: {
              address: senderAddress,
              id_task: task.id,
            },
          });
          if (!draftExists) {
            await this.prisma.draftVote.create({
              data: {
                address: senderAddress,
                voteOption: String(voteOption),
                id_task: task.id,
              },
            });
          }
        },
      );

      contract.on('ProposalExecuted', async (proposalId, event) => {
        console.log('new event');
        console.log('proposal executed');
        console.log(event);
        console.log('event event');
        console.log(event.event);
        //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

        // Fetch the transaction using the transaction hash from the event
        const transaction = await this.web3Provider.getTransaction(
          event.transactionHash,
        );

        // The address that submitted the transaction
        const senderAddress = transaction.from;

        //storing on the "events" table
        const finalData = {
          event: event,
          contractAddress: event.address,
        };
        console.log(finalData);
        try {
          await this.prisma.event.create({
            data: {
              name: 'ProposalExecuted',
              data: JSON.stringify(finalData),
              eventIndex: String(event.logIndex),
              transactionHash: event.transactionHash,
              blockNumber: String(event.blockNumber),
              taskId: String(proposalId),
              address: senderAddress,
              timestamp: timestamp,
            },
          });
        } catch (err) {
          console.log('error saving event');
        }
        const departament = await this.prisma.departament.findFirst({
          where: {
            addressTokenListGovernance: event.address,
          },
        });
        await this.prisma.task.updateMany({
          where: {
            departament: departament.name,
            proposalId: String(proposalId),
          },
          data: {
            isDraftCompleted: true,
          },
        });
      });

      //     event TokensAdded(uint256[] tokens);
      contract.on('TokensAdded', async (tokens, event) => {
        console.log('new event');
        console.log('token added');
        console.log(event);
        console.log('event event');
        console.log(event.event);
        console.log('the tokens');
        console.log(tokens);
        //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

        // Fetch the transaction using the transaction hash from the event
        const transaction = await this.web3Provider.getTransaction(
          event.transactionHash,
        );

        // The address that submitted the transaction
        const senderAddress = transaction.from;

        //storing on the "events" table
        const finalData = {
          event: event,
          contractAddress: event.address,
        };
        console.log(finalData);
        try {
          await this.prisma.event.create({
            data: {
              name: 'TokensAdded',
              data: JSON.stringify(finalData),
              eventIndex: String(event.logIndex),
              transactionHash: event.transactionHash,
              blockNumber: String(event.blockNumber),
              address: senderAddress,
              timestamp: timestamp,
            },
          });
        } catch (err) {
          console.log('error saving event');
        }

        //updating the verifiedcontributorToken with the new departament
        for (let i = 0; i < tokens.length; i++) {
          const contributorToken =
            await this.prisma.verifiedContributorToken.findFirst({
              where: {
                tokenId: String(tokens[i]),
              },
            });

          // Verifique se o endereço já está na lista
          if (
            contributorToken &&
            !contributorToken.departamentList.includes(event.address)
          ) {
            await this.prisma.verifiedContributorToken.update({
              where: {
                tokenId: String(tokens[i]),
              },
              data: {
                departamentList: {
                  // Adicione o novo endereço à lista existente
                  push: event.address,
                },
              },
            });
          }
        }
      });

      contract.on('TokensRemoved', async (tokens, event) => {
        console.log('new event');
        console.log('token removed');
        console.log(event);
        console.log('event event');
        console.log(event.event);
        console.log('the tokens');
        console.log(tokens);
        //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

        // Fetch the transaction using the transaction hash from the event
        const transaction = await this.web3Provider.getTransaction(
          event.transactionHash,
        );

        // The address that submitted the transaction
        const senderAddress = transaction.from;

        //storing on the "events" table
        const finalData = {
          event: event,
          contractAddress: event.address,
        };
        console.log(finalData);
        try {
          await this.prisma.event.create({
            data: {
              name: 'TokensRemoved',
              data: JSON.stringify(finalData),
              eventIndex: String(event.logIndex),
              transactionHash: event.transactionHash,
              blockNumber: String(event.blockNumber),
              address: senderAddress,
              timestamp: timestamp,
            },
          });
        } catch (err) {
          console.log('error saving event');
        }

        //updating the verifiedcontributorToken with the new departament
        for (let i = 0; i < tokens.length; i++) {
          const contributorToken =
            await this.prisma.verifiedContributorToken.findFirst({
              where: {
                tokenId: String(tokens[i]),
              },
            });

          // Verifique se o endereço já está na lista
          if (
            contributorToken &&
            contributorToken.departamentList.includes(event.address)
          ) {
            // Crie uma nova lista sem o endereço
            const newDepartamentList = contributorToken.departamentList.filter(
              (address) => address !== event.address,
            );

            await this.prisma.verifiedContributorToken.update({
              where: {
                tokenId: String(tokens[i]),
              },
              data: {
                departamentList: newDepartamentList,
              },
            });
          }
        }
      });
    });
  }

  async setupNFTListeners() {
    const contract = new ethers.Contract(
      this.nftContractAddress,
      nftContractABI,
      this.web3Provider,
    );

    // event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    contract.on('Transfer', async (from, to, tokenId, event) => {
      console.log('new event');
      console.log('nft mint');
      console.log(event);
      console.log('event event');
      console.log(event.event);
      //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const block = await this.web3Provider.getBlock(event['blockNumber']);
      const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

      //storing on the "events" table
      const finalData = {
        event: event,
        contractAddress: event.address,
      };
      console.log(finalData);
      try {
        await this.prisma.event.create({
          data: {
            name: 'Transfer',
            data: JSON.stringify(finalData),
            eventIndex: String(event.logIndex),
            transactionHash: event.transactionHash,
            address: to,
            blockNumber: String(event.blockNumber),
            timestamp: timestamp,
          },
        });
      } catch (err) {
        console.log('error saving event');
      }
      await this.usersService.checkIfUserExistsOnTheChain(to);

      //seeing if the token already exists on the db:
      const tokenExists = await this.prisma.verifiedContributorToken.findFirst({
        where: {
          tokenId: String(tokenId),
        },
      });

      const user = await this.prisma.user.findFirst({
        where: {
          address: to,
        },
      });
      console.log('the user');
      console.log(user);

      if (!tokenExists) {
        await this.prisma.verifiedContributorToken.create({
          data: {
            tokenId: String(tokenId),
            userId: user.id,
          },
        });
      } else {
        //if the token exists, changing its owner
        await this.prisma.verifiedContributorToken.update({
          where: {
            id: tokenExists.id,
          },
          data: {
            userId: user.id,
          },
        });
      }
    });
  }
}
