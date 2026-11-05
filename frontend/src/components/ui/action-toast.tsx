import { useEffect, useEffectEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';
import { Icon } from './icon';

export function ActionToast({
  tone,
  title,
  description,
  action,
  onClose,
  duration,
}: {
  tone: 'success' | 'error';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; disabled?: boolean } | undefined;
  onClose: () => void;
  duration?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!duration) return;
    const timer = window.setTimeout(close, duration);
    return () => window.clearTimeout(timer);
  }, [duration]);
  if (!mounted) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto max-w-md">
      <div
        role={tone === 'error' ? 'alert' : 'status'}
        aria-label={title}
        aria-atomic="true"
        dir="rtl"
        className={`screen-enter pointer-events-auto flex items-start gap-3 rounded-2xl border bg-surface p-4 shadow-lift ${tone === 'success' ? 'border-success/25' : 'border-danger/25'}`}
      >
        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${tone === 'success' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}
        >
          <Icon name={tone === 'success' ? 'check' : 'alert'} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{title}</p>
          {description && (
            <p className="mt-1 break-words text-sm leading-6 text-ink-soft">{description}</p>
          )}
          {action && (
            <Button
              variant="ghost"
              className="mt-2 px-0"
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
        <button
          type="button"
          className="-m-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-sand"
          aria-label="بستن پیام"
          onClick={onClose}
        >
          <Icon
            name="close"
            size={18}
          />
        </button>
      </div>
    </div>,
    document.body,
  );
}
