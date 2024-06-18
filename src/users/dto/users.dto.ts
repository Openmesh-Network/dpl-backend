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
} from 'class-validator';

export class GetUserDTO {
  @IsString()
  @ApiProperty({
    description: 'The user address',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  @IsNotEmpty()
  address: string;

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
}

export class GetUserResponseDTO {
  @ApiProperty({
    example: {
      id: 'bec93c74-ce9d-42ce-82ad-ea3fdb95780c',
      name: 'Bruno',
      address: '0x0D49C384055bAe6865982e40fC811264fAA1DA17',
      profilePictureHash: 'QmZAQsTMLET4BWuG1sLk3mstGkir3MsYkp81LwAJRfgpEP',
      tags: ['nestjs'],
      links: ['www.github.com.br'],
      joinedSince: '1690762870',
      updatesNonce: '3',
      jobSuccess: '33',
      totalEarned: '5000',
      createdAt: '2023-08-01T01:01:47.814Z',
      updatedAt: '2023-08-02T01:20:36.295Z',
      tasks: [
        {
          id: 'f0750fde-74cf-41fa-a6a4-e691be32c1e7',
          status: 'open',
          deadline: '1691118000',
          daysLeft: '2 days left',
          executor: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
          type: 'Group',
          skills: ['Solidity', 'Web development'],
          skillsSearch: 'Solidity Web development',
          departament: 'Frontend',
          description: 'ewqe',
          title: 'My new task',
          file: '',
          links: [
            '{"title":"githubLink","url":"www.github.com"}',
            '{"title":"calendarLink","url":"www.teste.com"}',
            '{"title":"reachOutLink","url":"www.linkedin.com"}',
          ],
          applications: '[]',
          estimatedBudget: '5555555555555555555.56',
          contributorsNeeded: '1',
          contributors: [
            '{"address": "0x08ADb3400E48cACb7d5a5CB386877B3A159d525C"}',
          ],
          projectLength: 'Less than 1 week',
          createdAt: '2023-07-27T22:33:35.499Z',
          updatedAt: '2023-07-29T18:05:42.855Z',
        },
        {
          id: 'def3f8fc-77e8-4067-9070-85712d335f08',
          status: 'open',
          deadline: '1691118000',
          daysLeft: '2 days left',
          executor: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
          type: 'Group',
          skills: ['Frontend', 'Solidity'],
          skillsSearch: 'Frontend Solidity',
          departament: 'Frontend',
          description:
            'A new task new task new task new task new task new task',
          title: 'A new task',
          file: '',
          links: [
            '{"title":"githubLink","url":"www.com.br"}',
            '{"title":"calendarLink","url":"www.teste.com"}',
            '{"title":"reachOutLink","url":"www.maor.com"}',
          ],
          applications:
            '[["QmZQvs4qfK9iYxfAZxb6XwTz6vexkvLjmJy4iKZURUB5Rt","0x0DD7167d9707faFE0837c0b1fe12348AfAabF170",false,[[true,"0x0DD7167d9707faFE0837c0b1fe12348AfAabF170",{"type":"BigNumber","hex":"0x056bc75e2d63100000"}]]],["QmRWXzq12HPDvQReok9k61wN6KWu9DkzsgHkvvLQLA236S","0x0DD7167d9707faFE0837c0b1fe12348AfAabF170",false,[[true,"0x0DD7167d9707faFE0837c0b1fe12348AfAabF170",{"type":"BigNumber","hex":"0x056bc75e2d63100000"}]]],["QmQkR8A2LuePYAyWvieNLTjPJB7VYysP3HDkP9wwTEHtoj","0x0DD7167d9707faFE0837c0b1fe12348AfAabF170",false,[[true,"0x0DD7167d9707faFE0837c0b1fe12348AfAabF170",{"type":"BigNumber","hex":"0x056bc75e2d63100000"}]]],["QmNVasxcx7fEzLRJGTd1pmKdKXo4sUD3FTjhxxYHBaDCFh","0x0DD7167d9707faFE0837c0b1fe12348AfAabF170",false,[[true,"0x0DD7167d9707faFE0837c0b1fe12348AfAabF170",{"type":"BigNumber","hex":"0x056bc75e2d63100000"}]]],["QmeYWiG8vZ4QZTdMmG2rrZ1Pyksz5dSQ5WY6PAbwf6fpkn","0x0D49C384055bAe6865982e40fC811264fAA1DA17",false,[[true,"0x0D49C384055bAe6865982e40fC811264fAA1DA17",{"type":"BigNumber","hex":"0x056bc75e2d63100000"}]]],["","0x0D49C384055bAe6865982e40fC811264fAA1DA17",false,[[true,"0x0D49C384055bAe6865982e40fC811264fAA1DA17",{"type":"BigNumber","hex":"0x056bc75e2d63100000"}]]],["QmQaky2WzfG7DzyWbh6X6QYEsshNVHCEeSpdHUwm1fkq2b","0x0D49C384055bAe6865982e40fC811264fAA1DA17",false,[[true,"0x0D49C384055bAe6865982e40fC811264fAA1DA17",{"type":"BigNumber","hex":"0x056bc75e2d63100000"}]]]]',
          estimatedBudget: '420',
          contributorsNeeded: '2 to 4',
          contributors: [
            '{"address": "0x08ADb3400E48cACb7d5a5CB386877B3A159d525C"}',
            '{"address": "0x0DD7167d9707faFE0837c0b1fe12348AfAabF170"}',
          ],
          projectLength: '1 to 2 weeks',
          createdAt: '2023-07-27T22:33:35.464Z',
          updatedAt: '2023-08-01T11:25:13.527Z',
        },
      ],
    },
  })
  @IsNotEmpty()
  object;
}

export class EditUserDTO {
  @IsString()
  @ApiProperty({
    description: 'The user address',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  @IsNotEmpty()
  address: string;

  @IsString()
  @ApiProperty({
    description: 'The user display name',
    example: 'Fabio',
  })
  @IsOptional()
  name: string;

  @IsString()
  @ApiProperty({
    description: 'The user profile picture hash',
    example: 'Fabio',
  })
  @IsOptional()
  profilePictureHash: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({
    description: 'The user tags',
    example: ['Frontend', 'Marketing'],
  })
  tags: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({
    description: 'The user links',
    example: ['www.github.com/bruno'],
  })
  links: string[];

  @IsString()
  @ApiProperty({
    description:
      'The update a profile, you need to provide a signature of the hash data to assure you are the profile owner',
    example:
      '0x921934902149120490123580392875903428590438590843905849035809438509438095',
  })
  @IsNotEmpty()
  signature: string;

  @IsString()
  @ApiProperty({
    description: 'Used to verifies the signature validate',
    example: '0',
    default: '0',
  })
  @IsNotEmpty()
  nonce: string;
}

export class GithubLoginDTO {
  @IsString()
  @ApiProperty({
    description:
      'The code returned on the frontend as soon as the user authorize the connection',
    example: '32134521512',
  })
  @IsNotEmpty()
  code: string;
}

export class VerifiedContributorSubmissionDTO {
  @IsString()
  @ApiProperty({
    description: 'The user address',
    example: '0x08ADb3400E48cACb7d5a5CB386877B3A159d525C',
  })
  @IsNotEmpty()
  address: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({
    description: 'Additional links to help on the submission',
    example: ['www.linkedin.com/bruno'],
  })
  links: string[];

  @IsString()
  @MaxLength(5000)
  @ApiProperty({
    description:
      'Please give us some details about your qualifications to be a Verified Contributor',
    example: 'Lorem ipsum religaris',
  })
  @IsNotEmpty()
  description: string;

  @IsString()
  @ApiProperty({
    description:
      'The create the submission, you need to provide a signature of the hash data to assure you are the profile owner',
    example:
      '0x921934902149120490123580392875903428590438590843905849035809438509438095',
  })
  @IsNotEmpty()
  signature: string;

  @IsString()
  @ApiProperty({
    description:
      'The create the submission, you need to connect a github account, this is the access token returned by the backend when doing the /githubLogin',
    example:
      '392823109uedijw09qjd09qwduwq90dj09dj120389du2y19021j0912dujd21890jd1209',
  })
  @IsNotEmpty()
  githubAccessToken: string;

  @IsString()
  @ApiProperty({
    description: 'Used to verifies the signature validate',
    example: '0',
    default: '0',
  })
  @IsNotEmpty()
  nonce: string;
}
