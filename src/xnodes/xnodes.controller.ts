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
  CreateXnodeDto,
  GetXnodeDto,
  XnodeHeartbeatDto,
  GetXnodeServiceDto,
  PushXnodeServiceDto,
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
    summary: 'Push xnode heartbeat including resource metrics',
  })
  @Post('pushXnodeHeartbeat')
  pushXnodeHeartbeat(@Body() data: XnodeHeartbeatDto, @Req() req: Request) {
    return this.xnodesService.pushXnodeHeartbeat(data, req);
  }

  @ApiOperation({
    summary: 'Gets the services',
  })
  @Get('getXnodeServices')
  getXnodeServices(@Body() data: GetXnodeServiceDto, @Req() req: Request) {
    return this.xnodesService.getXnodeServices(data, req);
  }

  @ApiOperation({
    summary: 'Pushes the services',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('pushXnodeServices')
  pushXnodeServices(@Body() data: PushXnodeServiceDto, @Req() req: Request) {
    return this.xnodesService.pushXnodeServices(data, req);
  }

  @ApiOperation({
    summary: 'Store xnode signing message',
    description:
      'If it is a validator, we request the user to sign a message with its wallet so we can know which wallet we are going to mint tokens of staking - the message signed here is: "I want to participate in the Validator beta"',
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
  @Post('getXnode')
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
  /*
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
  } */
}
