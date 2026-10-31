import type { ButtonHTMLAttributes } from 'react';

export const buttonStyles = {
  primary:
    'inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-petrol px-5 text-base font-bold text-white transition-colors hover:bg-petrol-deep disabled:cursor-not-allowed disabled:opacity-70',
  secondary:
    'inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-line-strong bg-surface px-5 text-base font-bold text-ink transition-colors hover:bg-sand disabled:opacity-70',
  ghost:
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-bold text-petrol transition-colors hover:bg-petrol-soft',
};
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonStyles;
}) {
  return (
    <button
      {...props}
      className={`${buttonStyles[variant]} ${className}`}
      type={type}
    />
  );
}
