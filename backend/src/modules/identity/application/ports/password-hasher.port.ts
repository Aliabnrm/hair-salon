export abstract class PasswordHasher {
  abstract hash(password: string): Promise<string>;
  // Even an unknown identity performs an Argon2 verification against a dummy hash.
  abstract verify(password: string, encodedHash?: string): Promise<boolean>;
}
