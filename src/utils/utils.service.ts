import { Injectable } from '@nestjs/common';

import { ethers } from 'ethers';
import { createHash } from 'crypto';

@Injectable()
export class UtilsService {
  hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    const hash = createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
  }

  async verifySignedMessage(hash: any, address: string, signature: string) {
    const signer = ethers.utils.verifyMessage(hash, signature);
    console.log('the signer');
    console.log(signer);
    return signer === address;
  }
}
