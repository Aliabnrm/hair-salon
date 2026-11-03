import 'reflect-metadata';
import { ConsoleLogger, type INestApplication, type Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApplication } from '../../src/app.setup.js';
import { Clock } from '../../src/modules/salon-management/application/ports/clock.js';
import type { Environment, NodeEnvironment } from '../../src/config/environment.js';

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
  clock?: Clock,
): Promise<{ app: INestApplication; logger: RecordingLogger }> {
  const logger = new RecordingLogger();
  const config = new ConfigService<Environment, true>({
    HOST: '127.0.0.1',
    PORT: 3001,
    DATABASE_URL: databaseUrl,
    NODE_ENV: environment,
    AUTH_ALLOWED_ORIGINS: ['http://localhost:3000'],
    AUTH_RATE_LIMIT_SECRET: 'test_only_auth_secret_never_use_in_production',
  });
  const builder = Test.createTestingModule({
    imports: [AppModule],
    controllers,
  })
    .overrideProvider(ConsoleLogger)
    .useValue(logger)
    .overrideProvider(ConfigService)
    .useValue(config);
  if (clock) builder.overrideProvider(Clock).useValue(clock);
  const module = await builder.compile();
  const app = module.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  await configureApplication(app);
  return { app, logger };
}
