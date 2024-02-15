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
import { UtilsService } from 'src/utils/utils.service';
import { UpdatesService } from 'src/tasks/updates.service';

//This is the service to handle the contracts related to the task managment:
// Task.sol

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
    private readonly utilsService: UtilsService,
    private readonly usersService: UsersService,
    private readonly updatesService: UpdatesService,
  ) {
    return; //events handler disabled, its consuming to many rpc requests.
    console.log('constructor being called');
    console.log(this.taskContractAddress);
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
        console.log('application received');
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
            const budgetTask = await this.utilsService.getEstimateBudgetToken(
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
              await this.utilsService.getEstimateBudgetToken(task.payments);
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
          await this.usersService.checkIfUserExistsOnTheChain(applicant);
          await this.utilsService.updatesTotalEarned(applicant);
        }
      },
    );

    // emit TaskCreated(            taskId,            _metadata,            _deadline,            _budget,            _msgSender(),            _manager        );
    this.newcontract.on(
      'TaskCreated',
      async (taskId, metadata, deadline, budget, creator, manager, event) => {
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
            creator,
            manager,
          },
        });
        this.usersService.checkIfUserExistsOnTheChain(creator);
        this.updatesService.updateSingleTaskData(Number(taskId));
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
          },
        });
        await this.updatesService.updateSingleTaskData(Number(taskId));
        console.log('updating job success');
        await this.utilsService.updatesJobSuccess(executor);
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
              metadataAdditionalLinks: metadataData
                ? metadataData['links']
                : [],
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
        console.log('submission reviewed');
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

        console.log('the judgment');
        console.log(judgement); // 1-> accepted; 2 -> rejected
        console.log('updating submission');
        await this.prisma.submission.updateMany({
          where: {
            taskId: String(taskId),
            submissionId: String(submissionId),
          },
          data: {
            accepted: judgement && Number(judgement) === 1 ? true : false,
            reviewed: true,
            review: String(judgement),
            metadataReview: feedback,
            executorReview: executor,
            metadataReviewFeedback: metadataData
              ? metadataData['description']
              : '',
            timestampReview: timestamp,
          },
        });

        await this.usersService.checkIfUserExistsOnTheChain(executor);
        await this.utilsService.updatesJobSuccess(executor);
      },
    );

    //event TaskCompleted(uint256 taskId, address proposer, address executor);
    this.newcontract.on(
      'TaskCompleted',
      async (taskId, executor, proposer, event) => {
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
        console.log('setting task as completed');
        await this.prisma.task.updateMany({
          where: {
            taskId: String(taskId),
          },
          data: {
            status: '2',
          },
        });
        await this.usersService.checkIfUserExistsOnTheChain(executor);
        await this.utilsService.updatesJobSuccess(executor);
        await this.utilsService.updatesTotalEarned(executor);
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
        const budgetTask = await this.utilsService.getEstimateBudgetToken(
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
            budgetIncreased: true,
          },
        });
        console.log(update);
        console.log('next');
        await this.updatesService.updateEstimationBudgetTaskAndApplications(
          String(taskId),
        );
        await this.usersService.checkIfUserExistsOnTheChain(executor);
      },
    );

    // event MetadataEditted(uint256 indexed taskId, string newMetadata, address manager);
    this.newcontract.on(
      'MetadataEditted',
      async (taskId, metadata, executor, event) => {
        console.log('Metadata editted');
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
            name: 'MetadataEditted',
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
        console.log('updating application');
        console.log('updating task');
        await this.prisma.task.update({
          where: {
            taskId: String(taskId),
          },
          data: {
            metadataHash: metadata,
            metadataEdited: true,
          },
        });
        await this.updatesService.updateSingleTaskData(Number(taskId));
      },
    );

    // event DeadlineExtended(uint256 indexed taskId, uint64 extension, address manager, address executor);
    this.newcontract.on(
      'DeadlineExtended',
      async (taskId, extension, metadata, executor, event) => {
        console.log('deadline extended');
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
            name: 'DeadlineExtended',
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

        const taskExist = await this.prisma.task.findFirst({
          where: {
            taskId: String(taskId),
          },
        });

        console.log('updating task');
        await this.prisma.task.update({
          where: {
            taskId: String(taskId),
          },
          data: {
            deadline: String(Number(taskExist.deadline) + Number(extension)),
            deadlineIncreased: true,
          },
        });
        await this.updatesService.updateSingleTaskData(Number(taskId));
      },
    );
  }
}
