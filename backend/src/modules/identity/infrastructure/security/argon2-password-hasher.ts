import { randomBytes } from 'node:crypto';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
import { PasswordHasher } from '../../application/ports/password-hasher.port.js';
export const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;
@Injectable()
export class Argon2PasswordHasher
  extends PasswordHasher
  implements OnModuleInit
{
  private readonly dummyHash = hash(randomBytes(32), ARGON2_OPTIONS);
  async onModuleInit(): Promise<void> {
    await this.dummyHash;
  }
  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }
  async verify(password: string, encodedHash?: string): Promise<boolean> {
    const valid = await verify(encodedHash ?? (await this.dummyHash), password);
    return encodedHash !== undefined && valid;
  }
}
