import type { ReactNode } from 'react';
export function ManagementFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 p-4 sm:p-6">
      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
      {children}
    </section>
  );
}
