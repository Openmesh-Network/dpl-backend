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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';

import { Request } from 'express';

import { OpenmeshExpertsAuthService } from './openmesh-experts-auth.service';
import {
  ChangePasswordOpenmeshExpertUserDTO,
  ConfirmEmailDTO,
  CreateOpenmeshExpertUserDTO,
  CreateOpenmeshExpertVerifiedContributorUserDTO,
  EmailRecoverPasswordDTO,
  LoginDTO,
  LoginResponseDTO,
  LoginWeb3DTO,
  RecoverPasswordDTO,
  RecoverPasswordIsValidDTO,
  UpdateOpenmeshExpertUserDTO,
} from './dto/openmesh-experts-auth.dto';
import { OpenmeshExpertsEmailManagerService } from './openmesh-experts-email-manager.service';

@ApiTags(
  'Openmesh-experts - Companies / individuals that qualify to become an openmesh expert endpoints.',
)
@Controller('openmesh-experts/functions')
export class OpenmeshExpertsController {
  constructor(
    private readonly openmeshExpertsAuthService: OpenmeshExpertsAuthService,
    private readonly openmeshExpertsEmailManagerService: OpenmeshExpertsEmailManagerService,
  ) {}

  apiTokenKey = process.env.API_TOKEN_KEY;
  deeplinkSignature = process.env.DEEPLINK_TEAM_SIGNATURE;

  @ApiOperation({
    summary: 'Create an openmesh user',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('createUser')
  createUser(@Body() data: CreateOpenmeshExpertUserDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.createUser(data);
  }

  @ApiOperation({
    summary:
      'Create an openmesh user if he wants to become a verified contributor',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('createUserByVerifiedContributor')
  createUserByVerifiedContributor(
    @Body() data: CreateOpenmeshExpertVerifiedContributorUserDTO,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.createUserByVerifiedContributor(
      data,
    );
  }

  @ApiOperation({
    summary: 'Login an openmesh user',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @ApiResponse({ status: 200, type: LoginResponseDTO })
  @Post('login')
  login(@Body() data: LoginDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.login(data);
  }

  @ApiOperation({
    summary: 'Login by web3 flow an openmesh user',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @ApiResponse({ status: 200, type: LoginResponseDTO })
  @Post('loginByWeb3Address')
  loginByWeb3Address(@Body() data: LoginWeb3DTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.loginByWeb3Address(data);
  }

  @ApiOperation({
    summary: 'Login an openmesh user',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @ApiResponse({ status: 200, type: LoginResponseDTO })
  @Post('loginOpenRD')
  loginOpenRD(@Body() data: LoginDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.loginOpenRD(data);
  }

  @ApiOperation({
    summary: 'validateRecaptcha from google',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('validateRecaptcha')
  @ApiResponse({ status: 200, type: Boolean })
  validateRecaptcha(@Body() data: any, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.validateRecaptcha(data);
  }

  @ApiOperation({
    summary: 'Return user info',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('getCurrentUser')
  getCurrentUser(@Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.getCurrentUser(req);
  }

  @ApiOperation({
    summary: 'Updates the user',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('updateUser')
  updateUser(@Body() data: UpdateOpenmeshExpertUserDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.updateUser(data, req);
  }

  @ApiOperation({
    summary: 'Changes user password',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('changePassword')
  changePassword(
    @Body() data: ChangePasswordOpenmeshExpertUserDTO,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.changePassword(data, req);
  }

  @ApiOperation({
    summary: 'Confirms the user email',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('confirmEmail')
  confirmEmail(@Body() data: ConfirmEmailDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.confirmEmail(data);
  }

  @ApiOperation({
    summary: 'Sends an email to recover user password',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('emailRecoverPassword')
  emailRecoverPassword(
    @Body() data: EmailRecoverPasswordDTO,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.emailRecoverPassword(data);
  }

  @ApiOperation({
    summary:
      'Recover the password, after sending the email and the user putting the new password.',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('recoverPassword')
  recoverPassword(@Body() data: RecoverPasswordDTO, @Req() req: Request) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.recoverPassword(data);
  }

  @ApiOperation({
    summary: 'Checks if exists a valid recover password with this id',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @Post('recoverPasswordIdIsValid')
  recoverPasswordIdIsValid(
    @Body() data: RecoverPasswordIsValidDTO,
    @Req() req: Request,
  ) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.recoverPasswordIdIsValid(data);
  }

  @ApiOperation({
    summary: 'Get users csv',
  })
  @ApiHeader({
    name: 'X-Parse-Application-Id',
    description: 'Token mandatory to connect with the app',
  })
  @ApiResponse({ status: 200, type: LoginResponseDTO })
  @Get('getUsersCSV')
  getUsersCSV(@Req() req: Request, @Res() response: Response) {
    const apiToken = String(req.headers['x-parse-application-id']);
    if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
    if (
      String(req.headers['x-deeeplink-team-signature']) !==
      this.deeplinkSignature
    )
      throw new UnauthorizedException();
    return this.openmeshExpertsAuthService.getUsersCSV(response);
  }

  // @ApiOperation({
  //   summary: 'Changes user password',
  // })
  // @ApiHeader({
  //   name: 'X-Parse-Application-Id',
  //   description: 'Token mandatory to connect with the app',
  // })
  // @Post('testEmail')
  // testEmail(@Req() req: Request) {
  //   const apiToken = String(req.headers['x-parse-application-id']);
  //   if (apiToken !== this.apiTokenKey) throw new UnauthorizedException();
  //   return this.openmeshExpertsEmailManagerService.testEmail(
  //     'brunolsantos152@gmail.com',
  //     '1232213',
  //   );
  // }
}
