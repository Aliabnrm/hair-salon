import { Module } from '@nestjs/common';
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
    BusinessesController,
    CatalogController,
    StaffController,
    HoursController,
    ScheduleExceptionsController,
  ],
  providers: [
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
