import type { ReactNode } from 'react';
import { AccountGate } from '../../../components/layout/account-gate';
export default function ManagementLayout({ children }: { children: ReactNode }) {
  return <AccountGate>{children}</AccountGate>;
}
