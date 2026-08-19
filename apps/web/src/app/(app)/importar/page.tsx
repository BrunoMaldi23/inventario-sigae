"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileUp,
  History,
  Info,
  RefreshCcw,
  UploadCloud,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Pagination } from "@/components/pagination";
import { Table, Td, Th } from "@/components/table";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { usePage } from "@/hooks/use-fetch";
import {
  apiDownload,
  apiPost,
  apiUpload,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

interface ImportPreview {
  jobId: string;

  summary: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    duplicateRows: number;
    errorRows: number;
  };

  issues: {
    row: number;
    code: string;
    message: string;
    level: "error" | "warning";
  }[];
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

  createdBy?: {
    name: string;
  };
}

const jobStatusBadge: Record<
  string,
  "green" | "amber" | "red" | "slate" | "indigo"
> = {
  COMPLETED: "green",
  VALIDATED: "amber",
  FAILED: "red",
  PENDING: "slate",
};

const jobStatusLabel: Record<string, string> = {
  COMPLETED: "Completada",
  VALIDATED: "Validada",
  FAILED: "Fallida",
  PENDING: "Pendiente",
};

export default function ImportarPage() {
  const { notify } = useToast();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] =
    useState<ImportPreview | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  const {
    items,
    meta,
    loading,
    setPage,
    reload,
  } = usePage<ImportJobItem>(
    "/imports",
    {
      pageSize: 15,
    },
  );

  async function onFile(file: File) {
    if (
      !file.name
        .toLowerCase()
        .endsWith(".xlsx") &&
      !file.name
        .toLowerCase()
        .endsWith(".xls")
    ) {
      notify(
        "Seleccione un archivo Excel válido.",
        "error",
      );

      return;
    }

    setUploading(true);

    try {
      const fd =
        new FormData();

      fd.append(
        "file",
        file,
      );

      const res =
        await apiUpload<ImportPreview>(
          "/imports/assets",
          fd,
        );

      setPreview(res);

      notify(
        `Archivo validado: ${res.summary.validRows} filas válidas`,
      );

      reload();
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "Error al procesar el archivo",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  async function confirmImport() {
    if (!preview) {
      return;
    }

    setConfirming(true);

    try {
      const res =
        await apiPost<{
          imported: number;
          skipped: number;
        }>(
          `/imports/${preview.jobId}/confirm`,
        );

      notify(
        `Importación completada: ${res.imported} bienes creados`,
      );

      setPreview(null);

      reload();
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "Error al confirmar",
        "error",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function downloadTemplate() {
    try {
      await apiDownload(
        "/exports/template",
        "plantilla-inventario.xlsx",
      );
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "No se pudo descargar la plantilla.",
        "error",
      );
    }
  }

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
  ) {
    e.preventDefault();

    setDragging(false);

    const file =
      e.dataTransfer.files?.[0];

    if (file) {
      void onFile(file);
    }
  }

  const hasErrors =
    Boolean(
      preview &&
        preview.summary.errorRows >
          0,
    );

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader
        title="Importar Excel"
        description="Carga, valida y revisa una planilla antes de incorporarla al inventario."
        actions={
          <Button
            variant="secondary"
            onClick={
              downloadTemplate
            }
          >
            <Download size={16} />
            Descargar plantilla
          </Button>
        }
      />

      {/* =====================================================
          FLUJO
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-3">
        <StepItem
          number="1"
          title="Cargar archivo"
          description="Selecciona la planilla Excel."
          active
        />

        <StepItem
          number="2"
          title="Validar datos"
          description="Revisamos errores y duplicados."
          active={Boolean(
            preview,
          )}
        />

        <StepItem
          number="3"
          title="Confirmar"
          description="Incorpora los bienes válidos."
          active={Boolean(
            preview &&
              !hasErrors,
          )}
        />
      </div>

      {/* =====================================================
          CARGA
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <FileUp size={18} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Cargar archivo
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Utiliza preferentemente la plantilla oficial para evitar problemas de validación.
            </p>
          </div>
        </div>

        <div className="p-5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!uploading) {
                fileInputRef.current?.click();
              }
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" ||
                e.key === " "
              ) {
                e.preventDefault();

                if (!uploading) {
                  fileInputRef.current?.click();
                }
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={handleDrop}
            className={[
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
              dragging
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/40",
              uploading
                ? "pointer-events-none opacity-70"
                : "",
            ].join(" ")}
          >
            {uploading ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Spinner className="h-6 w-6 text-emerald-700" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-800">
                  Validando archivo…
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Estamos revisando la información antes de continuar.
                </p>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <UploadCloud size={26} />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-900">
                  Arrastra tu archivo aquí
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  o haz clic para seleccionarlo desde tu equipo
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  <FileSpreadsheet size={14} />
                  XLSX / XLS · Máximo 20 MB
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file =
                  e.target
                    .files?.[0];

                if (file) {
                  void onFile(
                    file,
                  );
                }

                e.target.value =
                  "";
              }}
            />
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <Info
              size={16}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <p className="text-xs leading-5 text-slate-500">
              El sistema no importará nada inmediatamente. Primero valida la planilla y te muestra los errores, advertencias y duplicados encontrados.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          PREVIEW / VALIDACIÓN
      ===================================================== */}

      {preview && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FileCheck2 size={18} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Resultado de validación
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Revisa los resultados antes de confirmar la importación.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setPreview(
                  null,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <RefreshCcw
                size={13}
              />
              Cambiar archivo
            </button>
          </div>

          <div className="p-5">
            {/* KPIs */}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <ValidationStat
                label="Filas totales"
                value={
                  preview.summary
                    .totalRows
                }
                variant="default"
              />

              <ValidationStat
                label="Válidas"
                value={
                  preview.summary
                    .validRows
                }
                variant="success"
              />

              <ValidationStat
                label="Advertencias"
                value={
                  preview.summary
                    .warningRows
                }
                variant="warning"
              />

              <ValidationStat
                label="Duplicadas"
                value={
                  preview.summary
                    .duplicateRows
                }
                variant="danger"
              />

              <ValidationStat
                label="Con errores"
                value={
                  preview.summary
                    .errorRows
                }
                variant="danger"
              />
            </div>

            {/* ISSUES */}

            {preview.issues
              .length > 0 && (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Observaciones encontradas
                  </h3>
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                          Fila
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                          Tipo
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                          Detalle
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {preview.issues.map(
                        (
                          issue,
                          index,
                        ) => (
                          <tr
                            key={
                              `${issue.row}-${index}`
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                              {
                                issue.row
                              }
                            </td>

                            <td className="px-4 py-3">
                              <Badge
                                tone={
                                  issue.level ===
                                  "error"
                                    ? "red"
                                    : "amber"
                                }
                              >
                                {issue.level ===
                                "error"
                                  ? "Error"
                                  : "Advertencia"}
                              </Badge>
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {
                                issue.message
                              }
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* RESULTADO */}

            {hasErrors ? (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <XCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    La planilla contiene errores
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    Corrige las filas indicadas en Excel y vuelve a cargar el archivo. No se ha ingresado ningún bien al inventario.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />

                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Archivo listo para importar
                    </p>

                    <p className="mt-1 text-xs text-emerald-800/80">
                      Se incorporarán{" "}
                      <strong>
                        {
                          preview
                            .summary
                            .validRows
                        }
                      </strong>{" "}
                      bienes al inventario.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={
                    confirmImport
                  }
                  loading={
                    confirming
                  }
                >
                  <CheckCircle2
                    size={16}
                  />
                  Confirmar importación
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          HISTORIAL
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <History
                size={18}
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Historial de importaciones
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Revisa las planillas procesadas anteriormente.
              </p>
            </div>
          </div>

          {!loading &&
            meta.total >
              0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {meta.total}
              </span>
            )}
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Spinner className="h-6 w-6 text-emerald-700" />
          </div>
        ) : items.length === 0 ? (
          <div className="min-h-[260px]">
            <EmptyState
              title="Sin importaciones"
              description="Las importaciones realizadas aparecerán aquí."
            />
          </div>
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>
                    Archivo
                  </Th>
                  <Th>
                    Estado
                  </Th>
                  <Th>
                    Filas
                  </Th>
                  <Th>
                    Válidas
                  </Th>
                  <Th>
                    Errores
                  </Th>
                  <Th>
                    Fecha
                  </Th>
                  <Th>
                    Usuario
                  </Th>
                </>
              }
            >
              {items.map(
                (job) => (
                  <tr
                    key={
                      job.id
                    }
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80"
                  >
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <FileSpreadsheet
                            size={15}
                          />
                        </div>

                        <span className="font-medium text-slate-800">
                          {
                            job.filename
                          }
                        </span>
                      </div>
                    </Td>

                    <Td>
                      <Badge
                        tone={
                          jobStatusBadge[
                            job.status
                          ] ??
                          "slate"
                        }
                      >
                        {jobStatusLabel[
                          job.status
                        ] ??
                          job.status}
                      </Badge>
                    </Td>

                    <Td>
                      {
                        job.totalRows
                      }
                    </Td>

                    <Td>
                      <span className="font-semibold text-emerald-700">
                        {
                          job.validRows
                        }
                      </span>
                    </Td>

                    <Td>
                      <span
                        className={
                          job.errorRows >
                          0
                            ? "font-semibold text-red-600"
                            : "text-slate-400"
                        }
                      >
                        {
                          job.errorRows
                        }
                      </span>
                    </Td>

                    <Td className="text-slate-500">
                      {formatDateTime(
                        job.completedAt ??
                          job.createdAt,
                      )}
                    </Td>

                    <Td className="text-slate-600">
                      {job.createdBy
                        ?.name ??
                        "—"}
                    </Td>
                  </tr>
                ),
              )}
            </Table>

            <div className="border-t border-slate-100 px-4 py-3">
              <Pagination
                page={
                  meta.page
                }
                totalPages={
                  meta.totalPages
                }
                total={
                  meta.total
                }
                onChange={
                  setPage
                }
              />
            </div>
          </>
        )}
      </section>

      {/* =====================================================
          AYUDA
      ===================================================== */}

      <div className="flex items-start gap-3 rounded-xl bg-slate-100/70 px-4 py-3">
        <Info
          size={15}
          className="mt-0.5 shrink-0 text-slate-400"
        />

        <p className="text-xs leading-5 text-slate-500">
          ¿No tienes la plantilla? Puedes descargarla desde el botón superior o{" "}
          <Link
            href="/exportar"
            className="font-semibold text-emerald-700 hover:text-emerald-800"
          >
            exportar el inventario actual
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   STEP
============================================================ */

function StepItem({
  number,
  title,
  description,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border px-4 py-4 transition",
        active
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
            active
              ? "bg-emerald-700 text-white"
              : "bg-slate-100 text-slate-400",
          ].join(" ")}
        >
          {number}
        </div>

        <div>
          <p
            className={[
              "text-sm font-semibold",
              active
                ? "text-emerald-900"
                : "text-slate-700",
            ].join(" ")}
          >
            {title}
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VALIDATION STAT
============================================================ */

function ValidationStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger";
}) {
  const styles = {
    default: {
      box: "bg-slate-50",
      icon: "bg-slate-100 text-slate-600",
      value: "text-slate-900",
      iconNode: (
        <FileSpreadsheet
          size={17}
        />
      ),
    },

    success: {
      box: "bg-emerald-50",
      icon:
        "bg-emerald-100 text-emerald-700",
      value:
        "text-emerald-800",
      iconNode: (
        <CheckCircle2
          size={17}
        />
      ),
    },

    warning: {
      box: "bg-amber-50",
      icon:
        "bg-amber-100 text-amber-700",
      value:
        "text-amber-800",
      iconNode: (
        <AlertTriangle
          size={17}
        />
      ),
    },

    danger: {
      box: "bg-red-50",
      icon:
        "bg-red-100 text-red-700",
      value:
        "text-red-800",
      iconNode: (
        <XCircle
          size={17}
        />
      ),
    },
  };

  const config =
    styles[variant];

  return (
    <div
      className={[
        "rounded-xl px-4 py-3",
        config.box,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className={[
              "text-2xl font-semibold tracking-tight",
              config.value,
            ].join(" ")}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {label}
          </p>
        </div>

        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-xl",
            config.icon,
          ].join(" ")}
        >
          {config.iconNode}
        </div>
      </div>
    </div>
  );
}