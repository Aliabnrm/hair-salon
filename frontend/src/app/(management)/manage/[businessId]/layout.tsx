import type { ReactNode } from 'react';
import { ManagementNavigation } from '../../../../features/salon-management/index';
export default async function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  return (
    <>
      <ManagementNavigation businessId={businessId} />
      {children}
    </>
  );
}
