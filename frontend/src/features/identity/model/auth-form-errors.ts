import { HttpFailure } from '../../../lib/api/http-client';
export function authFormError(error: unknown): string {
  if (error instanceof HttpFailure) {
    if (error.status === 401) return 'ایمیل یا رمز درست نیست.';
    if (error.status === 429)
      return 'تلاش‌های زیادی انجام شده است. کمی بعد دوباره تلاش کنید.';
    if (error.status === 422) return 'ایمیل و شرایط رمز را بررسی کنید.';
    if (error.status === 503)
      return 'سرویس موقتاً در دسترس نیست. دوباره تلاش کنید.';
  }
  return 'ارتباط برقرار نشد. دوباره تلاش کنید.';
}
export function passwordError(value: string): string | undefined {
  const length = Array.from(value).length;
  return length < 12 ||
    length > 128 ||
    new TextEncoder().encode(value).length > 512
    ? 'رمز باید ۱۲ تا ۱۲۸ نویسه و حداکثر ۵۱۲ بایت باشد.'
    : undefined;
}
