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
    // modelName: 'gpt-4'
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
          // isDataRequired
          // idealResponseStyle

          // if !isDataRequired
          //   getGenericResponse

          // else
          //   getSQLQuery
          //   getDataFromDB
            
          //   if idealResponseStyle == 'chart'
          //     getRechartsCode
          //     return rechartsCode, showChart = true, data
          //   else:
          //     getDataSummary
          //     return response, showChart = false, data

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
      // this.inputQuestion(chatHistory, prompt)
      const response = await this.getGenericResponse(chatHistory, prompt)

      return response
      // return {response: response, showChart: false}
    }
    else {
      
      //check if query is even asking for data
      // try {
      const sql = await this.getSQLQuery(chatHistory, prompt)
      // console.log(sql)
      const data = await this.getDataFromDB(sql)
      // console.log ("data", data)
      // console.log("array type of ", typeof [])
      // console.log("data type of", typeof data)
      // console.log("data row ", data[0])
      // console.log("data row type of ", typeof data[0])


      const rechartsCode = await this.getRechartsCode(chatHistory, prompt, data)

      const summary = await this.getDataSummary(chatHistory, prompt, data)

      const response = JSON.stringify({data: data, rechartsCode: rechartsCode, summary: summary})
      
      return response
    }
      
    //   return {response: {data: data, rechartsCode: rechartsCode, summary: summary},
    //            showChart: true}
    // }

  }

  async getSQLQuery(chatHistory, prompt) {

    // const chatModel = new ChatOpenAI({
    //   openAIApiKey: process.env.OPENAI_API_KEY,
    // });

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
    4. Do not start your response with the string 'sql' under any circumstances

    
    For example 
    
    Query: "Give me a chart that shows the date on x-axis and the average volume of eth on coinbase on that date on y axis. Show this data for the 7 days before 15 may 2024"

    Ideal response: SELECT date_trunc('day', to_timestamp(timestamp / 1000.0)) AS date,
                    SUM(size) AS avg_vol_eth
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
  
    const result = await this.chatModel.invoke(messages)
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
      // console.log("date type", typeof result.rows[0]['date'])
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
    2. Only output valid Recharts code, no other text or explanations. Your output should not contain any boilerplate code. If outputting a bar chart then the output should start with <BarChart data = {data}> and end with </BarChart>. 
    You can add other attributes to the chart if needed.
    3. Include a Title and a Legend if appropriate for easily readability of the chart
    4. The given data is the output of the given query to the database to fetch data that is most relevant to answer the query. Take into account both the query and the given data to generate your response.
    5. The data key for <XAxis> and <YAxis> should be exactly the same as one of the columns of the given data so it can be rendered correctly.

    Prioritize:
    1. Accuracy and validity of the generated Recharts code. It should be accurate enough to be directly embedded into existing react code expecting Recharts code.
    2. Optimal use of the provided data.

    For example:

    Example data: data =  [
      {
        date: "2024-05-01T00:00:00.000Z",
        avg_vol_eth: 12843.94708887969,
      },
      {
        date: "2024-05-02T00:00:00.000Z",
        avg_vol_eth: 6327.453490859986,
      },
      {
        date: "2024-05-03T00:00:00.000Z",
        avg_vol_eth: 4818.880204149984,
      },
      {
        date: "2024-05-04T00:00:00.000Z",
        avg_vol_eth: 3369.8290032999944,
      },
      {
        date: "2024-05-05T00:00:00.000Z",
        avg_vol_eth: 4019.9601397300016,
      },
      {
        date: "2024-05-06T00:00:00.000Z",
        avg_vol_eth: 7967.200585189962,
      },
      {
        date: "2024-05-07T00:00:00.000Z",
        avg_vol_eth: 6247.122841229904,
      },

      Example Query: show me a chart with average daily volume of eth traded on coinbase between 01/05/2024 and 08/05/2024

      Ideal Response: 

      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis dataKey="avg_vol_eth" />
        <Tooltip />
        <Legend verticalAlign="top" wrapperStyle={{ lineHeight: "40px" }} />
        <Line
          type="monotone"
          dataKey=""
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    ];
    
    Given data to visualize:\n${JSON.stringify(data)}`

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
    1. If the query asks a question, answer the question as best possible using the given data.
    2. If summarizing the data will help address the query then you should summarize the data.
    3. Do not output a chart or table or data of any kind. Your job is to just provide a textual summary or helpful answer. A different agent will display the chart to the user.
    4. Do not respond with I can't show a chart. That's not your job. The given query is ran through other AI agents before coming to you. Other agents will render a chart and fetch required data.
    Your job is to use the given data and either summarize it or answer the question if the original query contains a question.
    5. Do not mention any other agents. The agent architecture is for the backend, the user just knows they're chatting to a chatbot.
    6. You should only output a textual description and nothing else.

    Prioritize:
    1. Accuracy and validity of the generated response.
    2. Optimal use of the provided data.
    
    For eg. 
    
    Example Query: show me a chart with average daily volume of eth traded on coinbase between 01/05/2024 and 08/05/2024
    
    Example data: data =  [
      {
        date: "2024-05-01T00:00:00.000Z",
        avg_vol_eth: 12843.94708887969,
      },
      {
        date: "2024-05-02T00:00:00.000Z",
        avg_vol_eth: 6327.453490859986,
      },
      {
        date: "2024-05-03T00:00:00.000Z",
        avg_vol_eth: 4818.880204149984,
      },
      {
        date: "2024-05-04T00:00:00.000Z",
        avg_vol_eth: 3369.8290032999944,
      },
      {
        date: "2024-05-05T00:00:00.000Z",
        avg_vol_eth: 4019.9601397300016,
      },
      {
        date: "2024-05-06T00:00:00.000Z",
        avg_vol_eth: 7967.200585189962,
      },
      {
        date: "2024-05-07T00:00:00.000Z",
        avg_vol_eth: 6247.122841229904,
      },
    
    Ideal Response: The chart shows the average daily volume of ethereum on coinbase between the dates 01/05/2024 and 08/05/2024. 
    The highest volume was 12843 on 1st May and the lowest volume was on 4th May`
    
    
    // Given data to visualize:\n${data}`

    // const user_prompt = "Show me a chart with exchanges on x axis and trading volume for eth on 01/01/2024 on y axis on coinbase, binance and okx?" 

    const messages = [
      new SystemMessage(system_context),
    ];

    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt + `\n Use this data to respond to the above query: ${JSON.stringify(data)}`))
    // messages.push(new HumanMessage(''))
    
    // const data_context = `The given prompt was given to a database agent which fetched the relevant data required by the above query. Use this data and the query to present a coherent response.
    
    // The data is an array of objects where each object represents a row of data. 
    
    // Given data: ${data}`

    // messages.push(new SystemMessage(data_context))

    const result = await this.chatModel.invoke(messages)
    console.log("summary", result.content)
    return result.content
  }

  async getGenericResponse(chatHistory, prompt) {
    
    const system_context = `Act as an expert in Crypto, Web3 and Blockchain technology. You are a helpful assistant who provide responses to user questions based on the context in crypto, 
    blockchain and web3 only.`

    const messages = [
      new SystemMessage(system_context),
    ];
 
    // console.log("chatHistory", chatHistory)
    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt))

    const result = await this.chatModel.invoke(messages)

    console.log("generic response", result.content)
    return result.content
  }

}
