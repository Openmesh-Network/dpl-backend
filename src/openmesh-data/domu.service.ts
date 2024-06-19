import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });
import { Vonage } from '@vonage/server-sdk';

import { tokenGenerate } from '@vonage/jwt';

import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../database/prisma.service';
import { Request, response } from 'express';
import axios from 'axios';

import { UtilsService } from '../utils/utils.service';
import {
  GetDatasetDTO,
  GetDatasetsDTO,
  UploadDatasetsDTO,
} from './dto/openmesh-data.dto';
import { GetTemplatesDTO } from './dto/openmesh-template-products.dto';

//This service is utilized to update all the governance workflow - it runs a query trhough all the events from the contracts governance to update it (its util to some cases in which the backend may have losed some events caused by a downtime or something similar)
@Injectable()
export class DomuService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  async createJWT() {
    const jwtToken = tokenGenerate(
      'c9731ae5-cac3-4fd9-a957-5bd5821462da',
      'privateKey',
    );

    console.log('jwttoken');
    console.log(jwtToken);
  }
}
