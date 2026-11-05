import { Suspense } from 'react';
import { SignInForm } from '../../../features/identity';
export default function SignInPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink">ورود به آراسته</h1>
      <p className="mb-6 mt-2 text-sm leading-7 text-ink-soft">با ایمیل و رمز خود وارد شوید.</p>
      <Suspense fallback={<p role="status">در حال آماده‌سازی فرم…</p>}>
        <SignInForm />
      </Suspense>
    </>
  );
}
