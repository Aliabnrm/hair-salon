import { PreviewScreen } from '../../../../../features/salon-management/components/publication/preview-screen';
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  return <PreviewScreen businessId={businessId} />;
}
