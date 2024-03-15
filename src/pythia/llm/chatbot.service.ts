import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import { PrismaService } from '../../database/prisma.service';
import { DeployerService } from './deployer.service';

import { MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class ChatbotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deployerService: DeployerService,
  ) {}

  chatModel = new ChatOpenAI({
    openAIApiKey: '',
  });
  outputParser = new StringOutputParser();

  async inputQuestion() {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'You are a world class technical documentation writer.'],
      ['user', '{input}'],
    ]);
    const chain = prompt.pipe(this.chatModel).pipe(this.outputParser);
    const res = await chain.invoke({
      input: 'what is LangSmith?',
    });
    console.log(res);
  }
}
