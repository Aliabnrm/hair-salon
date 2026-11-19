import type { BookingCommand, Appointment, BookingListQuery } from '../domain/booking.types.js';
import type { OutcomeInput, BlockInput, ScheduleBlock } from '../domain/salon-operations.js';
export abstract class SalonOperationsStore {
  abstract outcome(
    command: BookingCommand,
    business: string,
    id: string,
    input: OutcomeInput,
    version: number,
  ): Promise<Appointment>;
  abstract createBlock(
    command: BookingCommand,
    business: string,
    input: BlockInput,
  ): Promise<ScheduleBlock>;
  abstract releaseBlock(
    command: BookingCommand,
    business: string,
    id: string,
    reason: string,
    version: number,
  ): Promise<ScheduleBlock>;
  abstract resolveBlock(
    actor: string,
    business: string,
    key: string,
    operation: 'block-create' | 'block-release',
  ): Promise<ScheduleBlock>;
  abstract overview(
    actor: string,
    business: string,
    q: BookingListQuery,
  ): Promise<{
    checked_at: string;
    summary: Record<string, number>;
    blocks: ScheduleBlock[];
    blocks_truncated: boolean;
  }>;
}
