import { ApiProperty, ApiPropertyOptional, PartialType, PickType, OmitType } from '@nestjs/swagger';
export class BusinessCreateDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 600 }) description?:
    string | null;
  @ApiProperty({ minLength: 2, maxLength: 120 }) name!: string;
  @ApiProperty({ enum: ['men', 'women'] }) audience!: 'men' | 'women';
  @ApiProperty({ minLength: 2, maxLength: 80 }) city!: string;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 120 })
  district?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  public_address?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+989121234567',
  })
  public_phone?: string | null;
}
export class BusinessPatchDto extends PartialType(BusinessCreateDto) {}
export class BusinessResponseDto extends BusinessCreateDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['draft', 'pending_review', 'published', 'suspended'] }) state!: string;
  @ApiProperty({ enum: ['Asia/Tehran'] }) timezone!: string;
  @ApiProperty({ minimum: 1 }) version!: number;
  @ApiProperty({ format: 'date-time' }) created_at!: string;
}
export class ServiceCreateDto {
  @ApiProperty({
    type: String,
    description: 'Required for new services; nullable only for legacy responses.',
  })
  category_id!: string;
  @ApiProperty({ minLength: 2, maxLength: 120 }) name!: string;
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 10000000000,
    multipleOf: 10,
  })
  price_irr!: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 720 })
  duration_minutes!: number;
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 240 })
  buffer_before_minutes!: number;
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 240 })
  buffer_after_minutes!: number;
}
export class ServicePatchDto extends PartialType(ServiceCreateDto) {
  @ApiPropertyOptional() active?: boolean;
}
export class ServiceResponseDto extends OmitType(ServiceCreateDto, ['category_id'] as const) {
  @ApiProperty({ type: String, nullable: true }) category_id!: string | null;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty({ minimum: 1 }) version!: number;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
}
export class StaffCreateDto {
  @ApiPropertyOptional({ default: false }) public_visible?: boolean;
  @ApiProperty({ minLength: 2, maxLength: 80 }) display_name!: string;
  @ApiProperty({ type: [String], maxItems: 100, uniqueItems: true })
  service_ids!: string[];
}
export class StaffPatchDto extends PartialType(StaffCreateDto) {
  @ApiPropertyOptional() active?: boolean;
}
export class StaffResponseDto extends StaffCreateDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty({ minimum: 1 }) version!: number;
}
export class IntervalDto {
  @ApiProperty({ example: '09:00' }) start_local!: string;
  @ApiProperty({
    example: '18:00',
    description: '24:00 is permitted only as the end boundary.',
  })
  end_local!: string;
}
export class WeeklyIntervalDto extends IntervalDto {
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 6,
    description: 'Saturday = 0',
  })
  weekday!: number;
}
export class HoursRequestDto {
  @ApiProperty({ type: [WeeklyIntervalDto], maxItems: 28 })
  intervals!: WeeklyIntervalDto[];
}
export class HoursResponseDto extends HoursRequestDto {
  @ApiProperty({ minimum: 1 }) version!: number;
}
export class ExceptionCreateDto {
  @ApiProperty({ format: 'date' }) local_date!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) staff_id!: string | null;
  @ApiProperty() closed!: boolean;
  @ApiProperty({ type: [IntervalDto], maxItems: 4 }) intervals!: IntervalDto[];
}
export class ExceptionPatchDto extends PickType(ExceptionCreateDto, ['closed', 'intervals']) {}
export class ExceptionResponseDto extends ExceptionCreateDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ minimum: 1 }) version!: number;
  @ApiProperty() deleted!: boolean;
}
