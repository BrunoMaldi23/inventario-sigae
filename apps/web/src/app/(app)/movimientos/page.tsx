"use client";

import Link from "next/link";
import { usePage } from "@/hooks/use-fetch";
import { Badge, Card, EmptyState, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { Table, Td, Th } from "@/components/table";
import { Pagination } from "@/components/pagination";
import { AssetMovementDTO, MOVEMENT_TYPE_LABELS } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const typeTone: Record<string, "indigo" | "green" | "amber" | "red" | "slate"> = {
  TRANSFER: "indigo",
  ASSIGNMENT: "green",
  RETURN: "green",
  STATUS_CHANGE: "amber",
  MAINTENANCE: "amber",
  DISPOSAL: "red",
};

export default function MovimientosPage() {
  const { items, meta, loading, setPage, setParam } = usePage<AssetMovementDTO>("/movements", { pageSize: 25 });

  return (
    <div>
      <PageHeader title="Movimientos" description="Historial de traslados, cambios de estado y operaciones sobre los bienes" />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Input placeholder="Buscar por código, bien o motivo…" onChange={(e) => setParam("search", e.target.value || undefined)} />
        <Select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            setParam("type", v || undefined);
            if (v) (e.target as HTMLSelectElement).dataset.keep = "1";
          }}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="Sin movimientos" description="No hay movimientos que coincidan con los filtros" /></Card>
      ) : (
        <Table
          head={
            <>
              <Th>Fecha</Th>
              <Th>Bien</Th>
              <Th>Tipo</Th>
              <Th>Origen</Th>
              <Th>Destino</Th>
              <Th>Motivo</Th>
              <Th>Por</Th>
            </>
          }
        >
          {items.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50">
              <Td className="whitespace-nowrap text-slate-500">{formatDateTime(m.createdAt)}</Td>
              <Td>
                <Link href={`/inventario/${m.assetId}`} className="font-medium text-indigo-600 hover:underline">
                  {m.assetId}
                </Link>
              </Td>
              <Td>
                <Badge tone={typeTone[m.type] ?? "slate"}>{MOVEMENT_TYPE_LABELS[m.type] ?? m.type}</Badge>
              </Td>
              <Td className="text-slate-600">{m.fromLocation?.name ?? "—"}</Td>
              <Td className="text-slate-600">{m.toLocation?.name ?? "—"}</Td>
              <Td className="max-w-[220px] truncate text-slate-600">{m.reason}</Td>
              <Td className="text-slate-500">{m.performedBy?.name ?? "Sistema"}</Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
    </div>
  );
}