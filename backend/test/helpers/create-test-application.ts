import 'reflect-metadata';
import {
  ConsoleLogger,
  type INestApplication,
  type Type,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApplication } from '../../src/app.setup.js';
import type {
  Environment,
  NodeEnvironment,
} from '../../src/config/environment.js';

class RecordingLogger extends ConsoleLogger {
  readonly entries: unknown[] = [];

  override log(message: unknown): void {
    this.entries.push(message);
  }

  override error(message: unknown): void {
    this.entries.push(message);
  }
}

export async function createTestApplication(
  environment: NodeEnvironment = 'test',
  controllers: Type<unknown>[] = [],
  databaseUrl = 'postgresql://unused:unused@127.0.0.1:1/unused_test',
): Promise<{ app: INestApplication; logger: RecordingLogger }> {
  const logger = new RecordingLogger();
  const config = new ConfigService<Environment, true>({
    PORT: 3001,
    DATABASE_URL: databaseUrl,
    NODE_ENV: environment,
    AUTH_ALLOWED_ORIGINS: ['http://localhost:3000'],
    AUTH_RATE_LIMIT_SECRET: 'test_only_auth_secret_never_use_in_production',
  });
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers,
  })
    .overrideProvider(ConsoleLogger)
    .useValue(logger)
    .overrideProvider(ConfigService)
    .useValue(config)
    .compile();
  const app = module.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  await configureApplication(app);
  return { app, logger };
}
