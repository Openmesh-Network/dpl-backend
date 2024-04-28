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
  Min,
} from 'class-validator';

export class GetTemplatesDTO {
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Page number must be greater than 0.' })
  @ApiProperty({
    description: 'dataset page number',
  })
  page: number;
}
