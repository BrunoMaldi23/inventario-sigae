"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePage } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth-provider";
import { useData } from "@/hooks/use-fetch";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { Table, Td, Th } from "@/components/table";
import { Pagination } from "@/components/pagination";
import { AssetDTO, AssetStatusDTO, CategoryDTO, LocationDTO } from "@/lib/types";
import { Modal } from "@/components/modal";
import { apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function InventarioPage() {
  const { hasPermission } = useAuth();
  const { notify } = useToast();
  const canCreate = hasPermission("asset.create");
  const canTransfer = hasPermission("asset.transfer");

  const [categoryId, setCategoryId] = useState<string>("");
  const [statusId, setStatusId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { items, meta, loading, setPage, setParam } = usePage<AssetDTO>("/assets", {
    categoryId: categoryId || undefined,
    statusId: statusId || undefined,
    locationId: locationId || undefined,
    pageSize: 20,
  });

  const { data: categories } = useData<CategoryDTO[]>("/categories");
  const { data: statuses } = useData<AssetStatusDTO[]>("/statuses");
  const { data: locations } = useData<LocationDTO[]>("/locations?active=true");

  async function submitBulk() {
    if (!bulkTarget || !bulkReason.trim()) return;
    setBusy(true);
    try {
      const res = await apiPost<{ success: boolean; processed: number }>("/assets/bulk/transfer", {
        assetIds: bulkIds,
        toLocationId: bulkTarget,
        reason: bulkReason.trim(),
      });
      notify(`Traslado masivo completado: ${res.processed} bienes`);
      setBulkOpen(false);
      setBulkIds([]);
      setBulkTarget("");
      setBulkReason("");
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Error al trasladar", "error");
    } finally {
      setBusy(false);
    }
  }

  const filterCard = (
    <Card className="mb-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <SearchBox initial="" onSearch={(v) => setParam("search", v || undefined)} />
        <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setParam("categoryId", e.target.value || undefined); }}>
          <option value="">Todas las categorías</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={statusId} onChange={(e) => { setStatusId(e.target.value); setParam("statusId", e.target.value || undefined); }}>
          <option value="">Todos los estados</option>
          {(statuses ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Select value={locationId} onChange={(e) => { setLocationId(e.target.value); setParam("locationId", e.target.value || undefined); }}>
          <option value="">Todas las ubicaciones</option>
          {(locations ?? []).map((l) => (
            <option key={l.id} value={l.id}>{l.path || l.name}</option>
          ))}
        </Select>
      </div>
    </Card>
  );

  const selectedSel = useMemo(() => items.filter((i) => bulkIds.includes(i.id)), [items, bulkIds]);

  return (
    <div>
      <PageHeader
        title="Inventario"
        description={`${meta.total} bienes registrados`}
        actions={
          canCreate ? (
            <Link href="/inventario/nuevo" className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
              + Registrar bien
            </Link>
          ) : undefined
        }
      />

      {filterCard}

      {canTransfer && (
        <div className="mb-4 flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setBulkIds(items.map((i) => i.id)); setBulkOpen(true); }}>
            Traslado masivo (todos los visibles)
          </Button>
          {bulkIds.length > 0 && (
            <span className="text-sm text-slate-500">{bulkIds.length} bienes seleccionados</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No se encontraron bienes" description="Ajuste los filtros o registre un nuevo bien." />
        </Card>
      ) : (
        <Table
          head={
            <>
              <Th>Código</Th>
              <Th>Nombre</Th>
              <Th>Categoría</Th>
              <Th>Estado</Th>
              <Th>Ubicación</Th>
              <Th>Responsable</Th>
              <Th>Adquisición</Th>
              <Th></Th>
            </>
          }
        >
          {items.map((a) => (
            <tr key={a.id} className={a.active ? "hover:bg-slate-50" : "opacity-50 hover:bg-slate-50"}>
              <Td>
                <span className="font-mono text-xs font-semibold text-slate-900">{a.assetCode}</span>
                {!a.active && <Badge tone="slate">Inactivo</Badge>}
              </Td>
              <Td>
                <span className="font-medium text-slate-900">{a.name}</span>
                {a.brand && <span className="block text-xs text-slate-500">{a.brand} {a.model}</span>}
              </Td>
              <Td>{a.category?.name ?? "—"}</Td>
              <Td>
                <Badge tone={toneForStatus(a.status?.name)}>{a.status?.name ?? "—"}</Badge>
              </Td>
              <Td className="text-slate-600">{a.location?.path ?? "—"}</Td>
              <Td className="text-slate-600">{a.responsible?.name ?? "—"}</Td>
              <Td>{formatDate(a.acquisitionDate)}</Td>
              <Td>
                <div className="flex items-center gap-2 justify-end">
                  {canTransfer && (
                    <button
                      onClick={() => {
                        setBulkIds([a.id]);
                        setBulkOpen(true);
                      }}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Trasladar
                    </button>
                  )}
                  <Link href={`/inventario/${a.id}`} className="text-xs font-medium text-indigo-600 hover:underline">
                    Ficha
                  </Link>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />

      <Modal open={bulkOpen} onClose={() => !busy && setBulkOpen(false)} title="Traslado de bienes">
        <p className="text-sm text-slate-600">
          {bulkIds.length > 0 ? `${bulkIds.length} bien(es) seleccionado(s). El historial de cada bien quedará registrado.` : "Seleccione bienes desde la tabla."}
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Ubicación de destino *
            <select
              value={bulkTarget}
              onChange={(e) => setBulkTarget(e.target.value)}
              className="mt-1 block w-full rounded-md ring-1 ring-inset ring-slate-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-indigo-600"
              disabled={busy}
            >
              <option value="">Seleccione…</option>
              {(locations ?? []).map((l: LocationDTO) => (
                <option key={l.id} value={l.id}>{l.path || l.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Motivo *
            <input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              disabled={bulkIds.length === 0 || busy}
              placeholder="Ej.: Reorganización de salas"
              className="mt-1 block w-full rounded-md ring-1 ring-inset ring-slate-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-indigo-600"
            />
          </label>
          {selectedSel.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-md bg-slate-50 p-2 text-sm text-slate-600">
              {selectedSel.map((a) => (
                <li key={a.id} className="flex justify-between py-0.5">
                  <span className="font-mono text-xs">{a.assetCode}</span>
                  <span>{a.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => !busy && setBulkOpen(false)}>Cancelar</Button>
          <Button onClick={submitBulk} loading={busy} disabled={bulkTarget === "" || bulkIds.length === 0 || !bulkReason.trim()}>
            Confirmar traslado
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SearchBox({ onSearch }: { initial: string; onSearch: (v: string) => void }) {
  const [value, setValue] = useState("");
  const [timer, setTimer] = useState<number | null>(null);
  return (
    <Input
      placeholder="Buscar por código, nombre, serie…"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        setValue(v);
        if (timer) window.clearTimeout(timer);
        setTimer(window.setTimeout(() => onSearch(v), 400));
      }}
    />
  );
}

function toneForStatus(name?: string | null): "green" | "amber" | "red" | "slate" | "indigo" {
  switch (name?.toLowerCase()) {
    case "bueno":
    case "operativo":
    case "disponible":
      return "green";
    case "regular":
    case "prestado":
    case "en mantención":
    case "en reparación":
      return "amber";
    case "malo":
    case "de baja":
    case "extraviado":
    case "no localizado":
    case "fuera de servicio":
      return "red";
    default:
      return "slate";
  }
}