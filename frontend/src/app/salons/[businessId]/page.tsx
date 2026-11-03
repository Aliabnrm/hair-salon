import type { Metadata } from 'next';
import { PublicProfile } from '../../../features/public-catalog/components/public-profile';
import { loadPublicProfile } from '../../../features/public-catalog/api/profile.server';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'پروفایل سالن | آراسته',
  description: 'خدمات و اطلاعات عمومی سالن‌های تأییدشده',
};
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const profile = await loadPublicProfile(businessId);
  return <PublicProfile profile={profile} />;
}
