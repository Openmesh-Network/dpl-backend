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
} from 'class-validator';

export class GetTasksDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The task departament',
    enum: ['Data', 'Blockchain', 'Cloud', 'Frontend'],
  })
  departament: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The task status 0 -> open; 1 -> active; 2 -> completed',
    enum: ['0', '1', '2'],
  })
  status: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Returning tasks with a longer or a shorter deadline compared to the currently time',
    enum: ['newest', 'oldest'],
  })
  deadlineSorting: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Search tasks based on its title and skills',
    example: 'Web3 development of website',
  })
  searchBar: string;

  @IsOptional()
  @IsInt()
  @ApiProperty({
    description: 'Current page for pagination',
    minimum: 1,
    default: 1,
  })
  page: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({
    description: 'Tasks limit per page for pagination',
    minimum: 1,
    default: 10,
  })
  limit: number;
}

class PaymentDto {
  @ApiProperty({ example: '0x6eFbB027a552637492D827524242252733F06916' })
  @IsString()
  tokenContract: string;

  @ApiProperty({ example: '10000000000000000000' })
  @IsString()
  amount: string;

  @ApiProperty({ example: '18' })
  @IsString()
  decimals: string;
}

export class TaskDto {
  @ApiProperty({ description: 'The task id onchain', example: 0 })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'The task status',
    example: 'open',
    enum: ['open', 'active', 'completed'],
  })
  @IsString()
  status: string;

  @ApiProperty({ example: ['Frontend', 'Web development', 'Backend'] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({
    example: 'Frontend',
    enum: ['Data', 'Blockchain', 'Cloud', 'Frontend'],
  })
  @IsString()
  departament: string;

  @ApiProperty({
    description:
      'getting the value from the tokens we return the estimated budget in USD.',
    example: '520.21',
  })
  @IsString()
  estimatedBudget: string;

  @ApiProperty({
    example: 'Individual',
    enum: ['Individual', 'Group'],
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'the task deadline in Unix timestamp',
    example: '1689811200',
  })
  @IsString()
  deadline: string;

  @ApiProperty({
    description: 'How many days are left to do the task',
    example: '15 days left',
  })
  @IsString()
  daysLeft: string;

  @ApiProperty({ example: 'Lorem ipsum relgiar' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'My Task' })
  @IsString()
  title: string;

  // @ApiProperty({
  //   example: [
  //     '{"title": "My video","url": "https://www.youtube.com/watch?v=zizonToFXDs"}',
  //   ],
  // })
  // @IsArray()
  // @IsString({ each: true })
  // links: string[];

  @ApiProperty({
    type: [PaymentDto],
    example: [
      {
        tokenContract: '0x6eFbB027a552637492D827524242252733F06916',
        amount: '10000000000000000000',
        decimals: '18',
      },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];
}

class PaginationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  currentPage: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  totalPages: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  totalTasks: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  limit: number;
}

class CountingDto {
  @ApiProperty({
    description: 'Of the total tasks after the filtering, how many are open',
    example: 1,
  })
  @IsNumber()
  open: number;

  @ApiProperty({
    description: 'Of the total tasks after the filtering, how many are active',
    example: 2,
  })
  @IsNumber()
  active: number;

  @ApiProperty({
    description:
      'Of the total tasks after the filtering, how many are completed',
    example: 20,
  })
  @IsNumber()
  completed: number;
}

export class TasksResponseDto {
  @ApiProperty({
    type: [TaskDto],
    example: [
      {
        id: 1,
        status: 'open',
        skills: ['Frontend', 'Web development', 'Backend'],
        departament: 'Frontend',
        type: 'Individual',
        deadline: '1689811200',
        daysLeft: '0 day left',
        description: 'Lorem ipsum relgiar',
        title: 'My Task',
        payments: [
          {
            tokenContract: '0x6eFbB027a552637492D827524242252733F06916',
            amount: '10000000000000000000',
            decimals: '18',
          },
        ],
      },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks: TaskDto[];

  @ApiProperty({
    type: CountingDto,
    example: {
      open: 1,
      active: 2,
      completed: 20,
    },
  })
  @ValidateNested()
  @Type(() => CountingDto)
  counting: CountingDto;

  @ApiProperty({
    type: PaginationDto,
    example: {
      currentPage: 1,
      totalPages: 2,
      totalTasks: 20,
      limit: 10,
    },
  })
  @ValidateNested()
  @Type(() => CountingDto)
  pagination: CountingDto;
}

export class GetTaskDto {
  @IsString()
  @ApiProperty({
    description: 'How many days are left to do the task',
    example: '15 days left',
  })
  @IsNotEmpty()
  id: string;
}
