import { TextField } from '../../../../components/ui/text-field';
import { Button } from '../../../../components/ui/button';
import type { Interval } from '../../model/management.types';
import { digits } from '../../model/form-values';
export function IntervalEditor({
  label,
  intervals,
  onChange,
}: {
  label: string;
  intervals: Interval[];
  onChange: (rows: Interval[]) => void;
}) {
  const update = (index: number, key: keyof Interval, value: string) =>
    onChange(intervals.map((row, i) => (i === index ? { ...row, [key]: digits(value) } : row)));
  return (
    <fieldset className="space-y-3 rounded-2xl border border-line p-3">
      <legend className="px-1 font-bold">{label}</legend>
      {!intervals.length && <p className="text-sm text-muted">بسته</p>}
      {intervals.map((row, index) => (
        <div
          key={index}
          className="space-y-2"
        >
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <TextField
              label={`${label} شروع ${index + 1}`}
              value={row.start_local}
              onChange={(e) => update(index, 'start_local', e.target.value)}
              dir="ltr"
              inputMode="numeric"
              maxLength={5}
              required
              placeholder="09:00"
            />
            <TextField
              label={`${label} پایان ${index + 1}`}
              value={row.end_local}
              onChange={(e) => update(index, 'end_local', e.target.value)}
              dir="ltr"
              inputMode="numeric"
              maxLength={5}
              required
              placeholder="18:00"
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => onChange(intervals.filter((_, i) => i !== index))}
          >
            حذف بازه {index + 1} {label}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        disabled={intervals.length >= 4}
        onClick={() => onChange([...intervals, { start_local: '09:00', end_local: '18:00' }])}
      >
        افزودن بازه {label}
      </Button>
    </fieldset>
  );
}
