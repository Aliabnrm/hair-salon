import { Icon } from './icon';

const steps = ['انتخاب خدمت', 'انتخاب زمان', 'ثبت نهایی'];
export function BookingProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol
      aria-label="مراحل رزرو"
      className="grid grid-cols-3 items-start gap-2 py-1 text-xs sm:text-sm"
    >
      {steps.map((label, index) => (
        <li
          key={label}
          aria-current={index + 1 === step ? 'step' : undefined}
          className={`flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-start ${index + 1 <= step ? 'text-petrol-deep' : 'text-muted'}`}
        >
          <span
            className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${index + 1 <= step ? 'bg-petrol text-white' : 'bg-sand'}`}
          >
            {index + 1 < step ? (
              <Icon
                name="check"
                size={14}
              />
            ) : (
              (index + 1).toLocaleString('fa-IR')
            )}
          </span>
          <span
            className={`min-w-0 max-w-full break-words ${index + 1 === step ? 'font-bold' : ''}`}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}
