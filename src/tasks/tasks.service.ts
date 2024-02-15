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
import * as fundraiserContractABI from '../contracts/fundraiserContractABI.json';

import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import { PrismaService } from '../database/prisma.service';
import { Request, response } from 'express';
import axios from 'axios';
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
  UploadMetadataTaskApplicationOffchainDTO,
} from './dto/metadata.dto';
import { OpenmeshExpertsAuthService } from 'src/openmesh-experts/openmesh-experts-auth.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly openmeshExpertsAuthService: OpenmeshExpertsAuthService,
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
  priceFeedETHUSDAddress =
    process.env.CHAINLINK_PRICE_FEED_ETHUSD_CONTRACT_ADDRESS;
  fundraisingContractAddress = process.env.FUNDRAISING_CONTRACT_ADDRESS;
  web3UrlProviderFundraising = process.env.WEB3_URL_PROVIDER_FUNDRAISING;
  // eslint-disable-next-line prettier/prettier
  web3ProviderFundraising = new ethers.providers.JsonRpcProvider(this.web3UrlProviderFundraising);

  statusOptions = ['open', 'active', 'completed', 'draft'];

  //Runs a check-update through the on-chain and off-chain tasks data and store it in the database - its used to always be updated with the tasks data:
  async updateTasksData() {
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

    console.log('looping the tasks');
    const tasks = [];
    //looping through all the tasks and getting the right data:
    for (let i = 0; i < taskCount; i++) {
      let taskMetadata;
      await contractSigner.getTask(i).then(function (response) {
        taskMetadata = response; //-> response example: [  'QmX8MeaSR16FEmk6YxRfFJjgSNf5B7DJHDRvLhCcqNhSSv',  BigNumber { _hex: '0x64b9ca80', _isBigNumber: true },  BigNumber { _hex: '0x64b16a58', _isBigNumber: true },  BigNumber { _hex: '0x00', _isBigNumber: true },  0,  '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',  0,  '0x12be7EDC6829697B880EE949493fe81D15ADdB7c',  [    [      '0x6eFbB027a552637492D827524242252733F06916',      [BigNumber],      tokenContract: '0x6eFbB027a552637492D827524242252733F06916',       amount: [BigNumber]    ]  ],  [],  [],  [],  [],  [],  metadata: 'QmX8MeaSR16FEmk6YxRfFJjgSNf5B7DJHDRvLhCcqNhSSv',        deadline: BigNumber { _hex: '0x64b9ca80', _isBigNumber: true },    creationTimestamp: BigNumber { _hex: '0x64b16a58', _isBigNumber:   ],  applications: [],  submissions: [],  changeScopeRequests: [],  dropExecutorRequests: [],  cancelTaskRequests: []]
        console.log('the task received');
        console.log(response);
        tasks.push(taskMetadata);
      });
    }

    const tasksWithMetadata = [];

    //getting the metadata from ipfs:
    for (let i = 0; i < taskCount; i++) {
      const ipfsRes = await this.getDataFromIPFS(
        tasks[i][0],
        i,
        tasks[i][1],
        tasks[0][7],
        tasks[i][5],
      );
      console.log('ipfs respondido');
      console.log(ipfsRes);
      if (ipfsRes) {
        //adding the applications, since its a data from the smart-contracts and not from the ipfs metadata:
        ipfsRes['applications'] = JSON.stringify(tasks[i][8]);
        tasksWithMetadata.push(ipfsRes);
      }
    }
    console.log('liks receveing');
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
        await this.prisma.payment.deleteMany({
          where: { taskId: existingTask.id },
        });
      }

      const skillsSearch = task['skills'].join(' '); //parameter mandatory to execute case insensitive searchs on the database

      await this.prisma.task.upsert({
        where: { taskId: String(task['id']) },
        update: {
          deadline: task['deadline'],
          description: task['description'],
          file: task['file'],
          links: finalLinkAsStrings,
          payments: {
            create: task['payments'],
          },
          estimatedBudget: task['estimatedBudget'],
          contributorsNeeded: task['numberOfApplicants'],
          projectLength: task['projectLength'],
          skills: task['skills'],
          skillsSearch,
          applications: task['applications'],
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
          applications: task['applications'],
          payments: {
            create: task['payments'],
          },
          estimatedBudget: task['estimatedBudget'],
          contributorsNeeded: task['numberOfApplicants'],
          projectLength: task['projectLength'],
          skills: task['skills'],
          skillsSearch,
          status: String(task['status']),
          title: task['title'],
          departament: task['departament'],
          type: task['type'],
        },
      });
      await this.applicationsFromTask(task['id']);
    }

    await this.updateOffChainBudgetTasks();
    return tasksWithMetadata;
  }

  //This is a temporary function, since some tasks are not funded yet but we wnat to show how much the user will earn if he gets it, we will manually update this tasks
  async updateOffChainBudgetTasks() {
    if (process.env.CHAIN_ENV === 'ETHEREUM') {
      return;
    }
    const taskIdToBudget = {
      '1': '55000',
      '2': '30000',
      '3': '30000',
      '4': '20000',
      '5': '25000',
      '6': '30000',
      '7': '45000',
      '8': '95000',
      '9': '50000',
      '10': '65000',
      '11': '50000',
      '12': '35000',
      '13': '90000',
      '14': '85000',
      '15': '70000',
      '16': '60000',
      '17': '40000',
      '18': '30000',
      '19': '30000',
      '20': '6000',
      '21': '6000',
      '22': '20000',
      '23': '30000',
      '24': '500',
      '25': '1500',
      '26': '45000',
      '27': '15000',
      '28': '100000',
    };
    for (const [taskId, budget] of Object.entries(taskIdToBudget)) {
      await this.prisma.task.update({
        where: {
          taskId,
        },
        data: {
          estimatedBudget: budget,
        },
      });
    }
  }

  async uploadIPFSMetadataTaskCreation(
    data: UploadIPFSMetadataTaskCreationDTO,
  ) {
    if (data.numberOfApplicants === '1') {
      data['type'] = 'Individual';
    } else {
      data['type'] = 'Group';
    }

    const config = {
      method: 'post',
      url: `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretApiKey,
        'Content-Type': 'application/json',
      },
      data,
    };

    let dado;

    try {
      await axios(config).then(function (response) {
        dado = response.data;
      });
    } catch (err) {
      throw new BadRequestException('Error during IPFS upload', {
        cause: new Error(),
        description: 'Error during IPFS upload',
      });
    }

    const ipfsHash = dado.IpfsHash;

    console.log('JSON uploaded to IPFS with hash', ipfsHash);

    return ipfsHash;
  }

  async uploadIPFSMetadataTaskDraftCreation(data: any) {
    const config = {
      method: 'post',
      url: `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretApiKey,
        'Content-Type': 'application/json',
      },
      data,
    };

    let dado;

    try {
      await axios(config).then(function (response) {
        dado = response.data;
      });
    } catch (err) {
      console.log(err);
      throw new BadRequestException('Error during IPFS upload', {
        cause: new Error(),
        description: 'Error during IPFS upload',
      });
    }

    const ipfsHash = dado.IpfsHash;

    console.log('JSON uploaded to IPFS with hash', ipfsHash);

    return ipfsHash;
  }

  async uploadIPFSMetadataTaskApplication(
    data: UploadIPFSMetadataTaskApplicationDTO,
  ) {
    const config = {
      method: 'post',
      url: `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretApiKey,
        'Content-Type': 'application/json',
      },
      data,
    };

    let dado;

    try {
      await axios(config).then(function (response) {
        dado = response.data;
      });
    } catch (err) {
      console.log(err);
      throw new BadRequestException('Error during IPFS upload', {
        cause: new Error(),
        description: 'Error during IPFS upload',
      });
    }

    const ipfsHash = dado.IpfsHash;

    console.log('JSON uploaded to IPFS with hash', ipfsHash);

    return ipfsHash;
  }

  async uploadIPFSMetadataTaskSubmission(
    data: UploadIPFSMetadataTaskSubmissionDTO,
  ) {
    const config = {
      method: 'post',
      url: `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretApiKey,
        'Content-Type': 'application/json',
      },
      data,
    };

    let dado;

    try {
      await axios(config).then(function (response) {
        dado = response.data;
      });
    } catch (err) {
      console.log(err);
      throw new BadRequestException('Error during IPFS upload', {
        cause: new Error(),
        description: 'Error during IPFS upload',
      });
    }

    const ipfsHash = dado.IpfsHash;

    console.log('JSON uploaded to IPFS with hash', ipfsHash);

    return ipfsHash;
  }

  async uploadIPFSMetadataTaskSubmissionRevision(
    data: UploadIPFSMetadataTaskSubmissionRevisionDTO,
  ) {
    const config = {
      method: 'post',
      url: `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretApiKey,
        'Content-Type': 'application/json',
      },
      data,
    };

    let dado;

    try {
      await axios(config).then(function (response) {
        dado = response.data;
      });
    } catch (err) {
      console.log(err);
      throw new BadRequestException('Error during IPFS upload', {
        cause: new Error(),
        description: 'Error during IPFS upload',
      });
    }

    const ipfsHash = dado.IpfsHash;

    console.log('JSON uploaded to IPFS with hash', ipfsHash);

    return ipfsHash;
  }

  //updates a single task
  // async updateSingleTaskData(id: number) {
  //   console.log('getting a updated task');
  //   const walletEther = new ethers.Wallet(this.viewPrivateKey);
  //   const connectedWallet = walletEther.connect(this.web3Provider);
  //   const newcontract = new ethers.Contract(
  //     this.taskContractAddress,
  //     taskContractABI,
  //     this.web3Provider,
  //   );

  //   const contractSigner = await newcontract.connect(connectedWallet);

  //   const tasks = [];

  //   let taskMetadata;
  //   await contractSigner.getTask(id).then(function (response) {
  //     taskMetadata = response; //-> response example: [  'QmX8MeaSR16FEmk6YxRfFJjgSNf5B7DJHDRvLhCcqNhSSv',  BigNumber { _hex: '0x64b9ca80', _isBigNumber: true },  BigNumber { _hex: '0x64b16a58', _isBigNumber: true },  BigNumber { _hex: '0x00', _isBigNumber: true },  0,  '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',  0,  '0x12be7EDC6829697B880EE949493fe81D15ADdB7c',  [    [      '0x6eFbB027a552637492D827524242252733F06916',      [BigNumber],      tokenContract: '0x6eFbB027a552637492D827524242252733F06916',       amount: [BigNumber]    ]  ],  [],  [],  [],  [],  [],  metadata: 'QmX8MeaSR16FEmk6YxRfFJjgSNf5B7DJHDRvLhCcqNhSSv',        deadline: BigNumber { _hex: '0x64b9ca80', _isBigNumber: true },    creationTimestamp: BigNumber { _hex: '0x64b16a58', _isBigNumber:   ],  applications: [],  submissions: [],  changeScopeRequests: [],  dropExecutorRequests: [],  cancelTaskRequests: []]
  //     tasks.push(taskMetadata);
  //   });

  //   console.log('the response');
  //   console.log(taskMetadata);

  //   const tasksWithMetadata = [];

  //   const ipfsRes = await this.getDataFromIPFS(
  //     tasks[0][0],
  //     id,
  //     tasks[0][1],
  //     tasks[0][7],
  //     tasks[0][5],
  //   );
  //   console.log('ipfs respondido');
  //   console.log(ipfsRes);
  //   if (ipfsRes) {
  //     //adding the applications, since its a data from the smart-contracts and not from the ipfs metadata:
  //     console.log('the task2');
  //     console.log(tasks);
  //     ipfsRes['applications'] = JSON.stringify(tasks[0][8]);
  //     console.log('pushing data');
  //     tasksWithMetadata.push(ipfsRes);
  //     console.log('pushed');
  //   }
  //   console.log('receiving links');
  //   for (const task of tasksWithMetadata) {
  //     let finalLinkAsStrings = [];
  //     if (task['links'] && task['links'].length > 0) {
  //       finalLinkAsStrings = task['links'].map((dataItem) =>
  //         JSON.stringify(dataItem),
  //       );
  //     }
  //     const existingTask = await this.prisma.task.findUnique({
  //       where: { taskId: String(task['id']) },
  //       include: { payments: true },
  //     });

  //     const skillsSearch = task['skills'].join(' '); //parameter mandatory to execute case insensitive searchs on the database

  //     await this.prisma.task.upsert({
  //       where: { taskId: String(task['id']) },
  //       update: {
  //         deadline: task['deadline'],
  //         description: task['description'],
  //         file: task['file'],
  //         links: finalLinkAsStrings,
  //         payments: {
  //           create: task['payments'],
  //         },
  //         estimatedBudget: task['estimatedBudget'],
  //         contributorsNeeded: task['numberOfApplicants'],
  //         projectLength: task['projectLength'],
  //         skills: task['skills'],
  //         applications: task['applications'],
  //         skillsSearch,
  //         status: String(task['status']),
  //         title: task['title'],
  //         departament: task['departament'],
  //         type: task['type'],
  //       },
  //       create: {
  //         taskId: String(task['id']),
  //         deadline: task['deadline'],
  //         description: task['description'],
  //         file: task['file'],
  //         links: finalLinkAsStrings,
  //         payments: {
  //           create: task['payments'],
  //         },
  //         estimatedBudget: task['estimatedBudget'],
  //         contributorsNeeded: task['numberOfApplicants'],
  //         projectLength: task['projectLength'],
  //         skills: task['skills'],
  //         applications: task['applications'],
  //         skillsSearch,
  //         status: String(task['status']),
  //         title: task['title'],
  //         departament: task['departament'],
  //         type: task['type'],
  //       },
  //     });

  //     await this.updatePreapprovedApplicationsFromTask(
  //       task['id'],
  //       JSON.parse(ipfsRes['applications']),
  //     );
  //     // await this.applicationsFromTask(task['id']);
  //   }
  //   return tasksWithMetadata;
  // }

  async getTasks(data: GetTasksDto) {
    const {
      departament,
      status,
      deadlineSorting,
      estimatedBudgetSorting,
      searchBar,
      page = 1,
      limit = 10,
    } = data;

    const skip = (page - 1) * limit;

    let orderBy = {};
    if (deadlineSorting && !estimatedBudgetSorting) {
      orderBy = {
        deadline: deadlineSorting === 'newest' ? 'desc' : 'asc',
      };
    }

    if (estimatedBudgetSorting) {
      orderBy = {
        estimatedBudget: estimatedBudgetSorting === 'greater' ? 'desc' : 'asc',
        ...orderBy, // Caso deadlineSorting também esteja definido, será de menor prioridade
      };
    }

    const where = {};

    if (departament) {
      where['departament'] = departament;
    }

    if (status) {
      where['status'] = status;
    }

    if (searchBar) {
      where['OR'] = [
        {
          title: {
            contains: searchBar,
            mode: 'insensitive',
          },
        },
        {
          skillsSearch: {
            contains: searchBar,
            mode: 'insensitive',
          },
        },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      select: {
        id: true,
        taskId: true,
        proposalId: true,
        isDraft: true,
        status: true,
        title: true,
        description: true,
        deadline: true,
        departament: true,
        skills: true,
        taskTaken: true,
        estimatedBudget: true,
        projectLength: true,
        contributorsNeeded: true,
        type: true,
        payments: {
          select: {
            tokenContract: true,
            amount: true,
            decimals: true,
          },
        },
      },
      where,
      orderBy,
      skip,
      take: limit,
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
    const draftTaskCount = await getTaskCountForStatus('3');

    const totalTasks = await this.prisma.task.count({
      where,
    });

    const totalPages = Math.ceil(totalTasks / limit);

    const finalTasks = tasks.map((task) => {
      const { id, taskId, status, deadline, ...rest } = task;

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
        internalId: id,
        id: Number(taskId),
        status: this.statusOptions[status],
        deadline,
        daysLeft,
        ...rest,
      };
    });

    return {
      tasks: finalTasks,
      counting: {
        open: openTaskCount,
        active: activeTaskCount,
        completed: completedTaskCount,
        draft: draftTaskCount,
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalTasks,
        limit,
      },
    };
  }

  async getTask(data: GetTaskDto) {
    const task = await this.prisma.task.findUnique({
      select: {
        taskId: true,
        status: true,
        title: true,
        engineersRequirement: true,
        description: true,
        deadline: true,
        departament: true,
        contributorsNeeded: true,
        executor: true,
        creator: true,
        manager: true,
        projectLength: true,
        links: true,
        hasSpamLink: true,
        skills: true,
        estimatedBudget: true,
        contributors: true,
        metadataEdited: true,
        budgetIncreased: true,
        deadlineIncreased: true,
        type: true,
        payments: {
          select: {
            tokenContract: true,
            amount: true,
            decimals: true,
          },
        },
        Application: true,
        ApplicationOffChain: {
          include: {
            openmeshExpertUser: {
              select: {
                companyName: true,
                createdAt: true,
                description: true,
                email: true,
                firstName: true,
                lastName: true,
                githubLink: true,
                isCompany: true,
                tags: true,
                profilePictureHash: true,
                website: true,
                foundingYear: true,
                location: true,
              },
            },
          },
        },
        Submission: true,
      },
      where: {
        taskId: data.id,
      },
    });

    if (task && task.links && Array.isArray(task.links)) {
      task.links = task.links.map((link) => JSON.parse(link));
    }

    if (task && task.contributors && Array.isArray(task.contributors)) {
      task.contributors = task.contributors.map((contributor) =>
        JSON.parse(contributor),
      );
    }

    //fazer aqui o tratamento do applications:
    if (task && task.Application && Array.isArray(task.Application)) {
      task.Application = await Promise.all(
        task.Application.map(async (application) => {
          //getting the user name and image profile
          const userProfile = await this.prisma.user.findFirst({
            where: { address: application.applicant },
          });
          if (userProfile) {
            application['profileImage'] = userProfile.profilePictureHash;
            application['profileName'] = userProfile.name;
          }
          if (application.reward && Array.isArray(application.reward)) {
            application.reward = application.reward.map((rewardString) => {
              try {
                return JSON.parse(rewardString);
              } catch (error) {
                console.error('Erro ao fazer o parse de reward:', error);
                return rewardString; // Retorna o original se houver erro no parse
              }
            });
          }
          return application;
        }),
      );
    }

    //fazer aqui o tratamento dos submissions:
    if (task && task.Submission && Array.isArray(task.Submission)) {
      task.Submission = await Promise.all(
        task.Submission.map(async (submission) => {
          //getting the user name and image profile
          const userProfile = await this.prisma.user.findFirst({
            where: { address: submission.applicant },
          });
          if (userProfile) {
            submission['profileImage'] = userProfile.profilePictureHash;
            submission['profileName'] = userProfile.name;
          }

          return submission;
        }),
      );
    }

    if (!task) {
      throw new BadRequestException('Task not found', {
        cause: new Error(),
        description: 'Task not found',
      });
    }

    const { taskId, status, deadline, ...rest } = task;

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

    //getting events to know how many updates there are
    const updatesCount = await this.prisma.event.findMany({
      where: {
        taskId: data.id,
      },
    });

    const applicationsOffChainCount =
      await this.prisma.applicationOffChain.findMany({
        where: {
          taskId: data.id,
        },
      });

    return {
      id: Number(taskId),
      status: this.statusOptions[status],
      updatesCount: updatesCount.length + applicationsOffChainCount.length,
      deadline,
      daysLeft,
      ...rest,
    };
  }

  async getDraftTask(data: GetTaskDto) {
    console.log('fue hamado');
    const task = await this.prisma.task.findUnique({
      select: {
        proposalId: true,
        status: true,
        title: true,
        engineersRequirement: true,
        description: true,
        deadline: true,
        departament: true,
        contributorsNeeded: true,
        executor: true,
        projectLength: true,
        links: true,
        skills: true,
        estimatedBudget: true,
        contributors: true,
        type: true,
        startDate: true,
        endDate: true,
        aragonMetadata: true,
        isDraft: true,
        payments: {
          select: {
            tokenContract: true,
            amount: true,
            decimals: true,
          },
        },
      },
      where: {
        id: data.id,
      },
    });

    if (task && task.links && Array.isArray(task.links)) {
      task.links = task.links.map((link) => JSON.parse(link));
    }

    if (task && task.contributors && Array.isArray(task.contributors)) {
      task.contributors = task.contributors.map((contributor) =>
        JSON.parse(contributor),
      );
    }

    if (!task) {
      throw new BadRequestException('Task not found', {
        cause: new Error(),
        description: 'Task not found',
      });
    }

    if (!task.isDraft) {
      throw new BadRequestException('Task not found', {
        cause: new Error(),
        description: 'Task not found',
      });
    }

    const { proposalId, status, deadline, ...rest } = task;

    //here do the "days left" flow:
    let daysLeft;
    const now = Date.now();
    const deadlineDay = Number(task.endDate) * 1000;
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

    //getting events to know how many updates there are
    const updatesCount = await this.prisma.event.findMany({
      where: {
        taskId: data.id,
      },
    });

    const applicationsOffChainCount =
      await this.prisma.applicationOffChain.findMany({
        where: {
          taskId: data.id,
        },
      });

    return {
      proposalId: proposalId,
      status: this.statusOptions[status],
      updatesCount: updatesCount.length + applicationsOffChainCount.length,
      deadline,
      daysLeft,
      ...rest,
    };
  }

  //returns if the user is allowed to vote and if its already voted for the task etc.
  async getUserToDraftTask(data: GetUserToDraftTaskDto) {
    const draftVotingExists = await this.prisma.draftVote.findFirst({
      where: {
        address: data.address,
        id_task: data.id,
      },
    });

    const task = await this.prisma.task.findFirst({
      where: {
        id: data.id,
      },
    });

    //getting the departament of the task:
    const departament = await this.prisma.departament.findFirst({
      where: {
        name: task.departament,
      },
    });

    const userExists = await this.prisma.user.findFirst({
      where: {
        address: data.address,
      },
      include: {
        VerifiedContributorSubmission: true,
        VerifiedContributorToken: true,
      },
    });
    if (userExists) {
      let isVerifiedContributor = false;
      let verifiedContributorTokenId = null;

      // Encontre o primeiro VerifiedContributorToken que contém o endereço desejado em departamentList
      const verifiedContributorToken =
        await this.prisma.verifiedContributorToken.findFirst({
          where: {
            departamentList: {
              has: departament.addressTokenListGovernance,
            },
            userId: userExists.id,
          },
        });

      if (verifiedContributorToken) {
        isVerifiedContributor = true;
        verifiedContributorTokenId = verifiedContributorToken.tokenId;
      }

      return {
        isVerifiedContributor,
        alreadyVoted: draftVotingExists ? true : false,
        voteOption: draftVotingExists?.voteOption,
        verifiedContributorToken: verifiedContributorTokenId, // Retorna o tokenId aqui
      };
    } else {
      return {
        isVerifiedContributor: false,
        alreadyVoted: false,
      };
    }
  }

  async getTaskEvents(data: GetTaskDto) {
    const events = await this.prisma.event.findMany({
      where: {
        taskId: data.id,
      },
    });
    const offChainApplications = await this.prisma.applicationOffChain.findMany(
      {
        where: {
          taskId: data.id,
        },
        include: {
          openmeshExpertUser: {
            select: {
              companyName: true,
              createdAt: true,
              description: true,
              email: true,
              firstName: true,
              lastName: true,
              githubLink: true,
              isCompany: true,
              tags: true,
              profilePictureHash: true,
              website: true,
              foundingYear: true,
              location: true,
            },
          },
        },
      },
    );
    return [...events, ...offChainApplications];
  }

  //Returns all tasks events
  async getTasksEvents() {
    const events = await this.prisma.event.findMany();
    const offChainApplications = await this.prisma.applicationOffChain.findMany(
      {
        include: {
          openmeshExpertUser: {
            select: {
              companyName: true,
              createdAt: true,
              description: true,
              email: true,
              firstName: true,
              lastName: true,
              githubLink: true,
              isCompany: true,
              tags: true,
              profilePictureHash: true,
              website: true,
              foundingYear: true,
              location: true,
            },
          },
        },
      },
    );
    return [...events, ...offChainApplications];
  }

  // FUNCTIONS
  //get the task metadata
  //example metadata: QmX8MeaSR16FEmk6YxRfFJjgSNf5B7DJHDRvLhCcqNhSSv
  async getDataFromIPFS(
    hash: string,
    taskId: number,
    deadline: number,
    paymentsInfo: any,
    state: number,
  ) {
    console.log('a task');
    console.log(taskId);
    const url = `${this.ipfsBaseURL}/${hash}`;
    console.log('a url');
    console.log(url);

    //getting payment info directly from blockchain
    console.log('getting payment info directly from blockchain');
    console.log(paymentsInfo);

    let res;
    await axios
      .get(url)
      .then(async (response) => {
        console.log('the metadata:');
        console.log(response.data);
        const payments = await this.utilsService.getDecimalsFromPaymentsToken(
          paymentsInfo,
        );
        response.data.payments = payments;
        response.data['estimatedBudget'] =
          await this.utilsService.getEstimateBudgetToken(payments);
        response.data.id = String(taskId);
        response.data.deadline = String(deadline);
        response.data.status = String(state);
        console.log(`the metadata data`);
        console.log(response.data);
        res = response.data;
      })
      .catch(async (err) => {
        console.log('erro ocorreu get ipfs');
        const response = await this.recallGetDataFromIPFS(hash);
        console.log('the metadata:');
        console.log(response);
        const payments = await this.utilsService.getDecimalsFromPaymentsToken(
          paymentsInfo,
        );
        response.payments = payments;
        response['estimatedBudget'] =
          await this.utilsService.getEstimateBudgetToken(payments);
        response.id = String(taskId);
        response.deadline = String(deadline);
        response.status = String(state);
        console.log(`the metadata data`);
        console.log(response);
        res = response;
      });
    return res;
  }

  //get the application metadata
  async getApplicationDataFromIPFS(hash: string) {
    const url = `${this.ipfsBaseURL}/${hash}`;
    console.log(url);
    let res;
    await axios
      .get(url)
      .then(async (response) => {
        console.log('the metadata:');
        console.log(response.data);
        res = response.data;
      })
      .catch(async (err) => {
        console.log('erro happened');
        res = await this.recallGetDataFromIPFS(hash);
      });
    return res;
  }

  //get the submission metadata
  async getSubmissionDataFromIPFS(hash: string) {
    const url = `${this.ipfsBaseURL}/${hash}`;
    console.log(url);
    let res;
    await axios
      .get(url)
      .then(async (response) => {
        console.log('the metadata submission:');
        console.log(response.data);
        res = response.data;
      })
      .catch(async (err) => {
        console.log('erro happened on submission');
        res = await this.recallGetDataFromIPFS(hash);
      });
    return res;
  }

  //function to recall if first IPFS provider is down
  async recallGetDataFromIPFS(hash: string) {
    console.log('recall IPFS called');
    const url = `${this.recallIpfsBaseURL}/${hash}`;
    console.log(url);
    let res;
    await axios
      .get(url)
      .then(async (response) => {
        console.log('the metadata:');
        console.log(response.data);
        res = response.data;
      })
      .catch(async (err) => {
        console.log('erro happened on recall ipfs get data');
      });
    return res;
  }

  //example of payment:   "payments": [    {      "tokenContract": "0x6eFbB027a552637492D827524242252733F06916",      "amount": "1000000000000000000",  "decimals": "18"    }  ],
  async getEstimateBudgetToken(payments) {
    let budget = '0';
    if (this.environment === 'PROD') {
      try {
        for (let i = 0; i < payments.length; i++) {
          //if its a weth token, get the price, else it is a stable coin 1:1 so the valueToken should be 1;
          let valueToken = '1';
          if (payments[i].tokenContract === this.wEthTokenAddress) {
            // eslint-disable-next-line prettier/prettier
            valueToken = String(await this.utilsService.getWETHPriceTokensFromChailink(this.priceFeedETHUSDAddress,));
          }

          const totalTokens = new Decimal(payments[i].amount).div(
            new Decimal(new Decimal(10).pow(new Decimal(payments[i].decimals))),
          );
          budget = new Decimal(budget)
            .plus(new Decimal(totalTokens).mul(new Decimal(valueToken)))
            .toFixed(2);
        }
      } catch (err) {
        console.log('error catching estimated budget value');
        console.log(err);
      }
    } else {
      try {
        console.log('doing estimated budget here');
        //if its a dev environment, just consider every token to be a stablecoin 1:1
        for (let i = 0; i < payments.length; i++) {
          const totalTokens = new Decimal(payments[i].amount).div(
            new Decimal(new Decimal(10).pow(new Decimal(payments[i].decimals))),
          );
          console.log('total tokens');
          console.log(totalTokens);
          budget = new Decimal(budget)
            .plus(new Decimal(totalTokens))
            .toFixed(2);
        }
      } catch (err) {
        console.log('error catching estimated budget value here');
        console.log(err);
      }
    }
    console.log('budget to return');
    console.log('budget');
    return budget;
  }

  async getDecimalsFromPaymentsToken(payments) {
    console.log('getting decimals');
    console.log(payments);
    const newPayments = [...payments]; // creating a copy of the payments

    const walletEther = new ethers.Wallet(this.viewPrivateKey);
    const connectedWallet = walletEther.connect(this.web3Provider);

    for (let i = 0; i < payments.length; i++) {
      const newcontract = new ethers.Contract(
        payments[i].tokenContract,
        erc20ContractABI,
        this.web3Provider,
      );
      const contractSigner = await newcontract.connect(connectedWallet);

      let decimals = null;
      await contractSigner.decimals().then(function (response) {
        decimals = response;
      });
      console.log('the decimal from token:');
      console.log(decimals);
      if (decimals) {
        newPayments[i].decimals = String(Number(decimals)); // modifying the copy
      }
    }
    // returning the state with the correctly decimals
    return newPayments;
  }

  //Query the events log to get all the applications from a task and store it on database
  async applicationsFromTask(id: number) {
    console.log(id);
    const newcontract = new ethers.Contract(
      this.taskContractAddress,
      taskContractABI,
      this.web3Provider,
    );

    const filter = await newcontract.filters.ApplicationCreated();

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
    const events = logs.map((log) => {
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

    const filteredEvents = events.filter((event) => event.args.taskId.eq(id)); //[  {    name: 'ApplicationCreated',    args: [      [BigNumber],      0,      'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      [Array],      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      taskId: [BigNumber],      applicationId: 0,      metadata: 'QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt',      reward: [Array],      proposer: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',      applicant: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170'    ],    signature: 'ApplicationCreated(uint256,uint16,string,(bool,address,uint88)[],address,address)',    topic: '0x7dea79221549b396f31442a220505470acfcfd38f772b6b3faa676d25df5998d',    blockNumber: 38426300,    timestamp: 1690664419  }]

    // Define a cache for timestamps
    const timestampCache = {};

    const finalEvents = [];
    console.log('getting events');
    // Get block data for each event
    for (const event of filteredEvents) {
      const applicationExists = await this.prisma.application.findFirst({
        where: {
          taskId: String(id),
          applicationId: String(event['args'][1]),
        },
      });
      if (!applicationExists) {
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

        console.log('getting metadata if its exists 11');
        let metadataData;
        try {
          if (String(event['args'][2]).length > 0) {
            metadataData = await this.getApplicationDataFromIPFS(
              String(event['args'][2]),
            );
          }
        } catch (err) {
          console.log('not found metadata valid');
        }
        finalEvents.push({
          taskId: String(id),
          applicationId: String(event['args'][1]),
          metadata: String(event['args'][2]),
          reward: event['reward'] || [],
          proposer: event['args'][4],
          applicant: event['args'][5],
          metadataDescription: metadataData?.description || '',
          metadataProposedBudget:
            String(metadataData?.budgetPercentageRequested) || '',
          metadataAdditionalLink: metadataData?.additionalLink || '',
          metadataDisplayName: metadataData?.displayName || '',
          timestamp: event['timestamp'],
          transactionHash: event['transactionHash'],
          blockNumber: String(event['blockNumber']),
        });
      }
    }

    console.log('creating application events');
    console.log(finalEvents);
    await this.prisma.application.createMany({
      data: finalEvents,
    });

    console.log(filteredEvents);
  }

  async getSubmission(data: GetSubmissionDto) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: data.id,
      },
    });
    if (!submission) {
      throw new BadRequestException('Submission not found', {
        cause: new Error(),
        description: 'Submission not found',
      });
    }
    const task = await this.prisma.task.findUnique({
      select: {
        taskId: true,
        status: true,
        title: true,
        description: true,
        deadline: true,
        departament: true,
        contributorsNeeded: true,
        executor: true,
        creator: true,
        manager: true,
        projectLength: true,
        links: true,
        skills: true,
        estimatedBudget: true,
        contributors: true,
        type: true,
        payments: {
          select: {
            tokenContract: true,
            amount: true,
            decimals: true,
          },
        },
        Application: true,
      },
      where: {
        taskId: submission.taskId,
      },
    });

    if (task && task.links && Array.isArray(task.links)) {
      task.links = task.links.map((link) => JSON.parse(link));
    }

    if (task && task.contributors && Array.isArray(task.contributors)) {
      task.contributors = task.contributors.map((contributor) =>
        JSON.parse(contributor),
      );
    }

    if (!task) {
      throw new BadRequestException('Task not found', {
        cause: new Error(),
        description: 'Task not found',
      });
    }

    const { taskId, status, deadline, ...rest } = task;

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

    //getting events to know how many updates there are
    const updatesCount = await this.prisma.event.findMany({
      where: {
        taskId: data.id,
      },
    });

    const applicationsOffChainCount =
      await this.prisma.applicationOffChain.findMany({
        where: {
          taskId: data.id,
        },
      });

    return {
      task: {
        id: Number(taskId),
        status: this.statusOptions[status],
        updatesCount: updatesCount.length + applicationsOffChainCount.length,
        deadline,
        daysLeft,
        ...rest,
      },
      submission,
    };
  }

  //Everytime an user submit an application, its necessary to calculate, based on the percentage of the estimated budget he is asking for, how many tokens this application will request.
  async getTokensNecessaryToFillRequest(
    data: GetTokensNecessaryToFillRequestDTO,
  ) {
    const task = await this.prisma.task.findUnique({
      select: {
        taskId: true,
        payments: {
          select: {
            tokenContract: true,
            amount: true,
            decimals: true,
          },
        },
      },
      where: {
        taskId: data.id,
      },
    });

    if (!task) {
      throw new BadRequestException('Task not found', {
        cause: new Error(),
        description: 'Task not found',
      });
    }

    const budget = await this.utilsService.getEstimateBudgetToken(
      task.payments,
    );
    console.log('budget task');
    console.log(budget);

    //if its more than 100 percentage of the budget, calculate how many tokens need to be added
    if (data.percentage > 100) {
      console.log('sum');
      const amountToBeIncreased =
        ((data.percentage - 100) / 100) * Number(budget);
      //now its necessary to equally distribute this amount within the tokens:
      const amountToBeIncreasedPerToken =
        amountToBeIncreased / task.payments.length;
      console.log('amount to be increased by token');
      console.log(amountToBeIncreasedPerToken);
      for (let i = 0; i < task.payments.length; i++) {
        const tokenValue = await this.getTokenValue(
          task.payments[i].tokenContract,
        );
        console.log('token value');
        console.log(tokenValue);
        const finalTokenQuantity =
          (amountToBeIncreasedPerToken *
            10 ** Number(task.payments[i].decimals)) /
          tokenValue;
        console.log('finalTokenQuantity');
        console.log(finalTokenQuantity);
        task.payments[i].amount = String(
          Number(task.payments[i].amount) + finalTokenQuantity,
        );
      }
    } else if (data.percentage < 100) {
      console.log('decrease');
      //if its less than 100 percentage of the budget, calculate how many tokens need to be removed
      const amountToBeRemoved =
        ((100 - data.percentage) / 100) * Number(budget);
      //now its necessary to equally distribute this amount within the tokens:
      const amountToBeRemovedPerToken =
        amountToBeRemoved / task.payments.length;
      for (let i = 0; i < task.payments.length; i++) {
        const tokenValue = await this.getTokenValue(
          task.payments[i].tokenContract,
        );
        const finalTokenQuantity =
          (amountToBeRemovedPerToken *
            10 ** Number(task.payments[i].decimals)) /
          tokenValue;
        // eslint-disable-next-line prettier/prettier
        task.payments[i].amount = String(Number(task.payments[i].amount) - finalTokenQuantity);
      }
    }

    return {
      payments: task.payments,
    };
  }

  async getTokenValue(address: string): Promise<number> {
    let budget = 0;
    if (this.environment === 'PROD') {
      try {
        //if its a weth token, get the price, else it is a stable coin 1:1 so the valueToken should be 1;
        if (address === this.wEthTokenAddress) {
          budget = await this.utilsService.getWETHPriceTokensFromChailink(
            this.priceFeedETHUSDAddress,
          );
        }
      } catch (err) {
        console.log('error catching estimated budget value');
        console.log(err);
      }
    } else {
      try {
        budget = 1;
      } catch (err) {
        console.log('error catching estimated budget value');
        console.log(err);
      }
    }
    console.log('budget to return');
    console.log('budget');
    return budget;
  }

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

  async createTaskApplicationWeb2(
    data: UploadMetadataTaskApplicationOffchainDTO,
    req: Request,
  ) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    const taskExists = await this.prisma.task.findFirst({
      where: {
        taskId: data.taskId,
      },
    });

    if (!taskExists) {
      throw new BadRequestException('Task not found', {
        cause: new Error(),
        description: 'Task not found',
      });
    }

    const applicationExists = await this.prisma.applicationOffChain.findFirst({
      where: {
        taskId: data.taskId,
        openmeshExpertUserId: user.id,
      },
    });

    if (applicationExists) {
      throw new BadRequestException(
        'Already exists an application for this user',
        {
          cause: new Error(),
          description: 'Already exists an application for this user',
        },
      );
    }
    console.log('trying now application 1290');
    const application = await this.prisma.applicationOffChain.create({
      data: {
        openmeshExpertUserId: user.id,
        taskId: data?.taskId,
        metadataDisplayName: data?.displayName,
        metadataDescription: data?.description,
        metadataAdditionalLink: JSON.stringify(data?.links),
        metadataProposedBudget: JSON.stringify(data?.budgetPercentageRequested),
        timestamp: String(Date.now() / 1000),
      },
    });

    return application;
  }

  //FUNDRAISING FUNCTIONS:

  //GET HOW MANY ETHERS WERE TRANSFERED TO THE CONTRACT:
  async getFundraisingInfo() {
    //here it is utilizyng the network polygon, but probably it will be ethereum
    const balanceWei = await this.web3ProviderFundraising.getBalance(
      this.fundraisingContractAddress,
    );
    const balanceInEther = ethers.utils.formatEther(balanceWei);

    console.log(balanceInEther);
    return Number(balanceInEther);
  }

  //GET ethereum sends to contract
  async getFundraisingTransactions() {
    const etherscanProvider = new ethers.providers.EtherscanProvider('sepolia');

    const finalTransactions = await etherscanProvider.getHistory(
      this.fundraisingContractAddress,
    );

    for (let i = 0; i < finalTransactions.length; i++) {
      finalTransactions[i]['valueFormatted'] = ethers.utils.formatEther(
        finalTransactions[i].value,
      );
    }
    return finalTransactions;
  }
}
