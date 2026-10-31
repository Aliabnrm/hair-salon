import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { IdentityStore } from './application/ports/identity-store.port.js';
import { PasswordHasher } from './application/ports/password-hasher.port.js';
import { AuthAttemptStore } from './application/ports/auth-attempt-store.port.js';
import { PostgresIdentityStore } from './infrastructure/persistence/postgres-identity-store.js';
import { PostgresAuthAttemptStore } from './infrastructure/persistence/postgres-auth-attempt-store.js';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher.js';
import { RegisterUserService } from './application/register-user.service.js';
import { SignInService } from './application/sign-in.service.js';
import { SignOutService } from './application/sign-out.service.js';
import { ResolveSessionService } from './application/resolve-session.service.js';
import { AuthAttemptLimiter } from './application/auth-attempt-limiter.service.js';
import { AuthenticationController } from './presentation/http/authentication.controller.js';
import { CurrentUserController } from './presentation/http/current-user.controller.js';
import { AuthMutationGuard } from './presentation/http/auth-mutation.guard.js';
import { SessionAuthGuard } from './presentation/http/session-auth.guard.js';
import { CredentialsPipe } from './presentation/http/credentials.pipe.js';
@Module({
  imports: [DatabaseModule],
  controllers: [AuthenticationController, CurrentUserController],
  providers: [
    { provide: IdentityStore, useClass: PostgresIdentityStore },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: AuthAttemptStore, useClass: PostgresAuthAttemptStore },
    RegisterUserService,
    SignInService,
    SignOutService,
    ResolveSessionService,
    AuthAttemptLimiter,
    AuthMutationGuard,
    SessionAuthGuard,
    CredentialsPipe,
  ],
})
export class IdentityModule {}
