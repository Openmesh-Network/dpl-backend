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
    description:
      'Returning tasks with a greater or lesser estimated budget - this sorting has priority over deadlineSorting',
    enum: ['greater', 'lesser'],
  })
  estimatedBudgetSorting: string;

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

class ApplicationDto {
  @IsString()
  @ApiProperty({
    description: 'Application id onchain',
    example: '2',
  })
  applicationId: string;

  @IsArray()
  @ValidateNested()
  @Type(() => RewardDto)
  @ApiProperty({
    description: 'Rewards smart-contract logic',
  })
  reward: RewardDto[];

  @IsString()
  @ApiProperty({
    description: 'Application proposer',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  proposer: string;

  @IsString()
  @ApiProperty({
    description: 'Application applicant',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  applicant: string;

  @IsString()
  @ApiProperty({
    description: 'Application description',
    example: 'Lorem ipsum...',
  })
  metadataDescription: string;

  @IsNumber()
  @ApiProperty({
    description: 'Percentage of how much of the budget the user is asking for',
    example: 98,
  })
  metadataProposedBudget: number;

  @IsBoolean()
  @ApiProperty({
    description: 'If the application was accepted',
    example: true,
  })
  accepted: boolean;

  @IsBoolean()
  @ApiProperty({
    description:
      'used to track if the task description has any pottencial link spam',
    example: false,
  })
  hasSpamLink: boolean;

  @IsString()
  @ApiProperty({
    description: 'Any additional link',
    example: 'www.mysite.com.br',
  })
  metadataAdditionalLink: string;

  @IsString()
  @ApiProperty({
    description: 'The name that the user wants to show in his application',
    example: 'Bruno',
  })
  metadataDisplayName: string;

  @IsString()
  @ApiProperty({
    description:
      'Timestamp Unix global in seconds of when the event was emitted',
    example: '16904383',
  })
  timestamp: string;
}

class SubmissionDto {
  @IsString()
  @ApiProperty({
    description: 'Submission id',
    example: '2',
  })
  id: string;

  @IsString()
  @ApiProperty({
    description: 'Submission id onchain',
    example: '2',
  })
  submissionId: string;

  @IsString()
  @ApiProperty({
    description: 'Submission proposer',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  proposer: string;

  @IsString()
  @ApiProperty({
    description: 'Submission applicant',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  applicant: string;

  @IsString()
  @ApiProperty({
    description: 'Submission description',
    example: 'Lorem ipsum...',
  })
  metadataDescription: string;

  @IsBoolean()
  @ApiProperty({
    description: 'If the Submission was accepted',
    example: true,
  })
  accepted: boolean;

  @IsBoolean()
  @ApiProperty({
    description: 'If the Submission was reviewed',
    example: true,
  })
  reviewed: boolean;

  @ApiProperty({
    description: 'Any additional link',
    example: 'www.mysite.com.br',
  })
  @IsArray()
  @IsString({ each: true })
  metadataAdditionalLink: string[];

  @IsString()
  @ApiProperty({
    description: 'The review outcome of this submission',
    example: 'Rejected',
    enum: ['Accepted', 'Rejected'],
  })
  review: string;

  @IsString()
  @ApiProperty({
    description:
      'Timestamp Unix global in seconds of when the event was emitted',
    example: '16904383',
  })
  timestamp: string;
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
  @ApiProperty({
    description: 'Id used to, if its a task draft, get its id',
    example: '21321321-312312312-3213123-213123213',
  })
  @IsString()
  internalId: string;

  @ApiProperty({ description: 'The task id onchain', example: 0 })
  @IsNumber()
  id: number;

  @ApiProperty({
    description:
      'When the metadata for this task is eddited, set this parameter as true',
    example: true,
  })
  @IsBoolean()
  metadataEdited: boolean;

  @ApiProperty({
    description:
      'When the budgetIncreased for this task is eddited, set this parameter as true',
    example: true,
  })
  @IsBoolean()
  budgetIncreased: boolean;

  @ApiProperty({
    description:
      'When the deadlineIncreased for this task is eddited, set this parameter as true',
    example: true,
  })
  @IsBoolean()
  deadlineIncreased: boolean;

  @ApiProperty({
    description: 'The task status',
    example: 'open',
    enum: ['open', 'active', 'completed'],
  })
  @IsString()
  status: string;

  @ApiProperty({
    description:
      'If the task was taken (application accepted and etc), who is the address that is in charge of doing the task',
    example: '0xas01298d02i2d2d1d121dd21',
  })
  @IsString()
  executor: string;

  @ApiProperty({
    description: 'The task creator',
    example: '0xas01298d02i2d2d1d121dd21',
  })
  @IsString()
  creator: string;

  @ApiProperty({
    description: 'The task manager',
    example: '0xas01298d02i2d2d1d121dd21',
  })
  @IsString()
  manager: string;

  @ApiProperty({
    description: 'How many events there are - updates',
    example: 2,
  })
  @IsNumber()
  updatesCount: number;

  @ApiProperty({ example: ['Frontend', 'Web development', 'Backend'] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({
    type: ApplicationDto,
  })
  @ValidateNested({ each: true })
  @Type(() => ApplicationDto)
  application: ApplicationDto[];

  @ApiProperty({
    example: 'Frontend',
    // enum: ['Data', 'Blockchain', 'Cloud', 'Frontend'],
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

export class CountingDto {
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
        internalId: '20310213-213213213-21312321321-321313213123',
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
  @Type(() => PaginationDto)
  counting: PaginationDto;

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
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The chain task id',
    example: '2',
  })
  id: string;
}

export class GetUserToDraftTaskDto {
  @IsString()
  @ApiProperty({
    description: 'The chain task id',
    example: '2',
  })
  @IsNotEmpty()
  id: string;

  @IsString()
  @ApiProperty({
    description: 'The user address',
    example: '0xasdadd12231dwqwddwqsad2141dwwq',
  })
  @IsNotEmpty()
  address: string;
}

export class GetTokensNecessaryToFillRequestDTO {
  @IsString()
  @ApiProperty({
    description: 'The chain task id',
    example: '2',
  })
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @ApiProperty({
    description:
      'The percentage the user is requesting from the total estimated budget',
    example: 100,
  })
  @IsNotEmpty()
  percentage: number;
}

export class GetSubmissionDto {
  @IsString()
  @ApiProperty({
    description: 'The submission id on the backend',
    example: '1b7183d6-5e63-426d-9ceb-59818289a3fa',
  })
  @IsNotEmpty()
  id: string;
}

class RewardDto {
  @IsBoolean()
  @ApiProperty({
    description: 'Smart-contract logic',
    example: false,
  })
  nextToken: boolean;

  @IsString()
  @ApiProperty({
    description: 'Smart-contract logic',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  address: string;

  @IsInt()
  @ApiProperty({
    description: 'Smart-contract logic',
    example: 10000,
  })
  amount: number;
}

export class GetSubmissionResponseDto {
  @ApiProperty({
    type: TaskDto,
    example: {
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
  })
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  task: TaskDto;

  @ApiProperty({
    type: TaskDto,
    example: {
      id: '6f7f3ba1-e61e-4088-8884-12b843e32933',
      submissionId: '0',
      metadata: 'QmcaXGVw5TsHR3v9xymqjCUN5Nox3LRru7EtEwRaAxVDKi',
      proposer: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',
      applicant: '0x0DD7167d9707faFE0837c0b1fe12348AfAabF170',
      accepted: false,
      metadataDescription: 'I worked hard on this submission',
      metadataAdditionalLinks: ['www.github.com/my-repo'],
      timestamp: '1691096446',
      transactionHash:
        '0x9ab4c6d1e65d9d8e0edcd389d585f8d4a10080cf85706d7edba7d48ccbe064fa',
      blockNumber: '38607613',
      taskId: '1',
      createdAt: '2023-08-03T21:00:55.691Z',
      updatedAt: '2023-08-03T21:00:55.691Z',
    },
  })
  @ValidateNested({ each: true })
  @Type(() => SubmissionDto)
  submission: SubmissionDto;
}
