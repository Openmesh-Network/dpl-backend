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
  Delete,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

import { Request } from 'express';

import { PythiaService } from './pythia.service';
import {
  ChangeChatNameDTO,
  CreateLLMDTO,
  CreatePythiaChatDto,
  GetDTO,
  GetPythiaChatDto,
  InputMessageDTO,
} from './dto/pythia.dto';
import { DeployerService } from './llm/deployer.service';
import { LLMInstanceService } from './llm/llm.service';

@ApiTags('Pythia - Managing pythia')
@Controller('pythia/functions')
export class PythiaController {
  constructor(
    private readonly pythiaService: PythiaService,
    private readonly llmInstanceService: LLMInstanceService,
    private readonly deployerService: DeployerService,
  ) {}
  apiTokenKey = process.env.API_TOKEN_KEY;
  deeplinkSignature = process.env.DEEPLINK_TEAM_SIGNATURE;

  @ApiOperation({
    summary: 'Creates a pythia chat',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('createUserChat')
  createChat(@Body() data: CreatePythiaChatDto, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.pythiaService.createChat(data, req);
  }

  @ApiOperation({
    summary: 'Returns the user chats',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('getUserChats')
  getUserChats(@Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.pythiaService.getUserChats(req);
  }

  @ApiOperation({
    summary: 'Input a new user message in the chat',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('inputUserChatMessage')
  inputUserChatMessage(@Body() data: InputMessageDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.pythiaService.inputUserChatMessage(data, req);
  }

  @ApiOperation({
    summary: 'Change the chat name',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Put('changeChatName')
  changeChatName(@Body() data: ChangeChatNameDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.pythiaService.changeChatName(data, req);
  }

  @ApiOperation({
    summary: 'Returns an user specific chat',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('getUserChat')
  getUserChat(@Body() data: GetPythiaChatDto, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.pythiaService.getUserChat(data, req);
  }

  @ApiOperation({
    summary: 'Deletes an user specific chat',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('deleteUserChat')
  deleteUserChat(@Body() data: GetPythiaChatDto, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.pythiaService.deleteUserChat(data, req);
  }

  @ApiOperation({
    summary: 'ADMIN - deploy a new llm instance at sagemaker',
  })
  @ApiHeader({
    name: 'x-deeeplink-team-signature',
    description: 'Endpoint only available for openmesh team',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('createLLM')
  createLLM(@Body() data: CreateLLMDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    if (
      String(req.headers['x-deeeplink-team-signature']) !==
      this.deeplinkSignature
    )
      throw new UnauthorizedException();
    return this.llmInstanceService.createLLM(data);
  }

  @ApiOperation({
    summary: 'ADMIN - delete the llm instance at sagemaker',
  })
  @ApiHeader({
    name: 'x-deeeplink-team-signature',
    description: 'Endpoint only available for openmesh team',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Delete('deleteLLMInstance')
  deleteLLMInstance(@Body() data: GetDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    if (
      String(req.headers['x-deeeplink-team-signature']) !==
      this.deeplinkSignature
    )
      throw new UnauthorizedException();
    return this.llmInstanceService.deleteLLMInstance(data);
  }

  @ApiOperation({
    summary: 'ADMIN - return the llm instances',
  })
  @ApiHeader({
    name: 'x-deeeplink-team-signature',
    description: 'Endpoint only available for openmesh team',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Get('getLLMInstances')
  getLLMInstances(@Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    if (
      String(req.headers['x-deeeplink-team-signature']) !==
      this.deeplinkSignature
    )
      throw new UnauthorizedException();
    return this.llmInstanceService.getLLMInstances();
  }
}
