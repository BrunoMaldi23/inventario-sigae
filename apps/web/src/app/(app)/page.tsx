"use client";

import Link from "next/link";
import { useData } from "@/hooks/use-fetch";
import { Card, EmptyState, PageHeader, Spinner, StatCard } from "@/components/ui";
import { DashboardSummary, MOVEMENT_TYPE_LABELS } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/components/auth-provider";

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const canReadAssets = hasPermission("asset.read");
  const { data, loading, error } = useData<DashboardSummary>("/dashboard/summary");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <PageHeader title="Panel" />
    );
  }

  if (!data) return <PageHeader title="Panel" />;

  const maxLoc = Math.max(1, ...data.byLocation.map((l) => l.count));

  return (
    <div>
      <PageHeader
        title="Panel de control"
        description="Resumen del estado del inventario escolar"
        actions={
          canReadAssets ? (
            <Link href="/inventario" className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
              Ver inventario
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Bienes registrados" value={data.kpis.total} accent="bg-indigo-600" />
        <StatCard label="Activos" value={data.kpis.activos} accent="bg-green-500" />
        <StatCard label="En buen estado" value={data.kpis.buenEstado} accent="bg-emerald-500" />
        <StatCard label="En mantención / reparación" value={data.kpis.enReparacion + data.kpis.regular} accent="bg-amber-500" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Alertas de trazabilidad">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-red-700">
              <span>Bienes sin ubicación</span>
              <span className="font-bold">{data.alerts.sinUbicacion}</span>
            </li>
            <li className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-amber-700">
              <span>Bienes sin responsable</span>
              <span className="font-bold">{data.alerts.sinResponsable}</span>
            </li>
            <li className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-slate-600">
              <span>Bienes sin serie</span>
              <span className="font-bold">{data.alerts.sinSerie}</span>
            </li>
          </ul>
        </Card>

        <Card title="Por estado">
          {data.byStatus.some((s) => s.count > 0) ? (
            <ul className="space-y-2">
              {data.byStatus.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 text-slate-600">{s.name}</span>
                  <span className="font-semibold text-slate-800">{s.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin datos" description="Aún no hay bienes registrados" />
          )}
        </Card>

        <Card title="Bienes por ubicación">
          {data.byLocation.length > 0 ? (
            <ul className="space-y-2">
              {data.byLocation.map((l) => (
                <li key={l.locationId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{l.name}</span>
                    <span className="font-semibold">{l.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-indigo-600"
                      style={{ width: `${Math.max(4, (l.count / maxLoc) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin datos" description="Aún no hay bienes registrados" />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Movimientos recientes">
          {data.recentMovements.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {data.recentMovements.map((m) => (
                <li key={m.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <Link href={canReadAssets ? `/inventario/${m.assetCode}` : "#"} className="font-medium text-indigo-600 hover:underline">
                      {m.assetName}
                    </Link>
                    <span className="text-xs text-slate-400">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {MOVEMENT_TYPE_LABELS[m.type] ?? m.type}{" "}
                    {m.fromLocation && m.toLocation ? `${m.fromLocation} → ${m.toLocation}` : m.toLocation ? `→ ${m.toLocation}` : ""}
                    {" · "}
                    {m.performedBy ?? "Sistema"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin movimientos" />
          )}
        </Card>

        <Card title="Bienes por categoría">
          {data.byCategory.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {data.byCategory.map((c) => (
                <li key={c.name} className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
                  {c.name} · <span className="font-semibold">{c.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin datos" />
          )}
        </Card>
      </div>
    </div>
  );
}