import { SalonOperationsService } from './application/salon-operations.service.js';
import { SalonOperationsStore } from './application/salon-operations-store.js';
import { PostgresSalonOperations } from './infrastructure/persistence/postgres-salon-operations.js';
import { SalonOperationsController } from './presentation/http/salon-operations.controller.js';
import { BookingChangesStore } from './application/booking-changes-store.js';
import { BookingChangesService } from './application/booking-changes.service.js';
import { PostgresBookingChanges } from './infrastructure/persistence/postgres-booking-changes.js';
import { BookingChangesController } from './presentation/http/booking-changes.controller.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { IdentityModule } from '../identity/public.js';
import { SalonManagementModule } from '../salon-management/salon-management.module.js';
import { BookingStore } from './application/booking-store.js';
import { BookingsService } from './application/bookings.service.js';
import { PostgresBookingStore } from './infrastructure/persistence/postgres-booking-store.js';
import { BookingTransaction } from './infrastructure/persistence/booking-transaction.js';
import { BookingsController } from './presentation/http/bookings.controller.js';
import { BookingHttp } from './presentation/http/booking-http.js';
@Module({
  imports: [DatabaseModule, IdentityModule, SalonManagementModule],
  controllers: [BookingsController, BookingChangesController, SalonOperationsController],
  providers: [
    BookingsService,
    SalonOperationsService,
    { provide: SalonOperationsStore, useClass: PostgresSalonOperations },
    BookingChangesService,
    { provide: BookingChangesStore, useClass: PostgresBookingChanges },
    BookingTransaction,
    BookingHttp,
    { provide: BookingStore, useClass: PostgresBookingStore },
  ],
})
export class BookingsModule {}
