/* eslint-disable prefer-const */
import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as path from 'path';
import * as Papa from 'papaparse';
import * as fs from 'fs';

// import { import_ } from '@brillout/import';
import { ethers } from 'ethers';
import * as taskContractABI from '../contracts/taskContractABI.json';
import * as erc20ContractABI from '../contracts/erc20ContractABI.json';

import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import {
  KeyObject,
  createHmac,
  createSecretKey
} from 'crypto' // NodeJS native crypto lib

import { PrismaService } from '../database/prisma.service';
import { Request, response } from 'express';
import axios from 'axios';
import { UtilsService } from '../utils/utils.service';
import { OpenmeshExpertsAuthService } from 'src/openmesh-experts/openmesh-experts-auth.service';
import {
  ConnectAPI,
  CreateXnodeDto,
  XnodeHeartbeatDto,
  GetXnodeDto,
  GetXnodeServiceDto,
  StoreXnodeData,
  StoreXnodeSigningMessageDataDTO,
  UpdateXnodeDto,
} from './dto/xnodes.dto';
import { XnodeUnitContract } from 'src/contracts/XunitContractABI';
import { features } from 'process';
import {
  defaultSourcePayload,
  defaultStreamProcessorPayload,
  defaultWSPayload,
} from './utils/constants';
import { generateUUID8, generateUUID16 } from './utils/uuidGenerator';

