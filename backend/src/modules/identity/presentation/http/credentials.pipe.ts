import {
  Injectable,
  UnprocessableEntityException,
  type PipeTransform,
} from '@nestjs/common';
import { normalizeEmail } from '../../domain/email-policy.js';
import { isValidPassword } from '../../domain/password-policy.js';
import { RegisterRequestDto } from './dto/register-request.dto.js';
@Injectable()
export class CredentialsPipe implements PipeTransform<
  unknown,
  RegisterRequestDto
> {
  transform(input: unknown): RegisterRequestDto {
    if (
      input === null ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      Object.keys(input).length !== 2 ||
      !('email' in input) ||
      !('password' in input) ||
      typeof input.email !== 'string' ||
      typeof input.password !== 'string'
    )
      throw new UnprocessableEntityException();
    const email = normalizeEmail(input.email);
    if (!email || !isValidPassword(input.password))
      throw new UnprocessableEntityException();
    return { email, password: input.password };
  }
}
