import {
  ForbiddenException,
  Injectable,
  UnsupportedMediaTypeException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Environment } from '../../../../config/environment.js';
@Injectable()
export class AuthMutationGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    if (
      typeof origin !== 'string' ||
      !this.config.get('AUTH_ALLOWED_ORIGINS', { infer: true }).includes(origin)
    )
      throw new ForbiddenException();
    if (
      request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !==
      'application/json'
    )
      throw new UnsupportedMediaTypeException();
    return true;
  }
}
