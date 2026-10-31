import type { ReactNode } from 'react';
import { BottomNavigation } from './bottom-navigation';
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas lg:flex lg:items-center lg:justify-center lg:bg-sand lg:p-8">
      <div
        data-app-shell
        className="relative mx-auto flex h-dvh w-full max-w-[30rem] flex-col overflow-hidden bg-canvas md:max-w-[44rem] lg:h-[min(54rem,calc(100dvh-4rem))] lg:w-full lg:rounded-3xl lg:shadow-2xl xl:max-w-[52rem]"
      >
        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="screen-enter flex min-h-full flex-col">
            {children}
          </div>
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
}
