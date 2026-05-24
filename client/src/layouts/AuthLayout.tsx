import type { PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout({ children }: PropsWithChildren) {
  const appName = import.meta.env.VITE_APP_NAME ?? 'ALUMEX IMS';

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="relative hidden min-h-screen overflow-hidden bg-slate-900 md:flex md:items-center md:justify-center md:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(245,158,11,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.22)_1px,transparent_1px)] [background-position:center] [background-size:44px_44px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rotate-12 rounded-[2.5rem] border border-amber-400/30 bg-amber-400/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-14 -left-20 h-56 w-56 -rotate-12 rounded-[2rem] border border-amber-300/20"
        />

        <div className="relative z-10 max-w-lg">
          <div className="mb-8 h-1.5 w-24 rounded-full bg-amber-500" />
          <h1 className="text-5xl font-extrabold tracking-[0.08em] text-white">
            {appName}
          </h1>
          <p className="mt-4 text-2xl font-semibold text-slate-200">
            Inventory Management System
          </p>
          <p className="mt-8 text-sm font-medium tracking-wide text-amber-300">
            Powered by Alumex PLC · A Hayleys Group Company
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col bg-slate-50">
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">{children ?? <Outlet />}</div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500 sm:px-10">
          © 2025 Alumex PLC. All rights reserved.
        </div>
      </main>
    </div>
  );
}