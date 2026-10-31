import { ApiProperty } from '@nestjs/swagger';

export class HealthDataDto {
  @ApiProperty({ enum: ['ok'] })
  status = 'ok' as const;
}

export class ResponseMetaDto {
  @ApiProperty({ example: 'c4794aad-ccf7-4cb0-8781-a20557ba313b' })
  request_id!: string;
}

export class HealthResponseDto {
  @ApiProperty({ type: HealthDataDto })
  data!: HealthDataDto;

  @ApiProperty({ type: ResponseMetaDto })
  meta!: ResponseMetaDto;
}
