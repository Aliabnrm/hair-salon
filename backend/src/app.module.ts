import { BookingsModule } from './modules/bookings/bookings.module.js';
import { SalonManagementModule } from './modules/salon-management/salon-management.module.js';
import { ConsoleLogger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { environmentOptions } from './config/environment.js';
import { HttpExceptionFilter } from './common/http/http-exception.filter.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(environmentOptions()),
    HealthModule,
    IdentityModule,
    SalonManagementModule,
    BookingsModule,
  ],
  providers: [
    {
      provide: ConsoleLogger,
      useFactory: () => new ConsoleLogger('HTTP', { json: true }),
    },
    HttpExceptionFilter,
  ],
})
export class AppModule {}
