import { SignUpForm } from '../../../features/identity';
export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink">ساخت حساب آراسته</h1>
      <p className="mb-6 mt-2 text-sm leading-7 text-ink-soft">
        فعلاً ورود با ایمیل و رمز است؛ پیامکی ارسال نمی‌شود.
      </p>
      <SignUpForm />
    </>
  );
}
