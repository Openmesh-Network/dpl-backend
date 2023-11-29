/* eslint-disable prefer-const */
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

import Hex from 'crypto-js/enc-hex';
import hmacSHA1 from 'crypto-js/hmac-sha1';
import { createHmac } from 'crypto';

import { PrismaService } from '../database/prisma.service';
import { Request, response } from 'express';
import axios from 'axios';
import { UtilsService } from '../utils/utils.service';
import { OpenmeshExpertsAuthService } from 'src/openmesh-experts/openmesh-experts-auth.service';
import {
  ConnectEquinixAPI,
  CreateXnodeDto,
  GetXnodeDto,
  StoreXnodeData,
  UpdateXnodeDto,
} from './dto/xnodes.dto';
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
    private readonly utilsService: UtilsService,
    private readonly openmeshExpertsAuthService: OpenmeshExpertsAuthService,
  ) {}

  SECRET = process.env.XNODE_SECRET;
  WEBHOOK_URL = process.env.XNODE_WEBHOOK_URL;
  PAT = process.env.AZURE_PAT;

  async createXnode(dataBody: CreateXnodeDto, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    const xnodes = await this.prisma.xnode.findMany({
      where: {
        openmeshExpertUserId: user.id,
      },
    });

    if (xnodes.length > 100) {
      throw new BadRequestException('Xnode limit reached', {
        cause: new Error(),
        description: 'Xnode limit reached',
      });
    }

    if (!user.equinixAPIKey) {
      throw new BadRequestException(
        'User need to have a valid equinix api key',
        {
          cause: new Error(),
          description: 'User need to have a valid equinix api key',
        },
      );
    }

    const { features, serverNumber, websocketEnabled, status, ...dataNode } =
      dataBody;

    const uuid = generateUUID8();
    const finalFeatures = [];

    if (features.length > 0) {
      finalFeatures.push(defaultStreamProcessorPayload);
      finalFeatures.push({
        ...defaultSourcePayload,
        workloads: features,
      });
    }

    if (websocketEnabled) {
      finalFeatures.push(defaultWSPayload);
    }

    const payload = {
      builds: [
        {
          auth_token: user.equinixAPIKey,
          aws_role_arn: 'arn:aws:iam::849828677909:role/super',
          ccm_enabled: 'true',
          client_name: `${dataNode.name.replace(/\s+/g, '')}-${
            user.id
          }-${generateUUID16()}`,
          count_x86: JSON.stringify(serverNumber),
          features: finalFeatures,
          kubernetes_version: '1.25.10-00',
          metro: dataNode.serverLoc,
          product_version: 'v3',
          single_xnode: dataNode.type === 'validator' ? 'true' : 'false',
        },
      ],
      adoBuildTag: uuid,
    };
    console.log('saiu payload');
    console.log(payload);
    console.log('features');
    console.log(finalFeatures);

    const payloadStr = JSON.stringify(payload);
    console.log('saiu payloadStr');
    const signature = createHmac('sha1', this.SECRET)
      .update(payloadStr)
      .digest('hex');
    console.log('saiu signature');
    console.log(signature);

    try {
      const config = {
        method: 'post',
        url: this.WEBHOOK_URL,
        headers: {
          'X-Hub-Signature': `sha1=${signature}`,
          'Content-Type': 'application/json',
        },
        data: payloadStr,
      };
      await axios(config).then(function (response) {
        console.log('this is the response');
        console.log(response.data);
      });
    } catch (err) {
      console.log('error happened during runtime');
      console.log(err);
    }

    const xnode = await this.prisma.xnode.create({
      data: {
        openmeshExpertUserId: user.id,
        adoBuildTag: uuid,
        features: JSON.stringify(features),
        serverNumber: JSON.stringify(serverNumber),
        websocketEnabled,
        status: 'Deploying',
        ...dataNode,
      },
    });

    console.log('went through it');

    await this.getXnodeDeploymentLog(uuid, xnode.id);

    return xnode;
  }

  //since the azure pipeline does not have a websocket to connect to see when the deployment is ready, we need to call the api every 2 seconds to see if the deploy was successfull
  async getXnodeDeploymentLog(tagId: any, xnodeId) {
    return new Promise<void>(async (resolve, reject) => {
      const encodedCredentials = Buffer.from(`user:${this.PAT}`).toString(
        'base64',
      );

      let interval: NodeJS.Timeout; // Variável para armazenar o intervalo

      const fetchBuildId = async () => {
        try {
          const response = await axios.get(
            `https://dev.azure.com/gdafund/L3/_apis/build/builds?tagFilters=${tagId}`,
            {
              headers: {
                Authorization: `Basic ${encodedCredentials}`,
              },
            },
          );
          console.log('getting data build');

          if (response.data?.value.length > 0) {
            const buildId = response.data.value[0].id;
            console.log('found build');
            console.log(buildId);
            await this.prisma.xnode.update({
              where: {
                id: xnodeId,
              },
              data: {
                buildId: JSON.stringify(buildId),
              },
            });
            this.getBuildLogs(buildId, xnodeId);
            clearInterval(interval); // Limpa o intervalo quando a condição de sucesso for atendida
            resolve(); // Resolve a promessa
          }
        } catch (error) {
          console.error('error getting build:', error);
          clearInterval(interval); // Limpa o intervalo em caso de erro
          reject(error); // Rejeita a promessa
        }
      };

      await fetchBuildId();

      interval = setInterval(fetchBuildId, 10000); // Configura o intervalo
    });
  }

  async getBuildLogs(buildId: string, xnodeId: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const encodedCredentials = Buffer.from(`user:${this.PAT}`).toString(
        'base64',
      );

      let interval: NodeJS.Timeout;

      const fetchLogs = async () => {
        try {
          const response = await axios.get(
            `https://dev.azure.com/gdafund/L3/_apis/build/builds/${buildId}/logs?api-version=7.1-preview.2`,
            {
              headers: {
                Authorization: `Basic ${encodedCredentials}`,
              },
            },
          );

          if (response.data?.value) {
            console.log('the response data');
            if (response.data.value.some((log: any) => log.id > 31)) {
              console.log('YES LOG DONE');
              await this.prisma.xnode.update({
                where: {
                  id: xnodeId,
                },
                data: {
                  status: 'Running',
                },
              });
              clearInterval(interval);
              resolve(); // Resolve a promessa quando a condição é atendida
            }
          }
        } catch (error) {
          console.error('Erro ao buscar os logs:', error);
          clearInterval(interval);
          reject(error); // Rejeita a promessa em caso de erro
        }
      };

      await fetchLogs();

      interval = setInterval(fetchLogs, 20000);
    });
  }

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

    return await this.prisma.xnode.findMany({
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

    return await this.prisma.xnode.updateMany({
      where: {
        buildId,
      },
      data: {
        ...finalData,
      },
    });
  }

  async connectEquinixAPI(dataBody: ConnectEquinixAPI, req: Request) {
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

    let dado;

    try {
      await axios(config).then(function (response) {
        dado = response.data;
      });
    } catch (err) {
      console.log(err.response.data.error);
      console.log(err.response);
      throw new BadRequestException(`${err.response.data.error}`, {
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
}
