import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsString,
  IsOptional,
  ValidateNested,
  isEmail,
  MaxLength,
  MinLength,
  IsInt,
  Max,
  IsArray,
  IsEnum,
} from 'class-validator';

enum TagsEnum {
  IOT = 'IoT',
  WEB = 'Web development',
  CONSULTANCY = 'Consultancy',
  DESIGN = 'UI / UX',
  MARKETING = 'Marketing',
}

export class LoginDTO {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'User email',
    example: 'bruno@gmail.com',
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'User password',
    example: 'senha123',
  })
  password: string;
}

export class LoginWeb3DTO {
  @IsString()
  @ApiProperty({
    description: 'The user address',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  @IsNotEmpty()
  address: string;

  @IsString()
  @ApiProperty({
    description:
      'The create the submission, you need to provide a signature of the hash data to assure you are the profile owner',
    example:
      '0x921934902149120490123580392875903428590438590843905849035809438509438095',
  })
  @IsNotEmpty()
  signature: string;
}

export class GetUserNonceDTO {
  @IsString()
  @ApiProperty({
    description: 'The user address',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  @IsNotEmpty()
  address: string;
}

export class CreateOpenmeshExpertUserDTO {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'User email',
    example: 'bruno@gmail.com',
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Token to validate  recaptcha',
    example:
      '321321dk190-12k9=kkkkkkkk=k213k=wqd121=k=21d=k=k-==j120d98=1uhjd81902h12d8902h1d08921=hd21-98dh21982dh219dh-21d-12d12',
  })
  googleRecaptchaToken: string;

  @IsNotEmpty()
  @IsString()
  // @MinLength(8)
  @MaxLength(500)
  @ApiProperty({
    // minLength: 8,
    maxLength: 500,
    description: 'User-password-',
    example: '12345',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Company name',
    example: 'Bruno',
  })
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'githubLink',
    example: 'www.github.com',
  })
  githubLink: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'personal blog link',
    example: 'www.myBlog.com',
  })
  personalBlog: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    required: false,
    description: 'If the user registered through the openrd plataform.',
    example: true,
  })
  registrationByOpenRD: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description:
      'If there is any page it should redirect after the user email confirmation',
    example: 'www.myBlog.com',
  })
  pageRedirect: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    required: false,
    description: 'If the user is a company',
    example: true,
  })
  isCompany: boolean;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'First name',
    example: 'Bruno',
  })
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Last name',
    example: 'Santos',
  })
  lastName: string;

  @IsOptional()
  @IsInt()
  @Max(10000)
  @ApiProperty({
    required: false,
    maxLength: 10000,
    description: 'Company founding year',
    example: 2014,
  })
  foundingYear: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Company location',
    example: 'New York, US',
  })
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Company website',
    example: 'www.website.com.br',
  })
  website: string;

  @IsOptional()
  @IsArray()
  // @IsEnum(TagsEnum, {
  //   each: true,
  //   message:
  //     'Tag value must be one of the following: IoT, Web development, Consultancy, UI / UX, Marketing',
  // })
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Company tags',
    example: ['IoT'],
  })
  tags: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @ApiProperty({
    required: false,
    maxLength: 5000,
    description: 'Company description',
    example: 'Lorem ipsum relugaris',
  })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform((value) => `https://calendly.com/${value}`)
  @ApiProperty({
    required: false,
    maxLength: 5000,
    description: 'Company calendly sub-path link',
    example: 'kathleen-ragos/1?month=2023-09',
  })
  scheduleCalendlyLink: string;

  @IsString()
  @ApiProperty({
    description: 'The user profile picture hash',
    example: 'ipfs://21312d10dj1209d091290d29012id09',
  })
  @IsOptional()
  profilePictureHash: string;
}

