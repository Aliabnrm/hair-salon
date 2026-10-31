import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDetailsDto {
  @ApiProperty({ example: 'NOT_FOUND' })
  code!: string;

  @ApiProperty({ example: 'مسیر موردنظر یافت نشد.' })
  message!: string;

  @ApiProperty({ example: 'c4794aad-ccf7-4cb0-8781-a20557ba313b' })
  request_id!: string;

  @ApiProperty({ example: false })
  retryable!: boolean;
}

export class ApiErrorDto {
  @ApiProperty({ type: ApiErrorDetailsDto })
  error!: ApiErrorDetailsDto;
}

const HTTP_ERRORS: Record<number, { code: string; message: string }> = {
  503: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'سرویس موقتاً آماده پاسخ‌گویی نیست.',
  },
  413: {
    code: 'PAYLOAD_TOO_LARGE',
    message: 'حجم درخواست بیش از حد مجاز است.',
  },
  415: {
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'نوع محتوای درخواست معتبر نیست.',
  },
  422: { code: 'VALIDATION_FAILED', message: 'اطلاعات واردشده معتبر نیست.' },
  429: {
    code: 'RATE_LIMITED',
    message: 'تلاش‌های شما بیش از حد مجاز است. کمی بعد دوباره امتحان کنید.',
  },
  400: { code: 'BAD_REQUEST', message: 'درخواست نامعتبر است.' },
  401: { code: 'UNAUTHORIZED', message: 'ورود به حساب لازم است.' },
  403: { code: 'FORBIDDEN', message: 'دسترسی به این بخش مجاز نیست.' },
  404: { code: 'NOT_FOUND', message: 'مسیر موردنظر یافت نشد.' },
  405: { code: 'METHOD_NOT_ALLOWED', message: 'این روش درخواست مجاز نیست.' },
};

export function createApiError(status: number, requestId: string): ApiErrorDto {
  const details = HTTP_ERRORS[status] ?? {
    code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED',
    message:
      status >= 500 ? 'خطایی در پردازش درخواست رخ داد.' : 'درخواست انجام نشد.',
  };

  return {
    error: { ...details, request_id: requestId, retryable: false },
  };
}
