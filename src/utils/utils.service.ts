import { BadRequestException, Injectable } from '@nestjs/common';

import { join } from 'path';

import { BayesClassifier } from 'natural';
import { createReadStream } from 'fs';
import * as csv from 'csv-parser';
import * as Linkify from 'linkify-it';
import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });
import { ethers } from 'ethers';
import * as chainlinkPriceFeedABI from '../contracts/chainlinkPriceFeed.json';
import { createHash, createHmac } from 'crypto';
import { Request, response } from 'express';
import * as erc20ContractABI from '../contracts/erc20ContractABI.json';

import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import * as AWS from 'aws-sdk';
import { PrismaService } from '../database/prisma.service';

import axios from 'axios';

@Injectable()
export class UtilsService {
  private linkify;

  constructor(private readonly prisma: PrismaService) {
    this.linkify = new Linkify();
  }

  //setting variables:
  web3UrlProvider = process.env.WEB3_URL_PROVIDER;
  web3UrlProviderEthereum = process.env.WEB3_URL_PROVIDER_ETHEREUM;
  web3Provider = new ethers.providers.JsonRpcProvider(this.web3UrlProvider);
  web3ProviderEthereum = new ethers.providers.JsonRpcProvider(
    this.web3UrlProviderEthereum,
  );

  priceFeedETHUSDAddress =
    process.env.CHAINLINK_PRICE_FEED_ETHUSD_CONTRACT_ADDRESS;

  wEthTokenAddress = process.env.WETH_TOKEN_ADDRESS;
  // webhookSigningKey = ''
  environment = process.env.ENVIRONMENT;

