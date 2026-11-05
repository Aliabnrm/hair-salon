import { useEffect, useState } from 'react';
import { HttpFailure } from '../../../lib/api/http-client';
import { Button } from '../../../components/ui/button';
import { useManagedMutation } from '../../salon-management/hooks/use-managed-mutation';
import { RequestFeedback } from '../../salon-management/components/request-feedback';
import type { Publication } from '../../salon-management/model/publication.types';
import { decide } from '../api/review.api';
export function ReviewDecisionForm({
  businessId,
  status,
  reload,
  checking,
  onDenied,
}: {
  businessId: string;
  status: Publication;
  reload: () => Promise<void>;
  checking: boolean;
  onDenied: () => void;
}) {
  const [reason, setReason] = useState('');
  const mutation = useManagedMutation();
  useEffect(() => {
    if (mutation.error instanceof HttpFailure && [401, 403, 404].includes(mutation.error.status))
      onDenied();
  }, [mutation.error, onDenied]);
  const stale =
    mutation.error instanceof HttpFailure && [401, 403, 404, 409].includes(mutation.error.status);
  const frozen = checking || mutation.pending || mutation.uncertain || mutation.waiting || stale;
  async function submit(decision: 'approve' | 'reject' | 'suspend') {
    await mutation.execute(
      JSON.stringify([status.version, decision, reason]),
      (key, s) =>
        decide(
          businessId,
          decision,
          status.request_id,
          reason.trim() || null,
          status.version,
          status.content_revision,
          key,
          s,
        ),
      reload,
    );
  }
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-4">
      <h2 className="text-xl font-bold">تصمیم بررسی‌کننده</h2>
      <p className="leading-8 text-ink-soft">
        نسخه محتوای {new Intl.NumberFormat('fa').format(status.content_revision)}؛ تصمیم فقط برای
        همین درخواست ثبت می‌شود.
      </p>
      <label className="block space-y-2">
        <span className="font-bold">دلیل رد یا تعلیق</span>
        <textarea
          className="block min-h-28 w-full rounded-xl border border-line bg-surface p-3 text-base"
          maxLength={600}
          value={reason}
          disabled={frozen}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        {status.state === 'pending_review' && (
          <>
            <Button
              disabled={frozen || status.issues.length > 0}
              onClick={() => void submit('approve')}
            >
              تأیید انتشار
            </Button>
            <Button
              variant="secondary"
              disabled={frozen || reason.trim().length < 2}
              onClick={() => void submit('reject')}
            >
              رد درخواست
            </Button>
          </>
        )}
        {status.state === 'published' && (
          <Button
            variant="secondary"
            disabled={frozen || reason.trim().length < 2}
            onClick={() => void submit('suspend')}
          >
            تعلیق انتشار
          </Button>
        )}
        {status.state === 'suspended' && (
          <Button
            disabled={frozen || status.issues.length > 0}
            onClick={() => void submit('approve')}
          >
            رفع تعلیق و انتشار
          </Button>
        )}
      </div>
      <RequestFeedback mutation={mutation} />
      {Boolean(mutation.error) && (
        <Button
          variant="ghost"
          onClick={() => void reload()}
        >
          دریافت نسخه و دسترسی تازه
        </Button>
      )}
    </section>
  );
}
