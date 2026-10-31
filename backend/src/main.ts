import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApplication } from './app.setup.js';
import type { Environment } from './config/environment.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger('Bootstrap', { json: true }),
    abortOnError: false,
  });
  await configureApplication(app);
  app.enableShutdownHooks();
  const config = app.get(ConfigService<Environment, true>);
  await app.listen(config.get('PORT', { infer: true }), '127.0.0.1');
}

try {
  await bootstrap();
} catch {
  // Do not echo the configuration or an arbitrary exception containing secrets.
  process.stderr.write(
    'API startup failed. Check PORT, NODE_ENV, DATABASE_URL, AUTH settings and local setup.\n',
  );
  process.exitCode = 1;
}
