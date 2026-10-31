import { ApiProperty } from '@nestjs/swagger';
import type { IdentityUser } from '../../../application/ports/identity-store.port.js';
export class IdentityMetaDto {
  @ApiProperty() request_id!: string;
}
export class CurrentUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ example: false }) email_verified!: boolean;
}
class CurrentUserDataDto {
  @ApiProperty({ type: CurrentUserDto }) user!: CurrentUserDto;
}
export class CurrentUserResponseDto {
  @ApiProperty({ type: CurrentUserDataDto }) data!: CurrentUserDataDto;
  @ApiProperty({ type: IdentityMetaDto }) meta!: IdentityMetaDto;
}
export function currentUserResponse(
  user: IdentityUser,
  requestId: string,
): CurrentUserResponseDto {
  return {
    data: {
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.emailVerified,
      },
    },
    meta: { request_id: requestId },
  };
}
