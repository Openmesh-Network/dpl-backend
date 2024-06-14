import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Get,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Query,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';

import { Request } from 'express';

import { OpenmeshDataService } from './openmesh-data.service';
import {
  GetDatasetDTO,
  GetDatasetsDTO,
  UploadDatasetsDTO,
} from './dto/openmesh-data.dto';
import { GetTemplatesDTO } from './dto/openmesh-template-products.dto';
import { OpenmeshTemplateService } from './openmesh-template-products.service';
import { DomuService } from './domu.service';

@ApiTags('Data products')
@Controller('openmesh-data/functions')
export class OpenmeshDataController {
  constructor(
    private readonly openmeshDataService: OpenmeshDataService,
    private readonly domuService: DomuService,
    private readonly openmeshTemplateProducts: OpenmeshTemplateService,
  ) {}

  apiTokenKey = process.env.API_TOKEN_KEY;
  deeplinkSignature = process.env.DEEPLINK_TEAM_SIGNATURE;

  @ApiOperation({
    summary: 'Return the datasets',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('getDatasets')
  getDatasets(@Body() data: GetDatasetsDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshDataService.getDatasets(data);
  }

  @ApiOperation({
    summary: 'Return the datasets',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('getDataset')
  getDataset(@Body() data: GetDatasetDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshDataService.getDataset(data);
  }

  @ApiOperation({
    summary: 'Return the template products',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('templateProducts')
  templateProducts(@Query() data: GetTemplatesDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshTemplateProducts.getTemplateProducts(data);
  }

  @ApiOperation({
    summary: 'Upload the datasets',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @ApiHeader({
    name: 'x-deeeplink-team-signature',
    description: 'Token mandatory to connect with the app',
  })
  @Post('uploadDatasets')
  @ApiBody({ type: [UploadDatasetsDTO] })
  uploadDatasets(@Body() data: UploadDatasetsDTO[], @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    if (
      String(req.headers['x-deeeplink-team-signature']) !==
      this.deeplinkSignature
    )
      throw new UnauthorizedException();
    return this.openmeshDataService.uploadDatasets(data);
  }

  @ApiOperation({
    summary: 'Upload the datasets',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @ApiHeader({
    name: 'x-deeeplink-team-signature',
    description: 'Token mandatory to connect with the app',
  })
  @Post('uploadTemplateProducts')
  uploadTemplateProducts(@Body() data: any[], @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    if (
      String(req.headers['x-deeeplink-team-signature']) !==
      this.deeplinkSignature
    )
      throw new UnauthorizedException();
    return this.openmeshTemplateProducts.uploadTemplateProducts(data);
  }
  // @Post('updateLinksDataProducts')
  // updateLinksDataProducts(@Body() data: any) {
  //   return this.openmeshDataService.updateLinksDataProducts(data);
  // }

  @ApiOperation({
    summary: 'Return the templates data',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('getTemplatesData')
  getTemplatesData(@Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshTemplateProducts.getTemplatesData();
  }
/*
  @ApiOperation({
    summary: 'Return the template data',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('getTemplateData')
  getTemplateData(@Query() data: GetDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshTemplateProducts.getTemplateData(data);
  }
*/
  @ApiOperation({
    summary: 'Return the template data',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('test')
  test() {
    return this.domuService.createJWT();
  }
}
