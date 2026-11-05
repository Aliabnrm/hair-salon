'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function PageActionBar({
  children,
  label = 'ادامه رزرو',
}: {
  children: ReactNode;
  label?: string;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => setContainer(document.getElementById('page-actions')), []);
  if (!container) return null;
  return createPortal(
    <section
      aria-label={label}
      className="space-y-3 border-t border-line bg-surface px-4 py-3 shadow-card sm:px-6"
    >
      {children}
    </section>,
    container,
  );
}
