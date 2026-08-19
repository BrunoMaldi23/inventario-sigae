"use client";

import { useState } from "react";
import { usePage } from "@/hooks/use-fetch";
import { Badge, Card, EmptyState, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { Table, Td, Th } from "@/components/table";
import { Pagination } from "@/components/pagination";
import { AuditLogDTO } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const actionTone: Record<string, "indigo" | "green" | "amber" | "red" | "slate"> = {
  ASSET_CREATE: "green",
  ASSET_UPDATE: "indigo",
  ASSET_TRANSFER: "indigo",
  ASSET_DELETE: "red",
  AUTH_LOGIN: "green",
  AUTH_LOGIN_FAILED: "amber",
  USER_CREATE: "green",
  LOCATION_CREATE: "green",
};

export default function AuditoriaPage() {
  const { items, meta, loading, setPage, setParam } = usePage<AuditLogDTO>("/audit", { pageSize: 25 });

  const [entityType, setEntityType] = useState("");

  return (
    <div>
      <PageHeader title="Auditoría" description="Registro inmutable de las acciones realizadas en el sistema" />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Input placeholder="Buscar por acción o entidad…" onChange={(e) => setParam("action", e.target.value || undefined)} />
        <Select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setParam("entityType", e.target.value || undefined);
          }}
        >
          <option value="">Todas las entidades</option>
          <option value="Asset">Bienes</option>
          <option value="Location">Ubicaciones</option>
          <option value="Category">Categorías</option>
          <option value="User">Usuarios</option>
          <option value="Responsible">Responsables</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="Sin registros de auditoría" /></Card>
      ) : (
        <Table
          head={
            <>
              <Th>Fecha</Th>
              <Th>Acción</Th>
              <Th>Entidad</Th>
              <Th>Cambios</Th>
              <Th>Usuario</Th>
            </>
          }
        >
          {items.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50">
              <Td className="whitespace-nowrap text-slate-500">{formatDateTime(log.createdAt)}</Td>
              <Td><Badge tone={actionTone[log.action] ?? "slate"}>{log.action}</Badge></Td>
              <Td><span className="font-mono text-xs text-slate-600">{log.entityType}</span></Td>
              <Td className="max-w-[280px]">
                <pre className="max-h-16 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-1.5 font-mono text-[11px] text-slate-600">
                  {JSON.stringify(log.newValues ?? "", null, 1)}
                </pre>
              </Td>
              <Td className="text-slate-600">{log.user?.name ?? "Sistema"}</Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
    </div>
  );
}