export class CreateOpenmeshExpertVerifiedContributorUserDTO {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'User email',
    example: 'bruno@gmail.com',
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Token to validate  recaptcha',
    example:
      '321321dk190-12k9=kkkkkkkk=k213k=wqd121=k=21d=k=k-==j120d98=1uhjd81902h12d8902h1d08921=hd21-98dh21982dh219dh-21d-12d12',
  })
  googleRecaptchaToken: string;

  @IsNotEmpty()
  @IsString()
  // @MinLength(8)
  @MaxLength(500)
  @ApiProperty({
    // minLength: 8,
    maxLength: 500,
    description: 'User-password-',
    example: '12345',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Company name',
    example: 'Bruno',
  })
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'User walletAddress',
    example: '0x29104dasiksaksass',
  })
  walletAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'githubLink',
    example: 'www.github.com',
  })
  githubLink: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'personal blog link',
    example: 'www.myBlog.com',
  })
  personalBlog: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    required: false,
    description: 'If the user registered through the openrd plataform.',
    example: true,
  })
  registrationByOpenRD: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description:
      'If there is any page it should redirect after the user email confirmation',
    example: 'www.myBlog.com',
  })
  pageRedirect: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    required: false,
    description: 'If the user is a company',
    example: true,
  })
  isCompany: boolean;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'First name',
    example: 'Bruno',
  })
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Last name',
    example: 'Santos',
  })
  lastName: string;

  @IsOptional()
  @IsInt()
  @Max(10000)
  @ApiProperty({
    required: false,
    maxLength: 10000,
    description: 'Company founding year',
    example: 2014,
  })
  foundingYear: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Company location',
    example: 'New York, US',
  })
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Company website',
    example: 'www.website.com.br',
  })
  website: string;

  @IsOptional()
  @IsArray()
  // @IsEnum(TagsEnum, {
  //   each: true,
  //   message:
  //     'Tag value must be one of the following: IoT, Web development, Consultancy, UI / UX, Marketing',
  // })
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Company tags',
    example: ['IoT'],
  })
  tags: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @ApiProperty({
    required: false,
    maxLength: 5000,
    description: 'Company description',
    example: 'Lorem ipsum relugaris',
  })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform((value) => `https://calendly.com/${value}`)
  @ApiProperty({
    required: false,
    maxLength: 5000,
    description: 'Company calendly sub-path link',
    example: 'kathleen-ragos/1?month=2023-09',
  })
  scheduleCalendlyLink: string;

  @IsString()
  @ApiProperty({
    description: 'The user profile picture hash',
    example: 'ipfs://21312d10dj1209d091290d29012id09',
  })
  @IsOptional()
  profilePictureHash: string;
}

export class UpdateOpenmeshExpertUserDTO {
  @IsOptional()
  @IsEmail()
  @ApiProperty({
    description: 'User email',
    example: 'bruno@gmail.com',
  })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Company name',
    example: 'Bruno',
  })
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'githubLink',
    example: 'www.github.com',
  })
  githubLink: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'personal blog link',
    example: 'www.myBlog.com',
  })
  personalBlog: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    required: false,
    description: 'If the user is a company',
    example: true,
  })
  isCompany: boolean;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'First name',
    example: 'Bruno',
  })
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Last name',
    example: 'Santos',
  })
  lastName: string;

  @IsOptional()
  @IsInt()
  @Max(10000)
  @ApiProperty({
    maxLength: 10000,
    description: 'Company founding year',
    example: 2014,
  })
  foundingYear: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Company location',
    example: 'New York, US',
  })
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Company website',
    example: 'www.website.com.br',
  })
  website: string;

  @IsOptional()
  @IsArray()
  // @IsEnum(TagsEnum, {
  //   each: true,
  //   message:
  //     'Tag value must be one of the following: IoT, Web development, Consultancy, UI / UX, Marketing',
  // })
  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Company tags',
    example: ['IoT'],
  })
  tags: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @ApiProperty({
    maxLength: 5000,
    description: 'Company description',
    example: 'Lorem ipsum relugaris',
  })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform((value) => `https://calendly.com/${value}`)
  @ApiProperty({
    maxLength: 5000,
    description: 'Company calendly sub-path link',
    example: 'kathleen-ragos/1?month=2023-09',
  })
  scheduleCalendlyLink: string;

  @IsString()
  @ApiProperty({
    description: 'The user profile picture hash',
    example: 'ipfs://21312d10dj1209d091290d29012id09',
  })
  @IsOptional()
  profilePictureHash: string;
}

