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
  Put,
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

import { XnodesService } from './xnodes.service';
import {
  ConnectAPI,
  CreateXnodeDto,
  GetXnodeDto,
  StoreXnodeData,
  StoreXnodeSigningMessageDataDTO,
  UpdateXnodeDto,
} from './dto/xnodes.dto';
import { TestingService } from './testing.service';

@ApiTags('Xnodes - Managing xnodes')
@Controller('xnodes/functions')
export class XnodesController {
  constructor(
    private readonly xnodesService: XnodesService,
    private readonly testingService: TestingService,
  ) {}

  apiTokenKey = process.env.API_TOKEN_KEY;
  deeplinkSignature = process.env.DEEPLINK_TEAM_SIGNATURE;

  @ApiOperation({
    summary: 'Create a xnode',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('createXnode')
  createXnode(@Body() data: CreateXnodeDto, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.createXnode(data, req);
  }

  @ApiOperation({
    summary: 'Store xnode information',
  })
  @ApiHeader({
    name: 'x-deeeplink-team-signature',
    description: 'Private token to auth',
  })
  @Post('storeXnodeData')
  storeXnodeData(@Body() data: StoreXnodeData, @Req() req: Request) {
    if (
      String(req.headers['x-deeeplink-team-signature']) !==
      this.deeplinkSignature
    )
      throw new UnauthorizedException();
    return this.xnodesService.storeXnodeData(data);
  }

  @ApiOperation({
    summary: 'Store xnode signing message',
    description:
      'If it is a validator, we request the user to sign a message with its wallet so we can now which wallet we are going to mint tokens of staking - the message signed here is: "I want to participate in the Validator beta"',
  })
  @ApiHeader({
    name: 'x-deeeplink-team-signature',
    description: 'Private token to auth',
  })
  @Post('storeXnodeSigningMessage')
  storeXnodeSigningMessage(
    @Body() data: StoreXnodeSigningMessageDataDTO,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.storeXnodeSigningMessage(data, req);
  }

  @ApiOperation({
    summary: 'Connects and store the user equinix api key',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('connectEquinixAPI')
  connectEquinixAPI(@Body() data: ConnectAPI, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.connectEquinixAPI(data, req);
  }
  @ApiOperation({
    summary: 'Connects and store the user aiven api key - https://api.aiven.io/v1/project',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('connectAivenAPI')
  connectAivenAPI(@Body() data: ConnectAPI, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.connectAivenAPI(data, req);
  }

  @ApiOperation({
    summary: 'Connects and store the user valcloud api key - polygon',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('connectValidationCloudAPIPolygon')
  connectValidationCloudAPIPolygon(
    @Body() data: ConnectAPI,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.connectValidationCloudAPIPolygon(data, req);
  }

  // testing ci cd railway
  @ApiOperation({
    summary: 'Connects and store the user valcloud api key - eth',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('connectValidationCloudAPIEthereum')
  connectValidationCloudAPIEthereum(
    @Body() data: ConnectAPI,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.connectValidationCloudAPIEthereum(data, req);
  }

  @ApiOperation({
    summary: 'Update a xnode',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Put('updateXnode')
  updateXnode(@Body() data: UpdateXnodeDto, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.updateXnode(data, req);
  }

  @ApiOperation({
    summary: 'Returns a xnode',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('getXnode')
  getXnode(@Body() data: GetXnodeDto, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.getXnode(data, req);
  }

  @ApiOperation({
    summary: 'Returns general stats and a listing of all nodes validators',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('getNodesValidatorsStats')
  getNodesValidatorsStats(@Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.getNodesValidatorsStats();
  }

  @ApiOperation({
    summary:
      'Returns general stats and a listing of all nodes validators, and also returns the data about a specific xnode',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('getXnodeWithNodesValidatorsStats')
  getXnodeWithNodesValidatorsStats(
    @Body() data: GetXnodeDto,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.getXnodeWithNodesValidatorsStats(data);
  }

  @ApiOperation({
    summary: 'Returns all user xnodes',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('getXnodes')
  getXnodes(@Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.getXnodes(req);
  }

  @ApiOperation({
    summary: 'Returns all user xnodes',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('teste')
  teste(@Body() data: any, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.xnodesService.getXnodeDeploymentLog(data.tagId, data.xnodeId);
  }

  @ApiOperation({
    summary: 'test',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('test')
  test(@Body() data: any, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.testingService.createWallet(data.name, data.senha);
  }

  // @ApiOperation({
  //   summary: 'deleteTable',
  // })
  // @ApiHeader({
  //   name: 'X-Parse-Application-Id',
  //   description: 'Token mandatory to connect with the app',
  // })
  // @Post('deleteTable')
  // deleteTable() {
  //   return this.xnodesService.deleteTable();
  // }
}
