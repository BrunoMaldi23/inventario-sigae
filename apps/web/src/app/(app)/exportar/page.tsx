"use client";

import { apiDownload } from "@/lib/api";
import { Card, PageHeader } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function ExportarPage() {
  const { notify } = useToast();

  async function download(path: string, filename: string) {
    try {
      await apiDownload(path, filename);
      notify("Descarga iniciada");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Error al exportar", "error");
    }
  }

  const items = [
    {
      icon: "📦",
      title: "Inventario completo",
      description: "Listado de todos los bienes con sus datos y ubicación actual.",
      action: () => download("/exports/assets", `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`),
      label: "Exportar inventario",
    },
    {
      icon: "🔄",
      title: "Movimientos",
      description: "Historial de traslados, cambios de estado y operaciones.",
      action: () => download("/exports/movements", `movimientos-${new Date().toISOString().slice(0, 10)}.xlsx`),
      label: "Exportar movimientos",
    },
    {
      icon: "📋",
      title: "Plantilla de importación",
      description: "Plantilla .xlsx con los encabezados aceptados por la importación.",
      action: () => download("/exports/template", "plantilla-inventario.xlsx"),
      label: "Descargar plantilla",
    },
  ];

  return (
    <div>
      <PageHeader title="Exportar datos" description="Informes y respaldos en Excel (XLSX)" />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <Card key={it.title}>
            <div className="flex flex-col items-start">
              <span className="text-3xl">{it.icon}</span>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">{it.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{it.description}</p>
              <button onClick={it.action} className="mt-4 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                {it.label}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}