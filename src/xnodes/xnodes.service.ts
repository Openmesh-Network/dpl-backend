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
  PushXnodeServiceDto,
  StoreXnodeData,
  StoreXnodeSigningMessageDataDTO,
  UpdateXnodeDto,
} from './dto/xnodes.dto';
import { XnodeUnitContract } from 'src/contracts/XunitContractABI';
import { env, features } from 'process';
import {
  defaultSourcePayload,
  defaultStreamProcessorPayload,
  defaultWSPayload,
} from './utils/constants';
import { generateUUID8, generateUUID16 } from './utils/uuidGenerator';
import { time } from 'console';

@Injectable()
export class XnodesService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly utilsService: UtilsService, Unused
    private readonly openmeshExpertsAuthService: OpenmeshExpertsAuthService,
  ) {}
  web3UrlProvider = process.env.WEB3_URL_PROVIDER_ETHEREUM;
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

    console.log("CreateXnode request")

    // XXX: Handle more elegantly? Maybe offer user the chance to delete Xnodes.
    // This actually works OK for now. Just important to note.
    const MAX_DEPLOYMENTS = 100
    if (deployments.length > MAX_DEPLOYMENTS) {
      throw new BadRequestException('Xnode limit reached', {
        cause: new Error(),
        description: 'Xnode deployment limit of ' + MAX_DEPLOYMENTS + ' reached',
      });
    }

    // INPUT VALIDATION, dataBody is XnodeDto
    const { services, ...xnodeData } = dataBody; 


    // A whitelist of addresses for testing, want to be safe and make sure only people we trust can run before the official launch on Wednesday.
    const whitelist = [
      `0xc2859E9e0B92bf70075Cd47193fe9E59f857dFA5`,
      `0x99acBe5d487421cbd63bBa3673132E634a6b4720`,
      `0x7703d5753c54852d4249f9784a3e8a6eea08e1dd`,
      `0xA4a336783326241acFf520D91eb8841Ad3B9BD1a`,
      `0x87d795cbb0CABd0A68Df54E6a01033046919bA43`,
      `0xA45712c2724b059289F1bf5Cf098441a8e6D195c`,
    ];

    let isWhitelisted = false;
    for (let address of whitelist) {
      if (user.web3Address == address) {
        isWhitelisted = true;
      }
    }

    // XXX: Disable whitelist.
    if (!isWhitelisted) {
      console.error("User not whitelisted.")
      throw new Error("Not whitelisted, stay posted on our social media for full release.");
    }

    console.log('Final services:');
    console.log(services);

    // This token is for the admin service on the Xnode to identify itself for read requests/heartbeats.
    // Will be replaced with PSK + HMAC at some point.
    let xnodePresharedKey: KeyObject;
    const buffer = require('crypto').randomBytes(64).toString('hex'); // TODO: handle err on creation of key
    xnodePresharedKey = createSecretKey(buffer, 'hex')
    const xnodeAccessToken = xnodePresharedKey.export().toString('base64');
    const xnodeId = generateUUID16()

    if (xnodeData.isUnit) {

      let allowedTokenIdChars = "0123456789"
      for (let char of xnodeData.deploymentAuth) {
        if (!allowedTokenIdChars.includes(char)) {
          throw new Error(`Invalid NFT TokenId`);
        }
      }

      let tokenId = BigInt(xnodeData.deploymentAuth)
      let nftOwner = ""
      { // Check web3Address owns NFT.
        try {
          // XXX: Further testing is required.
          console.log("Token id: ", tokenId)
          // TODO: Consider caching these requests. We are charged by usage.
          nftOwner = await this.XuContractConnect.ownerOf(tokenId)

          console.log('Nft owner: ', nftOwner)
          console.log('Nft owner: ', user.web3Address)
        } catch (err) {
          console.error("Code: ", err.code)
          console.error("Reason: ", err.reason)
          console.error("Error: ", err)
        }

        if(nftOwner != user.web3Address || nftOwner == "") {
          throw new Error(`You don't own the NFT`);
        }
      }

      let nftMintDate = undefined
      console.log("Checking NFT date.")

      // TODO: Consider caching these requests. We are charged by usage.
      { // Check NFT date.
        try {
          // XXX: Not all RPC providers support events.
          // Works with our ankr API.
          const filter = this.XuContractConnect.filters.Transfer(null, null, tokenId);
          const events = await this.XuContractConnect.queryFilter(filter)

          const mintEvent = events.find(event => event.args.from === ethers.constants.AddressZero)

          if (!mintEvent) {
            const errString = "This error shouldn't run. This means the NFT has an owner despite it never being minted."
            console.error(errString)
            throw new Error(errString)
          } else {
            const block = await this.web3Provider.getBlock(mintEvent.blockNumber)

            if (!block) {
              const errString = "This error shouldn't run. This means the NFT was minted on a non-existent block."
              console.error(errString)
              throw new Error(errString)
            } else {
              nftMintDate = new Date(1000 * block.timestamp)
            }
          }
        } catch(err) {
          console.error(err)
          throw new Error("Error getting NFT date.")
        }
      }

      if (!nftMintDate) {
        throw new Error("No NFT mint date.")
      }

      console.log("Nft mint date: ", nftMintDate)

      let ipAddress = ""
      {
        if (process.env.MOCK_DEPLOYMENT == "1") {
          console.log("Mock deployment enabled, not talking to any APIs or controller")
        } else if (process.env.XU_CONTROLLER_ENABLE == "0") {
          // XXX: Re-enable the xu-controller API code.

          console.log("XU controller disabled, doing round-robbin reset with known hivelocity servers instead.")

          // Do round-robbin with hivelocity servers instead.
          const serverIds = process.env.HIVELOCITY_SERVER_IDS.split(",")

          if (serverIds.length < 2) {
            console.error("Need to specify hivelocity server ids. Is HIVELOCITY_SERVER_IDS env var not set?")
            throw new Error("No available servers, check dpl logs.")
          }

          // XXX: Actually do a round-robbin.
          let index = 0
          if (user.web3Address == "0xc2859E9e0B92bf70075Cd47193fe9E59f857dFA5") {
            index = 1
          }

          const serverId = serverIds[index]


          let headers = new Headers()

          // XXX: Replace this with env var
          headers.set('X-API-KEY', process.env.HIVELOCITY_KEY)
          headers.set('accept', 'application/json')
          headers.set('content-type', 'application/json')

          {
            // 1. Shutdown
            console.log("Sending shutdown request.")
            const shutdownUrl = 'https://core.hivelocity.net/api/v2/device/' + serverId + '/power?action=shutdown'
            const provisionRequest: RequestInfo = new Request(shutdownUrl, {
              method: `POST`,
              headers: headers,
            });

            const response = await fetch(shutdownUrl, provisionRequest)

            if (!response.ok) {
              // console.log(response)
              console.log("Server id: ", serverId)
              console.log(await response.json())
              // throw new Error(`Error shutting down! status: ${response.status}`);
            }
          }

          // XXX: Actually change architecture to do this asynchronously, instead of hanging on this one request.
          {
            // 2. Wait for the server to actually be shutdown.
            console.log("Waiting for power status off.")
            const attemptLimit = 30;
            let attemptCount = 0;
            let success = false;
            const powerUrl = 'https://core.hivelocity.net/api/v2/device/' + serverId + '/power'
            const powerRequest = new Request(powerUrl,  {
              method: 'GET',
              headers: headers
            })

            while (attemptCount < attemptLimit) {
              const response = await fetch(powerUrl, powerRequest)

              if (response.ok) {
                // success = true
                // console.log(response)

                const data = await response.json()

                if (data.powerStatus == "OFF") {
                  console.log("Machine is off, proceeding.")
                  success = true
                  break
                } else {
                  console.log("Machine is on, trying again.")
                }
                // break
              }

              attemptCount ++;

              function sleep(ms) {
                return new Promise((resolve) => {
                  setTimeout(resolve, ms);
                });
              }

              await sleep(1000)
            }

            console.log("Finished waiting for status after ", attemptCount, " attempts.")
          }

          {
            // 3. Reset + keys
            const resetData = {
              forceReload: true,
              hostname: "xnode.openmesh.network",
              osName: "Ubuntu 22.04 (VPS)",
              script: "#cloud-config \nruncmd: \n - \"mkdir /tmp/boot && mount -t tmpfs -osize=90% none /tmp/boot && mkdir /tmp/boot/__img && wget -q -O /tmp/boot/__img/kexec.tar.xz http://boot.opnm.sh/kexec.tar.xz && mkdir /tmp/boot/system && mkdir /tmp/boot/system/proc && mount -t proc /proc /tmp/boot/system/proc && tar xvf /tmp/boot/__img/kexec.tar.xz -C /tmp/boot/system && rm /tmp/boot/__img/kexec.tar.xz && chroot /tmp/boot/system ./kexec_nixos \\\"-- XNODE_UUID=" + xnodeId + " XNODE_ACCESS_TOKEN=" + xnodeAccessToken + "\\\"\""
            }

            const url = 'https://core.hivelocity.net/api/v2/compute/' + serverId
            const resetRequest: RequestInfo = new Request('https://core.hivelocity.net/api/v2/compute/' + serverId, {
              method: `PUT`,
              headers: headers,
              body: JSON.stringify(resetData),
            });

            const response = await fetch(url, resetRequest)
            if (!response.ok) {
              console.error(response)
              const data = await response.json()
              console.log(data)

              throw new Error("Failed to provision: " + response.status)
            } else {
              const data = await response.json()
              console.log(data)

              ipAddress = data.primaryIp
            }
          }
        } else {
          // Talk to the unit controller API. - Needs refactoring
          let controllerUrl = this.XU_CONTROLLER_URL;
          let headers: Headers = new Headers();

          // TODO: Test this, doesn't look correct:
          headers.set(`Authorization`, `Bearer ` + this.XU_CONTROLLER_KEY);
          headers.set('Content-Type', 'application/json')
          let jsondata = JSON.stringify({
            // get the walletAddress for the user from prisma
            WalletAddress: user.walletAddress,
            XNODE_UUID: xnodeId,
            XNODE_ACCESS_TOKEN: xnodeAccessToken,
          });

          // Attempt provisioning (should only be done once) XXX
          console.log("Controller url: ", controllerUrl)

          const provisionRequest: RequestInfo = new Request(controllerUrl, {
            method: `POST`,
            headers: headers,
            body: jsondata,
          });
          let provisionUrl = controllerUrl + "/provision/" + tokenId;

          console.log(provisionUrl)

          const response = await fetch(provisionUrl, provisionRequest);
          if (!response.ok) {
            console.log(response)
            throw new Error(`Error! status: ${response.status}`);
          }
          /*
          const provision_unit_response = await response.json();
          if (provision_unit_response == "Deployed into hivelocity") {
            xnodeData.provider = "hivelocity"; // Why?
          } else if (provision_unit_response == "Internal server error") {
            throw new Error(`Unable to provision Xnode Unit`);
          } else {
            console.log("Fatal provisioning error.");
          }
          */
        }
      }

      // Add the xnode deployment to our database.
      const xnode = await this.prisma.deployment.create({
        data: {
          id: xnodeId,
          accessToken: xnodeAccessToken,
          isUnit: xnodeData.isUnit,
          openmeshExpertUserId: user.id,
          services: services,
          // XXX: Need xu controller to support ip address, placeholder for now.
          ipAddress: ipAddress,
          unitClaimTime: nftMintDate,
          deploymentAuth: xnodeData.deploymentAuth,
          ...xnodeData,
        },
      });

      if (!xnode) {
        const errMessage = "Failed adding to database";
        console.error(errMessage);
        throw new Error(errMessage);
      }

      console.log('Added Xnode to the database');
      console.log("Xnode deployed");

      return xnode
    } else { // Non Xnode units.
      // TODO: Connect to xnode deployment backend instead.
      console.error("Not currently supported...")
      throw new Error("Not currently supported.")
    }
  }

  async getXnodeServices(dataBody: GetXnodeServiceDto, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']); // XXX: Rename session token to avoid confusion with browser sessions.

    console.log("About to get services for node. ID: ", dataBody.id, ", accessToken: ", accessToken)

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

  async pushXnodeServices(dataBody: PushXnodeServiceDto, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    console.log("Request to update services from user: ", user.id, "request: ", dataBody)

    if (!user) {
      throw new Error("Unauthorized user.")
    } else {
      console.log("Setting services for node. ID: ", dataBody.id)

      // Actually update.
      await this.prisma.deployment.updateMany({
        where: {
          AND: [
            {
              id: dataBody.id,
            },
            {
              openmeshExpertUserId: user.id,
            }
          ]
        },
        data: {
          services: dataBody.services
        }
      })
    }
  }

  async pushXnodeHeartbeat(dataBody: XnodeHeartbeatDto, req: Request) {
    const accessToken = String(req.headers['x-parse-session-token']); // XXX: Rename session token to avoid confusion with browser sessions.

    const { id, ...data} = dataBody;

    try {
      await this.prisma.deployment.updateMany({
        where: {
          AND: [
            {
              id: id,
            },
            {
              // TODO: Inlcude Hmac validation.
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
    // TODO: Double check this function works as expected.
    const accessToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      accessToken,
    );

    const xnodes = await this.prisma.deployment.findFirst({
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

    return await this.prisma.deployment.update({
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

    return await this.prisma.deployment.findFirst({
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
