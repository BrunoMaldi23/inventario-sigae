"use client";

import {
  ArrowDownToLine,
  Boxes,
  FileSpreadsheet,
  History,
  Info,
  ListChecks,
  MapPin,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { useState } from "react";

import { useToast } from "@/components/toast";
import {
  Button,
  PageHeader,
} from "@/components/ui";
import { apiDownload } from "@/lib/api";

type DownloadingType =
  | "assets"
  | "movements"
  | "template"
  | null;

export default function ExportarPage() {
  const { notify } = useToast();

  const [downloading, setDownloading] =
    useState<DownloadingType>(null);

  async function download(
    type: DownloadingType,
    path: string,
    filename: string,
  ) {
    try {
      setDownloading(type);

      await apiDownload(
        path,
        filename,
      );

      notify(
        "Descarga iniciada",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Error al exportar",
        "error",
      );
    } finally {
      setDownloading(null);
    }
  }

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader
        title="Exportar datos"
        description="Genera informes, respaldos y plantillas en formato Excel."
      />

      {/* =====================================================
          INTRO
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FileSpreadsheet
                size={22}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Centro de exportaciones
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Descarga la información del sistema en archivos Excel para respaldo, análisis o gestión administrativa.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 md:self-auto">
            <ShieldCheck
              size={15}
              className="text-emerald-700"
            />

            Datos generados desde PostgreSQL
          </div>
        </div>
      </section>

      {/* =====================================================
          EXPORTACIONES
      ===================================================== */}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* INVENTARIO */}

        <ExportCard
          icon={
            <Boxes size={22} />
          }
          variant="green"
          title="Inventario completo"
          description="Descarga el listado actualizado de todos los bienes registrados en el sistema."
          items={[
            {
              icon: (
                <PackageCheck
                  size={14}
                />
              ),
              label:
                "Identificación y código",
            },
            {
              icon: (
                <MapPin
                  size={14}
                />
              ),
              label:
                "Ubicación actual",
            },
            {
              icon: (
                <ListChecks
                  size={14}
                />
              ),
              label:
                "Estado y responsable",
            },
          ]}
          footer="Archivo XLSX"
        >
          <Button
            onClick={() =>
              download(
                "assets",
                "/exports/assets",
                `inventario-${date}.xlsx`,
              )
            }
            loading={
              downloading ===
              "assets"
            }
            disabled={
              downloading !==
                null &&
              downloading !==
                "assets"
            }
          >
            <ArrowDownToLine
              size={16}
            />

            Exportar inventario
          </Button>
        </ExportCard>

        {/* MOVIMIENTOS */}

        <ExportCard
          icon={
            <History size={22} />
          }
          variant="blue"
          title="Movimientos"
          description="Genera un informe con el historial de operaciones realizadas sobre los bienes."
          items={[
            {
              icon: (
                <RefreshCcw
                  size={14}
                />
              ),
              label:
                "Traslados",
            },
            {
              icon: (
                <ListChecks
                  size={14}
                />
              ),
              label:
                "Cambios de estado",
            },
            {
              icon: (
                <History
                  size={14}
                />
              ),
              label:
                "Historial de operaciones",
            },
          ]}
          footer="Archivo XLSX"
        >
          <Button
            variant="secondary"
            onClick={() =>
              download(
                "movements",
                "/exports/movements",
                `movimientos-${date}.xlsx`,
              )
            }
            loading={
              downloading ===
              "movements"
            }
            disabled={
              downloading !==
                null &&
              downloading !==
                "movements"
            }
          >
            <ArrowDownToLine
              size={16}
            />

            Exportar movimientos
          </Button>
        </ExportCard>

        {/* PLANTILLA */}

        <ExportCard
          icon={
            <FileSpreadsheet
              size={22}
            />
          }
          variant="amber"
          title="Plantilla de importación"
          description="Descarga la plantilla oficial para preparar una carga masiva de bienes."
          items={[
            {
              icon: (
                <ListChecks
                  size={14}
                />
              ),
              label:
                "Encabezados correctos",
            },
            {
              icon: (
                <PackageCheck
                  size={14}
                />
              ),
              label:
                "Formato compatible",
            },
            {
              icon: (
                <ShieldCheck
                  size={14}
                />
              ),
              label:
                "Lista para validación",
            },
          ]}
          footer="Plantilla XLSX"
        >
          <Button
            variant="secondary"
            onClick={() =>
              download(
                "template",
                "/exports/template",
                "plantilla-inventario.xlsx",
              )
            }
            loading={
              downloading ===
              "template"
            }
            disabled={
              downloading !==
                null &&
              downloading !==
                "template"
            }
          >
            <ArrowDownToLine
              size={16}
            />

            Descargar plantilla
          </Button>
        </ExportCard>
      </div>

      {/* =====================================================
          INFORMACIÓN
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
            <Info size={16} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Sobre las exportaciones
            </p>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Los archivos se generan utilizando la información actual registrada en el sistema. Excel funciona como formato de respaldo y reporte; PostgreSQL continúa siendo la fuente oficial de los datos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   EXPORT CARD
============================================================ */

function ExportCard({
  icon,
  title,
  description,
  items,
  footer,
  variant,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: {
    icon: React.ReactNode;
    label: string;
  }[];
  footer: string;
  variant:
    | "green"
    | "blue"
    | "amber";
  children: React.ReactNode;
}) {
  const styles = {
    green: {
      icon:
        "bg-emerald-50 text-emerald-700",
      badge:
        "bg-emerald-50 text-emerald-700",
    },

    blue: {
      icon:
        "bg-sky-50 text-sky-700",
      badge:
        "bg-sky-50 text-sky-700",
    },

    amber: {
      icon:
        "bg-amber-50 text-amber-700",
      badge:
        "bg-amber-50 text-amber-700",
    },
  };

  const config =
    styles[variant];

  return (
    <section className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-1 flex-col p-5">
        {/* ICON */}

        <div
          className={[
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            config.icon,
          ].join(" ")}
        >
          {icon}
        </div>

        {/* TITLE */}

        <h2 className="mt-5 text-base font-semibold text-slate-900">
          {title}
        </h2>

        <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
          {description}
        </p>

        {/* CONTENT */}

        <div className="mt-5 space-y-2.5">
          {items.map(
            (item) => (
              <div
                key={
                  item.label
                }
                className="flex items-center gap-2 text-xs text-slate-600"
              >
                <div
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    config.badge,
                  ].join(
                    " ",
                  )}
                >
                  {
                    item.icon
                  }
                </div>

                <span>
                  {
                    item.label
                  }
                </span>
              </div>
            ),
          )}
        </div>

        {/* BUTTON */}

        <div className="mt-auto pt-6">
          {children}
        </div>
      </div>

      {/* FOOTER */}

      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <FileSpreadsheet
            size={13}
          />

          {footer}
        </div>
      </div>
    </section>
  );
}