export class ConfirmEmailDTO {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    minLength: 8,
    maxLength: 500,
    description: 'Email confirm hash',
    example: '12345',
  })
  id: string;
}

export class EmailRecoverPasswordDTO {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    minLength: 8,
    maxLength: 500,
    description: 'Email to whom the recover password link must be send',
    example: 'agame@gmail.com',
  })
  email: string;
}

export class RecoverPasswordDTO {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'New password set by the user',
    example: 'senha123',
  })
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Id sent through email link for recovery',
    example: '212302130248281428401480824082121321321321321321',
  })
  objectId: string;
}

export class RecoverPasswordIsValidDTO {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Id sent through email link for recovery',
    example: '212302130248281428401480824082121321321321321321',
  })
  objectId: string;
}

export class ChangePasswordOpenmeshExpertUserDTO {
  @IsNotEmpty()
  @IsString()
  // @MinLength(8)
  @MaxLength(500)
  @ApiProperty({
    // minLength: 8,
    maxLength: 500,
    description: 'User new password',
    example: '12345',
  })
  password: string;

  @IsNotEmpty()
  @IsString()
  // @MinLength(8)
  @MaxLength(500)
  @ApiProperty({
    // minLength: 8,
    maxLength: 500,
    description: 'User old password',
    example: '12345',
  })
  oldPassword: string;
}

export class LoginResponseDTO {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Session token to auth the user',
    example:
      'bruno@gmail.comeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM0ZWNhZDhmLTA1OWUtNGYyOS1hYjU1LTI2N2FjOTkwYjRkZSIsImlhdCI6MTY5NDUyNzAwOCwiZXhwIjoxNjk0Njk5ODA4fQ.g3vlpaak7Qy3TlBTKRqrF-VuHkchznfgs0jot00Drxk',
  })
  sessionToken: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'User email',
    example: 'bruno@gmail.com',
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Company name',
    example: 'Bruno',
  })
  companyName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Name',
    example: 'Bruno',
  })
  name: string;

  @IsNotEmpty()
  @IsInt()
  @Max(10000)
  @ApiProperty({
    maxLength: 10000,
    description: 'Company founding year',
    example: 2014,
  })
  foundingYear: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Company location',
    example: 'New York, US',
  })
  location: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    maxLength: 500,
    description: 'Company website',
    example: 'www.website.com.br',
  })
  website: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'If the user wants to schedule a call',
    example: true,
  })
  scheduleCall: string;

  @IsNotEmpty()
  @IsArray()
  // @IsEnum(TagsEnum, {
  //   each: true,
  //   message:
  //     'Tag value must be one of the following: blockchain, frontend, backend',
  // })
  @ApiProperty({
    maxLength: 500,
    description: 'Company tags',
    example: ['backend'],
  })
  tags: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  @ApiProperty({
    maxLength: 5000,
    description: 'Company description',
    example: 'Lorem ipsum relugaris',
  })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform((value) => `https://calendly.com/${value}`)
  @ApiProperty({
    maxLength: 5000,
    description: 'Company calendly sub-path link',
    example: 'kathleen-ragos/1?month=2023-09',
  })
  scheduleCalendlyLink: string;

  @IsString()
  @ApiProperty({
    description: 'The user profile picture hash',
    example: 'ipfs://21312d10dj1209d091290d29012id09',
  })
  @IsOptional()
  profilePictureHash: string;
}
