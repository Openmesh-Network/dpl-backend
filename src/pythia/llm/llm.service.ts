import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import { PrismaService } from '../../database/prisma.service';
import axios from 'axios';

import * as AWS from 'aws-sdk';
import { DeployerService } from './deployer.service';
import { CreateLLMDTO, GetDTO } from '../dto/pythia.dto';

@Injectable()
export class LLMInstanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deployerService: DeployerService,
  ) {}

  async createLLM(dataBody: CreateLLMDTO) {
    try {
      const uriEndpoint = await this.deployerService.runPythonScript();

      return await this.prisma.lLMInstance.create({
        data: {
          name: dataBody.name,
          urlEndpoint: String(uriEndpoint),
        },
      });
    } catch (err) {
      console.log(err);
      throw new BadRequestException(`${err}`);
    }
  }

  async getLLMInstances() {
    return await this.prisma.lLMInstance.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });
  }

  async deleteLLMInstance(dataBody: GetDTO) {
    const llm = await this.prisma.lLMInstance.findFirst({
      where: {
        id: dataBody.id,
      },
    });
    try {
      await this.deleteSageMakerEndpoint(llm.urlEndpoint);
      return await this.prisma.lLMInstance.delete({
        where: {
          id: dataBody.id,
        },
      });
    } catch (err) {
      throw new BadRequestException(`${err}`);
    }
  }

  async deleteSageMakerEndpoint(endpointName: string) {
    AWS.config.update({
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const sageMaker = new AWS.SageMaker();
    try {
      await sageMaker.deleteEndpoint({ EndpointName: endpointName }).promise();
      console.log(`Endpoint ${endpointName} deleted successfully`);

      await sageMaker
        .deleteEndpointConfig({ EndpointConfigName: endpointName })
        .promise();
      console.log(`EndpointConfig ${endpointName} deleted successfully`);
    } catch (error) {
      console.error('Error', error);
      throw new Error(`Error: ${error.message}`);
    }
  }

  //   async callInstance(dataBody: CallInstanceDTO, req: Request) {
  //     const instance =
  //       await this.generalValidationsService.validateEditUpdateLLMInstance(
  //         user.id,
  //         dataBody.id,
  //       );

  //     try {
  //       const response = await this.awsLLMService.callModel(
  //         instance.url,
  //         dataBody.input,
  //       );
  //       return response;
  //     } catch (err) {
  //       console.log(err);
  //       throw new BadRequestException(`${err}`);
  //     }
  //   }
}
