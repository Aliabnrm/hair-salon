export interface IdentityUser {
  id: string;
  email: string;
  emailVerified: boolean;
}
export interface PasswordIdentity {
  user: IdentityUser;
  passwordHash: string;
}
export abstract class IdentityStore {
  abstract register(email: string, passwordHash: string): Promise<void>;
  abstract findPasswordIdentity(
    email: string,
  ): Promise<PasswordIdentity | undefined>;
  abstract createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    previousHash?: string,
  ): Promise<void>;
  abstract resolveSession(tokenHash: string): Promise<IdentityUser | undefined>;
  abstract revokeSession(tokenHash: string): Promise<void>;
}
