import { ApiProperty } from '@nestjs/swagger';
import { IdentityMetaDto } from './current-user-response.dto.js';
class RegistrationDataDto {
  @ApiProperty({ enum: ['received'] }) registration!: 'received';
}
export class RegistrationResponseDto {
  @ApiProperty({ type: RegistrationDataDto }) data!: RegistrationDataDto;
  @ApiProperty({ type: IdentityMetaDto }) meta!: IdentityMetaDto;
}
class SignOutDataDto {
  @ApiProperty({ enum: [true] }) signed_out!: true;
}
export class SignOutResponseDto {
  @ApiProperty({ type: SignOutDataDto }) data!: SignOutDataDto;
  @ApiProperty({ type: IdentityMetaDto }) meta!: IdentityMetaDto;
}
