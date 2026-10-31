import { Injectable } from '@nestjs/common';
import { IdentityStore } from './ports/identity-store.port.js';
import { PasswordHasher } from './ports/password-hasher.port.js';
@Injectable()
export class RegisterUserService {
  constructor(
    private readonly store: IdentityStore,
    private readonly hasher: PasswordHasher,
  ) {}
  async execute(email: string, password: string): Promise<void> {
    // Hash on both branches: the public response must not disclose an existing email.
    const passwordHash = await this.hasher.hash(password);
    await this.store.register(email, passwordHash);
  }
}
