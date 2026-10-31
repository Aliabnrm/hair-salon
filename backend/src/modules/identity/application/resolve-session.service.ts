import { Injectable } from '@nestjs/common';
import { IdentityStore } from './ports/identity-store.port.js';
import { hashSessionToken } from './session-token.js';
@Injectable()
export class ResolveSessionService {
  constructor(private readonly store: IdentityStore) {}
  async execute(token?: string) {
    return token
      ? this.store.resolveSession(hashSessionToken(token))
      : undefined;
  }
}
