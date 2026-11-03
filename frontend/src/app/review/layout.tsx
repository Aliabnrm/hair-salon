import type { ReactNode } from 'react';
import { AccountGate } from '../../components/layout/account-gate';
import { ReviewGate } from '../../features/review/components/review-gate';
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AccountGate>
      <ReviewGate>{children}</ReviewGate>
    </AccountGate>
  );
}
