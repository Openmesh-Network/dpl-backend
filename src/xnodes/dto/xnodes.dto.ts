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
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'The xnode name',
    maxLength: 100,
  })
  name: string;

  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'The xnode location',
    maxLength: 100,
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

export class XnodeStatusDto {
  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: "The xnode's id",
    maxLength: 100,
  })
  id: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  @ApiProperty({
    description: 'Status.',
  })
  status: string;
}

export class XnodeGetGenerationDto {
  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: "The xnode's id",
    maxLength: 100,
  })
  id: string;
}

export class XnodePushGenerationDto {
  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: "The xnode's id",
    maxLength: 100,
  })
  id: string;

  @IsNumber()
  @ApiProperty({
    description: 'Generation applied',
  })
  generation: number;
}

export class XnodeHeartbeatDto {
  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: "The xnode's id",
    maxLength: 100,
  })
  id: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Percent CPU used.',
  })
  cpuPercent: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Maximum CPU used.',
  })
  cpuPercentPeek: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'RAM used.',
  })
  ramMbUsed: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Total available RAM',
  })
  ramMbTotal: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Total available RAM',
  })
  ramMbPeek: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Storage used.',
  })
  storageMbUsed: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Total available storage.',
  })
  storageMbTotal: number;
}

export class GetXnodeServiceDto {
  @IsNotEmpty()
  @MaxLength(5000)
  @IsString()
  @ApiProperty({
    description: "The xnode's id",
    maxLength: 5000,
  })
  id: string;
}

export class PushXnodeServiceDto {
  @IsNotEmpty()
  @MaxLength(5000)
  @IsString()
  @ApiProperty({
    description: "The xnode's id",
    maxLength: 5000,
  })
  id: string;

  @IsNotEmpty()
  @MaxLength(50000)
  @IsString()
  @ApiProperty({
    description: "The xnode's services",
    maxLength: 50000,
  })
  services: string;
}

export class UpdateXnodeDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  @ApiProperty({
    description: 'Id of the Xnode',
    maxLength: 100,
  })
  xnodeId: string;

  @IsNotEmpty()
  @MaxLength(1000)
  @IsString()
  @ApiProperty({
    description: 'The Xnode name',
    maxLength: 100,
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

export class RegisterXnodeDeploymentDto {
  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'The xnode name',
    maxLength: 100,
  })
  name: string;

  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'The xnode location',
    maxLength: 100,
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

  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'Authentication token for heartbeats',
    maxLength: 100,
  })
  accessToken: string;

  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'Unique Xnode Identifier',
    maxLength: 100,
  })
  id: string;

  @IsOptional()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'Ip address of Xnode machine',
    maxLength: 100,
  })
  ipAddress: string;

  @IsOptional()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'Additional information required to identify the machine',
    maxLength: 100,
  })
  deploymentAuth: string;
}

export class RemoveXnodeDeploymentDto {
  @IsNotEmpty()
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'Unique Xnode Identifier',
    maxLength: 100,
  })
  id: string;
}