@Injectable()
export class XnodesService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly utilsService: UtilsService, Unused
    private readonly openmeshExpertsAuthService: OpenmeshExpertsAuthService,
  ) {}
  web3UrlProvider = process.env.WEB3_URL_PROVIDER;
  web3Provider = new ethers.providers.JsonRpcProvider(this.web3UrlProvider);
  XUContractAddr = process.env.XU_NFT_CONTRACT_ADDRESS;
  XuContractConnect = new ethers.Contract(
    this.XUContractAddr,
    JSON.stringify(XnodeUnitContract),
    this.web3Provider,
  );
  XU_CONTROLLER_URL = process.env.XU_CONTROLLER_URL;
  XU_CONTROLLER_KEY = process.env.XU_CONTROLLER_KEY;

  async createXnode(dataBody: CreateXnodeDto, req: Request) {
    const sessionToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      sessionToken,
    );

    const deployments = await this.prisma.deployment.findMany({
      where: {
        openmeshExpertUserId: user.id,
      },
    });

    // XXX: Handle more elegantly? Maybe offer user the chance to delete Xnodes.
    // This actually works OK for now. Just important to note.
    if (deployments.length > 100) {
      throw new BadRequestException('Xnode limit reached', {
        cause: new Error(),
        description: 'Xnode deployment limit of 100 reached',
      });
    }
    // INPUT VALIDATION, dataBody is XnodeDto
    
    const { services, ...dataNode } = dataBody; 

    // A whitelist of addresses for testing, want to be safe and make sure only people we trust can run before the official launch on Wednesday.
    const whitelist = [
      `0xc2859E9e0B92bf70075Cd47193fe9E59f857dFA5`,
      `0x99acBe5d487421cbd63bBa3673132E634a6b4720`,
      `0x7703d5753C54852D4249F9784A3e8A6eeA08e1dD`,
      `0xA4a336783326241acFf520D91eb8841Ad3B9BD1a`,
    ];
    let isWhitelisted = false;
    for (let address of whitelist) {
      if (user.web3Address == address) {
        isWhitelisted = true;
      }
    }
    if (!isWhitelisted) {
      throw new Error("Not whitelisted, stay posted on our social media for the official launch.");
    }

    console.log('Final services:');
    console.log(services);

    // This token is for the admin service on the Xnode to identify itself for read requests/heartbeats.
    // Will be replaced with PSK + HMAC at some point.
    let xnodePresharedKey: KeyObject;
    require('crypto').randomBytes(64, function(err, buffer) {
      let randomBytes = buffer.toString('hex');
      xnodePresharedKey = createSecretKey(randomBytes, 'hex');
    }); // TODO: handle err on creation of key
    let xnodeAccessToken = xnodePresharedKey.export().toString();

    // Add the xnode deployment to our database.
    const xnode = await this.prisma.deployment.create({
      data: {
        id: generateUUID16(),
        accessToken: xnodeAccessToken,
        openmeshExpertUserId: user.id,
        isUnit: dataNode.isUnit,
        deployment_auth: dataNode.deployment_auth, // INPUT VALIDATION BEFORE WRITE TO DB!
        ...dataNode,
      },
    });

    console.log('Added Xnode to the database');

    if (xnode.isUnit) {
      // XXX: Further testing is required.
      // TODO (Harsh): Check that xnode.nftId is valid here!
      let nftOwner = this.XuContractConnect.eth.ownerOf(xnode.deployment_auth); // STUB
      if(nftOwner != user.walletAddress) {
        throw new Error(`You don't own the NFT`);
      }
      let allowedTokenIdChars = "0123456789" // Must be uint256
      for (let char of xnode.deployment_auth) {
        if (!allowedTokenIdChars.includes(char)) {
          throw new Error(`Invalid NFT TokenId`);
        }
      }
      let tokenId = xnode.deployment_auth

      // Talk to the unit controller API. - Needs refactoring
      let controller_url = this.XU_CONTROLLER_URL; // make this an env variable
      let headers: Headers = new Headers();
      headers.set(`Authorization`, `Bearer ` + this.XU_CONTROLLER_KEY);
      let jsondata = JSON.stringify({
        // get the walletAddress for the user from prisma
        WalletAddress: user.walletAddress,
        XNODE_UUID: xnode.id,
        XNODE_ACCESS_TOKEN: xnode.accessToken,
      });
      // Attempt provisioning (should only be done once) XXX
      const provision_request: RequestInfo = new Request(controller_url, {
        method: `POST`,
        headers: headers,
        body: jsondata,
      });
      let provision_url = controller_url + "provision/" + tokenId;
      const response = await fetch(provision_url, provision_request);
      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }
      const provision_unit_response = await response.json();
      if (provision_unit_response == "Deployed into hivelocity") {
        xnode.provider = "hivelocity"; // Why?
        
      } else if (provision_unit_response == "Internal server error") {
        throw new Error(`Unable to provision Xnode Unit`);
      } else {
        console.log("Fatal provisioning error.");
      }
      console.log("Xnode deployed");

    } else { // !dataNode.isUnit
      // Deploy into a provider via api proxy?
    }

    return xnode;
  }

  async getXnodeServices(dataBody: GetXnodeServiceDto, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']); // Does not make sense, access token = session token?
    const node = await this.prisma.deployment.findFirst({
      where: {
        AND: [
          {
            id: dataBody.id,
          },
          {
            // Hmac validation
            accessToken: accessToken
          }
        ]
      }
    })

    return node.services
  }

  async pushXnodeHeartbeat(dataBody: XnodeHeartbeatDto, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']); // Rename session token to avoid confusion with browser sessions

    const { id, ...data} = dataBody;

    try {
      await this.prisma.deployment.updateMany({
        where: {
          AND: [
            {
              id: id,
            },
            {
            // Hmac validation              
              accessToken: accessToken
            }
          ]
        },
        data: {
          heartbeatData: JSON.stringify(data),
        }
      })
    } catch(err) {
      throw new BadRequestException('Failed to authenticate', {
        cause: new Error(),
        description: 'Couldn\'t authenticate Xnode / Xnode id is invalid.',
      });
    }
  }
  // TODO: Can get information from node_information/<xnode-unit-token-id>
  //async fetch_unit_information(deployment: ) {
    // STUB
  //}

  async updateXnode(dataBody: UpdateXnodeDto, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    const xnodes = await this.prisma.xnode.findFirst({
      where: {
        id: dataBody.xnodeId,
        openmeshExpertUserId: user.id,
      },
    });

    if (!xnodes) {
      throw new BadRequestException('Xnode not found', {
        cause: new Error(),
        description: 'Xnode not found',
      });
    }

    const { xnodeId, ...finalBody } = dataBody;

    return await this.prisma.xnode.update({
      data: {
        ...finalBody,
      },
      where: {
        id: xnodeId,
      },
    });
  }

  async getXnode(dataBody: GetXnodeDto, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    return await this.prisma.xnode.findFirst({
      where: {
        id: dataBody.id,
        openmeshExpertUserId: user.id,
      },
    });
  }

  async getXnodes(req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    return await this.prisma.deployment.findMany({
      where: {
        openmeshExpertUserId: user.id,
      },
    });
  }

  async getNodesValidatorsStats() {
    const nodesListing = await this.prisma.xnode.findMany({
      where: {
        type: 'validator',
      },
    });

    return {
      stats: {
        totalValidators: nodesListing.length,
        totalStakeAmount: 0,
        totalAverageReward: 0,
        averagePayoutPeriod: 'Every 7 days',
      },
      nodes: nodesListing,
    };
  }

  async getXnodeWithNodesValidatorsStats(data: GetXnodeDto) {
    const node = await this.prisma.xnode.findFirst({
      where: {
        id: data.id,
      },
      include: {
        XnodeClaimActivities: true,
      },
    });
    const nodesListing = await this.prisma.xnode.findMany({
      where: {
        type: 'validator',
      },
    });

    return {
      node: node,
      stats: {
        totalValidators: nodesListing.length,
        totalStakeAmount: 0,
        totalAverageReward: 0,
        averagePayoutPeriod: 'Every 7 days',
      },
      nodes: nodesListing,
    };
  }
  /*
  async storeXnodeData(data: StoreXnodeData) {
    console.log('the log data');

    console.log(data);
    const { buildId, ...finalData } = data;

    const buildIdExists = await this.prisma.xnode.findFirst({
      where: {
        buildId,
      },
    });

    if (!buildIdExists) {
      throw new BadRequestException('BuildId not found', {
        cause: new Error(),
        description: 'BuildId not found',
      });
    }
    console.log(data);

    //if you receive the data, it also means the node has been deployed succesfully
    return await this.prisma.xnode.updateMany({
      where: {
        buildId,
      },
      data: {
        status: 'Running',
        ...finalData,
      },
    });
  } */

  async storeXnodeSigningMessage(
    dataBody: StoreXnodeSigningMessageDataDTO,
    req: Request,
  ) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    const xnodeExists = await this.prisma.xnode.findFirst({
      where: {
        id: dataBody.xnodeId,
        openmeshExpertUserId: user.id,
      },
    });

    if (!xnodeExists)
      throw new BadRequestException(`Xnode not found`, {
        cause: new Error(),
        description: `Xnode not found`,
      });

    return await this.prisma.xnode.update({
      where: {
        id: dataBody.xnodeId,
      },
      data: {
        validatorSignature: dataBody.signedMessage,
      },
    });
  }

  async connectEquinixAPI(dataBody: ConnectAPI, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    // validating the equinix key:
    const config = {
      method: 'get',
      url: 'https://api.equinix.com/metal/v1/user',
      headers: {
        Accept: 'application/json',
        'X-Auth-Token': dataBody.apiKey,
      },
    };

    let data: any;

    try {
      await axios(config).then(function (response) {
        data = response.data;
      });
    } catch (err) {
      console.log(err.response.data.error);
      console.log(err.response);
      throw new BadRequestException(`Error validating api key`, {
        cause: new Error(),
        description: `${err.response.data.error}`,
      });
    }

    //if the api is valid, store in user account
    await this.prisma.openmeshExpertUser.update({
      where: {
        id: user.id,
      },
      data: {
        equinixAPIKey: dataBody.apiKey,
      },
    });

    return;
  }

  async connectValidationCloudAPIEthereum(dataBody: ConnectAPI, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    const dataBodyAPI = {
      jsonrpc: '2.0',
      method: 'eth_accounts',
      params: [],
      id: 1,
    };

    // validating the key:
    const config = {
      method: 'post',
      url: `https://mainnet.ethereum.validationcloud.io/v1/${dataBody.apiKey}`,
      headers: {
        Accept: 'application/json',
      },
      data: dataBodyAPI,
    };

    let dado;

    try {
      await axios(config).then(function (response) {
        dado = response.data;
      });
    } catch (err) {
      console.log(err.response.data.error);
      console.log(err.response);
      throw new BadRequestException(`Error validating api key`, {
        cause: new Error(),
        description: `${err.response.data.error}`,
      });
    }

    if (dado?.error) {
      throw new BadRequestException(`Error validating api key`, {
        cause: new Error(),
        description: `${dado?.error}`,
      });
    }

    //if the api is valid, store in user account
    await this.prisma.openmeshExpertUser.update({
      where: {
        id: user.id,
      },
      data: {
        validationCloudAPIKeyEthereum: dataBody.apiKey,
      },
    });

    return;
  }

  async connectValidationCloudAPIPolygon(dataBody: ConnectAPI, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    const dataBodyAPI = {
      jsonrpc: '2.0',
      method: 'eth_accounts',
      params: [],
      id: 1,
    };

    // validating the key:
    const config = {
      method: 'post',
      url: `https://mainnet.polygon.validationcloud.io/v1/${dataBody.apiKey}`,
      headers: {
        Accept: 'application/json',
      },
      data: dataBodyAPI,
    };

    let dado;

    try {
      await axios(config).then(function (response) {
        dado = response.data;
      });
    } catch (err) {
      console.log(err.response.data.error);
      console.log(err.response);
      throw new BadRequestException(`Error validating api key`, {
        cause: new Error(),
        description: `${err.response.data.error}`,
      });
    }

    if (dado?.error) {
      throw new BadRequestException(`Error validating api key`, {
        cause: new Error(),
        description: `${dado?.error}`,
      });
    }

    //if the api is valid, store in user account
    await this.prisma.openmeshExpertUser.update({
      where: {
        id: user.id,
      },
      data: {
        validationCloudAPIKeyPolygon: dataBody.apiKey,
      },
    });

    return;
  }

  async connectAivenAPI(dataBody: ConnectAPI, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    // validating the equinix key:
    const config = {
      method: 'get',
      url: 'https://api.aiven.io/v1/project',
      headers: {
        Accept: 'application/json',
        Authorization: `aivenv1 ${dataBody.apiKey}`,
      },
    };

    let data;

    try {
      await axios(config).then(function (response) {
        data = response.data;
      });
    } catch (err) {
      console.log(err.response.data.error);
      console.log(err.response);
      throw new BadRequestException(`Error validating api key`, {
        cause: new Error(),
        description: `${err.response.data.error}`,
      });
    }

    //validate if user is admin
    const keys = Object.keys(data?.project_membership);
    if (data?.project_membership[keys[0]] !== 'admin') {
      throw new BadRequestException(`project_membership is not an admin`, {
        cause: new Error(),
        description: `project_membership is not an admin`,
      });
    }

    //validate if it has server deployed with grafana:
    if (data.projects?.length === 0) {
      throw new BadRequestException(
        `User should have at least one project created`,
        {
          cause: new Error(),
          description: `User should have at least one project created`,
        },
      );
    }

    let getGrafanaURIParams = await this.getGrafanaServiceFromAivenAPI(
      data,
      dataBody.apiKey,
    );

    //if it does not have a grafana service data, just deploy a new one
    if (!getGrafanaURIParams) {
      getGrafanaURIParams = await this.deployGrafanaServiceFromAivenAPI(
        data,
        dataBody.apiKey,
      );
    }

    //if the api is valid, store in user account
    const upd = await this.prisma.openmeshExpertUser.update({
      where: {
        id: user.id,
      },
      data: {
        aivenAPIKey: dataBody.apiKey,
        aivenAPIServiceUriParams: JSON.stringify(getGrafanaURIParams),
      },
    });

    return upd;
  }

  async getGrafanaServiceFromAivenAPI(data: any, apiKey: string) {
    if (data?.projects.length === 0) {
      throw new BadRequestException(
        `A project was not found, make sure to create one.`,
        {
          cause: new Error(),
          description: `A project was not found, make sure to create one.`,
        },
      );
    }
    for (let i = 0; i < data?.projects.length; i++) {
      const projectName = data?.projects[i].project_name;

      // validating the equinix key:
      const config = {
        method: 'get',
        url: `https://api.aiven.io/v1/project/${projectName}/service`,
        headers: {
          Accept: 'application/json',
          Authorization: `aivenv1 ${apiKey}`,
        },
      };

      let dataRes;

      try {
        await axios(config).then(function (response) {
          dataRes = response.data;
        });
      } catch (err) {
        console.log(err.response.data.error);
        console.log(err.response);
        throw new BadRequestException(`Error getting services`, {
          cause: new Error(),
          description: `${err.response.data.error}`,
        });
      }

      if (dataRes?.services?.length > 0) {
        for (let j = 0; j < dataRes?.services.length; j++) {
          if (dataRes?.services[j].service_type === 'grafana') {
            return dataRes?.services[j].service_uri_params;
          }
        }
      }
    }
  }
  async deployGrafanaServiceFromAivenAPI(data: any, apiKey: string) {
    const databody = {
      cloud: 'do-syd',
      group_name: 'default',
      plan: 'startup-1',
      service_name: 'openmesh-grafana-123',
      service_type: 'grafana',
      project_vpc_id: null,
      user_config: {},
      tags: {},
    };
    for (let i = 0; i < data?.projects.length; i++) {
      const projectName = data?.projects[i].project_name;

      // validating the equinix key:
      const config = {
        method: 'post',
        url: `https://api.aiven.io/v1/project/${projectName}/service`,
        headers: {
          Accept: 'application/json',
          Authorization: `aivenv1 ${apiKey}`,
        },
        data: databody,
      };

      let dataRes;

      try {
        await axios(config).then(function (response) {
          dataRes = response.data;
        });
      } catch (err) {
        console.log(err.response.data.error);
        console.log(err.response);
      }

      if (dataRes?.service) {
        return dataRes.service.service_uri_params;
      }
    }

    // if no project works, just trhows error
    throw new BadRequestException('Grafana service deploy failed', {
      cause: new Error(),
      description: 'Grafana service deploy failed',
    });
  }

  async storeDb() {
    const data = await this.prisma.xnodeClaimActivities.findMany();
    const csv = Papa.unparse(data);

    const filePath = path.join(__dirname, 'xnodeClaimActivities.csv');
    fs.writeFileSync(filePath, csv);

    return { message: 'CSV file created', filePath };
  }
}
