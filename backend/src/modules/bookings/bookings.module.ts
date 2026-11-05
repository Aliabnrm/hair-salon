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
  controllers: [BookingsController],
  providers: [
    BookingsService,
    BookingTransaction,
    BookingHttp,
    { provide: BookingStore, useClass: PostgresBookingStore },
  ],
})
export class BookingsModule {}
