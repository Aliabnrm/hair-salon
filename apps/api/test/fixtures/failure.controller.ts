import { Controller, Get } from '@nestjs/common';

export const SENSITIVE_SENTINEL = 'test-only-secret-that-must-not-leak';

@Controller('_test')
export class FailureController {
  @Get('failure')
  fail(): never {
    throw new Error(SENSITIVE_SENTINEL);
  }
}
