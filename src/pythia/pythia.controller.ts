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
  FeedbackInput,
  GetDTO,
  GetPythiaChatDto,
  InputMessageDTO,
  InputMessageNonUserDTO,
} from './dto/pythia.dto';
import { DeployerService } from './llm/deployer.service';
import { LLMInstanceService } from './llm/llm.service';
import { ChatbotService } from './llm/chatbot.service';
import { ChatbotBedrockService } from './llm/chatbot-bedrock.service';

@ApiTags('Pythia - Managing pythia')
@Controller('pythia/functions')
export class PythiaController {
  constructor(
    private readonly pythiaService: PythiaService,
    private readonly llmInstanceService: LLMInstanceService,
    private readonly deployerService: DeployerService,
    private readonly chatbotService: ChatbotService,
    private readonly chatbotBedrockService: ChatbotBedrockService,
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
    summary:
      'Input a new non-user message in the open chat - anonymous chat - istn required to login',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('inputNonUserChatMessage')
  inputNonUserChatMessage(
    @Body() data: InputMessageNonUserDTO,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.pythiaService.inputNonUserChatMessage(data);
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
    summary: ' Bad feedback about certain response from the llm',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Put('insertBadFeedbackInput')
  insertBadFeedbackInput(@Body() data: FeedbackInput, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.pythiaService.insertBadFeedbackInput(data, req);
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

  @ApiOperation({
    summary: 'Call bot',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('inputQuestion')
  inputQuestion(@Body() data: any, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();

    const data1 = `[
              {
                  "exchange": "Binance",
                  "trading_volume": 2685773.9500000686
              },
              {
                  "exchange": "Okx",
                  "trading_volume": 514174.6446540662
              }
            ]`

    const data2 = `[
      {
        "date": "2024-05-01T00:00:00Z",
        "average_volume": 12843.947088879631
      },
      {
        "date": "2024-05-02T00:00:00Z",
        "average_volume": 6327.4534908599835
      },
      {
        "date": "2024-05-03T00:00:00Z",
        "average_volume": 4818.880204149982
      },
      {
        "date": "2024-05-04T00:00:00Z",
        "average_volume": 3369.8290032999944
      },
      {
        "date": "2024-05-05T00:00:00Z",
        "average_volume": 4019.9601397300016
      },
      {
        "date": "2024-05-06T00:00:00Z",
        "average_volume": 7967.200585189992
      },
      {
        "date": "2024-05-07T00:00:00Z",
        "average_volume": 6247.122841229915
      }
    ]`

    const avgVolPrompt = "how me a chart with average daily volume of eth traded on coinbase between 01/05/2024 and 08/05/2024"
    
    // return this.chatbotBedrockService.inputQuestion([], 'hello what do you do');
    return this.chatbotBedrockService.newInputQuestion([], avgVolPrompt, true);
    // return this.chatbotBedrockService.getSQLQuery([], 'show me a chart with average daily volume of eth traded on coinbase between 01/05/2024 and 08/05/2024');
    // return this.chatbotBedrockService.getRechartsCode([], 'show me a chart with average daily volume of eth traded on coinbase between 01/05/2024 and 08/05/2024', data2);
    // const sql = "SELECT * from trades LIMIT 10;"
    // return this.chatbotBedrockService.getDataFromDB(sql);
  }

  // @ApiOperation({
  //   summary: 'Call bot',
  // })
  // @ApiHeader({
  //   name: 'X-Parse-Application-Id',
  //   description: 'Token mandatory to connect with the app',
  // })
  // @Post('inputQuestion2')
  // inputQuestion2(@Body() data: any, @Req() req: Request) {
  //   const apiToken = String(req.headers['x-parse-application-id']);
  //   if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
  //   return this.chatbotBedrockService.inputQuestion(data.history, data.input);
  // }

}
