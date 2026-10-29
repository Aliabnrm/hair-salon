import { ConsoleLogger, Module } from '@nestjs/common';
import { DatabaseHealthCheck } from './database-health.port.js';
import { DatabaseProvider } from './database.provider.js';
import { PostgresHealthCheck } from './postgres-health-check.js';

@Module({
  providers: [
    {
      provide: ConsoleLogger,
      useFactory: () => new ConsoleLogger('Database', { json: true }),
    },
    DatabaseProvider,
    { provide: DatabaseHealthCheck, useClass: PostgresHealthCheck },
  ],
  exports: [DatabaseProvider, DatabaseHealthCheck],
})
export class DatabaseModule {}
