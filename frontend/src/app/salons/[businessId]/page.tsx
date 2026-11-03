import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonStyles } from '../../../components/ui/button';
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
  return (
    <>
      <div className="px-4 pt-4">
        <Link
          href={`/salons/${businessId}/times`}
          className={`${buttonStyles.primary} w-full`}
        >
          بررسی زمان‌ها
        </Link>
      </div>
      <PublicProfile profile={profile} />
    </>
  );
}
