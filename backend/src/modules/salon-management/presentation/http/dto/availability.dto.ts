import { ApiProperty } from '@nestjs/swagger';
import type { AvailabilityResult } from '../../../domain/availability/availability.types.js';

export const availabilityExample = {
  business_id: 'c2784e4e-797c-4bfa-8c21-270d43c3725e',
  service_id: '69cbfdc1-72fa-4e2d-a570-dfa39ae2ff32',
  service: {
    id: '69cbfdc1-72fa-4e2d-a570-dfa39ae2ff32',
    name: 'کوتاهی مو',
    price_irr: 2500000,
    duration_minutes: 30,
  },
  staff_id: 'any',
  timezone: 'Asia/Tehran',
  checked_at: '2026-11-03T06:00:00.000Z',
  availability_basis: 'schedule_only',
  booking_enabled: false,
  policy: {
    slot_step_minutes: 15,
    minimum_notice_minutes: 60,
    first_allowed_date: '2026-11-03',
    last_allowed_date: '2026-12-02',
  },
  from: '2026-11-03',
  to: '2026-11-03',
  days: [
    {
      local_date: '2026-11-03',
      slots: [
        {
          starts_at: '2026-11-03T07:00:00.000Z',
          ends_at: '2026-11-03T07:30:00.000Z',
          start_local: '10:30',
          end_local: '11:00',
          available_staff_count: 2,
        },
      ],
    },
  ],
} satisfies AvailabilityResult;

export class AvailabilityServiceDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 10000000000 }) price_irr!: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 720 }) duration_minutes!: number;
}
export class AvailabilitySlotDto {
  @ApiProperty({ format: 'date-time' }) starts_at!: string;
  @ApiProperty({ format: 'date-time' }) ends_at!: string;
  @ApiProperty({ example: '10:15', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }) start_local!: string;
  @ApiProperty({
    example: '10:45',
    description: '24:00 is allowed only as the end of the local day.',
  })
  end_local!: string;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 50 }) available_staff_count!: number;
}
export class AvailabilityDayDto {
  @ApiProperty({ format: 'date' }) local_date!: string;
  @ApiProperty({ type: [AvailabilitySlotDto], maxItems: 100 }) slots!: AvailabilitySlotDto[];
}
export class AvailabilityPolicyDto {
  @ApiProperty({ enum: [15] }) slot_step_minutes!: number;
  @ApiProperty({ enum: [60] }) minimum_notice_minutes!: number;
  @ApiProperty({ format: 'date' }) first_allowed_date!: string;
  @ApiProperty({ format: 'date' }) last_allowed_date!: string;
}
export class AvailabilityDto {
  @ApiProperty({ format: 'uuid' }) business_id!: string;
  @ApiProperty({ format: 'uuid' }) service_id!: string;
  @ApiProperty({ type: AvailabilityServiceDto }) service!: AvailabilityServiceDto;
  @ApiProperty({ description: 'any or an eligible public staff UUID' }) staff_id!: string;
  @ApiProperty({ enum: ['Asia/Tehran'] }) timezone!: string;
  @ApiProperty({ format: 'date-time' }) checked_at!: string;
  @ApiProperty({ enum: ['schedule_only'] }) availability_basis!: string;
  @ApiProperty({ enum: [false], description: 'This response does not reserve or hold capacity.' })
  booking_enabled!: boolean;
  @ApiProperty({ type: AvailabilityPolicyDto }) policy!: AvailabilityPolicyDto;
  @ApiProperty({ format: 'date' }) from!: string;
  @ApiProperty({ format: 'date' }) to!: string;
  @ApiProperty({
    type: [AvailabilityDayDto],
    maxItems: 7,
    description: 'All inclusive dates, including closed days; at most 700 slots overall.',
  })
  days!: AvailabilityDayDto[];
}
