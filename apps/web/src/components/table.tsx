"use client";

import { ReactNode } from "react";

export function Table({
  head,
  children,
  minWidth = "760px",
  maxHeight,
}: {
  head: ReactNode;
  children: ReactNode;
  minWidth?: string;
  maxHeight?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-white to-transparent" />
      <div
        className="overflow-auto overscroll-contain"
        style={maxHeight ? { maxHeight } : undefined}
      >
      <table className="w-full divide-y divide-slate-200 text-sm" style={{ minWidth }}>
        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(148,163,184,0.28)]">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[11px] font-medium text-slate-400 sm:hidden">
        Desliza la tabla para ver más columnas.
      </div>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-slate-700 ${className}`}>{children}</td>;
}
