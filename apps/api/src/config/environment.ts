import { fileURLToPath } from 'node:url';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface Environment {
  PORT: number;
  NODE_ENV: NodeEnvironment;
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

  return { PORT: Number(port), NODE_ENV: nodeEnvironment };
}

export function environmentOptions() {
  return {
    isGlobal: true,
    envFilePath: fileURLToPath(new URL('../../.env', import.meta.url)),
    ignoreEnvFile: process.env.NODE_ENV === 'test',
    validate: validateEnvironment,
  };
}
