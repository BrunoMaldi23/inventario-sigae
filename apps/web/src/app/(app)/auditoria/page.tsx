"use client";

import {
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash,
  UserRound,
  UsersRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { Table, Td, Th } from "@/components/table";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";
import { useData, usePage } from "@/hooks/use-fetch";
import {
  apiGetPage,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  ROLE_LABELS,
  RoleName,
} from "@/lib/types";

export default function AuditoriaPage() {
  const { notify } = useToast();

  const {
    items,
    meta,
    loading,
    setPage,
    reload,
  } = usePage<AuditLogDTO>(
    "/audit",
    {
      pageSize: 50,
    },
  );

  const [search, setSearch] =
    useState("");

  const [actionFilter, setActionFilter] =
    useState("");

  const [userFilter, setUserFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const filteredItems =
    useMemo(() => {
      const term = search
        .trim()
        .toLowerCase();

      if (!term && !actionFilter && !userFilter && !statusFilter) {
        return items;
      }

      return items.filter(
        (log) => {
          const matchesSearch =
            !term ||
            [log.entityType, log.action, log.details]
              .map((v) => v?.toString() ?? "")
              .some((value) => value.toLowerCase().includes(term));

          const matchesAction =
            !actionFilter ||
            log.action === actionFilter;

          const matchesUser =
            !userFilter ||
            log.userId === userFilter ||
            (log.userName?.toString()?.includes(userFilter) ?? false);

          const matchesStatus =
            !statusFilter ||
            (log.success !== undefined ? (log.success ? "éxito" : "error") : "") ===
              statusFilter;

          return matchesSearch && matchesAction && matchesUser && matchesStatus;
        },
      );
    }, [
      items,
      search,
      actionFilter,
      userFilter,
      statusFilter,
    ]);

  function openFilterModal() {
    // Reset filters
    setActionFilter("");
    setUserFilter("");
    setStatusFilter("");
  }

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader
        title="Auditoría"
        description="Registro de actividades y cambios en el sistema."
      />

      {/* =====================================================
          FILTROS
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Search
              size={12}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por entidad, acción o detalles..."
              className="pl-7"
            />
          </div>

          <div>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as any)}
              className="w-full"
            >
              <option value="">Todas acciones</option>
              <option value="create">Crear</option>
              <option value="update">Actualizar</option>
              <option value="delete">Eliminar</option>
              <option value="login">Login</option>
              <option value="permission">Permiso</option>
            </Select>
          </div>

          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full"
            >
              <option value="">Todos estados</option>
              <option value="éxito">Éxito</option>
              <option value="error">Error</option>
            </Select>
          </div>

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={openFilterModal}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================
          RESUMEN / ESTADÍSTICAS
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-semibold text-slate-900">{meta.total}</p>
          <p className="text-xs text-slate-500">Total eventos</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-semibold text-emerald-600">{meta.total > 0 ? Math.round((items.filter((i) => i.success).length / meta.total) * 100) : 0}%</p>
          <p className="text-xs text-slate-500">Éxito</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-semibold text-red-600">
            {meta.total > 0
              ? Math.round(
                  ((meta.total - (items.filter((i) => i.success).length) / meta.total) *
                    100),
                )
              : "0"}%
          </p>
          <p className="text-xs text-slate-500">Error</p>
        </div>
      </div>

      {/* =====================================================
          TABLA DE LOGS
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Historial de actividades
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              últimos {meta.total} eventos registrados
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {filteredItems.length} de {meta.total} visibles
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner className="h-8 w-8 text-emerald-700" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="min-h-[280px]">
            <EmptyState
              title="No se encontraron registros"
              description="Los filtros actualizados no coinciden con ningún evento en el log de auditoría."
            />
          </div>
        ) : (
          <Table
            head={
              <>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
                <Th>Acción</Th>
                <Th>Entidad</Th>
                <Th>Detalles</Th>
                <Th>Resultado</Th>
              </>
            }
          >
            {filteredItems.map(
              (log) => {
                const resultClass =
                  log.success ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800";
                const resultBadge =
                  log.success
                    ? <Badge tone="green">éxito</Badge>
                    : <Badge tone="slate">error</Badge>;

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50"
                  >
                    <Td>
                      {formatDateTime(log.createdAt)}
                    </Td>

                    <Td>
                      <p className="font-medium text-slate-900">
                        {log.userName ?? "Sistema"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        ID: {log.userId ?? "N/A"}
                      </p>
                    </Td>

                    <Td>
                      <span className="capitalize text-slate-600">
                        {log.action}
                      </span>
                    </Td>

                    <Td>
                      <p className="text-slate-500 text-xs">
                        {log.entityType ?? "N/A"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        ID: {log.entityId ?? "N/A"}
                      </p>
                    </Td>

                    <Td>
                      <p className="text-slate-500 truncate">
                        {log.details ?? "Sin detalles"}
                      </p>
                    </Td>

                    <Td>
                      {resultBadge}
                    </Td>
                  </tr>
                );
              },
            )}
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
    </div>
  );
}

/* ============================================================
   AUDIT LOG INTERFACE
============================================================ */

interface AuditLogDTO {
  id: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  success: boolean;
}