import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import * as pty from 'node-pty';
import Decimal from 'decimal.js';
Decimal.set({ precision: 60 });
import { writeFile, unlink } from 'fs/promises';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../database/prisma.service';
import { Request, response } from 'express';
import axios from 'axios';
import { spawn } from 'child_process';

import * as AWS from 'aws-sdk';

// This is the service related with the LLM deploying, it runs in the cli the python script that will deploy the model to aws sagemaker and get back the url endpoint
@Injectable()
export class DeployerService {
  constructor(private readonly prisma: PrismaService) {
    AWS.config.update({
      region: 'us-east-1',
      accessKeyId: process.env.AWS_S3_ACCESS_KEY,
      secretAccessKey: process.env.AWS_S3_KEY_SECRET,
    });
  }

  async runPythonScript() {
    return new Promise((resolve, reject) => {
      const scriptPath = `${process.cwd()}/dist/pythia/llm`;

      console.log('script path');
      console.log(scriptPath);
      const ptyProcess = pty.spawn('python3', ['model.py'], {
        name: 'xterm-color',
        cwd: scriptPath,
        env: process.env,
      });

      let output = '';

      ptyProcess.onData((data) => {
        output += data;
        console.log(output);
        console.log(data);
      });

      ptyProcess.onExit(({ exitCode }) => {
        if (exitCode === 0) {
          const finalText = this.getEndpointName(output);
          console.log('the final text ');
          console.log(finalText);
          resolve(finalText);
        } else {
          console.log('error output');
          console.log(output);
          reject(new Error(`${output}`));
        }
      });
    });
  }

  getEndpointName(str) {
    // Find string "'endpoint_name': "
    const inicio = str.indexOf("'endpoint_name': ");
    if (inicio === -1) return '';

    // Get index after "'endpoint_name': "
    const inicioNome = inicio + "'endpoint_name': ".length;

    const fim = str.indexOf(',', inicioNome);
    if (fim === -1) return str.substring(inicioNome).trim(); // If it doesnt find any comma, return everything

    // Exctract substring with endpoint name
    const nomeEndpoint = str.substring(inicioNome, fim).trim();

    return nomeEndpoint.replace(/^['"]+|['"]+$/g, '');
  }
}
