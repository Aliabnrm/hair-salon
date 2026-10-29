import 'reflect-metadata';
import {
  ConsoleLogger,
  type INestApplication,
  type Type,
} from '@nestjs/common';
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
): Promise<{ app: INestApplication; logger: RecordingLogger }> {
  const logger = new RecordingLogger();
  const config = new ConfigService<Environment, true>({
    PORT: 3001,
    NODE_ENV: environment,
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
  const app = module.createNestApplication({ logger: false });
  await configureApplication(app);
  return { app, logger };
}
