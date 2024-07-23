/* eslint-disable prefer-const */
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { ethers } from 'ethers';

import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import {
  KeyObject,
  createHmac,
  createSecretKey
} from 'crypto' // NodeJS native crypto lib

import { PrismaService } from '../database/prisma.service';
import { Request } from 'express';
import axios from 'axios';
import { OpenmeshExpertsAuthService } from 'src/openmesh-experts/openmesh-experts-auth.service';
import {
  ConnectAPI,
  CreateXnodeDto,
  XnodeHeartbeatDto,
  XnodeStatusDto,
  XnodeGetUpdateDto,
  XnodePushUpdateDto,
  GetXnodeDto,
  GetXnodeServiceDto,
  PushXnodeServiceDto,
  UpdateXnodeDto,
} from './dto/xnodes.dto';
import { XnodeUnitContract } from 'src/contracts/XunitContractABI';
import { generateUUID16 } from './utils/uuidGenerator';

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
  XNODE_API_URL = process.env.XNODE_API_URL;

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
      '0x00AbF21a1f81d348B848a035951396Db96f28b3a',
      '0x2DCcD53e4017eFa602Fd382C4495b7c006248eae',
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

      // Check if the NFT is already in the database.
      {
        // TODO: Add flag to change this behaviour.

        console.log("Deleting any deployments with a matching nft.")

        // If the NFT is already in the database, we have to delete it.
        const result = await this.prisma.$transaction(async (prisma) => {
          let duplicateNftServers = await prisma.deployment.findMany({
            where: {
              deploymentAuth: xnodeData.deploymentAuth
            }
          })

          console.log("Found: " + duplicateNftServers.length + " servers matching nft..");

          for (let i = 0; i < duplicateNftServers.length; i++) {
            console.log("Deleting server: ", duplicateNftServers[i].id)
            await prisma.deployment.deleteMany({
              where: {
                deploymentAuth: duplicateNftServers[i].deploymentAuth
              }
            })
          }
        })

        console.log(result)
      }

      console.log("Nft mint date: ", nftMintDate)

      let ipAddress = ""
      {
        if (process.env.MOCK_DEPLOYMENT == "1") {
          console.log("Mock deployment enabled, not talking to any APIs or controller")
        } else {
          // Talk to the unit controller API. - Needs refactoring
          let controllerUrl = this.XU_CONTROLLER_URL;
          let headers: Headers = new Headers();

          // TODO: Test this, doesn't look correct:
          headers.set(`Authorization`, `Bearer ` + this.XU_CONTROLLER_KEY);
          headers.set('Content-Type', 'application/json')
          let controllerPayload = JSON.stringify({
            // Get the walletAddress for the user from prisma.
            // WalletAddress: user.walletAddress,
            xnodeId: xnodeId,
            xnodeAccessToken: xnodeAccessToken,
            xnodeConfigRemote: this.XNODE_API_URL,
            nftActivationTime: nftMintDate,
          });

          // Attempt provisioning (should only be done once) XXX
          console.log("Controller url: ", controllerUrl)

          const provisionRequest: RequestInfo = new Request(controllerUrl, {
            method: `POST`,
            headers: headers,
            body: controllerPayload,
          });
          let provisionUrl = controllerUrl + "/provision/" + tokenId;

          console.log(provisionUrl)

          const response = await fetch(provisionUrl, provisionRequest);
          if (!response.ok) {
            // XXX: Print the body.
            let message = await response.json()
            console.log(message)

            throw new Error(`Error! status: ${response.status}, message: ${message}`);
          }

          let body = await response.json()

          if (response.ok) {
            ipAddress = body.ipAddress
            console.log("")
          } else {
            console.log("Couldn't provision unit: " + body.message)
            throw new Error(`Unable to provision Xnode Unit`);
          }
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
          status: "booting",
          updateGenerationHave: 0,
          updateGenerationWant: 0,
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

  generate_hmac(accessToken, message) {
    let preSharedKey = createSecretKey(accessToken, 'base64')
    const computedHmac = createHmac('sha256', preSharedKey).update(message, 'utf8').digest('hex');
    return computedHmac
  }

  verifyHmac(accessToken, message, claimedHmac) {
    // accessToken is passed as base64
    console.log("Computing hmac for message:", message)
    let realHmac = this.generate_hmac(accessToken, message)
    let verified = realHmac === claimedHmac
    console.log("Hmac computed: ", realHmac, "matched:", verified)
    return verified
  }

  async getXnodeServices(dataBody: GetXnodeServiceDto, req: Request) {
    const unverifiedHmac = String(req.headers['x-parse-session-token']); 

    // XXX: Needs anti-spam measures.
    const node = await this.prisma.deployment.findFirst({
      where: {
        id: dataBody.id,
      }
    })
    console.log("Got services for node. ID: ", node.id, ", accessToken: ", node.accessToken)
    let preSharedKey = Buffer.from(node.accessToken, 'base64').toString('hex')
    console.log("Decoded access token: ", preSharedKey)


    let jsonMessage = JSON.stringify(dataBody)

    if (this.verifyHmac(node.accessToken, jsonMessage, unverifiedHmac)) {
      let expiry = new Date().getTime() + 30 * 1000; // 30 seconds
      let message = JSON.stringify(
        {
          "xnode_config": JSON.parse(node.services),
          "expiry": expiry
        }
      )
      let msg_hmac = this.generate_hmac(node.accessToken, message)
      console.log("Creating hmac for", message)
      console.log(msg_hmac)
      return {
        message,
        "hmac": msg_hmac
      }

    } else {
      throw new Error("Invalid HMAC, is your access token correct?")
    }
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
    const unverifiedHmac = String(req.headers['x-parse-session-token']); // XXX: Rename session token to avoid confusion with browser sessions.

    const { id, ...data} = dataBody;

    const node = await this.prisma.deployment.findFirst({
      where: {
        id: dataBody.id,
      }
    })
    let jsonMessage = JSON.stringify(dataBody)

    if (node) {
      if (this.verifyHmac(node.accessToken, jsonMessage, unverifiedHmac)) {
        try {
          let status = node.status

          if (node.status == "booting") {
            status = "booted"
          }

          await this.prisma.deployment.updateMany({
            where: {
              id: id,
            },
            data: {
              heartbeatData: JSON.stringify(data),
              status: status
            }
          })

        } catch(err) {
          throw new BadRequestException('Failed to authenticate', {
            cause: new Error(),
            description: 'Couldn\'t authenticate Xnode / Xnode id is invalid.',
          });
        }
      } else {
        throw new Error("Invalid HMAC, is your access token correct?")
      }
    } else {
      throw new Error("No node found with id: " + dataBody.id)
    }
  }

  async getXnodeUpdate(dataBody: XnodeGetUpdateDto, req: Request) {
    const unverifiedHmac = String(req.headers['x-parse-session-token']); // XXX: Rename session token to avoid confusion with browser sessions.

    const node = await this.prisma.deployment.findFirst({
      where: {
        id: dataBody.id,
      }
    })

    let jsonMessage = JSON.stringify(dataBody)

    if (this.verifyHmac(node.accessToken, jsonMessage, unverifiedHmac)) {
      return {
        want: node.updateGenerationWant,
        have: node.updateGenerationHave,
      }
    } else {
      throw new Error("Invalid HMAC, is your access token correct?")
    }
  }

  async pushXnodeUpdate(dataBody: XnodePushUpdateDto, req: Request) {
    const unverifiedHmac = String(req.headers['x-parse-session-token']); // XXX: Rename session token to avoid confusion with browser sessions.

    const node = await this.prisma.deployment.findFirst({
      where: {
        id: dataBody.id,
      }
    })
    let jsonMessage = JSON.stringify(dataBody)

    if (this.verifyHmac(node.accessToken, jsonMessage, unverifiedHmac)) {
      try {
        await this.prisma.deployment.updateMany({
          where: {
            id: dataBody.id,
          },
          data: {
            updateGenerationHave: dataBody.generation,
          }
        })
      } catch(err) {
        throw new BadRequestException('Failed to authenticate', {
          cause: new Error(),
          description: 'Couldn\'t authenticate Xnode / Xnode id is invalid.',
        });
      }
    } else {
      throw new Error("Invalid HMAC, is your access token correct?")
    }
  }

  async allowXnodeUpdate(dataBody: XnodePushUpdateDto, req: Request) {
    const sessionToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      sessionToken,
    );

    const xnode = await this.prisma.deployment.findFirst({
      where: {
        id: dataBody.id,
        openmeshExpertUserId: user.id,
      },
    });

    if (xnode) {
      try {
        await this.prisma.deployment.updateMany({
          where: {
            id: dataBody.id,
          },
          data: {
            updateGenerationWant: dataBody.generation,
          }
        })
      } catch(err) {
        throw new BadRequestException('Failed to authenticate', {
          cause: new Error(),
          description: 'Couldn\'t authenticate Xnode / Xnode id is invalid.',
        });
      }
    } else {
      throw new Error("No xnode with id found.")
    }
  }

  async pushXnodeStatus(dataBody: XnodeStatusDto, req: Request) {
    const unverifiedHmac = String(req.headers['x-parse-session-token']); // XXX: Rename session token to avoid confusion with browser sessions.

    const { id, ...data} = dataBody;

    const node = await this.prisma.deployment.findFirst({
      where: {
        id: dataBody.id,
      }
    })
    let jsonMessage = JSON.stringify(dataBody)

    if (this.verifyHmac(node.accessToken, jsonMessage, unverifiedHmac)) {
      try {
        await this.prisma.deployment.updateMany({
          where: {
            id: id,
          },
          data: {
            status: data.status,
          }
        })
      } catch(err) {
        throw new BadRequestException('Failed to authenticate', {
          cause: new Error(),
          description: 'Couldn\'t authenticate Xnode / Xnode id is invalid.',
        });
      }
    } else {
      throw new Error("Invalid HMAC, is your access token correct?")
    }
  }

  async updateXnode(dataBody: UpdateXnodeDto, req: Request) {
    // TODO: Double check this function works as expected.
    const sessionToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      sessionToken,
    );

    const xnode = await this.prisma.deployment.findFirst({
      where: {
        id: dataBody.xnodeId,
        openmeshExpertUserId: user.id,
      },
    });

    if (!xnode) {
      throw new BadRequestException('Xnode not found', {
        cause: new Error(),
        description: 'Xnode not found',
      });
    }

    const { xnodeId, ...finalBody } = dataBody;

    return await this.prisma.deployment.update({
      data: {
        status: status,
        ...finalBody,
      },
      where: {
        id: xnodeId,
      },
    });
  }

  async getXnode(dataBody: GetXnodeDto, req: Request) {
    const sessionToken = String(req.headers['x-parse-session-token']);
    const user = await this.openmeshExpertsAuthService.verifySessionToken(
      sessionToken,
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
}
