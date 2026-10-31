import { Injectable } from '@nestjs/common';
import { IdentityStore } from './ports/identity-store.port.js';
import { hashSessionToken } from './session-token.js';
@Injectable()
export class SignOutService {
  constructor(private readonly store: IdentityStore) {}
  async execute(token?: string): Promise<void> {
    if (token) await this.store.revokeSession(hashSessionToken(token));
  }
}
