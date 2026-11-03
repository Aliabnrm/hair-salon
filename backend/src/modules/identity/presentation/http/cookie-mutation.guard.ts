import { Injectable, type ExecutionContext } from '@nestjs/common';
import { AuthMutationGuard } from './auth-mutation.guard.js';
import type { Request } from 'express';
@Injectable()
export class CookieMutationGuard extends AuthMutationGuard {
  override canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'GET') return true;
    return this.validate(request, request.method !== 'DELETE' || request.body !== undefined);
  }
}
