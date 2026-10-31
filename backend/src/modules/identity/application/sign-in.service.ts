import { Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from '../domain/identity-errors.js';
import { IdentityStore } from './ports/identity-store.port.js';
import { PasswordHasher } from './ports/password-hasher.port.js';
import {
  createSessionToken,
  hashSessionToken,
  SESSION_LIFETIME_MS,
} from './session-token.js';
@Injectable()
export class SignInService {
  constructor(
    private readonly store: IdentityStore,
    private readonly hasher: PasswordHasher,
  ) {}
  async execute(email: string, password: string, previousToken?: string) {
    const identity = await this.store.findPasswordIdentity(email);
    const valid = await this.hasher.verify(password, identity?.passwordHash);
    if (!valid || !identity) throw new InvalidCredentialsError();
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    await this.store.createSession(
      identity.user.id,
      hashSessionToken(token),
      expiresAt,
      previousToken ? hashSessionToken(previousToken) : undefined,
    );
    return { user: identity.user, token, expiresAt };
  }
}
