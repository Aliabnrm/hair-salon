export class CapabilityError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}
export function invalid(field: string, message = 'مقدار این فیلد معتبر نیست.'): never {
  throw new CapabilityError(422, 'VALIDATION_FAILED', 'اطلاعات فرم را بررسی کنید.', {
    [field]: message,
  });
}
export function notFound(): never {
  throw new CapabilityError(404, 'NOT_FOUND', 'اطلاعات موردنظر یافت نشد.');
}
export function conflict(
  code = 'VERSION_CONFLICT',
  message = 'اطلاعات تغییر کرده است؛ صفحه را تازه کنید.',
): never {
  throw new CapabilityError(409, code, message);
}
