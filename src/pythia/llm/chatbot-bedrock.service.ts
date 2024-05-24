import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import { PrismaService } from '../../database/prisma.service';
import { DeployerService } from './deployer.service';

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
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
import { ChatOpenAI } from '@langchain/openai';

import { Client } from 'pg';

@Injectable()
export class ChatbotBedrockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deployerService: DeployerService,
  ) {}

  chatModel = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  // chatModel = new Bedrock({
  //   model: 'meta.llama2-70b-chat-v1', // You can also do e.g. "anthropic.claude-v2"
  //   region: 'ap-southeast-2',
  //   // endpointUrl: "custom.amazonaws.com",
  //   credentials: {
  //     accessKeyId: process.env.AWS_S3_ACCESS_KEY,
  //     secretAccessKey: process.env.AWS_S3_KEY_SECRET,
  //   },
  //   maxTokens: 2048,
  //   temperature: 0,
    // modelKwargs: {},
  // });
  outputParser = new StringOutputParser();
  loader = new CheerioWebBaseLoader('https://docs.openmesh.network/');

  // const chatHistory = [ new HumanMessage("Can LangSmith help test my LLM applications?"), new AIMessage("Yes!"), ];
  async inputQuestion(chatHistory: any, newUserInput: string) {
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

    //historyAwareRetrieverChain should be sufficient for the workflow
    const conversationalRetrievalChain = await createRetrievalChain({
      retriever: historyAwareRetrieverChain,
      combineDocsChain: historyAwareCombineDocsChain,
    });

    // const result = await conversationalRetrievalChain.invoke({
    //   chat_history: chatHistory,
    //   input: newUserInput,
    // });

    // console.log(result.answer);
    // return result.answer;
    return "done";
  }

  
  // inputQuestion(chatHistory, prompt, showChart)
  //       if !showChart:
  //         do rag response
  //       else:
  //         getSQLQuery
  //         getDataFromDB
  //         getRechartsCode
          // do normal rag response to summarise
          // return recharts code and summary

  async getSQLQuery(chatHistory, prompt) {

    const chatModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    //RAG
    //setup vector database
    //create rag workflow
    //retrieve response

    //NORMAL

    const chatPromptTemplate = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder('chat_history'),
      ['user', '{input}'],
    ]);
  
    // Define the input with the given prompt
    const input = {
      chat_history: [],
      input: prompt,
    };
  
    // Initialize the output parser
    // const outputParser = new StringOutputParser();
    
    // const result = await chatModel.invoke({
    //   model: 'gpt-4',
    //   messages: chatPromptTemplate.renderMessages(input),
    //   max_tokens: 100,
    //   temperature: 0,
    // });

    const system_context = `Act as an expert programmer in SQL. You are an AI assistant that translates natural language into read-only SQL queries
    based on the provided schema: 

    CREATE TABLE trades_l2 (
      exchange character varchar,
      symbol character varchar,
      price double precision,
      size double precision,
      taker_side character varchar,
      trade_id character varchar,
      timestamp bigint,
    );
    
    Guidelines:
    1. Only output valid SQL querie compatible with postgresql, no other text or explanations.
    2. Design queries suitable for charts used in a charting library called Recharts.
    3. Trading pairs format: "BASE/QUOTE" (uppercase).
    4. Use trades_l2 table for all exchanges
    5. Exchange names are lowercase with first letter capitalised for eg. Binance, Coinbase.
    6. Timestamp is number of seconds since unix epoch
    7. By default price is denominated in USDT unless otherwise specified
    
    Prioritize:
    1. Accuracy and validity of the generated SQL query.
    2. Optimal use of the provided schema and tables.
    3. Relevance, conciseness and clarity of the query.`

    const user_prompt = "What was the highest price of aioz in the last month on binance" 

    // const messages = [
    //   { role: "system", content: system_context },
    //   { role: "user", content: "What was the highest price of ethereum in the last 7 days on binance" }
    // ];

    const messages = [
      new SystemMessage(system_context),
      new HumanMessage(user_prompt),
    ];
  
    // const result = await chatModel.invoke("Test message, is the llm responding?")
    const result = await chatModel.invoke(messages)
    console.log("result", result.content)
    // console.log("result.answer", result.answer)
    //return sql
  }

  async getDataFromDB(sql: string) {
    
    const client = new Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT, 10),
    });
  
    try {
      await client.connect();
      const result = await client.query(sql);
      console.log("result", result)
      console.log("rows", result.rows)
      return result.rows;
    } catch (error) {
      console.error('Error executing query', error.stack);
      throw new Error('Error executing query');
    } finally {
      await client.end();
    }
  }

  // async getRechartsCode(chatHistory, prompt, data) {
    
    //RAG
    //setup vector database
    //create rag workflow
    //retrieve response

    //NORMAL
    //call api with relevant context

}
