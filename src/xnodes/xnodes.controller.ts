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
  XnodeStatusDto,
  XnodeGetGenerationDto,
  XnodePushGenerationDto,
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
    summary: 'Returns the config generation numbers for the Xnode.',
  })
  @Post('getXnodeGeneration')
  getXnodeGeneration(@Body() data: XnodeGetGenerationDto, @Req() req: Request) {
    return this.xnodesService.getXnodeGeneration(data, req);
  }

  @ApiOperation({
    summary: 'Increments the configuration generation which signals a new configuration was applied.',
  })
  @Post('pushXnodeGenerationConfig')
  pushXnodeGenerationConfig(@Body() data: XnodePushGenerationDto, @Req() req: Request) {
    return this.xnodesService.pushXnodeGeneration(data, req, true);
  }

  @ApiOperation({
    summary: 'Increments the update generation which signals a new update was applied.',
  })
  @Post('pushXnodeGenerationUpdate')
  pushXnodeGenerationUpdate(@Body() data: XnodePushGenerationDto, @Req() req: Request) {
    return this.xnodesService.pushXnodeGeneration(data, req, false);
  }

  @ApiOperation({
    summary: 'Increments the generation number which prompts the Xnode to update.',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('allowXnodeGenerationConfig')
  allowXnodeGenerationConfig(@Body() data: XnodePushGenerationDto, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();

    return this.xnodesService.allowXnodeGeneration(data, req, true);
  }

  @ApiOperation({
    summary: 'Increments the generation number which prompts the Xnode to update.',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('allowXnodeGenerationUpdate')
  allowXnodeGenerationUpdate(@Body() data: XnodePushGenerationDto, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();

    return this.xnodesService.allowXnodeGeneration(data, req, false);
  }

  @ApiOperation({
    summary: 'Push xnode heartbeat including resource metrics.',
  })
  @Post('pushXnodeHeartbeat')
  pushXnodeHeartbeat(@Body() data: XnodeHeartbeatDto, @Req() req: Request) {
    return this.xnodesService.pushXnodeHeartbeat(data, req);
  }

  @ApiOperation({
    summary: 'Push xnode status to determine whether it\'s building or not.',
  })
  @Post('pushXnodeStatus')
  pushXnodeStatus(@Body() data: XnodeStatusDto, @Req() req: Request) {
    return this.xnodesService.pushXnodeStatus(data, req);
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
