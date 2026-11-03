'use client';
import { useRemote } from '../../../../lib/hooks/use-remote';
import { PublicProfile } from '../../../public-catalog';
import { preview, getPublication } from '../../api/publication.api';
import { LoadState } from '../request-feedback';
export function PreviewScreen({ businessId }: { businessId: string }) {
  const q = useRemote(businessId, async (s) => {
    const [profile, publication] = await Promise.all([
      preview(businessId, s),
      getPublication(businessId, s),
    ]);
    return { profile, publication };
  });
  return (
    <>
      <p
        role="status"
        className="m-4 rounded-2xl bg-saffron-soft p-4 leading-8 text-saffron-deep"
      >
        پیش‌نمایش خصوصی؛ این صفحه به معنی انتشار یا امکان رزرو نیست.
      </p>
      <div className="px-4">
        <LoadState
          loading={q.loading}
          error={q.error}
          retry={() => void q.reload()}
        />
      </div>
      {!q.loading && !q.error && q.data && (
        <>
          <ul className="mx-4 space-y-2 rounded-2xl bg-saffron-soft p-4">
            {q.data.publication.issues.map((i, n) => (
              <li
                key={n}
                className="leading-8"
              >
                {i.message}
              </li>
            ))}
          </ul>
          <PublicProfile profile={q.data.profile} />
        </>
      )}
    </>
  );
}
