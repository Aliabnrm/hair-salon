import { HttpFailure } from '../../../lib/api/http-client';

export function hoursFailureMessage(error: unknown, uncertain: boolean) {
  if (error instanceof HttpFailure) {
    if (error.code === 'VERSION_CONFLICT')
      return {
        title: 'برنامه در جای دیگری تغییر کرده است',
        description: 'نسخه تازه را بارگذاری کنید و تغییرات خود را دوباره بررسی کنید.',
      };
    const messages = [...new Set([error.message, ...Object.values(error.fields)])];
    if (uncertain) messages.push('نتیجه ذخیره مشخص نیست؛ برای بررسی و تکمیل، دوباره تلاش کنید.');
    return {
      title:
        error.status === 401
          ? 'نشست شما پایان یافته است'
          : uncertain
            ? 'نتیجه ذخیره مشخص نیست'
            : 'برنامه ذخیره نشد',
      description: messages.join(' '),
    };
  }
  return {
    title: 'ارتباط با سرور برقرار نشد',
    description: 'ممکن است برنامه ذخیره شده باشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
  };
}
