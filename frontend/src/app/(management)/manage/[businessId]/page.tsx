import { BusinessSettingsScreen } from '../../../../features/salon-management/index';
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  return (
    <BusinessSettingsScreen
      key={businessId}
      businessId={businessId}
    />
  );
}
