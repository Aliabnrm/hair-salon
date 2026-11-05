import { useId, type ComponentPropsWithRef } from 'react';
export function TextField({
  label,
  hint,
  error,
  comfortable = false,
  ...props
}: ComponentPropsWithRef<'input'> & {
  label: string;
  comfortable?: boolean;
  hint?: string;
  error?: string | undefined;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div>
      <label
        className={`mb-2 block font-bold text-ink ${comfortable ? 'text-base' : 'text-sm'}`}
        htmlFor={id}
      >
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? descriptionId : undefined}
        className={`h-14 w-full min-w-0 rounded-2xl border bg-surface px-4 text-base text-ink placeholder:text-muted disabled:opacity-70 ${error ? 'border-danger' : comfortable ? 'border-muted' : 'border-line-strong'}`}
      />
      {(hint || error) && (
        <p
          id={descriptionId}
          className={`mt-2 leading-6 ${comfortable ? 'text-sm' : 'text-xs'} ${error ? 'text-danger' : 'text-muted'}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
