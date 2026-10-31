import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

export function StatePanel({
  icon,
  title,
  description,
  children,
  tone = 'neutral',
}: {
  icon: IconName;
  title: string;
  description: string;
  children?: ReactNode;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div
      className="flex flex-col items-center rounded-3xl border border-line bg-surface px-6 py-9 text-center"
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <span
        className={`grid size-16 place-items-center rounded-full ${tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-petrol-soft text-petrol'}`}
      >
        <Icon name={icon} size={28} />
      </span>
      <h2 className="mt-5 text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 max-w-72 text-sm leading-7 text-ink-soft">
        {description}
      </p>
      {children && (
        <div className="mt-6 flex w-full flex-col gap-2">{children}</div>
      )}
    </div>
  );
}
