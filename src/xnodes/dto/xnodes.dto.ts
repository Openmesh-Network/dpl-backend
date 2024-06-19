import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsString,
  IsOptional,
  ValidateNested,
  IsInt,
  IsDateString,
  ArrayMaxSize,
  IsArray,
  MaxLength,
  IsEnum,
  Min,
  Max,
  IsNumberString,
} from 'class-validator';

enum XnodeEnum {
  DRAFT = 'Draft',
  DEPLOYING = 'Deploying',
  RUNNING = 'Running',
  OFF = 'Off',
}

export class CreateXnodeDto {
  @IsNotEmpty()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'The xnode name',
    maxLength: 1000,
  })
  name: string;

  @IsNotEmpty()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'The xnode location',
    maxLength: 1000,
  })
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiProperty({
    required: false,
    description: 'The xnode desc',
    maxLength: 1000,
  })
  description: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Provider',
    example: 'equinix',
  })
  provider: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: 'Is the Xnode being deployed a unit.',
  })
  isUnit: boolean;

  @IsString()
  // XXX: Might have to allow more than max 50 services.
  @ApiProperty({
    required: false,
    description: 'The nft id or api key',
    example: ['{}'],
  })
  deploymentAuth: string;

  @IsNotEmpty()
  @IsString()
  // XXX: Might have to allow more than max 50 services.
  @ApiProperty({
    required: false,
    // TODO: Clarify this with good example or whatever.
    description: 'A json string with all the services.',
    example: ['{}'],
  })
  // It's just an array of JSON objects from the DPL's perspective, it does no parsing really.
  // TODO: Maybe check validity at this stage? Would involve duplicating definition from frontend...
  // Frontend check should probably be enough.
  services: string;
}

export class XnodeHeartbeatDto {
  @IsNotEmpty()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'The xnode\'s id',
    maxLength: 1000,
  })
  id: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Percent CPU used.'
  })
  cpuPercent: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Maximum CPU used.'
  })
  cpuPercentPeek: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'RAM used.'
  })
  ramMbUsed: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Total available RAM'
  })
  ramMbTotal: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Total available RAM'
  })
  ramMbPeek: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Storage used.'
  })
  storageMbUsed: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Total available storage.'
  })
  storageMbTotal: number;
}

export class GetXnodeServiceDto {
  @IsNotEmpty()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'The xnode\'s id',
    maxLength: 1000,
  })
  id: string;
}

export class UpdateXnodeDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  @ApiProperty({
    description: 'Id of the Xnode',
    maxLength: 1000,
  })
  xnodeId: string;

  @IsNotEmpty()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'The Xnode name',
    maxLength: 1000,
  })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiProperty({
    required: false,
    description: 'The Xnode desc',
    maxLength: 1000,
  })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  @ApiProperty({
    required: false,
    description:
      'The xnode nodes - The nodes that exists in the console created by the user',
  })
  consoleNodes: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  @ApiProperty({
    required: false,
    description:
      'The xnode edges - The edges (connections bettwen nodes) that exists in the console created by the user',
  })
  consoleEdges: string;
}

export class GetXnodeDto {
  @IsNotEmpty()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'The xnode id',
    maxLength: 1000,
  })
  id: string;
}

export class ConnectAPI {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The api key',
    example: '2012-12--32-134--214-213421412-421412',
  })
  apiKey: string;
}

export class StoreXnodeSigningMessageDataDTO {
  @IsNotEmpty()
  @MaxLength(10000)
  @IsString()
  @ApiProperty({
    description: 'The xnode id',
    example: '321',
    maxLength: 10000,
  })
  xnodeId: string;

  @IsNotEmpty()
  @MaxLength(10000)
  @IsString()
  @ApiProperty({
    description: 'The signed message',
    example:
      '0x9204i12df90jk209dijk12092i1903i90213i920390213i9012i3902i30921i903i213903i9012i39012i903ehjd209jh1209',
    maxLength: 10000,
  })
  signedMessage: string;
}

export class StoreXnodeData {
  @IsNotEmpty()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'The xnode build id',
    example: '321',
    maxLength: 1000,
  })
  buildId: string;

  @IsOptional()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'Url1',
    example: 'https://query.ju98i2.tech.openmesh.network',
    maxLength: 1000,
  })
  url1: string;

  @IsOptional()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'Url1',
    example: 'https://query.ju98i2.tech.openmesh.network',
    maxLength: 1000,
  })
  url2: string;

  @IsOptional()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'Url1',
    example: 'https://query.ju98i2.tech.openmesh.network',
    maxLength: 1000,
  })
  url3: string;

  @IsOptional()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'Url1',
    example: 'https://query.ju98i2.tech.openmesh.network',
    maxLength: 1000,
  })
  url4: string;

  @IsOptional()
  @MaxLength(100000)
  @IsString()
  @ApiProperty({
    description: 'Any additional value',
    example: 'https://query.ju98i2.tech.openmesh.network',
    maxLength: 100000,
  })
  additional: string;
}
