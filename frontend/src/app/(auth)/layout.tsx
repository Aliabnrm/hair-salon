import { Suspense, type ReactNode } from 'react';
import { Brand } from '../../components/ui/brand';
import { AuthBackLink } from '../../features/identity';
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <Brand />
        <Suspense fallback={null}>
          <AuthBackLink />
        </Suspense>
      </div>
      <div className="mx-auto mt-8 w-full max-w-96">{children}</div>
    </div>
  );
}
