"use client";

import {
  ArrowRightLeft,
  Box,
  Boxes,
  Filter,
  MapPin,
  PackagePlus,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { Table, Td, Th } from "@/components/table";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";
import { useData, usePage } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  AssetDTO,
  AssetStatusDTO,
  CategoryDTO,
  LocationDTO,
} from "@/lib/types";

interface LocationInventoryGroup {
  id: string;
  name: string;
  path: string;
  type: string;
  active: boolean;
  description?: string | null;
  assetCount: number;
  mainStatus?: string | null;
  mainResponsible?: string | null;
  latestUpdate?: string | null;
}

export default function InventarioPage() {
  const { hasPermission } = useAuth();
  const { notify } = useToast();

  const canCreate = hasPermission("asset.create");
  const canTransfer = hasPermission("asset.transfer");

  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [locationId, setLocationId] = useState("");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [busy, setBusy] = useState(false);

  const {
    items,
    meta,
    loading,
    setPage,
    setParam,
  } = usePage<LocationInventoryGroup>("/assets/locations", {
    categoryId: categoryId || undefined,
    statusId: statusId || undefined,
    locationId: locationId || undefined,
    pageSize: 20,
  });

  const { data: categories } =
    useData<CategoryDTO[]>("/categories");

  const { data: statuses } =
    useData<AssetStatusDTO[]>("/statuses");

  const { data: locations } =
    useData<LocationDTO[]>("/locations?active=true");

  const selectedSel = useMemo(() => [] as AssetDTO[], []);

  async function submitBulk() {
    if (!bulkTarget || !bulkReason.trim()) {
      return;
    }

    setBusy(true);

    try {
      const res = await apiPost<{
        success: boolean;
        processed: number;
      }>("/assets/bulk/transfer", {
        assetIds: bulkIds,
        toLocationId: bulkTarget,
        reason: bulkReason.trim(),
      });

      notify(
        `Traslado completado: ${res.processed} bien(es)`,
      );

      setBulkOpen(false);
      setBulkIds([]);
      setBulkTarget("");
      setBulkReason("");

      setTimeout(() => {
        location.reload();
      }, 600);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Error al trasladar",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function openBulkTransfer() {
    setBulkIds([]);
    setBulkOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* =====================================================
          CABECERA
      ===================================================== */}

      <PageHeader
        title="Inventario"
        description={
          meta.total === 1
            ? "1 ubicación con inventario"
            : `${meta.total} ubicaciones con inventario`
        }
        actions={
          canCreate ? (
            <Link
              href="/inventario/nuevo"
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-emerald-700
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-emerald-800
              "
            >
              <PackagePlus size={17} />
              Registrar bien
            </Link>
          ) : undefined
        }
      />

      {/* =====================================================
          RESUMEN RÁPIDO
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryItem
          icon={<Boxes size={18} />}
          label="Ubicaciones encontradas"
          value={meta.total}
        />

        <SummaryItem
          icon={<Box size={18} />}
          label="Visibles en esta página"
          value={items.length}
        />

        <SummaryItem
          icon={<MapPin size={18} />}
          label="Bienes en ubicaciones visibles"
          value={items.reduce((total, item) => total + item.assetCount, 0)}
        />

        <SummaryItem
          icon={<UserRound size={18} />}
          label="Con responsable principal"
          value={
            items.filter((item) => item.mainResponsible).length
          }
        />
      </div>

      {/* =====================================================
          BÚSQUEDA Y FILTROS
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Filter
                size={16}
                className="text-slate-500"
              />

              <h2 className="text-sm font-semibold text-slate-900">
                Buscar y filtrar
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Encuentra ubicaciones por nombre, código, categoría, estado o bien contenido.
            </p>
          </div>

          {(categoryId || statusId || locationId) && (
            <button
              type="button"
              onClick={() => {
                setCategoryId("");
                setStatusId("");
                setLocationId("");

                setParam("categoryId", undefined);
                setParam("statusId", undefined);
                setParam("locationId", undefined);
                setParam("search", undefined);
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchBox
            onSearch={(value) =>
              setParam("search", value || undefined)
            }
          />

          <Select
            value={categoryId}
            onChange={(event) => {
              const value = event.target.value;

              setCategoryId(value);

              setParam(
                "categoryId",
                value || undefined,
              );
            }}
          >
            <option value="">
              Todas las categorías
            </option>

            {(categories ?? []).map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </Select>

          <Select
            value={statusId}
            onChange={(event) => {
              const value = event.target.value;

              setStatusId(value);

              setParam(
                "statusId",
                value || undefined,
              );
            }}
          >
            <option value="">
              Todos los estados
            </option>

            {(statuses ?? []).map((status) => (
              <option
                key={status.id}
                value={status.id}
              >
                {status.name}
              </option>
            ))}
          </Select>

          <Select
            value={locationId}
            onChange={(event) => {
              const value = event.target.value;

              setLocationId(value);

              setParam(
                "locationId",
                value || undefined,
              );
            }}
          >
            <option value="">
              Todas las ubicaciones
            </option>

            {(locations ?? []).map((location) => (
              <option
                key={location.id}
                value={location.id}
              >
                {location.path || location.name}
              </option>
            ))}
          </Select>
        </div>
      </section>

      {/* =====================================================
          RESULTADOS
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Ubicaciones registradas
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Cada fila abre la ficha mural con todos los bienes de esa ubicación.
            </p>
          </div>

          {!loading && items.length > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {items.length} visibles
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Spinner className="h-8 w-8 text-emerald-700" />
          </div>
        ) : items.length === 0 ? (
          <div className="min-h-[300px]">
            <EmptyState
              title="No se encontraron ubicaciones"
              description="Ajusta los filtros o registra un nuevo bien para comenzar."
            />
          </div>
        ) : (
          <Table
            head={
              <>
                <Th>Ubicación</Th>
                <Th>Bienes</Th>
                <Th>Estado predominante</Th>
                <Th>Responsable principal</Th>
                <Th>Última actualización</Th>
                <Th></Th>
              </>
            }
          >
            {items.map((group) => (
              <tr
                key={group.id}
                className={[
                  "border-b border-slate-100 transition-colors last:border-b-0",
                  group.active
                    ? "hover:bg-slate-50/80"
                    : "bg-slate-50/50 opacity-60",
                ].join(" ")}
              >
                <Td>
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin
                      size={13}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <div>
                      <p className="font-semibold text-slate-900">{group.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{group.path}</p>
                    </div>
                  </div>
                </Td>

                <Td>
                  <span className="font-semibold text-slate-900">{group.assetCount}</span>
                </Td>

                <Td>
                  <Badge tone={toneForStatus(group.mainStatus)}>{group.mainStatus ?? "—"}</Badge>
                </Td>

                <Td>
                  <span className="text-slate-600">{group.mainResponsible ?? "Sin responsable"}</span>
                </Td>

                <Td>
                  <span className="text-slate-600">{formatDate(group.latestUpdate)}</span>
                </Td>

                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/inventario/ubicacion/${group.id}`}
                      className="
                        rounded-lg
                        px-2.5
                        py-1.5
                        text-xs
                        font-semibold
                        text-slate-700
                        transition
                        hover:bg-slate-100
                      "
                    >
                      Ver ficha
                    </Link>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      {/* =====================================================
          PAGINACIÓN
      ===================================================== */}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onChange={setPage}
      />

      {/* =====================================================
          MODAL TRASLADO
      ===================================================== */}

      <Modal
        open={bulkOpen}
        onClose={() => {
          if (!busy) {
            setBulkOpen(false);
          }
        }}
        title={
          bulkIds.length === 1
            ? "Trasladar bien"
            : "Trasladar bienes"
        }
      >
        <div className="space-y-5">
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ArrowRightLeft size={17} />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  {bulkIds.length} bien(es) seleccionado(s)
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                  La ubicación actual cambiará y el movimiento quedará registrado en el historial de cada bien.
                </p>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Ubicación de destino *
            </span>

            <select
              value={bulkTarget}
              onChange={(event) =>
                setBulkTarget(event.target.value)
              }
              disabled={busy}
              className="
                mt-2
                block
                w-full
                rounded-xl
                border
                border-slate-300
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-900
                outline-none
                transition
                focus:border-emerald-600
                focus:ring-2
                focus:ring-emerald-100
              "
            >
              <option value="">
                Selecciona una ubicación
              </option>

              {(locations ?? []).map((location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.path || location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Motivo *
            </span>

            <input
              value={bulkReason}
              onChange={(event) =>
                setBulkReason(event.target.value)
              }
              disabled={
                bulkIds.length === 0 || busy
              }
              placeholder="Ej.: Reorganización de salas"
              className="
                mt-2
                block
                w-full
                rounded-xl
                border
                border-slate-300
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-900
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-emerald-600
                focus:ring-2
                focus:ring-emerald-100
              "
            />
          </label>

          {selectedSel.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Bienes seleccionados
              </p>

              <div
                className="
                  max-h-44
                  overflow-y-auto
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-2

                  [&::-webkit-scrollbar]:hidden
                  [scrollbar-width:none]
                "
              >
                {selectedSel.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {asset.name}
                      </p>

                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {asset.assetCode}
                      </p>
                    </div>

                    <span className="max-w-[180px] truncate text-xs text-slate-500">
                      {asset.location?.path ??
                        "Sin ubicación"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                if (!busy) {
                  setBulkOpen(false);
                }
              }}
            >
              Cancelar
            </Button>

            <Button
              onClick={submitBulk}
              loading={busy}
              disabled={
                bulkTarget === "" ||
                bulkIds.length === 0 ||
                !bulkReason.trim()
              }
            >
              Confirmar traslado
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
   COMPONENTES AUXILIARES
============================================================ */

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {label}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SearchBox({
  onSearch,
}: {
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const [timer, setTimer] =
    useState<number | null>(null);

  return (
    <div className="relative">
      <Search
        size={16}
        className="
          pointer-events-none
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-slate-400
        "
      />

      <Input
        placeholder="Buscar por código, nombre o serie..."
        value={value}
        className="pl-9"
        onChange={(event) => {
          const nextValue = event.target.value;

          setValue(nextValue);

          if (timer) {
            window.clearTimeout(timer);
          }

          setTimer(
            window.setTimeout(() => {
              onSearch(nextValue);
            }, 400),
          );
        }}
      />
    </div>
  );
}

function toneForStatus(
  name?: string | null,
):
  | "green"
  | "amber"
  | "red"
  | "slate"
  | "indigo" {
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
