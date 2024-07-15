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
}
