import { PublicationScreen } from '../../../../../features/salon-management/components/publication/publication-screen';
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  return <PublicationScreen businessId={businessId} />;
}
