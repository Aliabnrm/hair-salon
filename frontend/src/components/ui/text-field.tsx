import { useId, type InputHTMLAttributes } from 'react';
export function TextField({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink" htmlFor={id}>
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? descriptionId : undefined}
        className={`h-14 w-full min-w-0 rounded-2xl border bg-surface px-4 text-base text-ink placeholder:text-muted disabled:opacity-70 ${error ? 'border-danger' : 'border-line-strong'}`}
      />
      {(hint || error) && (
        <p
          id={descriptionId}
          className={`mt-2 text-xs leading-6 ${error ? 'text-danger' : 'text-muted'}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
