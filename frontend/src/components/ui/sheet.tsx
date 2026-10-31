'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './icon';

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) {
      dialog?.close();
      return;
    }
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]',
          ),
        );
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto h-dvh w-full bg-transparent lg:h-[min(54rem,calc(100dvh-4rem))] max-w-[30rem] md:max-w-[44rem] xl:max-w-[52rem]"
    >
      <div className="pointer-events-none flex h-full items-end">
        <div className="sheet-panel pointer-events-auto relative flex max-h-[88%] w-full flex-col rounded-t-[1.75rem] bg-canvas shadow-2xl">
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
            <h2 className="text-lg font-extrabold text-ink" id={titleId}>
              {title}
            </h2>
            <button
              type="button"
              aria-label="بستن"
              className="inline-grid size-12 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-ink/5"
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 pb-5">{children}</div>
          {footer && (
            <div className="border-t border-line bg-surface px-5 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
