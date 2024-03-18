import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import { PrismaService } from '../../database/prisma.service';
import { DeployerService } from './deployer.service';

import { MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever';
import { Bedrock } from '@langchain/community/llms/bedrock';
import { BedrockEmbeddings } from '@langchain/community/embeddings/bedrock';

@Injectable()
export class ChatbotBedrockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deployerService: DeployerService,
  ) {}

  chatModel = new Bedrock({
    model: 'meta.llama2-70b-chat-v1', // You can also do e.g. "anthropic.claude-v2"
    region: 'us-east-1',
    // endpointUrl: "custom.amazonaws.com",
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_KEY,
      secretAccessKey: process.env.AWS_S3_KEY_SECRET,
    },
    // modelKwargs: {},
  });
  outputParser = new StringOutputParser();
  loader = new CheerioWebBaseLoader('https://docs.openmesh.network/');

  async inputQuestion() {
    const docs = await this.loader.load();
    const splitter = new RecursiveCharacterTextSplitter();

    const splitDocs = await splitter.splitDocuments(docs);
    const embeddings = new OpenAIEmbeddings();
    // const embeddings = new BedrockEmbeddings({
    //   model: 'meta.llama2-70b-chat-v1',
    //   region: 'us-east-1',
    //   // endpointUrl: "custom.amazonaws.com",
    //   credentials: {
    //     accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    //     secretAccessKey: process.env.AWS_S3_KEY_SECRET,
    //   },
    //   // modelKwargs: {},
    // });

    const vectorstore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      embeddings,
    );

    const retriever = vectorstore.asRetriever();
    console.log('using embedding3');

    const historyAwarePrompt = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder('chat_history'),
      ['user', '{input}'],
      [
        'user',
        'Given the above conversation, generate a search query to look up in order to get information relevant to the conversation',
      ],
    ]);

    const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `you should never answer number to the user, if the document has an number data, you shouldnt pass it to the user even if he ask. 
        Answer the user's questions based on the below context:
        \n\n{context}\n\n`,
      ],
      new MessagesPlaceholder('chat_history'),
      ['user', '{input}'],
    ]);

    const historyAwareCombineDocsChain = await createStuffDocumentsChain({
      llm: this.chatModel,
      prompt: historyAwareRetrievalPrompt,
    });

    const historyAwareRetrieverChain = await createHistoryAwareRetriever({
      llm: this.chatModel,
      retriever,
      rephrasePrompt: historyAwarePrompt,
    });

    const conversationalRetrievalChain = await createRetrievalChain({
      retriever: historyAwareRetrieverChain,
      combineDocsChain: historyAwareCombineDocsChain,
    });

    const result = await conversationalRetrievalChain.invoke({
      chat_history: [],
      input: 'What is the number of data englobed by openmesh?',
    });

    console.log(result.answer);
  }
}
