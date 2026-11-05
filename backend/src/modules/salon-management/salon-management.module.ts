import { PublicCatalogService } from './application/public-catalog.service.js';
import { PublicationService } from './application/publication.service.js';
import { PublicationStore, PublicCatalogStore } from './application/ports/publication-store.js';
import { PostgresPublicationStore } from './infrastructure/persistence/postgres-publication-store.js';
import { PostgresPublicCatalogStore } from './infrastructure/persistence/postgres-public-catalog-store.js';
import { PublicationController } from './presentation/http/publication.controller.js';
import { PublicCatalogController } from './presentation/http/public-catalog.controller.js';
import { ConsoleLogger, Module } from '@nestjs/common';
import { AvailabilityService } from './application/availability/availability.service.js';
import { AvailabilityReader } from './application/ports/availability-reader.js';
import { Clock } from './application/ports/clock.js';
import { SystemClock } from './infrastructure/time/system-clock.js';
import { PostgresAvailabilityReader } from './infrastructure/persistence/postgres-availability-reader.js';
import { AvailabilityController } from './presentation/http/availability.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { IdentityModule } from '../identity/public.js';
import {
  BusinessStore,
  CatalogStore,
  TeamStore,
  ScheduleStore,
} from './application/ports/management-stores.js';
import { BusinessesService } from './application/businesses/businesses.service.js';
import { CatalogService } from './application/catalog/catalog.service.js';
import { TeamService } from './application/team/team.service.js';
import { SchedulingService } from './application/scheduling/scheduling.service.js';
import { PostgresBusinessStore } from './infrastructure/persistence/postgres-business-store.js';
import { PostgresCatalogStore } from './infrastructure/persistence/postgres-catalog-store.js';
import { PostgresTeamStore } from './infrastructure/persistence/postgres-team-store.js';
import { PostgresScheduleStore } from './infrastructure/persistence/postgres-schedule-store.js';
import { BusinessWriteTransaction } from './infrastructure/persistence/business-write-transaction.js';
import { ManagementHttp } from './presentation/http/management-http.js';
import { BusinessesController } from './presentation/http/businesses.controller.js';
import { CatalogController } from './presentation/http/catalog.controller.js';
import { StaffController } from './presentation/http/staff.controller.js';
import { HoursController } from './presentation/http/hours.controller.js';
import { ScheduleExceptionsController } from './presentation/http/schedule-exceptions.controller.js';
@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [
    AvailabilityController,
    PublicationController,
    PublicCatalogController,
    BusinessesController,
    CatalogController,
    StaffController,
    HoursController,
    ScheduleExceptionsController,
  ],
  exports: [Clock],
  providers: [
    {
      provide: ConsoleLogger,
      useFactory: () => new ConsoleLogger('SalonManagement', { json: true }),
    },
    AvailabilityService,
    { provide: AvailabilityReader, useClass: PostgresAvailabilityReader },
    { provide: Clock, useClass: SystemClock },
    PublicCatalogService,
    PublicationService,
    { provide: PublicationStore, useClass: PostgresPublicationStore },
    { provide: PublicCatalogStore, useClass: PostgresPublicCatalogStore },
    { provide: BusinessStore, useClass: PostgresBusinessStore },
    { provide: CatalogStore, useClass: PostgresCatalogStore },
    { provide: TeamStore, useClass: PostgresTeamStore },
    { provide: ScheduleStore, useClass: PostgresScheduleStore },
    BusinessesService,
    CatalogService,
    TeamService,
    SchedulingService,
    BusinessWriteTransaction,
    ManagementHttp,
  ],
})
export class SalonManagementModule {}
