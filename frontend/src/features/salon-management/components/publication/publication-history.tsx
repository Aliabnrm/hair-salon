import type { Publication } from '../../model/publication.types';
const labels: Record<string, string> = {
  request: 'درخواست انتشار',
  withdraw: 'انصراف یا توقف انتشار',
  approve: 'تأیید انتشار',
  reject: 'رد درخواست',
  suspend: 'تعلیق انتشار',
  content_changed: 'اطلاعات تغییر کرد؛ انتشار متوقف شد',
  publish: 'انتشار مستقیم توسط مالک',
  content_updated: 'اطلاعات به‌روز شد؛ انتشار ادامه دارد',
  publication_incomplete: 'توقف انتشار؛ اطلاعات نیاز به تکمیل دارد',
};
export function PublicationHistory({ history }: { history: Publication['history'] }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4">
      <h2 className="mb-4 text-lg font-bold">سابقه انتشار</h2>
      {!history.length ? (
        <p className="text-muted">هنوز سابقه انتشاری ثبت نشده است.</p>
      ) : (
        <ol className="space-y-4">
          {history.map((h) => (
            <li
              key={h.id}
              className="border-s-2 border-petrol/25 ps-3"
            >
              <p className="font-bold">{labels[h.action] ?? h.action}</p>
              <time
                className="text-sm text-muted"
                dateTime={h.created_at}
              >
                {new Intl.DateTimeFormat('fa-IR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Asia/Tehran',
                }).format(new Date(h.created_at))}
              </time>
              {h.reason && (
                <p className="mt-2 whitespace-pre-wrap break-words leading-8">{h.reason}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
