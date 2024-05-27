import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });

import { PrismaService } from '../../database/prisma.service';
import { DeployerService } from './deployer.service';

import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
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

    const result = await conversationalRetrievalChain.invoke({
      chat_history: chatHistory,
      input: newUserInput,
    });

    console.log(result.answer);
    return result.answer;
    // return "done";
  }


  
  // inputQuestion(chatHistory: any, prompt: string, showChart: boolean)
  //       if !showChart:
  //         do rag response
  //       else:
  //         getSQLQuery
  //         getDataFromDB
    //       makeDataVisualizable
  //         getRechartsCode
          // do normal rag response to summarise
          // return recharts code and summary

  async newInputQuestion(chatHistory: any, prompt: string, showChart: boolean = false) {

    if (!showChart) {
      //decide if data needed
      //  if data needed
      //      getSqlQuery
      //      getDatafromDB
      //      get
      //  else
      //    getResponse

    }
    else {

      // try {
      const sql = await this.getSQLQuery(chatHistory, prompt)
      console.log(sql)
      const data = await this.getDataFromDB(sql)
      const rechartsCode = await this.getRechartsCode(chatHistory, prompt, data)

      const summary = await this.getDataSummary(chatHistory, prompt, data)
      
      return {rechartsCode: rechartsCode, summary: summary}
    }

  }

  async getSQLQuery(chatHistory, prompt) {

    const chatModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    //RAG
    //setup vector database
    //create rag workflow
    //retrieve response
 
    //NORMAL
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
    1. Only output valid SQL querie compatible with postgresql, no other text or explanations. Especially do not output any backticks at the start or end. Do not start the response with "sql". Only a valid sql command as output.
    2. Design queries suitable for charts used in a charting library called Recharts.
    3. Trading pairs format: "BASE/QUOTE" (uppercase).
    4. Use trades_l2 table for all exchanges
    5. Exchange names are lowercase with first letter capitalised for eg. Binance, Coinbase.
    6. Timestamp is number of milli seconds(ms) since unix epoch
    7. By default price is denominated in USDT unless otherwise specified
    8. Structure the query such that no more than 1000 rows are fetched from the database
    9. Remember, to use date_trunc with timestamp as argument you will have to convert timestamp from bigint to type timestamp using to_timestamp(timestamp / 1000.0)
    10. Average volume over a time period is derived by summing all the sizes of all trades over that time period not by averaging the sizes of trades over that time period
    
    Prioritize:
    1. Accuracy and validity of the generated SQL query.
    2. Optimal use of the provided schema and tables.
    3. Relevance, conciseness and clarity of the query.
    
    For example 
    
    Query: "Give me a chart that shows the date on x-axis and the average volume of eth on coinbase on that date on y axis. Show this data for the 7 days before 15 may 2024"

    Ideal response: SELECT date_trunc('day', to_timestamp(timestamp / 1000.0)) AS date,
                    SUM(size) AS average_volume
                    FROM
                    trades_l2
                    WHERE
                    exchange = 'Coinbase'
                    AND symbol = 'ETH/USDT'
                    AND timestamp >= extract(epoch from timestamp '2024-05-08') * 1000
                    AND timestamp < extract(epoch from timestamp '2024-05-15' ) * 1000 GROUP BY date ORDER BY date;
    `

    // const user_prompt = "Show me a chart with exchanges on x axis and trading volume for eth on 01/01/2024 on y axis on coinbase, binance and okx?" 

    
    const messages = [
      new SystemMessage(system_context),
    ];

    //spread operator appends each value in chatHistory individually to messages resulting in a flat list
    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt))
  
    const result = await chatModel.invoke(messages)
    console.log("sql", result.content)
    // console.log("type", typeof result)
    // console.log("type", typeof result.content)
    return result.content
  }

  async getDataFromDB(sql) {
    
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
      // console.log("result", result)
      console.log("data", result.rows)
      return result.rows;
    } catch (error) {
      console.error('Error executing query', error.stack);
      throw new Error('Error executing query');
    } finally {
      await client.end();
    }
  }

  async getRechartsCode(chatHistory, prompt, data) {
    
    //RAG
    //setup vector database
    //create rag workflow
    //retrieve response

    //NORMAL
    //call api with relevant context
    const system_context = `Act as an expert programmer in Recharts library in React. You are an AI assistant that translates natural language into Recharts code which helps to best visualize the
    provided data and query. Do not include any explanations, descriptions, or other unrelated text.

    Guidelines:
    1. You have to decide the best type of chart to display to best visualize given data. You can display bar, line, area, pie chart etc. 
    2. Only output valid Recharts code, no other text or explanations. Your output should not contain any boilerplate code. If outputting a bar chart then the output should start with <BarChart> and end with </BarChart>
    3. Include a Title and a Legend if appropriate for easily readability of the chart

    Prioritize:
    1. Accuracy and validity of the generated Recharts code. It should be accurate enough to be directly embedded into existing react code expecting Recharts code.
    2. Optimal use of the provided data.
    
    Given data to visualize:\n${data}`

    // const user_prompt = "Show me a chart with exchanges on x axis and trading volume for eth on 01/01/2024 on y axis on coinbase, binance and okx?" 

    const messages = [
      new SystemMessage(system_context),
    ];

    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt))

    const result = await this.chatModel.invoke(messages)
    console.log("recharts", result.content)
    return result.content
  }

  async getDataSummary(chatHistory, prompt, data) {
    
    const system_context = `Act as an expert in Crypto, Web3 and Blockchain technology. You are an AI assistant that summarizes given data and also helps answer any queries regarding the data in a 
    most concise, helpful and useful manner.

    Guidelines:
    1. You have to best answer the given query using the given data. If the query asks a question, answer the question as best possible.
    2. If summarizing the data will help address the query then you should summarize the data.

    Prioritize:
    1. Accuracy and validity of the generated response.
    2. Optimal use of the provided data.
    
    Given data to visualize:\n${data}`

    // const user_prompt = "Show me a chart with exchanges on x axis and trading volume for eth on 01/01/2024 on y axis on coinbase, binance and okx?" 

    const messages = [
      new SystemMessage(system_context),
    ];

    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt))

    const result = await this.chatModel.invoke(messages)
    console.log("summary", result.content)
    return result.content
  }

}