  //Funcion to check if a task desc has any type of link, this is utilize to check if the task might have some type of spam / scam
  async hasLink(text: string, taskId: string) {
    console.log('values received for links');
    console.log(text);
    function isAllowedLink(link: string): boolean {
      // Allow to have links that are any subdomain of google (docs.google for instance) and github links
      // const allowedPatterns = [/github/, /\.google/];

      const allowedPatterns = [/github/]; // Probably not sufficient input sanitization - TODO: Split OpenR&D into a separate codebase

      return allowedPatterns.some((pattern) => pattern.test(link));
    }
    function removeLinksFromText(
      originalText: string,
      linksToRemove: string[],
    ): string {
      let newText = originalText;
      for (const link of linksToRemove) {
        // Remover a URL completa (com esquema)
        newText = newText.replace(link, '');

        // Tentar remover a URL parcial (sem esquema)
        const noScheme = link.replace(/^http:\/\/|https:\/\//, '');
        newText = newText.replace(noScheme, '');

        // Tentar remover a URL sem o 'www.'
        const noWww = noScheme.replace(/^www\./, '');
        newText = newText.replace(noWww, '');
      }
      return newText;
    }
    const spamsList = [];
    // XXX: (Mostly) unsanitized user input into match()
    const matches = this.linkify.match(text); 
    if (matches) {
      for (const match of matches) {
        if (isAllowedLink(match.url)) {
          console.log(`Link allowed found: ${match.url}`);
        } else {
          console.log(`Potential spam link found: ${match.url}`);
          spamsList.push(match.url);
        }
      }
    } else {
      console.log('Nenhum link encontrado.');
    }

    if (spamsList.length > 0) {
      console.log('removing the links');
      const textWithoutSpamLinks = removeLinksFromText(text, spamsList);
      console.log(textWithoutSpamLinks);
      await this.prisma.task.update({
        where: {
          taskId: String(taskId),
        },
        data: {
          hasSpamLink: true,
          description: textWithoutSpamLinks, //here the description without the spam links,
        },
      });
    }
  }

  //function used to update the job success rating of a user
  public async updatesJobSuccess(userAddress: string): Promise<any> {
    console.log('updating job success');
    //getting all the tasks that the user has taken:
    const taskTotal = await this.prisma.task.findMany({
      where: {
        Application: {
          some: {
            applicant: userAddress,
            taken: true,
          },
        },
      },
    });
    console.log('task total');
    console.log(taskTotal);

    //getting all the tasks that the user has completed succesfully:
    const taskCompleted = await this.prisma.task.findMany({
      where: {
        Application: {
          some: {
            applicant: userAddress,
            taken: true,
          },
        },
        Submission: {
          some: {
            applicant: userAddress,
            accepted: true,
          },
        },
      },
    });
    console.log('task completed');
    console.log(taskCompleted);

    const jobSuccess = (taskCompleted.length * 100) / taskTotal.length;

    console.log('the job success');
    console.log(jobSuccess);
    if (jobSuccess !== null) {
      return await this.prisma.user.upsert({
        where: {
          address: userAddress,
        },
        update: {
          jobSuccess: JSON.stringify(jobSuccess),
        },
        create: {
          address: userAddress,
          jobSuccess: JSON.stringify(jobSuccess),
        },
      });
    }
  }

  //function used to update the user total amount earned through the tasks
  public async updatesTotalEarned(userAddress: string): Promise<any> {
    console.log('updating total earned');
    //getting all the tasks that the user has completed succesfully:
    const taskCompleted = await this.prisma.task.findMany({
      where: {
        Application: {
          some: {
            applicant: userAddress,
            taken: true,
          },
        },
        Submission: {
          some: {
            applicant: userAddress,
            accepted: true,
          },
        },
      },
    });
    console.log('task completed');
    console.log(taskCompleted);

    let total = 0;
    taskCompleted.forEach((task) => {
      if (task.estimatedBudget) {
        total = total + Number(task.estimatedBudget);
      }
    });

    console.log('the total earned');
    console.log(total);
    return await this.prisma.user.update({
      where: {
        address: userAddress,
      },
      data: {
        totalEarned: JSON.stringify(total),
      },
    });
  }

  //example of dataBody: {﻿created_at: '2023-08-14T16:37:00.000000Z',﻿created_by: 'https://api.calendly.com/users/bb4efcfa-56d4-4751-acfd-644af5f372d7';,﻿event: 'invitee.created',﻿payload: {﻿cancel_url: 'https://calendly.com/cancellations/30429fd6-dcc5-4b15-aa65-d9f658df7c21';,﻿created_at: '2023-08-14T16:37:00.264437Z',﻿email: 'brunolsantos152@gmail.com',﻿event: 'https://api.calendly.com/scheduled_events/aa3f7446-d8b6-422c-8414-cada16e33158';,﻿first_name: null,﻿last_name: null,﻿name: 'BRUNO LAUREANO DOS SANTOS',﻿new_invitee: null,﻿no_show: null,﻿old_invitee: null,﻿payment: null,﻿questions_and_answers: [ [Object] ],﻿reconfirmation: null,﻿reschedule_url: 'https://calendly.com/reschedulings/30429fd6-dcc5-4b15-aa65-d9f658df7c21';,﻿rescheduled: false,﻿routing_form_submission: null,﻿scheduled_event: {﻿created_at: '2023-08-14T16:37:00.249519Z',﻿end_time: '2023-08-30T14:00:00.000000Z',﻿event_guests: [],﻿event_memberships: [Array],﻿event_type: 'https://api.calendly.com/event_types/e153a182-7013-4e45-8ddc-430089ba3381';,﻿invitees_counter: [Object],﻿location: [Object],﻿name: 'Test event type',﻿start_time: '2023-08-30T13:30:00.000000Z',﻿status: 'active',﻿updated_at: '2023-08-14T16:37:00.249519Z',﻿uri: 'https://api.calendly.com/scheduled_events/aa3f7446-d8b6-422c-8414-cada16e33158';﻿},﻿status: 'active',﻿text_reminder_number: null,﻿timezone: 'America/Sao_Paulo',﻿tracking: {﻿utm_campaign: null,﻿utm_source: null,﻿utm_medium: null,﻿utm_content: null,﻿utm_term: null,﻿salesforce_uuid: null﻿},﻿updated_at: '2023-08-14T16:37:00.264437Z',﻿uri: 'https://api.calendly.com/scheduled_events/aa3f7446-d8b6-422c-8414-cada16e33158/invitees/30429fd6-dcc5-4b15-aa65-d9f658df7c21';﻿}﻿}
  /* async calendlyWebhook(dataBody: any, req: Request) {
    console.log('chamado');
    console.log(dataBody);
    const keySignature = String(req.headers['calendly-webhook-signature']);

    const { t, signature } = keySignature.split(',').reduce(
      (acc, currentValue) => {
        const [key, value] = currentValue.split('=');

        if (key === 't') {
          // UNIX timestamp
          acc.t = value;
        }

        if (key === 'v1') {
          acc.signature = value;
        }

        return acc;
      },
      {
        t: '',
        signature: '',
      },
    );

    if (!t || !signature) throw new Error('Invalid Signature');

    const data = t + '.' + JSON.stringify(req.body);

    const expectedSignature = createHmac('sha256', this.webhookSigningKey)
      .update(data, 'utf8')
      .digest('hex');

    // Determine the expected signature by computing an HMAC with the SHA256 hash function.

    if (expectedSignature !== signature) {
      // Signature is invalid!
      console.log('invalid signature');
      throw new Error('Invalid Signature');
    }

    //checking to see if the event already exists:
    const eventExists =
      await this.prisma.speakersRegistrationCalendly.findFirst({
        where: {
          uri: dataBody['payload']['uri'],
        },
      });
    console.log('event exists?');
    console.log(eventExists);
    if (eventExists) {
      if (dataBody['event'] === 'invitee.created') {
        console.log('event already created');
        //the event already exists, does need to be created again
        return;
      } else if (dataBody['event'] !== 'invitee.created') {
        if (dataBody['payload']['rescheduled'] === true) {
          console.log('rescheduled');
          await this.prisma.speakersRegistrationCalendly.updateMany({
            where: {
              uri: dataBody['payload']['uri'],
            },
            data: {
              reschedule: true,
              active: false,
            },
          });
        } else {
          console.log('canceled');
          await this.prisma.speakersRegistrationCalendly.updateMany({
            where: {
              uri: dataBody['payload']['uri'],
            },
            data: {
              active: false,
            },
          });
        }
      }
    } else {
      console.log('new event');
      console.log(dataBody['payload']['questions_and_answers']);
      console.log('the payload');
      console.log(dataBody['payload']);
      console.log('the start time');
      console.log(dataBody['payload']['scheduled_event']['start_time']);
      console.log(
        new Date(dataBody['payload']['scheduled_event']['start_time']),
      );
      await this.prisma.speakersRegistrationCalendly.create({
        data: {
          uri: dataBody['payload']['uri'],
          userName: dataBody['payload']['name'],
          userEmail: dataBody['payload']['email'],
          eventAt: new Date(
            dataBody['payload']['scheduled_event']['start_time'],
          ),
          timezone: dataBody['payload']['timezone'],
          eventName: dataBody['payload']['scheduled_event']['name'],
          additionalInfo: JSON.stringify(
            dataBody['payload']['questions_and_answers'],
          ),
        },
      });
    }
    // chamando a api:
    //   const configAPI = {
    //     method: 'post',
    //     url: 'https://api.calendly.com/scheduling_links',
    //     headers: {
    //       accept: 'application/json',
    //       client_id: this.clientIdSRMAPI,
    //       access_token: accessTokenSRM,
    //     },
    //   };

    //   let operacaoSigma;
    //   try {
    //     await axios(configAPI).then(function (response) {
    //       operacaoSigma = response.data;
    //     });
    //   } catch (err) {
    //     console.log(err);
    //   }
    // }
  } */

  hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    const hash = createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
  }

  async verifiesSignedMessage(hash: any, address: string, signature: string) {
    const signer = ethers.utils.verifyMessage(hash, signature);
    console.log('the signer');
    console.log(signer);
    return signer === address;
  }

  async isSpam() {
    const classifier = new BayesClassifier();
    createReadStream('./src/utils/spam.csv')
      .pipe(csv())
      .on('data', (row) => {
        const label = row.v1; // 'ham' or 'spam'
        const text = row.v2;

        if (label && text) {
          classifier.addDocument(text, label === 'spam' ? 'spam' : 'not_spam');
        }
      })
      .on('end', () => {
        classifier.train();

        function isSpam(text) {
          const guessedLabel = classifier.classify(text);
          return guessedLabel === 'spam';
        }

        // Testing
        const testTexts = [
          'I need you to create me a little of high forward jobs really now!',
          'Win a brand new car now www.cars.com!',
          'Free bitcoins -> www.earnbitcoinfree.com',
          'Manage the ec2 amazon instance - software engineer job',
        ];

        testTexts.forEach((text) => {
          console.log(`"${text}" is spam? ${isSpam(text)}`);
        });
      });
  }
}
