import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import { import_ } from '@brillout/import';
import * as sgMail from '@sendgrid/mail';

import { PrismaService } from '../database/prisma.service';

import axios from 'axios';

@Injectable()
export class OpenmeshExpertsEmailManagerService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  sgApiKey = process.env.SG_API_KEY;

  async emailRecPassword(email: string, id: string) {
    sgMail.setApiKey(this.sgApiKey);

    const msg: any = {
      to: email,
      from: { email: 'hello@openmesh.network', name: 'Openmesh' },
      subject: 'Password recovery',
      template_id: 'd-45414c11f48d4bcdbd65e7bbc2b7605e',
      dynamic_template_data: {
        objectId: id,
      },
    };
    await sgMail
      .send(msg)
      .then(() => {
        return 'email sent';
      })
      .catch(async (error) => {
        console.log(`Error during email recover password - ${email}`);
        console.log(error);
        return error;
      });
  }

  async emailConfirmationAccountVC(email, objectId) {
    console.log('chamado');
    sgMail.setApiKey(this.sgApiKey);
    console.log(this.sgApiKey);
    const msg: any = {
      to: email,
      from: { email: 'hello@openmesh.network', name: 'Openmesh' },
      template_id: 'd-183d3bcf1eb347a89b6ad211c707437c',
      dynamic_template_data: {
        objectId: objectId,
      },
    };
    await sgMail
      .send(msg)
      .then(() => {
        console.log('confirmed');
        return 'email sent';
      })
      .catch(async (error) => {
        console.log(`Error during email recover password - ${email}`);
        console.log(error);
        return error;
      });
  }

  async emailConfirmationAccount(email, objectId) {
    console.log('chamado');
    sgMail.setApiKey(this.sgApiKey);
    console.log(this.sgApiKey);
    const msg: any = {
      to: email,
      from: { email: 'hello@openmesh.network', name: 'Openmesh' },
      template_id: 'd-8e65b4ec7d974bba9a2450ab0bb1b1d1',
      dynamic_template_data: {
        objectId: objectId,
      },
    };
    await sgMail
      .send(msg)
      .then(() => {
        console.log('confirmed');
        return 'email sent';
      })
      .catch(async (error) => {
        console.log(`Error during email recover password - ${email}`);
        console.log(error);
        return error;
      });
  }
}
