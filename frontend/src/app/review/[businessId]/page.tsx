import { ReviewDetail } from '../../../features/review/components/review-detail';
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  return <ReviewDetail businessId={businessId} />;
}
