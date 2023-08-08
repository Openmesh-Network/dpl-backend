import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

// import { import_ } from '@brillout/import';
import { ethers } from 'ethers';
import * as taskContractABI from '../contracts/taskContractABI.json';
import * as erc20ContractABI from '../contracts/erc20ContractABI.json';
import { TasksService } from '../tasks/tasks.service';

import { PrismaService } from '../database/prisma.service';
import { Request, response } from 'express';
import axios from 'axios';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class EventsHandlerService {
  //setting variables:
  web3UrlProvider = process.env.WEB3_URL_PROVIDER;
  web3Provider = new ethers.providers.JsonRpcProvider(this.web3UrlProvider);
  viewPrivateKey = process.env.VIEW_PRIVATE_KEY;
  taskContractAddress = process.env.TASK_CONTRACT_ADDRESS;
  ipfsBaseURL = process.env.IPFS_BASE_URL;
  walletEther = new ethers.Wallet(this.viewPrivateKey);
  connectedWallet = this.walletEther.connect(this.web3Provider);
  newcontract = new ethers.Contract(
    this.taskContractAddress,
    taskContractABI,
    this.web3Provider,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
  ) {
    //event ApplicationCreated(uint256 taskId, uint16 applicationId, string metadata, Reward[] reward, address proposer, address applicant);
    this.newcontract.on(
      'ApplicationCreated',
      async (
        taskId,
        applicationId,
        metadata,
        reward,
        proposer,
        applicant,
        event,
      ) => {
        console.log('new event');
        //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
        await new Promise((resolve) => setTimeout(resolve, 4500));
        console.log(event);
        console.log('event event');
        console.log(event.event);
        console.log('event reward');
        console.log(event['args'][3]);
        console.log('event reward specific');
        console.log(event['args'][3]['amount']);
        console.log('next reward');
        console.log(event['args'][3][0]['amount']);
        console.log('now the reward');
        console.log(reward[0]);
        console.log('next');
        console.log(reward[0]['amount']);
        console.log('and');
        console.log(reward['amount']);

        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

        //storing on the "events" table
        const finalData = {
          event: event,
          contractAddress: event.address,
        };
        console.log(finalData);

        //application special data treating
        const applicationExists = await this.prisma.application.findFirst({
          where: {
            taskId: String(taskId),
            applicationId: String(applicationId),
          },
        });

        if (!applicationExists) {
          if (reward && Array.isArray(reward)) {
            reward = reward.map((singleReward) => JSON.stringify(singleReward));
          }
          console.log('the arg you looking for');
          console.log(event['args'][2]);
          const metadataData =
            await this.tasksService.getApplicationDataFromIPFS(
              String(event['args'][2]),
            );
          console.log('the metadata app');
          console.log(metadataData);

          let finalPercentageBudget;
          try {
            //getting the percentage of the budget estimation
            //first - updating the estiamted budget of the task
            const task = await this.prisma.task.findFirst({
              where: {
                taskId: String(taskId),
              },
              select: {
                payments: true,
              },
            });
            console.log('getting budget fort budgetTask');
            console.log(task.payments);
            const budgetTask = await this.tasksService.getEstimateBudgetToken(
              task.payments,
            );
            console.log(budgetTask);
            console.log('looping');
            console.log(event['args'][3][0]['amount']);
            //second, getting the budgetEstimation for the application:
            for (let i = 0; i < task.payments.length; i++) {
              task.payments[i].amount = String(event['args'][3][i]['amount']);
            }
            console.log('budget for budgetApplication');
            console.log(task.payments);
            const budgetApplication =
              await this.tasksService.getEstimateBudgetToken(task.payments);
            console.log('budgetApplication2');
            console.log(budgetApplication);
            finalPercentageBudget = (
              (Number(budgetApplication) / Number(budgetTask)) *
              100
            ).toFixed(0);
          } catch (err) {
            console.log('error getting estimated budget3');
            console.log(err);
          }

          await this.prisma.application.create({
            data: {
              taskId: String(taskId),
              applicationId: String(applicationId),
              metadata: metadata,
              reward: reward || [],
              proposer: proposer,
              applicant: applicant,
              metadataDescription: metadataData
                ? metadataData['description']
                : '',
              // eslint-disable-next-line prettier/prettier
              metadataProposedBudget: finalPercentageBudget,
              metadataAdditionalLink: metadataData
                ? metadataData['additionalLink']
                : '',
              metadataDisplayName: metadataData
                ? metadataData['displayName']
                : '',
              timestamp: timestamp,
              transactionHash: event.transactionHash,
              blockNumber: String(event.blockNumber),
            },
          });

          try {
            await this.prisma.event.create({
              data: {
                name: 'ApplicationCreated',
                data: JSON.stringify(finalData),
                eventIndex: String(event.logIndex),
                transactionHash: event.transactionHash,
                blockNumber: String(event.blockNumber),
                taskId: String(taskId),
                address: applicant,
                timestamp: timestamp,
              },
            });
          } catch (err) {
            console.log('error submiting application');
          }
          this.usersService.checkIfUserExistsOnTheChain(applicant);
        }
      },
    );

    // //event TaskCreated(uint256 taskId, string metadata, uint64 deadline, ERC20Transfer[] budget, address manager, PreapprovedApplication[] preapproved);
    this.newcontract.on(
      'TaskCreated',
      async (
        taskId,
        metadata,
        deadline,
        budget,
        creator,
        manager,
        preapproved,
        event,
      ) => {
        console.log('new event');
        //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
        await new Promise((resolve) => setTimeout(resolve, 4500));
        console.log(event);
        console.log('event event');
        console.log(event.event);

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
              name: 'TaskCreated',
              data: JSON.stringify(finalData),
              eventIndex: String(event.logIndex),
              transactionHash: event.transactionHash,
              blockNumber: String(event.blockNumber),
              taskId: String(taskId),
              address: manager,
              timestamp: timestamp,
            },
          });
        } catch (err) {
          console.log('wasnt eable to created the task');
        }
        await this.prisma.task.create({
          data: {
            taskId: String(taskId),
            executor: manager,
          },
        });
        this.usersService.checkIfUserExistsOnTheChain(manager);
        this.tasksService.updateSingleTaskData(Number(taskId));
      },
    );

    // event ApplicationAccepted(uint256 taskId, uint16 application, address proposer, address applicant);
    this.newcontract.on(
      'ApplicationAccepted',
      async (taskId, applicationId, proposer, applicant, event) => {
        console.log('new event');
        console.log(event);
        console.log('event event');
        console.log(event.event);

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
              name: 'ApplicationAccepted',
              data: JSON.stringify(finalData),
              eventIndex: String(event.logIndex),
              transactionHash: event.transactionHash,
              blockNumber: String(event.blockNumber),
              taskId: String(taskId),
              address: applicant,
              timestamp: timestamp,
            },
          });
        } catch (err) {
          console.log('error saving event');
        }

        this.usersService.checkIfUserExistsOnTheChain(applicant);

        //Updating application to accepted
        console.log('updating the application');

        await this.prisma.application.updateMany({
          where: {
            taskId: String(taskId),
            applicationId: String(applicationId),
          },
          data: {
            accepted: true,
          },
        });
      },
    );

    // event TaskTaken(uint256 taskId, uint16 applicationId, address proposer, address executor);
    this.newcontract.on(
      'TaskTaken',
      async (taskId, applicationId, proposer, executor, event) => {
        console.log('new event');
        console.log(event);
        console.log('event event');
        console.log(event.event);

        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

        //storing on the "events" table
        const finalData = {
          event: event,
          contractAddress: event.address,
        };
        console.log(finalData);
        await this.prisma.event.create({
          data: {
            name: 'TaskTaken',
            data: JSON.stringify(finalData),
            eventIndex: String(event.logIndex),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: executor,
            timestamp: timestamp,
          },
        });
        this.usersService.checkIfUserExistsOnTheChain(executor);
        //setting the task as taken and the application as well
        console.log('updating application');
        await this.prisma.application.updateMany({
          where: {
            taskId: String(taskId),
            applicationId: String(applicationId),
          },
          data: {
            accepted: true,
            taken: true,
          },
        });
        console.log('updating task');
        await this.prisma.task.update({
          where: {
            taskId: String(taskId),
          },
          data: {
            status: String(1),
            executor,
          },
        });
        this.tasksService.updateSingleTaskData(Number(taskId));
      },
    );

    //event SubmissionCreated(uint256 taskId, uint8 submissionId, string metadata, address proposer, address executor);
    this.newcontract.on(
      'SubmissionCreated',
      async (taskId, submissionId, metadata, proposer, executor, event) => {
        console.log('new event');
        //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
        await new Promise((resolve) => setTimeout(resolve, 4500));
        console.log(event);
        console.log('event event');
        console.log(event.event);

        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

        //storing on the "events" table
        const finalData = {
          event: event,
          contractAddress: event.address,
        };
        console.log(finalData);

        //application special data treating
        const applicationExists = await this.prisma.submission.findFirst({
          where: {
            taskId: String(taskId),
            submissionId: String(submissionId),
          },
        });

        if (!applicationExists) {
          console.log('getting submission metadata');
          console.log('the arg you looking for');
          console.log(event['args'][2]);
          const metadataData =
            await this.tasksService.getSubmissionDataFromIPFS(
              String(event['args'][2]),
            );
          console.log('creating submission');
          await this.prisma.submission.create({
            data: {
              taskId: String(taskId),
              submissionId: String(submissionId),
              metadata: metadata,
              proposer: proposer,
              applicant: executor,
              metadataDescription: metadataData
                ? metadataData['description']
                : '',
              // eslint-disable-next-line prettier/prettier
              metadataAdditionalLinks: metadataData ? metadataData['links'] : [],
              timestamp: timestamp,
              transactionHash: event.transactionHash,
              blockNumber: String(event.blockNumber),
            },
          });
          console.log('creating event');
          try {
            await this.prisma.event.create({
              data: {
                name: 'SubmissionCreated',
                data: JSON.stringify(finalData),
                eventIndex: String(event.logIndex),
                transactionHash: event.transactionHash,
                blockNumber: String(event.blockNumber),
                taskId: String(taskId),
                address: executor,
                timestamp: timestamp,
              },
            });
          } catch (err) {
            console.log('error submiting application');
          }
          console.log('checking user');
          this.usersService.checkIfUserExistsOnTheChain(executor);
        }
      },
    );

    //event SubmissionReviewed(uint256 taskId, uint8 submissionId, SubmissionJudgement judgement, string feedback, address proposer, address executor);
    this.newcontract.on(
      'SubmissionReviewed',
      async (
        taskId,
        submissionId,
        judgement,
        feedback,
        proposer,
        executor,
        event,
      ) => {
        console.log('new event');
        //waiting 4.5 seconds so its gives time to the metadata to load on ipfs.
        await new Promise((resolve) => setTimeout(resolve, 4500));
        console.log(event);
        console.log('event event');
        console.log(event.event);

        // const judmentsOptions = ['None', 'Accepted', 'Rejected'];

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
              name: 'SubmissionReviewed',
              data: JSON.stringify(finalData),
              eventIndex: String(event.logIndex),
              transactionHash: event.transactionHash,
              blockNumber: String(event.blockNumber),
              taskId: String(taskId),
              address: executor,
              timestamp: timestamp,
            },
          });
        } catch (err) {
          console.log('error in submission review');
        }

        const metadataData = await this.tasksService.getSubmissionDataFromIPFS(
          String(event['args'][3]),
        );
        //setting the task as taken and the application as well
        console.log('updating application');
        await this.prisma.submission.updateMany({
          where: {
            taskId: String(taskId),
            submissionId: String(submissionId),
          },
          data: {
            accepted: true,
            reviewed: true,
            review: String(judgement),
            metadataReview: feedback,
            metadataReviewFeedback: metadataData
              ? metadataData['description']
              : '',
            timestampReview: timestamp,
          },
        });

        this.usersService.checkIfUserExistsOnTheChain(executor);
      },
    );

    //event TaskCompleted(uint256 taskId, address proposer, address executor);
    this.newcontract.on(
      'TaskCompleted',
      async (taskId, proposer, executor, event) => {
        console.log('new event');
        console.log(event);
        console.log('event event');
        console.log(event.event);

        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

        //storing on the "events" table
        const finalData = {
          event: event,
          contractAddress: event.address,
        };
        console.log(finalData);
        await this.prisma.event.create({
          data: {
            name: 'TaskCompleted',
            data: JSON.stringify(finalData),
            eventIndex: String(event.logIndex),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: executor,
            timestamp: timestamp,
          },
        });
        this.prisma.task.update({
          where: {
            taskId: String(taskId),
          },
          data: {
            status: '2',
          },
        });
        this.usersService.checkIfUserExistsOnTheChain(executor);
      },
    );

    //event BudgetIncreased(uint256 indexed taskId, uint96[] increase, address manager);
    this.newcontract.on(
      'BudgetIncreased',
      async (taskId, increase, executor, event) => {
        console.log('new event');
        console.log(event);
        console.log('event event');
        console.log(event.event);

        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = String(block.timestamp) || String(Date.now() / 1000); // Timestamp in seconds

        //storing on the "events" table
        const finalData = {
          event: event,
          contractAddress: event.address,
        };
        console.log(finalData);
        await this.prisma.event.create({
          data: {
            name: 'BudgetIncreased',
            data: JSON.stringify(finalData),
            eventIndex: String(event.logIndex),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: executor,
            timestamp: timestamp,
          },
        });
        const getTask = await this.prisma.task.findFirst({
          where: {
            taskId: String(taskId),
          },
        });
        //getting all the payments from the task and then checking if its increased something:
        const payments = await this.prisma.payment.findMany({
          where: {
            taskId: getTask.id,
          },
        });
        console.log('os payments');
        console.log(payments);
        console.log('os incrementes');
        console.log(increase);
        console.log('trying to number increase');
        console.log(Number(increase[0]));
        for (let i = 0; i < payments.length; i++) {
          if (Number(increase[i]) > 0) {
            console.log('increase');
            await this.prisma.payment.update({
              where: {
                id: payments[i].id,
              },
              data: {
                amount: String(
                  Number(payments[i].amount) + Number(increase[i]),
                ),
              },
            });
          }
        }
        console.log('final payment');
        const finalPayments = await this.prisma.payment.findMany({
          where: {
            taskId: getTask.id,
          },
        });
        console.log('budgetTask');
        const budgetTask = await this.tasksService.getEstimateBudgetToken(
          finalPayments,
        );
        console.log(budgetTask);
        console.log('task');
        console.log('final budget: ' + budgetTask);
        const update = await this.prisma.task.update({
          where: {
            taskId: String(taskId),
          },
          data: {
            estimatedBudget: budgetTask,
          },
        });
        console.log(update);
        console.log('next');
        await this.tasksService.updateEstimationBudgetTaskAndApplications(
          String(taskId),
        );
        await this.usersService.checkIfUserExistsOnTheChain(executor);
      },
    );
  }
}
