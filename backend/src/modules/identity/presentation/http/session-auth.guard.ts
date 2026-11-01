import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../../config/environment.js';
import { ResolveSessionService } from '../../application/resolve-session.service.js';
import type { AuthenticatedRequest } from './authenticated-request.js';
import { readSessionCookie } from './session-cookie.js';
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly resolve: ResolveSessionService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.resolve.execute(
      readSessionCookie(request, this.config.get('NODE_ENV', { infer: true })),
    );
    if (!user) throw new UnauthorizedException();
    request.identityUser = user;
    return true;
  }
}
