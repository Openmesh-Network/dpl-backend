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
import { BigQuery } from '@google-cloud/bigquery';


@Injectable()
export class ChatbotBedrockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deployerService: DeployerService,
  ) {}
  
  chatModel = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  gpt3 = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  gpt4o = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-4o',
  }); 

  // keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  bigQuery = new BigQuery({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    projectId: process.env.GCP_PROJECT_ID
  });

  // bigQuery = new BigQuery({
  //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  //   projectId: process.env.GCP_PROJECT_ID
  // });

  bigQuerySql = "SELECT * FROM `bigquery-public-data.crypto_ethereum.INFORMATION_SCHEMA.TABLES`;"

  example_data = [
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
    }
  ]

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

  schema = `CREATE TABLE trades_l2 (
    exchange character varchar,
    symbol character varchar,
    price double precision,
    size double precision,
    taker_side character varchar,
    trade_id character varchar,
    timestamp bigint,
  );
  `

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

    //No charts, bigQuery workflow

    // const isDataRequired = await this.isDataRequired(chatHistory, prompt)
    // if (!isDataRequired) {
    //   const response = await this.getGenericResponse(chatHistory, prompt)
    //   return JSON.stringify({response: response})
    // }
    // else {
    //   const sql = await this.getSQLQuery(chatHistory, prompt)
    //   const data = await this.getData(sql)
    //   const response = await this.getDataDescription(chatHistory, prompt, data)

    //   return JSON.stringify({response: response})
    // }

    //new charts workflow
    const isDataRequired = await this.isDataRequired(chatHistory, prompt)
    if (!isDataRequired) {
      const response = await this.getGenericResponse(chatHistory, prompt)
      return JSON.stringify({response: response})
    }
    else {
      const sql = await this.getSQLQuery(chatHistory, prompt)
      const [data, xkey, ykey] = await this.getData(sql)

      console.log("data", data)
      console.log("xkey", xkey)
      console.log("ykey", ykey)

      const isChartRequired = await this.isChartRequired(chatHistory, prompt)
      const response = await this.getDataDescription(chatHistory, prompt, data)

      if (isChartRequired) {
        // const rechartsCode = await this.getRechartsCode(chatHistory, prompt, data)
        // const summary = await this.getDataSummary(chatHistory, prompt, data)
        // const response = JSON.stringify({data: data, rechartsCode: rechartsCode, summary: summary})

        if (Array.isArray(data) && data.length === 0) {
          return {response: response}
        } else {
          return JSON.stringify({data: data, xkey: xkey, ykey: ykey, response: response})
        }
      }
        // else {
        //   const summary = await this.getDataSummary(chatHistory, prompt, data)
        //   return JSON.stringify({response: summary})
        // }

      return JSON.stringify({response: response})
    }


    //Charts workflow
    // console.log("chat history", chatHistory)
    // console.log("prompt", prompt)
    // const isDataRequired = await this.isDataRequired(chatHistory, prompt)

    // if (!isDataRequired) {
      
    //   console.log("getting here")
    //   const response = await this.getGenericResponse(chatHistory, prompt)
    //   return JSON.stringify({response: response})
    // }
    // else {
    //   console.log("wrong place")
    //   const sql = await this.getSQLQuery(chatHistory, prompt)
    //   const data = await this.getDataFromDB(sql)

    //   const isChartRequired = this.isChartRequired(chatHistory, prompt)
      
    //   if (isChartRequired) {
    //     const rechartsCode = await this.getRechartsCode(chatHistory, prompt, data)
    //     const summary = await this.getDataSummary(chatHistory, prompt, data)
    //     // const response = JSON.stringify({data: data, rechartsCode: rechartsCode, summary: summary})

    //     if (Array.isArray(data) && data.length === 0) {
    //       return {response: summary}
    //     } else {
    //       return JSON.stringify({data: data, rechartsCode: rechartsCode, response: summary})
    //     }
    //   }
    //   else {
    //     const summary = await this.getDataSummary(chatHistory, prompt, data)
    //     return JSON.stringify({response: summary})
    //   }

    // }

    // const bigQueryResponse = await this.runBigQuerySQL(this.bigQuerySql);
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
    based on the provided schemas. There are 2 data sources-
    
    1. Ethereum blockchain data from BigQuery
    2. Cryptocurrency CEX trading data on a postgresql database.
    
    Schema for CEX trading data on postgres database:
    ${this.schema}

    Schema for available BigQuery tables
    ${this.bigQuerySchema}
    
    Guidelines for postgres database queries:
    1. Only output valid SQL queries. If you're trying to query CEX trading data the SQL query should be correct according to postgresql.
    1.a no other text or explanations. Especially do not output any backticks at the start or end. Do not start the response with "sql". Only a valid sql command as output.
    2. Design queries suitable for charts used in a charting library called Recharts.
    3. Trading pairs format: "BASE/QUOTE" (uppercase).
    4. Use trades_l2 table for all exchanges
    5. Exchange names are lowercase with first letter capitalised for eg. Binance, Coinbase.
    6. Timestamp is number of milli seconds(ms) since unix epoch
    7. By default price is denominated in USDT unless otherwise specified
    8. Structure the query such that no more than 1000 rows are fetched from the database
    9. Remember, to use date_trunc with timestamp as argument you will have to convert timestamp from bigint to type timestamp using to_timestamp(timestamp / 1000.0)
    10. Average volume over a time period is derived by summing all the sizes of all trades over that time period not by averaging the sizes of trades over that time period
    
    Guidelines for Big Query database queries:
    1. If you're trying to query Big Query ethereum data set, the SQL query should be correct accoring to BigQuery SQL
    2. Carefully examine the big query schema when writing sql query for big query. Take special care around how data type for 
    time stamps are defined and if it needs to be converted. 

    Prioritize:
    1. Accuracy and validity of the generated SQL query.
    2. Optimal use of the provided schema and tables.
    3. Relevance, conciseness and clarity of the query.
    4. Do not start your response with the string 'sql' under any circumstances

    
    For example 
    
    Query: "Give me a chart that shows the date on x-axis and the volume of eth on coinbase on that date on y axis. Show this data for the 7 days before 15 may 2024"

    Ideal response: SELECT date_trunc('day', to_timestamp(timestamp / 1000.0)) AS date,
                    SUM(size) AS vol_eth
                    FROM
                    trades_l2
                    WHERE
                    exchange = 'Coinbase'
                    AND symbol = 'ETH/USDT'
                    AND timestamp >= extract(epoch from timestamp '2024-05-08') * 1000
                    AND timestamp < extract(epoch from timestamp '2024-05-15' ) * 1000 GROUP BY date ORDER BY date;

    Query: what was the number of the last ethereum block?
    Ideal response: SELECT number
                    FROM \`bigquery-public-data.crypto_ethereum.blocks\`
                    ORDER BY timestamp DESC
                    LIMIT 1;

    Query: what was the average gas fee on eth yesterday?
    Ideal response: SELECT AVG(gas_price) AS avg_gas_price_yesterday
                    FROM \`bigquery-public-data.crypto_ethereum.transactions\`
                    WHERE DATE(block_timestamp) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

    Query: How many total transactions every day over the Last week on ethereum blockchain
    Ideal response: SELECT DATE(block_timestamp) AS date,
                    COUNT(*) AS total_transactions
                    FROM \`bigquery-public-data.crypto_ethereum.transactions\`
                    WHERE block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                    GROUP BY date
                    ORDER BY date;
    `

    // const user_prompt = "Show me a chart with exchanges on x axis and trading volume for eth on 01/01/2024 on y axis on coinbase, binance and okx?" 

    
    const messages = [
      new SystemMessage(system_context),
    ];

    //spread operator appends each value in chatHistory individually to messages resulting in a flat list
    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt))
  
    const result = await this.gpt4o.invoke(messages)
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

  async getData(sql) {
    const isPostgresQuery = await this.isPostgresQuery(sql)

    
    let response;
    let xkey;
    let ykey;
    
    if (isPostgresQuery) {
      response = await this.getDataFromDB(sql)
      xkey = Object.keys(response[0])[0]
      ykey = Object.keys(response[0])[1]

    if (xkey === "date") {

      response = response.map(item => ({
        [xkey]: new Date(item.date).toLocaleDateString(), // Transform date to readable format
        [ykey]: item[ykey]
      }));
    }
    
    console.log("postgres response transformed", response);
    }
    
    else {
      response = await this.runBigQuerySQL(sql)
      xkey = Object.keys(response[0])[0]
      ykey = Object.keys(response[0])[1]
      
      console.log("xkey", typeof xkey)
      console.log("ykey", typeof ykey)
      
      if (xkey === "date") {

        response = response.map(item => ({
          [xkey]: item[xkey]["value"],
          [ykey]: item[ykey]
        }));

        console.log("flat response", response)
      } 
    }

    return [response, xkey, ykey]
  }

  async isPostgresQuery(sql: any) {

    const system_context = `You are a helpful AI assistant. You will be given sql queries in prompts. The queries will either be trying
    to query ethereum blockchain data from big query. Or it will be trying to query cryptocurrency CEX trades data from custom database. 
    
    Guidelines:
    1. You only respond with 'true' or 'false'
    2. You responsd 'true' if the query is trying to get cryptocurrency CEX trades data from a custom database table called 'trades_l2'
    3. You responsd 'false' if the query is trying to get ethereum blockchain data from Big Query's ethereum blockchain dataset`

    const messages = [
      new SystemMessage(system_context),
    ];
 
    // console.log("chatHistory", chatHistory)
    // messages.push(...chatHistory)

    const prompt = `Is the following sql trying to access CEX trades data? ${sql}`
    
    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt))

    const result = await this.gpt4o.invoke(messages)

    console.log("isPostgresQuery", result.content)
    return result.content == 'true'
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

    const result = await this.gpt4o.invoke(messages)
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

    const result = await this.gpt4o.invoke(messages)
    console.log("summary", result.content)
    return result.content
  }

  async getDataDescription(chatHistory, prompt, data) {
    const system_context = `Act as an expert in Crypto, Web3 and Blockchain technology. You are an AI assistant that explains given data and also helps answer any queries regarding the data in a 
    most concise, helpful and useful manner.

    Guidelines:
    1. If the query asks a question, answer the question as best possible using the given data.
    2. If explaining the data will help address the query then you should explain the data.
    3. Do not output a table. Only describe the data in text.
    4. Your job is to use the given data and either explain it or answer the question if the original query contains a question.
    5. If the data you get is empty or not sufficient to answer the query. Say that you don't have the necessary data to answer. Don't say that the data hasn't been provided.
    6. Don't refer to the provided data. Just describe the data. The user of the chat bot can't see any data. They can only see your explanation and output.
    7. Use the provided schema to interpret the given data. If the data is about ethereum block chain data use the BigQuery schema. Else use the Postgres cryptocurrency CEX data.

    Prioritize:
    1. Accuracy and validity of the generated response.
    2. Optimal use of the provided data.

    Postgres Crypto CEX trades data schema: ${this.schema}
    BigQuery Ethereum blockchain data schema: ${this.bigQuerySchema}

    // Given data to describe:\n${JSON.stringify(data)}`
    
    const example = `For eg.  Example Query: what was the average daily volume of eth traded on coinbase between 01/05/2024 and 08/05/2024
    Ideal Response: 
    `

    const messages = [
      new SystemMessage(system_context),
    ];

    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    // messages.push(new HumanMessage(prompt + `\n Use this data to respond to the above query: ${JSON.stringify(data)}`))
    messages.push(new HumanMessage(prompt))

    const result = await this.gpt4o.invoke(messages)
    console.log("data description", result.content)
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

    const result = await this.gpt4o.invoke(messages)

    console.log("generic response", result.content)
    return result.content
  }

  async isChartRequired(chatHistory, prompt) {
    
    const system_context = `
    1. You are an AI agent that only return a boolean value. 'true' or 'false'
    2. You return true if the users prompt requests for a chart or visualization. You will also return true 
        if the prompt doesn't explicitly request for a chart but a chart would be the best way to visualize/answer the prompt.
    3. You return false if the best way to respond to the prompt is textual.

    Example Prompt: Show me a chart of bitcoin trade sizes on coinbase per day for the last week
    Ideal Response: true

    Example Prompt: Does coinbase have a AIOZ/USDT pair?
    Ideal Response: false

    Example Prompt: What was the highest price of eth on coinbase on 1 May 2024
    Ideal Response: false
    `

    const messages = [
      new SystemMessage(system_context),
    ];
 
    // console.log("chatHistory", chatHistory)
    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt))

    const result = await this.gpt4o.invoke(messages)

    console.log("chartRequired", result.content == 'true')
    return result.content == 'true'
  }

  async isDataRequired(chatHistory, prompt) {

    const system_context = `
    You are an AI agent that only returns a boolean value. 'true' or 'false'
    
    Data from 2 datasets is available to the chat bot. 
    
    1. The first data set is trades data from cryptocurrency CEX's. It has the following schema: ${this.schema}
    2. The second data set is big query ethereum blockchain dataset. Any data regarding ethereum blockchain like block number, 
    transactions, tokens etc can be answered through this. It has the following schema: ${this.bigQuerySchema}

    1. You return true if the users prompt would be best responded by fetching some of the data from the schema and 
        using that to give a response to the user
    2. You return false if the users prompt doesn't need any data that's available in the above schema to answer.

    Example Prompt: Show me a chart of bitcoin trade sizes on coinbase per day for the last week
    Ideal Response: true

    Example Prompt: Does coinbase have a AIOZ/USDT pair?
    Ideal Response: true

    Example Prompt: What is web3?
    Ideal Response: false

    Example Prompt: What was the last ethereum block
    Ideal Response: true

    Example Prompt: What was the average gas price on eth last month?
    Ideal Response: true

    Example Prompt: What was the total volume of eth on coinbase on 1 May 2024
    Ideal Response: true
    `

    const messages = [
      new SystemMessage(system_context),
    ];
 
    // console.log("chatHistory", chatHistory)
    messages.push(...chatHistory)

    // messages.push(new HumanMessage(user_prompt))
    messages.push(new HumanMessage(prompt))

    const result = await this.gpt4o.invoke(messages)

    console.log("isDataRequired", result.content)
    // console.log("isData", result.content == 'true')
    return result.content == 'true'
  }

  async runBigQuerySQL(sql: string) {
    try {
      const [job] = await this.bigQuery.createQueryJob({ query: sql });
      console.log(`Job ${job.id} started.`);
  
      // Wait for the query to finish
      const [rows] = await job.getQueryResults();
  
      // Convert rows to JSON object
      const result = JSON.stringify(rows);
      
      // Output the JSON object
      console.log(result);
  
      // Alternatively, return the JSON object if used in a function
      return rows;
  
    } catch (error) {
      console.error('ERROR:', error);
    }
  }

  bigQuerySchema = `
  Tokens
  CREATE TABLE \`bigquery-public-data.crypto_ethereum.tokens\`\n(\n
  address STRING NOT NULL OPTIONS(description\u003d\"The address of the ERC20 token\"),\n
  symbol STRING OPTIONS(description\u003d\"The symbol of the ERC20 token\"),
  name STRING OPTIONS(description\u003d\"The name of the ERC20 token\"),\n  
  decimals STRING OPTIONS(description\u003d\"The number of decimals the token uses. Use safe_cast for casting to NUMERIC or FLOAT64\"),\n  
  total_supply STRING OPTIONS(description\u003d\"The total token supply. Use safe_cast for casting to NUMERIC or FLOAT64\"),\n  
  block_timestamp TIMESTAMP NOT NULL OPTIONS(description\u003d\"Timestamp of the block where this token was created\"),\n  
  block_number INT64 NOT NULL OPTIONS(description\u003d\"Block number where this token was created\"),\n  
  block_hash STRING NOT NULL OPTIONS(description\u003d\"Hash of the block where this token was created\")\n)\nOPTIONS(\n  description\u003d\"Token data.\\nData is exported using https://github.com/medvedev1088/ethereum-etl\"\n);",

  Blocks
  CREATE TABLE \`bigquery-public-data.crypto_ethereum.blocks\`\n(\n  timestamp TIMESTAMP NOT NULL OPTIONS(description\u003d\"The timestamp for when the block was collated\"),\n  number INT64 NOT NULL OPTIONS(description\u003d\"The block number\"),\n  \`hash\` STRING NOT NULL OPTIONS(description\u003d\"Hash of the block\"),\n  parent_hash STRING OPTIONS(description\u003d\"Hash of the parent block\"),\n  nonce STRING NOT NULL OPTIONS(description\u003d\"Hash of the generated proof-of-work\"),\n  sha3_uncles STRING OPTIONS(description\u003d\"SHA3 of the uncles data in the block\"),\n  logs_bloom STRING OPTIONS(description\u003d\"The bloom filter for the logs of the block\"),\n  transactions_root STRING OPTIONS(description\u003d\"The root of the transaction trie of the block\"),\n  state_root STRING OPTIONS(description\u003d\"The root of the final state trie of the block\"),\n  receipts_root STRING OPTIONS(description\u003d\"The root of the receipts trie of the block\"),\n  miner STRING OPTIONS(description\u003d\"The address of the beneficiary to whom the mining rewards were given\"),\n  difficulty NUMERIC OPTIONS(description\u003d\"Integer of the difficulty for this block\"),\n  total_difficulty NUMERIC OPTIONS(description\u003d\"Integer of the total difficulty of the chain until this block\"),\n  size INT64 OPTIONS(description\u003d\"The size of this block in bytes\"),\n  extra_data STRING OPTIONS(description\u003d\"The extra data field of this block\"),\n  gas_limit INT64 OPTIONS(description\u003d\"The maximum gas allowed in this block\"),\n  gas_used INT64 OPTIONS(description\u003d\"The total used gas by all transactions in this block\"),\n  transaction_count INT64 OPTIONS(description\u003d\"The number of transactions in the block\"),\n  base_fee_per_gas INT64 OPTIONS(description\u003d\"Protocol base fee per gas, which can move up or down\"),\n  withdrawals_root STRING OPTIONS(description\u003d\"The root of the withdrawal trie of the block\"),\n  withdrawals ARRAY\u003cSTRUCT\u003cindex INT64, validator_index INT64, address STRING, amount STRING\u003e\u003e OPTIONS(description\u003d\"Validator withdrawals\"),\n  blob_gas_used INT64 OPTIONS(description\u003d\"The total amount of blob gas consumed by transactions in the block\"),\n  excess_blob_gas INT64 OPTIONS(description\u003d\"A running total of blob gas consumed in excess of the target, prior to the block. This is used to set blob gas pricing\")\n)\nPARTITION BY DATE(timestamp)\nOPTIONS(\n  description\u003d\"The Ethereum blockchain is composed of a series of blocks. This table contains a set of all blocks in the blockchain and their attributes.\\nData is exported using https://github.com/medvedev1088/ethereum-etl\"\n);

  Token transfer
  "CREATE TABLE \`bigquery-public-data.crypto_ethereum.token_transfers\`\n(\n  token_address STRING NOT NULL OPTIONS(description\u003d\"ERC20 token address\"),\n  from_address STRING OPTIONS(description\u003d\"Address of the sender\"),\n  to_address STRING OPTIONS(description\u003d\"Address of the receiver\"),\n  value STRING OPTIONS(description\u003d\"Amount of tokens transferred (ERC20) / id of the token transferred (ERC721). Use safe_cast for casting to NUMERIC or FLOAT64\"),\n  transaction_hash STRING NOT NULL OPTIONS(description\u003d\"Transaction hash\"),\n  log_index INT64 NOT NULL OPTIONS(description\u003d\"Log index in the transaction receipt\"),\n  block_timestamp TIMESTAMP NOT NULL OPTIONS(description\u003d\"Timestamp of the block where this transfer was in\"),\n  block_number INT64 NOT NULL OPTIONS(description\u003d\"Block number where this transfer was in\"),\n  block_hash STRING NOT NULL OPTIONS(description\u003d\"Hash of the block where this transfer was in\")\n)\nPARTITION BY DATE(block_timestamp)\nOPTIONS(\n  description\u003d\"The most popular type of transaction on the Ethereum blockchain invokes a contract of type ERC20 to perform a transfer operation, moving some number of tokens from one 20-byte address to another 20-byte address.\\nThis table contains the subset of those transactions and has further processed and denormalized the data to make it easier to consume for analysis of token transfer events.\\nData is exported using https://github.com/medvedev1088/ethereum-etl\\n\"\n)

  Transactions 
  CREATE TABLE \`bigquery-public-data.crypto_ethereum.transactions\`\n(\n  \`hash\` STRING NOT NULL OPTIONS(description\u003d\"Hash of the transaction\"),\n  nonce INT64 NOT NULL OPTIONS(description\u003d\"The number of transactions made by the sender prior to this one\"),\n  transaction_index INT64 NOT NULL OPTIONS(description\u003d\"Integer of the transactions index position in the block\"),\n  from_address STRING NOT NULL OPTIONS(description\u003d\"Address of the sender\"),\n  to_address STRING OPTIONS(description\u003d\"Address of the receiver. null when its a contract creation transaction\"),\n  value NUMERIC OPTIONS(description\u003d\"Value transferred in Wei\"),\n  gas INT64 OPTIONS(description\u003d\"Gas provided by the sender\"),\n  gas_price INT64 OPTIONS(description\u003d\"Gas price provided by the sender in Wei\"),\n  input STRING OPTIONS(description\u003d\"The data sent along with the transaction\"),\n  receipt_cumulative_gas_used INT64 OPTIONS(description\u003d\"The total amount of gas used when this transaction was executed in the block\"),\n  receipt_gas_used INT64 OPTIONS(description\u003d\"The amount of gas used by this specific transaction alone\"),\n  receipt_contract_address STRING OPTIONS(description\u003d\"The contract address created, if the transaction was a contract creation, otherwise null\"),\n  receipt_root STRING OPTIONS(description\u003d\"32 bytes of post-transaction stateroot (pre Byzantium)\"),\n  receipt_status INT64 OPTIONS(description\u003d\"Either 1 (success) or 0 (failure) (post Byzantium)\"),\n  block_timestamp TIMESTAMP NOT NULL OPTIONS(description\u003d\"Timestamp of the block where this transaction was in\"),\n  block_number INT64 NOT NULL OPTIONS(description\u003d\"Block number where this transaction was in\"),\n  block_hash STRING NOT NULL OPTIONS(description\u003d\"Hash of the block where this transaction was in\"),\n  max_fee_per_gas INT64 OPTIONS(description\u003d\"Total fee that covers both base and priority fees\"),\n  max_priority_fee_per_gas INT64 OPTIONS(description\u003d\"Fee given to miners to incentivize them to include the transaction\"),\n  transaction_type INT64 OPTIONS(description\u003d\"Transaction type\"),\n  receipt_effective_gas_price INT64 OPTIONS(description\u003d\"The actual value per gas deducted from the senders account. Replacement of gas_price after EIP-1559\"),\n  max_fee_per_blob_gas INT64 OPTIONS(description\u003d\"The maximum fee a user is willing to pay per blob gas\"),\n  blob_versioned_hashes ARRAY\u003cSTRING\u003e OPTIONS(description\u003d\"A list of hashed outputs from kzg_to_versioned_hash\"),\n  receipt_blob_gas_price INT64 OPTIONS(description\u003d\"Blob gas price\"),\n  receipt_blob_gas_used INT64 OPTIONS(description\u003d\"Blob gas used\")\n)\nPARTITION BY DATE(block_timestamp)\nOPTIONS(\n  description\u003d\"Each block in the blockchain is composed of zero or more transactions. Each transaction has a source address, a target address, an amount of Ether transferred, and an array of input bytes.\\nThis table contains a set of all transactions from all blocks, and contains a block identifier to get associated block-specific information associated with each transaction.\\nData is exported using https://github.com/medvedev1088/ethereum-etl\\n\"\n);
  `
}

