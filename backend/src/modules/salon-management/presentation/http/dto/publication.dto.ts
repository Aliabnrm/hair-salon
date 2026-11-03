import { ApiProperty } from '@nestjs/swagger';
import { WeeklyIntervalDto, ExceptionCreateDto } from './management.dto.js';
export class CategoryDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
}
export class LocationDto {
  @ApiProperty() city!: string;
  @ApiProperty({ type: [String] }) districts!: string[];
}
export class PublicServiceDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) category_id!: string | null;
  @ApiProperty({ minimum: 0, maximum: 10000000000, type: 'integer' }) price_irr!: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 720 }) duration_minutes!: number;
}
export class PublicStaffDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() display_name!: string;
  @ApiProperty({ type: [String] }) service_ids!: string[];
  @ApiProperty({ type: [WeeklyIntervalDto] }) hours!: WeeklyIntervalDto[];
}
export class PublicProfileDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true, maxLength: 600 }) description!: string | null;
  @ApiProperty({ enum: ['men', 'women'] }) audience!: string;
  @ApiProperty() city!: string;
  @ApiProperty({ type: String, nullable: true }) district!: string | null;
  @ApiProperty({ type: String, nullable: true }) public_address!: string | null;
  @ApiProperty({ type: String, nullable: true }) public_phone!: string | null;
  @ApiProperty() timezone!: string;
  @ApiProperty({ type: [PublicServiceDto] }) services!: PublicServiceDto[];
  @ApiProperty({ type: [PublicStaffDto] }) staff!: PublicStaffDto[];
  @ApiProperty({ type: [WeeklyIntervalDto] }) hours!: WeeklyIntervalDto[];
  @ApiProperty({ type: [ExceptionCreateDto] }) exceptions!: ExceptionCreateDto[];
}
export class ReadinessIssueDto {
  @ApiProperty() code!: string;
  @ApiProperty() section!: string;
  @ApiProperty() field!: string;
  @ApiProperty({ type: String, nullable: true }) resource_id!: string | null;
  @ApiProperty() message!: string;
}
export class PublicationEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() action!: string;
  @ApiProperty() revision!: number;
  @ApiProperty({ type: String, nullable: true }) request_id!: string | null;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty() created_at!: string;
}
export class PublicationDto {
  @ApiProperty({ enum: ['draft', 'pending_review', 'published', 'suspended'] }) state!: string;
  @ApiProperty() version!: number;
  @ApiProperty() content_revision!: number;
  @ApiProperty({ type: String, nullable: true }) request_id!: string | null;
  @ApiProperty({ type: [ReadinessIssueDto] }) issues!: ReadinessIssueDto[];
  @ApiProperty({ type: [PublicationEventDto] }) history!: PublicationEventDto[];
}
export class ReviewDto {
  @ApiProperty({ type: PublicationDto }) publication!: PublicationDto;
  @ApiProperty({ type: PublicProfileDto }) profile!: PublicProfileDto;
}
export class ReviewAccessDto {
  @ApiProperty() can_review!: boolean;
}
export class ReviewSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() state!: string;
}
export class PublicationRequestDto {
  @ApiProperty({ enum: [true] }) consent!: boolean;
}
export class PublicationDecisionDto {
  @ApiProperty({ type: 'integer', minimum: 1 }) content_revision!: number;
  @ApiProperty({ enum: ['approve', 'reject', 'suspend'] }) decision!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) request_id!: string | null;
  @ApiProperty({ type: String, nullable: true, maxLength: 600 }) reason!: string | null;
}
export class EmptyPublicationDto {}
export class SalonSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['men', 'women'] }) audience!: string;
  @ApiProperty() city!: string;
  @ApiProperty({ type: String, nullable: true }) district!: string | null;
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 10000000000 }) min_price_irr!: number;
}
