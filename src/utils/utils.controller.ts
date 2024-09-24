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
import { UtilsService } from './utils.service';

@ApiTags('Utils')
@Controller('functions')
export class UsersController {
  constructor(private readonly utilsService: UtilsService) {}

  apiTokenKey = process.env.API_TOKEN_KEY;
}
