import { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-200/60 via-slate-50 to-sky-200/60 p-5">
      <div aria-hidden className="pointer-events-none absolute -left-28 -top-28 size-96 rounded-full bg-indigo-300/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-36 -right-28 size-[28rem] rounded-full bg-sky-300/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/4 size-80 -translate-x-1/2 rounded-full bg-violet-200/30 blur-3xl" />
      {children}
    </main>
  );
}