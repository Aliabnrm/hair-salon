'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button, buttonStyles } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import { StatePanel } from '../../../components/ui/state-panel';
import { useSession } from '../hooks/use-session';
import { register } from '../api/identity.api';
import { authFormError, passwordError } from '../model/auth-form-errors';

export function CredentialsForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const signingUp = mode === 'sign-up';
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidPassword, setInvalidPassword] = useState<string | undefined>();
  const [received, setReceived] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const validation = passwordError(password);
    setInvalidPassword(validation);
    setError(null);
    if (validation) {
      event.currentTarget
        .querySelector<HTMLInputElement>('[name="password"]')
        ?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      if (signingUp) {
        await register({ email, password });
        setReceived(true);
      } else {
        await session.signIn({ email, password });
        router.replace('/account');
      }
    } catch (failure) {
      setError(authFormError(failure));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      busy.current = false;
      setPending(false);
      setPassword('');
    }
  }
  if (received)
    return (
      <StatePanel
        icon="check"
        title="درخواست ثبت‌نام دریافت شد"
        description="اگر این ایمیل قابل ثبت باشد، حساب ساخته شده است. برای ادامه با ایمیل و رمز خود وارد شوید. مالکیت ایمیل هنوز تأیید نمی‌شود."
      >
        <Link href="/sign-in" className={buttonStyles.primary}>
          رفتن به ورود
        </Link>
      </StatePanel>
    );
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="space-y-5"
      aria-label={signingUp ? 'ثبت‌نام با ایمیل' : 'ورود با ایمیل'}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <legend className="sr-only">ایمیل و رمز عبور</legend>
        <TextField
          label="ایمیل"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="رمز عبور"
          name="password"
          type="password"
          dir="ltr"
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setInvalidPassword(undefined);
          }}
          hint="۱۲ تا ۱۲۸ نویسه؛ فاصله‌های ابتدا و انتها بخشی از رمز هستند."
          {...(invalidPassword ? { error: invalidPassword } : {})}
        />
      </fieldset>
      {error && (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-2xl bg-danger-soft p-4 text-sm leading-7 text-danger"
        >
          {error}
        </div>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'در حال ارسال…' : signingUp ? 'ساخت حساب' : 'ورود'}
      </Button>
      <p className="text-center text-sm leading-7 text-ink-soft">
        {signingUp ? 'حساب دارید؟' : 'حساب ندارید؟'}{' '}
        <Link
          className={buttonStyles.ghost}
          href={signingUp ? '/sign-in' : '/sign-up'}
        >
          {signingUp ? 'ورود' : 'ثبت‌نام'}
        </Link>
      </p>
    </form>
  );
}
