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
  apiPatch,
  apiPost,
  apiDelete,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  ROLE_LABELS,
  RoleDTO,
} from "@/lib/types";

export default function RolesPage() {
  const { notify } = useToast();

  const {
    items,
    meta,
    loading,
    setPage,
    reload,
  } = usePage<RoleDTO>(
    "/roles",
    {
      pageSize: 20,
    },
  );

  const {
    data: roles,
  } = useData<RoleDTO[]>(
    "/roles",
  );

  const [search, setSearch] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<RoleDTO | null>(
      null,
    );

  const [form, setForm] =
    useState<{
      name: string;
      description: string;
      active: boolean;
    }>({
      name: "",
      description: "",
      active: true,
    });

  const [busy, setBusy] =
    useState(false);

  const filteredItems =
    useMemo(() => {
      const term = search
        .trim()
        .toLowerCase();

      if (!term) {
        return items;
      }

      return items.filter(
        (role) => {
          return [
            role.name,
            role.description ?? "",
          ].some((value) =>
            value.toLowerCase().includes(term),
          );
        },
      );
    }, [
      items,
      search,
    ]);

  function openCreate() {
    setEditing(null);

    setForm({
      name: "",
      description: "",
      active: true,
    });

    setModalOpen(true);
  }

  function openEdit(
    role: RoleDTO,
  ) {
    setEditing(role);

    setForm({
      name: role.name,

      description: role.description ?? "",

      active: role.active ?? true,
    });

    setModalOpen(true);
  }

  async function submit(
    e: FormEvent,
  ) {
    e.preventDefault();

    setBusy(true);

    try {
      if (editing) {
        await apiPatch(
          `/roles/${editing.id}`,
          {
            name: form.name.trim(),

            description: form.description.trim(),

            active: form.active,
          },
        );

        notify(
          "Rol actualizado",
        );
      } else {
        await apiPost(
          "/roles",
          {
            name: form.name.trim(),

            description: form.description.trim(),

            active: form.active,
          },
        );

        notify(
          "Rol creado",
        );
      }

      setModalOpen(false);
      reload();
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "Error al guardar",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteRole(
    id: string,
  ) {
    if (
      confirm(
        "¿Estás seguro de eliminar este rol?",
      )
    ) {
      setBusy(true);

      try {
        await apiDelete(
          `/roles/${id}`,
        );

        notify(
          "Rol eliminado",
        );

        reload();
      } catch (err) {
        notify(
          err instanceof Error
            ? err.message
            : "Error al eliminar",
          "error",
        );
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader
        title="Roles"
        description="Catálogo de roles y permisos del sistema."
        actions={
          <Button
            onClick={openCreate}
          >
            <Plus size={16} />
            Nuevo rol
          </Button>
        }
      />

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryItem
          label="Total roles"
          value={meta.total}
          icon={
            <UsersRound
              size={18}
            />
          }
        />

        <SummaryItem
          label="Activos"
          value={
            items.filter(
              (role) => role.active,
            ).length
          }
          icon={
            <UserRound
              size={18}
            />
          }
        />

        <SummaryItem
          label="Inactivos"
          value={
            items.length -
            items.filter(
              (role) => role.active,
            ).length
          }
          icon={
            <ShieldCheck
              size={18}
            />
          }
        />
      </div>

      {/* =====================================================
          BUSCADOR
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-xl">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <Input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value,
              )
            }
            placeholder="Buscar por nombre o descripción..."
            className="pl-9"
          />
        </div>
      </section>

      {/* =====================================================
          TABLA
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Roles del sistema
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Permisos y capacidades de cada rol.
            </p>
          </div>

          {!loading && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {
                filteredItems.length
              }{" "}
              visibles
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Spinner className="h-8 w-8 text-emerald-700" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="min-h-[280px]">
            <EmptyState
              title={
                search
                  ? "No se encontraron roles"
                  : "Sin roles"
              }
              description={
                search
                  ? "Prueba con otro nombre o descripción."
                  : "Crea un rol para comenzar."
              }
            />
          </div>
        ) : (
          <Table
            minWidth="900px"
            maxHeight="68vh"
            head={
              <>
                <Th>
                  Nombre
                </Th>

                <Th>
                  Descripción
                </Th>

                <Th>
                  Estado
                </Th>

                <Th></Th>
              </>
            }
          >
            {filteredItems.map(
              (role) => {
                return (
                  <tr
                    key={
                      role.id
                    }
                    className={[
                      "border-b border-slate-100 transition-colors last:border-b-0",
                      role.active
                        ? "hover:bg-slate-50/80"
                        : "bg-slate-50/60 opacity-65",
                    ].join(
                      " ",
                    )}
                  >
                    {/* NOMBRE */}

                    <Td>
                      <p className="font-medium text-slate-900">
                        {role.name}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {role.description || "Sin descripción"}
                      </p>
                    </Td>

                    {/* DESCRIPCIÓN */}

                    {/* ESTADO */}

                    <Td>
                      {role.active ? (
                        <Badge tone="green">
                          Activo
                        </Badge>
                      ) : (
                        <Badge tone="slate">
                          Inactivo
                        </Badge>
                      )}
                    </Td>

                    {/* ACCIONES */}

                    <Td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              role,
                            )
                          }
                          title="Editar rol"
                          aria-label="Editar rol"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition hover:bg-sky-100 hover:text-sky-700"
                        >
                          <Pencil
                            size={15}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteRole(role.id!)
                          }
                          title="Eliminar rol"
                          aria-label="Eliminar rol"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 hover:text-red-700"
                        >
                          <Trash
                            size={15}
                          />
                        </button>
                      </div>
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
        totalPages={
          meta.totalPages
        }
        total={meta.total}
        onChange={setPage}
      />

      {/* =====================================================
          MODAL
      ===================================================== */}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!busy) {
            setModalOpen(
              false,
            );
          }
        }}
        title={
          editing
            ? "Editar rol"
            : "Nuevo rol"
        }
      >
        <form
          onSubmit={submit}
          className="space-y-5"
        >
          {/* NOMBRE */}

          <Field
            label="Nombre"
            required
          >
            <Input
              value={form.name}
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    name:
                      e.target
                        .value,
                  }),
                )
              }
              placeholder="Ej.: Administrador"
              required
            />
          </Field>

          {/* DESCRIPCIÓN */}

          <Field
            label="Descripción"
            required
          >
            <Input
              value={form.description}
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    description:
                      e.target
                        .value,
                  }),
                )
              }
              placeholder="Ej.: Permisos de administrador del sistema"
              required
            />
          </Field>

          {/* ACTIVO */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Rol activo
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Un rol inactivo no tendrá permisos activos.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  form.active
                }
                onChange={(e) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      active:
                        e
                          .target
                          .checked,
                    }),
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
            </label>
          </div>

          {/* FOOTER */}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!busy) {
                  setModalOpen(
                    false,
                  );
                }
              }}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              loading={busy}
            >
              {editing
                ? "Guardar cambios"
                : "Crear rol"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ============================================================
   SUMMARY ITEM
============================================================ */

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
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
