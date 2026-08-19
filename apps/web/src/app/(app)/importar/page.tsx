"use client";

import { useState } from "react";
import Link from "next/link";
import { usePage } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { Table, Td, Th } from "@/components/table";
import { apiDownload, apiPost, apiUpload } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

interface ImportPreview {
  jobId: string;
  summary: { totalRows: number; validRows: number; warningRows: number; duplicateRows: number; errorRows: number };
  issues: { row: number; code: string; message: string; level: "error" | "warning" }[];
}

interface ImportJobItem {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  completedAt: string | null;
  createdAt: string;
  createdBy?: { name: string };
}

const jobStatusBadge: Record<string, "green" | "amber" | "red" | "slate" | "indigo"> = {
  COMPLETED: "green",
  VALIDATED: "amber",
  FAILED: "red",
  PENDING: "slate",
};

export default function ImportarPage() {
  const { notify } = useToast();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { items, meta, loading, setPage, reload } = usePage<ImportJobItem>("/imports", { pageSize: 15 });

  async function onFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiUpload<ImportPreview>("/imports/assets", fd);
      setPreview(res);
      notify(`Archivo validado: ${res.summary.validRows} filas válidas`);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al procesar el archivo", "error");
    } finally {
      setUploading(false);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setConfirming(true);
    try {
      const res = await apiPost<{ imported: number; skipped: number }>(`/imports/${preview.jobId}/confirm`);
      notify(`Importación completada: ${res.imported} bienes creados`);
      setPreview(null);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al confirmar", "error");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Importar desde Excel"
        description="Cargue un archivo .xlsx con la plantilla: el sistema valida y permite confirmar antes de insertar"
        actions={
          <Button
            variant="secondary"
            onClick={() => apiDownload("/exports/template", "plantilla-inventario.xlsx").catch((e) => notify(e.message, "error"))}
          >
            Descargar plantilla
          </Button>
        }
      />

      <Card title="1 · Cargar y validar archivo">
        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-indigo-400 hover:bg-indigo-50/50"
        >
          {uploading ? (
            <Spinner className="h-6 w-6 text-indigo-600" />
          ) : (
            <>
              <span className="text-3xl">⬆️</span>
              <p className="mt-2 text-sm font-medium text-slate-700">Haga clic para seleccionar un archivo .xlsx</p>
              <p className="mt-1 text-xs text-slate-500">Máximo 20 MB · Solo extensión .xlsx</p>
            </>
          )}
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </Card>

      {preview && (
        <Card title="2 · Resumen de validación" className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Sum label="Filas" value={preview.summary.totalRows} />
            <Sum label="Válidas" value={preview.summary.validRows} tone="text-green-600" />
            <Sum label="Con advertencias" value={preview.summary.warningRows} tone="text-amber-600" />
            <Sum label="Duplicadas" value={preview.summary.duplicateRows} tone="text-red-600" />
            <Sum label="Con errores" value={preview.summary.errorRows} tone="text-red-600" />
          </div>

          {preview.issues.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Fila</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.issues.map((iss, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-slate-500">{iss.row}</td>
                      <td className="px-3 py-1.5">
                        <Badge tone={iss.level === "error" ? "red" : "amber"}>{iss.level === "error" ? "Error" : "Advertencia"}</Badge>
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{iss.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.summary.errorRows === 0 ? (
            <div className="mt-4 flex justify-end">
              <Button onClick={confirmImport} loading={confirming}>Confirmar importación ({preview.summary.validRows})</Button>
            </div>
          ) : (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Existen filas con errores. Corríjalas en la planilla y vuelva a cargar.
            </p>
          )}
        </Card>
      )}

      <Card title="Historial de importaciones" className="mt-4">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-indigo-600" /></div>
        ) : items.length === 0 ? (
          <EmptyState title="Sin importaciones" description="Las importaciones realizadas aparecerán aquí" />
        ) : (
          <Table
            head={
              <>
                <Th>Archivo</Th>
                <Th>Estado</Th>
                <Th>Filas</Th>
                <Th>Válidas</Th>
                <Th>Errores</Th>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
              </>
            }
          >
            {items.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <Td className="text-slate-800">{j.filename}</Td>
                <Td><Badge tone={jobStatusBadge[j.status] ?? "slate"}>{j.status}</Badge></Td>
                <Td>{j.totalRows}</Td>
                <Td className="text-green-600">{j.validRows}</Td>
                <Td className="text-red-600">{j.errorRows}</Td>
                <Td className="text-slate-500">{formatDateTime(j.completedAt ?? j.createdAt)}</Td>
                <Td className="text-slate-600">{j.createdBy?.name ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
      </Card>

      <p className="mt-3 text-sm text-slate-500">
        ¿No tiene la plantilla? Descárguela con el botón «Descargar plantilla» o{" "}
        <Link href="/exportar" className="text-indigo-600 hover:underline"> exporte el inventario actual</Link>.
      </p>
    </div>
  );
}

function Sum({ label, value, tone = "text-slate-800" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3 text-center">
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}