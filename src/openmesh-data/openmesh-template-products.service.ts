import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

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
export class OpenmeshTemplateService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  //using pagination
  async getTemplateProducts(data: GetTemplatesDTO) {
    const limit = 25;
    const offset = (data.page - 1) * limit;

    let filters = {};
    if (data.searchBarFilter) {
      const phrase = data.searchBarFilter;
      filters = {
        OR: [
          { cpuCores: { contains: phrase, mode: 'insensitive' } },
          { providerName: { contains: phrase, mode: 'insensitive' } },
        ],
      };
    }

    const products = await this.prisma.openmeshTemplateProducts.findMany({
      where: filters,
      take: limit,
      skip: offset,
      orderBy: {
        id: 'asc',
      },
    });

    const totalProducts = await this.prisma.openmeshTemplateProducts.count({
      where: filters,
    });

    const nextPage = await this.prisma.openmeshTemplateProducts.findMany({
      where: filters,
      take: 1,
      skip: offset + limit,
    });

    const hasMorePages = nextPage.length > 0;

    return {
      products,
      totalProducts,
      hasMorePages,
    };
  }

  async getDataset(data: GetDatasetDTO) {
    const dataset = await this.prisma.openmeshTemplateProducts.findFirst({
      where: {
        ...data,
      },
    });
    return dataset;
  }

  async uploadTemplateProducts(dataBody: any[]) {
    const dataset = await this.prisma.openmeshTemplateProducts.createMany({
      data: dataBody,
    });
    return dataset;
  }
}
