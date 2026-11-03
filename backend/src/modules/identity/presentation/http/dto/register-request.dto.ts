import { ApiProperty } from '@nestjs/swagger';
export class RegisterRequestDto {
  @ApiProperty({
    format: 'email',
    maxLength: 254,
    example: 'customer@example.com',
  })
  email!: string;
  @ApiProperty({
    minLength: 12,
    maxLength: 128,
    format: 'password',
    writeOnly: true,
  })
  password!: string;
}
