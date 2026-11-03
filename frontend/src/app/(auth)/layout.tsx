import type { ReactNode } from 'react';
import Link from 'next/link';
import { Brand } from '../../components/ui/brand';
import { Icon } from '../../components/ui/icon';
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <Brand />
        <Link
          href="/account"
          aria-label="بازگشت به حساب"
          className="grid size-12 place-items-center rounded-full hover:bg-sand"
        >
          <Icon name="back" />
        </Link>
      </div>
      <div className="mx-auto mt-8 w-full max-w-96">{children}</div>
    </div>
  );
}
