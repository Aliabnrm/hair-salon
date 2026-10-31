import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AppShell } from '../components/layout/app-shell';
import { SessionProvider } from '../features/identity';
import './globals.css';

export const metadata: Metadata = {
  title: 'آراسته | کشف سالن',
  description: 'کشف سالن‌های نمونه و حساب کاربری آراسته',
  icons: { icon: '/assets/brand-mark.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
