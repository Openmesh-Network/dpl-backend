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

import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import { PrismaService } from '../database/prisma.service';
import {
  GetSubmissionDto,
  GetTaskDto,
  GetTasksDto,
  GetTokensNecessaryToFillRequestDTO,
  GetUserToDraftTaskDto,
} from './dto/tasks.dto';
import { UtilsService } from '../utils/utils.service';
import {
  UploadIPFSMetadataTaskApplicationDTO,
  UploadIPFSMetadataTaskCreationDTO,
  UploadIPFSMetadataTaskDraftCreationDTO,
  UploadIPFSMetadataTaskSubmissionDTO,
  UploadIPFSMetadataTaskSubmissionRevisionDTO,
} from './dto/metadata.dto';
import { TasksService } from '../tasks/tasks.service';

//This service is utilized to update some task - it runs a query trhough all the events from a determined task to update it (its util to some cases in which the backend may have losed some events caused by a downtime or something similar)
@Injectable()
export class UpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly tasksService: TasksService,
  ) {}

  //setting variables:
  web3UrlProvider = process.env.WEB3_URL_PROVIDER;
  web3Provider = new ethers.providers.JsonRpcProvider(this.web3UrlProvider);
  viewPrivateKey = process.env.VIEW_PRIVATE_KEY;
  taskContractAddress = process.env.TASK_CONTRACT_ADDRESS;
  ipfsBaseURL = process.env.IPFS_BASE_URL;
  recallIpfsBaseURL = process.env.RECALL_IPFS_BASE_URL;
  pinataApiKey = process.env.PINATA_API_KEY;
  pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
  environment = process.env.ENVIRONMENT;
  usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS;
  usdtTokenAddress = process.env.USDT_TOKEN_ADDRESS;
  wEthTokenAddress = process.env.WETH_TOKEN_ADDRESS;

  statusOptions = ['open', 'active', 'completed', 'draft'];

  async updateAllSingleTaskData() {
    console.log('getting all tasks updateds task');
    const walletEther = new ethers.Wallet(this.viewPrivateKey);
    const connectedWallet = walletEther.connect(this.web3Provider);
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    const contractSigner = await newcontract.connect(connectedWallet);

    let taskCount = 0;
    await contractSigner.taskCount().then(function (response) {
      taskCount = response;
    });

    for (let i = 0; i < Number(taskCount); i++) {
      console.log('called the single task data ' + i);
      await this.updateSingleTaskData(i);
    }
  }

  //updates a single task
  async updateSingleTaskData(id: number) {
    console.log('getting a updated task');
    const walletEther = new ethers.Wallet(this.viewPrivateKey);
    const connectedWallet = walletEther.connect(this.web3Provider);
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    const contractSigner = await newcontract.connect(connectedWallet);

    const tasks = [];

    let taskMetadata;
    await contractSigner.getTask(id).then(function (response) {
      taskMetadata = response; //-> response example: [  'QmX8MeaSR16FEmk6YxRfFJjgSNf5B7DJHDRvLhCcqNhSSv',  BigNumber { _hex: '0x64b9ca80', _isBigNumber: true },  BigNumber { _hex: '0x64b16a58', _isBigNumber: true },  BigNumber { _hex: '0x00', _isBigNumber: true },  0,  '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',  0,  '0x12be7EDC6829697B880EE949493fe81D15ADdB7c',  [    [      '0x6eFbB027a552637492D827524242252733F06916',      [BigNumber],      tokenContract: '0x6eFbB027a552637492D827524242252733F06916',       amount: [BigNumber]    ]  ],  [],  [],  [],  [],  [],  metadata: 'QmX8MeaSR16FEmk6YxRfFJjgSNf5B7DJHDRvLhCcqNhSSv',        deadline: BigNumber { _hex: '0x64b9ca80', _isBigNumber: true },    creationTimestamp: BigNumber { _hex: '0x64b16a58', _isBigNumber:   ],  applications: [],  submissions: [],  changeScopeRequests: [],  dropExecutorRequests: [],  cancelTaskRequests: []]
      tasks.push(taskMetadata);
    });

    console.log('the response');
    console.log(taskMetadata);

    const tasksWithMetadata = [];

    const ipfsRes = await this.tasksService.getDataFromIPFS(
      tasks[0][0],
      id,
      tasks[0][1],
      tasks[0][7],
      tasks[0][5],
    );
    console.log('ipfs respondido');
    console.log(ipfsRes);
    if (ipfsRes) {
      //adding the applications, since its a data from the smart-contracts and not from the ipfs metadata:
      console.log('the task2');
      ipfsRes['applications'] = JSON.stringify(tasks[0][8]);
      console.log('pushing data');
      tasksWithMetadata.push(ipfsRes);
      console.log('pushed');
    }
    console.log('receiving links');
    for (const task of tasksWithMetadata) {
      let finalLinkAsStrings = [];
      if (task['links'] && task['links'].length > 0) {
        finalLinkAsStrings = task['links'].map((dataItem) =>
          JSON.stringify(dataItem),
        );
      }
      const existingTask = await this.prisma.task.findUnique({
        where: { taskId: String(task['id']) },
        include: { payments: true },
      });
      if (existingTask) {
        console.log('exists tasks');
        await this.prisma.payment.deleteMany({
          where: {
            taskId: existingTask.id,
          },
        });
        console.log('deleted');
      }
      console.log('next step');
      const skillsSearch = task['skills'].join(' '); //parameter mandatory to execute case insensitive searchs on the database

      await this.prisma.task.upsert({
        where: { taskId: String(task['id']) },
        update: {
          deadline: task['deadline'],
          description: task['description'],
          file: task['file'],
          links: finalLinkAsStrings,
          creator: tasks[0][3],
          manager: tasks[0][4],
          payments: {
            create: task['payments'],
          },
          estimatedBudget: task['estimatedBudget'],
          contributorsNeeded: task['numberOfApplicants'],
          projectLength: task['projectLength'],
          skills: task['skills'],
          applications: task['applications'],
          skillsSearch,
          status: String(task['status']),
          title: task['title'],
          departament: task['departament'],
          type: task['type'],
        },
        create: {
          taskId: String(task['id']),
          deadline: task['deadline'],
          description: task['description'],
          file: task['file'],
          links: finalLinkAsStrings,
          creator: tasks[0][3],
          manager: tasks[0][4],
          payments: {
            create: task['payments'],
          },
          estimatedBudget: task['estimatedBudget'],
          contributorsNeeded: task['numberOfApplicants'],
          projectLength: task['projectLength'],
          skills: task['skills'],
          applications: task['applications'],
          skillsSearch,
          status: String(task['status']),
          title: task['title'],
          departament: task['departament'],
          type: task['type'],
        },
      });

      await this.updatePreapprovedApplicationsFromTask(
        task['id'],
        JSON.parse(ipfsRes['applications']),
      );
      if (task['description']) {
        console.log('checking potencial links spam');
        this.utilsService.hasLink(task['description'], String(task['id']));
      }
      //   await this.applicationsFromTask(task['id']);
    }
    return tasksWithMetadata;
  }

  async updatePreapprovedApplicationsFromTask(
    taskId: string,
    applications: any,
  ) {
    console.log(
      'searching for the applications (preapproved - they are the first ones), if not exist yet, just create it',
    );
    const task = await this.prisma.task.findFirst({
      where: {
        taskId,
      },
      select: {
        payments: true,
        estimatedBudget: true,
        executor: true,
      },
    });
    console.log('what I received from applications');
    console.log(typeof applications);
    console.log('here it is the application');
    console.log(applications);
    applications.forEach(async (application, index) => {
      const applicationExists = await this.prisma.application.findFirst({
        where: {
          taskId,
          applicationId: String(index),
        },
      });
      console.log('and the application payment');
      console.log(application[3]);
      console.log('another one');
      console.log(application?.at(3)?.at(0));
      console.log('next 321');
      console.log(application?.at(3)?.at(0).at(2));
      console.log('next 123');
      console.log(application?.at(3)?.at(0).at(2)?.hex);

      // console.log(Number(application[3][0][2]['hex']));

      console.log('and now the task payments');
      console.log(task.payments);
      console.log(task.payments.length);

      if (!applicationExists) {
        console.log('getting the estimated budget of payments');
        for (let i = 0; i < task.payments.length; i++) {
          task.payments[i].amount = String(
            Number(application?.at(3)?.at(i)?.at(2)?.hex),
          );
        }
        console.log('budget for budgetApplication');
        console.log(task.payments);
        const budgetApplication =
          await this.utilsService.getEstimateBudgetToken(task.payments);
        console.log('it went back from get estimated budget token');
        const finalPercentageBudget = (
          (Number(budgetApplication) / Number(task.estimatedBudget)) *
          100
        ).toFixed(0);
        console.log('here it is if it was accepted or not');
        console.log(application[2]);
        const created = await this.prisma.application.create({
          data: {
            taskId,
            applicationId: String(index),
            metadataProposedBudget: finalPercentageBudget,
            applicant: application[1],
            proposer: task.executor,
            accepted: application[2] === true ? true : false,
          },
        });
        console.log('create succesfulyy');
      } else {
        console.log(
          'this task already exists, so just updating to see if its preaproved or not',
        );
        if (application[2] === true) {
          await this.prisma.application.updateMany({
            where: {
              taskId,
              applicationId: String(index),
            },
            data: {
              accepted: true,
            },
          });
        }
      }
    });
    console.log('now getting all previous applications from events log');
    await this.updateApplicationsFromTask(Number(taskId));
  }

  //Query the events log to get all the applications from a task and store it on database
  async updateApplicationsFromTask(taskId: number) {
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the applications all of them from task - events');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.ApplicationCreated(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });

    // const filteredEvents = events.filter((event) => event.args.taskId.eq(id)); //[  {    name: 'ApplicationCreated',    args: [      [BigNumber],      0,      'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      [Array],      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      taskId: [BigNumber],      applicationId: 0,      metadata: 'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      reward: [Array],      proposer: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      applicant: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170'    ],    signature: 'ApplicationCreated(uint256,uint16,string,(bool,address,uint88)[],address,address)',    topic: '0x7dea79221549b396f31442a220505470acfcfd38f772b6b3faa676d25df5998d',    blockNumber: 38426300,    timestamp: 1690664419  }]

    // Define a cache for timestamps
    const timestampCache = {};

    //getting the task and its budget
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

    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      console.log('creating args');
      if (event['args'][3] && Array.isArray(event['args'][3])) {
        event['reward'] = event['args'][3].map((reward) =>
          JSON.stringify(reward),
        );
      }

      console.log('getting metadata if its exists 22');
      let metadataData;
      try {
        if (String(event['args'][2]).length > 0) {
          metadataData = await this.tasksService.getApplicationDataFromIPFS(
            String(event['args'][2]),
          );
        }
      } catch (err) {
        console.log('not found metadata valid');
      }

      let finalPercentageBudget = '0';
      console.log('the event budget');
      console.log(event['args'][3][0]);
      console.log('more');
      console.log(event['args'][3][0]['amount']);
      try {
        //getting estimated budget
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
      }
      console.log('application creating - upserting');
      await this.prisma.application.upsert({
        where: {
          taskId_applicationId: {
            taskId: String(taskId),
            applicationId: String(event['args'][1]),
          },
        },
        update: {
          metadata: String(event['args'][2]),
          reward: event['reward'] || [],
          proposer: event['args'][4],
          applicant: event['args'][5],
          metadataDescription: metadataData ? metadataData?.description : '',
          metadataProposedBudget: finalPercentageBudget,
          metadataDisplayName: metadataData ? metadataData?.displayName : '',
          timestamp: event['timestamp'],
          transactionHash: event['transactionHash'],
          blockNumber: String(event['blockNumber']),
        },
        create: {
          taskId: String(taskId),
          applicationId: String(event['args'][1]),
          metadata: String(event['args'][2]),
          reward: event['reward'] || [],
          proposer: event['args'][4],
          applicant: event['args'][5],
          metadataDescription: metadataData ? metadataData?.description : '',
          metadataProposedBudget: finalPercentageBudget,
          metadataDisplayName: metadataData ? metadataData?.displayName : '',
          timestamp: event['timestamp'],
          transactionHash: event['transactionHash'],
          blockNumber: String(event['blockNumber']),
        },
      });
      try {
        const finalData = {
          event: event,
          contractAddress: newcontract.address,
        };
        await this.prisma.event.upsert({
          where: {
            eventIndex_transactionHash_blockNumber: {
              blockNumber: String(event.blockNumber),
              transactionHash: event.transactionHash,
              eventIndex: String(event['topic']),
            },
          },
          update: {
            name: 'ApplicationCreated',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][5],
            timestamp: event['timestamp'],
          },
          create: {
            name: 'ApplicationCreated',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][5],
            timestamp: event['timestamp'],
          },
        });
      } catch (err) {
        console.log('error submiting application');
      }
    }
    console.log('now getting all accepted applications from events log');
    await this.updateApplicationsAcceptedFromTask(Number(taskId));
  }

  //Query the events log to get all the applications that were accepted from a task and store it on database
  async updateApplicationsAcceptedFromTask(taskId: number) {
    console.log('UPDATE APPLICATIONS ACCEPTED');
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the applications acceptedes');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.ApplicationAccepted(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });
    console.log('FITLERED EVENTS');
    console.log(filteredEvents);
    // Define a cache for timestamps
    const timestampCache = {};

    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      await this.prisma.application.update({
        where: {
          taskId_applicationId: {
            taskId: String(taskId),
            applicationId: String(event['args'][1]),
          },
        },
        data: {
          accepted: true,
        },
      });
      try {
        const finalData = {
          event: event,
          contractAddress: newcontract.address,
        };
        await this.prisma.event.upsert({
          where: {
            eventIndex_transactionHash_blockNumber: {
              blockNumber: String(event.blockNumber),
              transactionHash: event.transactionHash,
              eventIndex: String(event['topic']),
            },
          },
          update: {
            name: 'ApplicationAccepted',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][5],
            timestamp: event['timestamp'],
          },
          create: {
            name: 'ApplicationAccepted',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][5],
            timestamp: event['timestamp'],
          },
        });
        console.log(
          'the task  ACCEPTED argss sSQDADDSNJQI0WQDIODQWMIN WQDIODNDQWNIOIQWNODNIDOQWINODQWIONWDQINOQWD111111111111111111111111111111111111111111111111',
        );
        console.log(event['args']);
      } catch (err) {
        console.log('error submiting application');
      }
    }
    console.log(
      'now getting all applications taken (task taken) from events log',
    );
    await this.updateApplicationsTakenFromTask(Number(taskId));
  }

  //Query the events log to get all the applications that were taken (after being accepted) from a task and store it on database
  async updateApplicationsTakenFromTask(taskId: number) {
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the applications taken');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.TaskTaken(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });

    // Define a cache for timestamps
    const timestampCache = {};

    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      await this.prisma.application.update({
        where: {
          taskId_applicationId: {
            taskId: String(taskId),
            applicationId: String(event['args'][1]),
          },
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
          taskTaken: true,
        },
      });

      try {
        const finalData = {
          event: event,
          contractAddress: newcontract.address,
        };
        await this.prisma.event.upsert({
          where: {
            eventIndex_transactionHash_blockNumber: {
              blockNumber: String(event.blockNumber),
              transactionHash: event.transactionHash,
              eventIndex: String(event['topic']),
            },
          },
          update: {
            name: 'TaskTaken',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][3],
            timestamp: event['timestamp'],
          },
          create: {
            name: 'TaskTaken',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][3],
            timestamp: event['timestamp'],
          },
        });
        console.log(
          'the task argss sSQDADDSNJQI0WQDIODQWMIN WQDIODNDQWNIOIQWNODNIDOQWINODQWIONWDQINOQWD111111111111111111111111111111111111111111111111',
        );
        console.log(event['args']);
      } catch (err) {
        console.log('error submiting application');
      }

      await this.utilsService.updatesJobSuccess(event['args'][3]);
    }
    console.log('now getting all submissions created from events log');
    await this.updateSubmissionCreatedFromTask(Number(taskId));
  }

  //Query the events log to get all the submissions created from a task and store it on database
  async updateSubmissionCreatedFromTask(taskId: number) {
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the submissions');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.SubmissionCreated(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });

    // Define a cache for timestamps
    const timestampCache = {};

    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      console.log('getting metadata if its exists 33');
      let metadataData;
      try {
        if (String(event['args'][2]).length > 0) {
          metadataData = await this.tasksService.getSubmissionDataFromIPFS(
            String(event['args'][2]),
          );
        }
      } catch (err) {
        console.log('not found metadata valid');
      }

      await this.prisma.submission.upsert({
        where: {
          taskId_submissionId: {
            taskId: String(taskId),
            submissionId: String(event['args'][1]),
          },
        },
        update: {
          taskId: String(taskId),
          submissionId: String(event['args'][1]),
          metadata: String(event['args'][2]),
          proposer: String(event['args'][3]),
          applicant: String(event['args'][4]),
          metadataDescription: metadataData ? metadataData?.description : '',
          // eslint-disable-next-line prettier/prettier
            metadataAdditionalLinks: metadataData
              ? metadataData?.links
              : [],
          timestamp: event['timestamp'],
          transactionHash: event.transactionHash,
        },
        create: {
          taskId: String(taskId),
          submissionId: String(event['args'][1]),
          metadata: String(event['args'][2]),
          proposer: String(event['args'][3]),
          applicant: String(event['args'][4]),
          metadataDescription: metadataData ? metadataData?.description : '',
          // eslint-disable-next-line prettier/prettier
              metadataAdditionalLinks: metadataData
                ? metadataData?.links
                : [],
          timestamp: event['timestamp'],
          transactionHash: event.transactionHash,
        },
      });

      try {
        const finalData = {
          event: event,
          contractAddress: newcontract.address,
        };
        await this.prisma.event.upsert({
          where: {
            eventIndex_transactionHash_blockNumber: {
              blockNumber: String(event.blockNumber),
              transactionHash: event.transactionHash,
              eventIndex: String(event['topic']),
            },
          },
          update: {
            name: 'SubmissionCreated',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][3],
            timestamp: event['timestamp'],
          },
          create: {
            name: 'SubmissionCreated',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][3],
            timestamp: event['timestamp'],
          },
        });
      } catch (err) {
        console.log('error submiting application');
      }
    }
    console.log('now getting all submissions reviews from events log');
    await this.updateSubmissionReviewedFromTask(Number(taskId));
  }

  //Query the events log to get all the submissions revisions from a task and store it on database
  async updateSubmissionReviewedFromTask(taskId: number) {
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the submissions reviews');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.SubmissionReviewed(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });

    // Define a cache for timestamps
    const timestampCache = {};

    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      console.log('getting metadata if its exists 44');
      let metadataData;
      try {
        if (String(event['args'][3]).length > 0) {
          metadataData = await this.tasksService.getSubmissionDataFromIPFS(
            String(event['args'][3]),
          );
        }
      } catch (err) {
        console.log('not found metadata valid');
      }

      await this.prisma.submission.update({
        where: {
          taskId_submissionId: {
            taskId: String(taskId),
            submissionId: String(event['args'][1]),
          },
        },
        data: {
          accepted:
            event['args'][2] && Number(event['args'][2]) === 1 ? true : false,
          reviewed: true,
          review: String(event['args'][2]),
          metadataReview: String(event['args'][3]),
          executorReview: String(event['args'][5]),
          metadataReviewFeedback: metadataData
            ? metadataData['description']
            : '',
          timestampReview: event['timestamp'],
        },
      });

      try {
        const finalData = {
          event: event,
          contractAddress: newcontract.address,
        };
        await this.prisma.event.upsert({
          where: {
            eventIndex_transactionHash_blockNumber: {
              blockNumber: String(event.blockNumber),
              transactionHash: event.transactionHash,
              eventIndex: String(event['topic']),
            },
          },
          update: {
            name: 'SubmissionReviewed',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][5],
            timestamp: event['timestamp'],
          },
          create: {
            name: 'SubmissionReviewed',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][5],
            timestamp: event['timestamp'],
          },
        });
      } catch (err) {
        console.log('error submiting application');
      }
    }
    console.log('now getting all tasks completed from events log');
    await this.updateTaskCompletedFromTask(Number(taskId));
  }

  //Query the events log to get all the tasks completed events from a task and store it on database
  async updateTaskCompletedFromTask(taskId: number) {
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the tasks completed');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.TaskCompleted(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });

    // Define a cache for timestamps
    const timestampCache = {};

    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      await this.prisma.task.update({
        where: {
          taskId: String(taskId),
        },
        data: {
          status: '2',
        },
      });

      try {
        const finalData = {
          event: event,
          contractAddress: newcontract.address,
        };
        await this.prisma.event.upsert({
          where: {
            eventIndex_transactionHash_blockNumber: {
              blockNumber: String(event.blockNumber),
              transactionHash: event.transactionHash,
              eventIndex: String(event['topic']),
            },
          },
          update: {
            name: 'TaskCompleted',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][1],
            timestamp: event['timestamp'],
          },
          create: {
            name: 'TaskCompleted',
            data: JSON.stringify(finalData),
            eventIndex: String(event['topic']),
            transactionHash: event.transactionHash,
            blockNumber: String(event.blockNumber),
            taskId: String(taskId),
            address: event['args'][1],
            timestamp: event['timestamp'],
          },
        });
      } catch (err) {
        console.log('error submiting application');
      }
    }
    console.log('now getting all budgets increases from events log');
    await this.updateBudgetIncreasedFromTask(Number(taskId));
  }

  //Query the events log to get all the budgets increased updates from a task and store it on database
  async updateBudgetIncreasedFromTask(taskId: number) {
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the budgets increases in the task');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.BudgetIncreased(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });

    // const filteredEvents = events.filter((event) => event.args.taskId.eq(id)); //[  {    name: 'ApplicationCreated',    args: [      [BigNumber],      0,      'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      [Array],      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      taskId: [BigNumber],      applicationId: 0,      metadata: 'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      reward: [Array],      proposer: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      applicant: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170'    ],    signature: 'ApplicationCreated(uint256,uint16,string,(bool,address,uint88)[],address,address)',    topic: '0x7dea79221549b396f31442a220505470acfcfd38f772b6b3faa676d25df5998d',    blockNumber: 38426300,    timestamp: 1690664419  }]

    // Define a cache for timestamps
    const timestampCache = {};

    //getting the task and its budget
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

    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      console.log('the event budget');
      console.log(event['args'][1]);
      console.log('more');
      console.log(event['args'][1][0]);
      try {
        //does not need to update the payment, because when you get it in the getTask it already comes updated with the increased budget
      } catch (err) {
        console.log('error getting estimated budget3');
      }
      await this.prisma.task.update({
        where: {
          taskId: String(taskId),
        },
        data: {
          budgetIncreased: true,
        },
      });
    }
    console.log('now getting all metadata edits from events log');
    await this.updateMetadataEdittedFromTask(Number(taskId));
  }

  //Query the events log to get all the metadata edits updates from a task and store it on database
  async updateMetadataEdittedFromTask(taskId: number) {
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the metadata edits in the task');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.MetadataEditted(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });

    // const filteredEvents = events.filter((event) => event.args.taskId.eq(id)); //[  {    name: 'ApplicationCreated',    args: [      [BigNumber],      0,      'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      [Array],      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      taskId: [BigNumber],      applicationId: 0,      metadata: 'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      reward: [Array],      proposer: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      applicant: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170'    ],    signature: 'ApplicationCreated(uint256,uint16,string,(bool,address,uint88)[],address,address)',    topic: '0x7dea79221549b396f31442a220505470acfcfd38f772b6b3faa676d25df5998d',    blockNumber: 38426300,    timestamp: 1690664419  }]

    // Define a cache for timestamps
    const timestampCache = {};
    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      console.log('the event metadata');
      console.log(event['args']);
      console.log('more');
      try {
        //does not need to update the metadata, because when you get it in the getTask it already comes updated with the metadata edited
      } catch (err) {
        console.log('error getting event');
      }
      await this.prisma.task.update({
        where: {
          taskId: String(taskId),
        },
        data: {
          metadataEdited: true,
        },
      });
    }
    console.log('now getting all deadlines extendeds from events log');
    await this.updateDeadlineExtendedFromTask(Number(taskId));
  }

  //Query the events log to get all the deadlines extended updates from a task and store it on database
  async updateDeadlineExtendedFromTask(taskId: number) {
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    console.log('now updating the deadlines extendeds in the task');
    const taskIdBigNumber = ethers.BigNumber.from(taskId);
    const filter = newcontract.filters.DeadlineExtended(taskIdBigNumber);

    // Getting the events
    const logs = await this.web3Provider.getLogs({
      fromBlock: 0,
      toBlock: 'latest',
      address: newcontract.address,
      topics: filter.topics,
    });

    console.log('logs');
    console.log(logs);

    // Parsing the events
    const filteredEvents = logs.map((log) => {
      const event = newcontract.interface.parseLog(log);
      console.log('final event');
      console.log(event);
      return {
        name: event.name,
        args: event.args,
        signature: event.signature,
        topic: event.topic,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    });

    // const filteredEvents = events.filter((event) => event.args.taskId.eq(id)); //[  {    name: 'ApplicationCreated',    args: [      [BigNumber],      0,      'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      [Array],      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      taskId: [BigNumber],      applicationId: 0,      metadata: 'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      reward: [Array],      proposer: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      applicant: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170'    ],    signature: 'ApplicationCreated(uint256,uint16,string,(bool,address,uint88)[],address,address)',    topic: '0x7dea79221549b396f31442a220505470acfcfd38f772b6b3faa676d25df5998d',    blockNumber: 38426300,    timestamp: 1690664419  }]

    // Define a cache for timestamps
    const timestampCache = {};
    //getting events
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      if (timestampCache[event['blockNumber']]) {
        // If the timestamp for this block is already cached, use it
        event['timestamp'] = timestampCache[event['blockNumber']];
      } else {
        // Otherwise, fetch the block and cache the timestamp
        const block = await this.web3Provider.getBlock(event['blockNumber']);
        const timestamp = block.timestamp; // Timestamp in seconds
        timestampCache[event['blockNumber']] = timestamp;
        event['timestamp'] = String(timestamp);
      }

      console.log('the event deadline');
      console.log(event['args']);
      console.log('more');
      try {
        //does not need to update the deadline, because when you get it in the getTask it already comes updated with the deadline edited
      } catch (err) {
        console.log('error getting event');
      }
      await this.prisma.task.update({
        where: {
          taskId: String(taskId),
        },
        data: {
          metadataEdited: true,
          deadlineIncreased: true,
        },
      });
    }
  }

  // FUNCTIONS

  //runs a check to update the estiamted budget of a task and its applications
  async updateEstimationBudgetTaskAndApplications(taskId: string) {
    console.log('updateEstimationBudgetTaskAndApplications');
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
    await this.prisma.task.update({
      where: {
        taskId: String(taskId),
      },
      data: {
        estimatedBudget: budgetTask,
      },
    });
    console.log('getting budget of applications');
    const applications = await this.prisma.application.findMany({
      where: {
        taskId,
      },
    });
    console.log('going to applications reward loop');
    for (let i = 0; i < applications.length; i++) {
      for (let j = 0; j < applications[i].reward.length; j++) {
        task.payments[j].amount = String(
          JSON.parse(applications[i].reward[j])[2]['hex'],
        );
        console.log('the reward here');
        console.log(
          String(Number(JSON.parse(applications[i].reward[j])[2]['hex'])),
        );
        console.log('loop its over');
      }
      const budgetApplication = await this.utilsService.getEstimateBudgetToken(
        task.payments,
      );
      const finalPercentageBudget = (
        (Number(budgetApplication) / Number(budgetTask)) *
        100
      ).toFixed(0);
      await this.prisma.application.update({
        where: {
          id: applications[i].id,
        },
        data: {
          metadataProposedBudget: finalPercentageBudget,
        },
      });
    }
  }
}
