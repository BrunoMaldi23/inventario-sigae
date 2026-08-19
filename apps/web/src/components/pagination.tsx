"use client";

import { Button } from "@/components/ui";

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1 && total === 0) return null;
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span>Página {page} de {totalPages || 1} · {total} registros</span>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </Button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-8 w-8 rounded-md text-sm font-medium ${
              p === page ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p}
          </button>
        ))}
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}