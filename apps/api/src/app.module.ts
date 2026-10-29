import { ConsoleLogger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { environmentOptions } from './config/environment.js';
import { HttpExceptionFilter } from './common/http/http-exception.filter.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [ConfigModule.forRoot(environmentOptions()), HealthModule],
  providers: [
    {
      provide: ConsoleLogger,
      useFactory: () => new ConsoleLogger('HTTP', { json: true }),
    },
    HttpExceptionFilter,
  ],
})
export class AppModule {}
