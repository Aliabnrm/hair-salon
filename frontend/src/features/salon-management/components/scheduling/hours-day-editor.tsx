import type { UseFormReturn } from 'react-hook-form';
import { Button } from '../../../../components/ui/button';
import { TextField } from '../../../../components/ui/text-field';
import { endError, startError } from '../../model/hours-validation';
import type { WeeklyInterval } from '../../model/management.types';

export type HoursForm = { intervals: WeeklyInterval[] };

export function HoursDayEditor({
  day,
  rows,
  form,
  onAdd,
  onRemove,
}: {
  day: string;
  rows: { id: string; index: number }[];
  form: UseFormReturn<HoursForm>;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const {
    register,
    getValues,
    formState: { errors },
  } = form;
  const names = rows.flatMap(({ index }) => [
    `intervals.${index}.start_local` as const,
    `intervals.${index}.end_local` as const,
  ]);
  return (
    <fieldset className="space-y-3 rounded-2xl border border-line p-3">
      <legend className="px-1 font-bold">{day}</legend>
      {rows.length === 0 && <p className="text-sm text-muted">بسته</p>}
      {rows.map(({ id, index }, position) => (
        <div
          key={id}
          className="space-y-2"
        >
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <TextField
              label={`${day} شروع ${position + 1}`}
              dir="ltr"
              inputMode="text"
              maxLength={5}
              placeholder="09:00"
              error={errors.intervals?.[index]?.start_local?.message}
              {...register(`intervals.${index}.start_local`, {
                validate: () => startError(getValues('intervals'), index) ?? true,
                deps: names.filter((name) => name !== `intervals.${index}.start_local`),
              })}
            />
            <TextField
              label={`${day} پایان ${position + 1}`}
              dir="ltr"
              inputMode="text"
              maxLength={5}
              placeholder="18:00"
              error={errors.intervals?.[index]?.end_local?.message}
              {...register(`intervals.${index}.end_local`, {
                validate: () => endError(getValues('intervals'), index) ?? true,
                deps: names.filter((name) => name !== `intervals.${index}.end_local`),
              })}
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => onRemove(index)}
          >
            حذف بازه {position + 1} {day}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        disabled={rows.length >= 4}
        onClick={onAdd}
      >
        افزودن بازه {day}
      </Button>
    </fieldset>
  );
}
