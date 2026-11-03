'use client';
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { TextField } from '../../../../components/ui/text-field';
import * as api from '../../api/management.api';
import type { ScheduleException } from '../../model/management.types';
import { todayIso, inDays, persianDate, jalaliToIso } from '../../model/form-values';
import { usePaged } from '../../hooks/use-paged';
import { useManagedMutation } from '../../hooks/use-managed-mutation';
import { ManagementFrame } from '../management-frame';
import { LoadState, RequestFeedback } from '../request-feedback';
import { ConfirmAction } from '../confirm-action';
import { Pagination } from '../pagination';
import { ExceptionEditor } from './exception-editor';
function ExceptionList({ businessId, from, to }: { businessId: string; from: string; to: string }) {
  const query = usePaged(businessId + from + to, (signal, cursor) =>
    api.listExceptions(businessId, from, to, signal, cursor),
  );
  const [editor, setEditor] = useState<ScheduleException | 'new' | null>(null),
    mutation = useManagedMutation();
  const refresh = async () => {
    setEditor(null);
    await query.reset();
  };
  const remove = (x: ScheduleException) =>
    void mutation.execute(
      JSON.stringify([x.id, x.version, 'remove']),
      (key, signal) => api.removeException(businessId, x.id, x.version, key, signal),
      refresh,
    );
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={mutation.pending || mutation.uncertain}
          onClick={() => setEditor('new')}
        >
          روز خاص جدید
        </Button>
        <Button
          variant="ghost"
          onClick={() => void refresh()}
        >
          تازه‌سازی فهرست
        </Button>
      </div>
      {editor && (
        <ExceptionEditor
          key={editor === 'new' ? 'new' : editor.id}
          businessId={businessId}
          {...(editor === 'new' ? {} : { exception: editor })}
          onSaved={refresh}
          onCancel={() => setEditor(null)}
        />
      )}
      <RequestFeedback mutation={mutation} />
      <LoadState
        loading={query.loading}
        error={query.error}
        retry={() => void query.reload()}
      />
      {query.data && (
        <>
          <ul className="space-y-3">
            {query.data.items.map((x) => (
              <li
                key={x.id}
                className="space-y-2 rounded-2xl border border-line bg-surface p-4"
              >
                <h2 className="font-bold">
                  {persianDate(x.local_date)} · {x.closed ? 'تعطیل' : 'ساعت جایگزین'}
                </h2>
                <p className="text-sm text-muted">{x.staff_id ? 'متخصص انتخاب‌شده' : 'کل سالن'}</p>
                {x.intervals.map((row) => (
                  <p
                    key={row.start_local}
                    dir="ltr"
                    className="text-sm"
                  >
                    {row.start_local} – {row.end_local}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    disabled={mutation.pending || mutation.uncertain}
                    onClick={() => setEditor(x)}
                  >
                    ویرایش روز {persianDate(x.local_date)}
                  </Button>
                  <ConfirmAction
                    label="رفع استثنا"
                    disabled={mutation.pending || mutation.uncertain}
                    onConfirm={() => remove(x)}
                  />
                </div>
              </li>
            ))}
          </ul>
          {!query.data.items.length && <p>در این بازه برنامه روز خاص ندارید.</p>}
          <Pagination
            hasNext={Boolean(query.data.next_cursor)}
            hasPrevious={query.hasPrevious}
            pending={query.loading}
            next={query.next}
            previous={query.previous}
          />
        </>
      )}
    </>
  );
}
export function ExceptionsScreen({ businessId }: { businessId: string }) {
  const [range, setRange] = useState(() => ({
      from: todayIso(),
      to: inDays(todayIso(), 90),
    })),
    [input, setInput] = useState(() => ({
      from: persianDate(range.from),
      to: persianDate(range.to),
    })),
    [error, setError] = useState('');
  return (
    <ManagementFrame title="تعطیلی‌ها و روزهای خاص">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const from = jalaliToIso(input.from),
              to = jalaliToIso(input.to);
            if (
              Date.parse(to) < Date.parse(from) ||
              (Date.parse(to) - Date.parse(from)) / 86400000 > 92
            )
              throw new Error('بازه باید حداکثر ۹۳ روز باشد.');
            setRange({ from, to });
            setError('');
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'تاریخ معتبر نیست.');
          }
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="از تاریخ شمسی"
            value={input.from}
            onChange={(e) => setInput((p) => ({ ...p, from: e.target.value }))}
            dir="ltr"
            required
          />
          <TextField
            label="تا تاریخ شمسی"
            value={input.to}
            onChange={(e) => setInput((p) => ({ ...p, to: e.target.value }))}
            dir="ltr"
            required
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
        >
          نمایش بازه
        </Button>
        {error && (
          <p
            role="alert"
            className="text-sm text-danger"
          >
            {error}
          </p>
        )}
      </form>
      <ExceptionList
        key={range.from + range.to}
        businessId={businessId}
        {...range}
      />
    </ManagementFrame>
  );
}
