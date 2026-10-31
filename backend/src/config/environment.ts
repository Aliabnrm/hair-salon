import { fileURLToPath } from 'node:url';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface Environment {
  PORT: number;
  NODE_ENV: NodeEnvironment;
  DATABASE_URL: string;
  AUTH_ALLOWED_ORIGINS: string[];
  AUTH_RATE_LIMIT_SECRET: string;
}

export function validateDatabaseUrl(
  value: unknown,
  variable = 'DATABASE_URL',
): string {
  const invalid = () =>
    new Error(`${variable} must be a PostgreSQL URL with a host and database.`);
  if (typeof value !== 'string' || value.trim() !== value || !value)
    throw invalid();
  try {
    const url = new URL(value);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !database.trim() ||
      database.includes('/') ||
      url.hash
    )
      throw invalid();
    return value;
  } catch {
    throw invalid();
  }
}

export function validateAuthOrigins(
  value: unknown,
  environment: NodeEnvironment,
): string[] {
  const invalid = () =>
    new Error(
      'AUTH_ALLOWED_ORIGINS must list exact HTTP origins (HTTPS in production).',
    );
  if (typeof value !== 'string' || !value) throw invalid();
  const origins = value.split(',');
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (
        url.origin !== origin ||
        !['https:', 'http:'].includes(url.protocol) ||
        (environment === 'production' && url.protocol !== 'https:')
      )
        throw invalid();
    } catch {
      throw invalid();
    }
  }
  return [...new Set(origins)];
}

export function validateAuthSecret(
  value: unknown,
  environment: NodeEnvironment,
): string {
  if (
    typeof value !== 'string' ||
    !/^[\x21-\x7e]{32,256}$/.test(value) ||
    (environment === 'production' &&
      value === 'local_only_change_before_shared_use_32_bytes')
  ) {
    throw new Error(
      'AUTH_RATE_LIMIT_SECRET must be a private 32 to 256 character secret.',
    );
  }
  return value;
}

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const port = input.PORT === undefined ? '3001' : input.PORT;
  const nodeEnvironment =
    input.NODE_ENV === undefined ? 'development' : input.NODE_ENV;
  if (
    typeof port !== 'string' ||
    !/^[0-9]+$/.test(port) ||
    !Number.isSafeInteger(Number(port)) ||
    Number(port) < 1 ||
    Number(port) > 65_535
  ) {
    throw new Error('PORT must be a decimal integer between 1 and 65535.');
  }
  if (
    nodeEnvironment !== 'development' &&
    nodeEnvironment !== 'test' &&
    nodeEnvironment !== 'production'
  ) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }
  return {
    PORT: Number(port),
    NODE_ENV: nodeEnvironment,
    DATABASE_URL: validateDatabaseUrl(input.DATABASE_URL),
    AUTH_ALLOWED_ORIGINS: validateAuthOrigins(
      input.AUTH_ALLOWED_ORIGINS,
      nodeEnvironment,
    ),
    AUTH_RATE_LIMIT_SECRET: validateAuthSecret(
      input.AUTH_RATE_LIMIT_SECRET,
      nodeEnvironment,
    ),
  };
}

export function environmentOptions() {
  return {
    isGlobal: true,
    envFilePath: fileURLToPath(new URL('../../.env', import.meta.url)),
    ignoreEnvFile: process.env.NODE_ENV === 'test',
    validate: validateEnvironment,
  };
}
