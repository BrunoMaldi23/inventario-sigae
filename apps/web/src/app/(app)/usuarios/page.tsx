"use client";

import {
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
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
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  ROLE_LABELS,
  RoleDTO,
  UserDTO,
} from "@/lib/types";

export default function UsuariosPage() {
  const { notify } = useToast();

  const {
    items,
    meta,
    loading,
    setPage,
    reload,
  } = usePage<UserDTO>(
    "/users",
    {
      pageSize: 25,
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
    useState<UserDTO | null>(
      null,
    );

  const [form, setForm] =
    useState({
      name: "",
      email: "",
      password: "",
      roleId: "",
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
        (user) => {
          const roleName =
            ROLE_LABELS[
              user.role
                ?.name as keyof typeof ROLE_LABELS
            ] ??
            user.role?.name ??
            "";

          return [
            user.name,
            user.email,
            roleName,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(term),
          );
        },
      );
    }, [
      items,
      search,
    ]);

  const activeCount =
    items.filter(
      (user) => user.active,
    ).length;

  const inactiveCount =
    items.length -
    activeCount;

  function openCreate() {
    setEditing(null);

    setForm({
      name: "",
      email: "",
      password: "",
      roleId: "",
      active: true,
    });

    setModalOpen(true);
  }

  function openEdit(
    user: UserDTO,
  ) {
    setEditing(user);

    setForm({
      name:
        user.name,

      email:
        user.email,

      password:
        "",

      roleId:
        user.roleId,

      active:
        user.active,
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
          `/users/${editing.id}`,
          {
            name:
              form.name.trim(),

            email:
              form.email.trim(),

            roleId:
              form.roleId,

            active:
              form.active,

            ...(form.password
              ? {
                  password:
                    form.password,
                }
              : {}),
          },
        );

        notify(
          "Usuario actualizado",
        );
      } else {
        await apiPost(
          "/users",
          {
            name:
              form.name.trim(),

            email:
              form.email.trim(),

            password:
              form.password,

            roleId:
              form.roleId,
          },
        );

        notify(
          "Usuario creado",
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

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader
        title="Usuarios"
        description="Cuentas con acceso al sistema y permisos asociados por rol."
        actions={
          <Button
            onClick={openCreate}
          >
            <Plus size={16} />
            Nuevo usuario
          </Button>
        }
      />

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryItem
          label="Total usuarios"
          value={meta.total}
          icon={
            <UsersRound
              size={18}
            />
          }
        />

        <SummaryItem
          label="Activos"
          value={activeCount}
          icon={
            <UserRound
              size={18}
            />
          }
        />

        <SummaryItem
          label="Inactivos"
          value={inactiveCount}
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
            placeholder="Buscar por nombre, correo o rol..."
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
              Cuentas del sistema
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Administra acceso, rol y estado de cada usuario.
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
                  ? "No se encontraron usuarios"
                  : "Sin usuarios"
              }
              description={
                search
                  ? "Prueba con otro nombre, correo o rol."
                  : "Crea una cuenta para comenzar."
              }
            />
          </div>
        ) : (
          <Table
            head={
              <>
                <Th>
                  Usuario
                </Th>

                <Th>
                  Correo
                </Th>

                <Th>
                  Rol
                </Th>

                <Th>
                  Estado
                </Th>

                <Th>
                  Creado
                </Th>

                <Th></Th>
              </>
            }
          >
            {filteredItems.map(
              (user) => {
                const roleLabel =
                  ROLE_LABELS[
                    user.role
                      ?.name as keyof typeof ROLE_LABELS
                  ] ??
                  user.role
                    ?.name ??
                  "Sin rol";

                return (
                  <tr
                    key={
                      user.id
                    }
                    className={[
                      "border-b border-slate-100 transition-colors last:border-b-0",
                      user.active
                        ? "hover:bg-slate-50/80"
                        : "bg-slate-50/60 opacity-65",
                    ].join(
                      " ",
                    )}
                  >
                    {/* USUARIO */}

                    <Td>
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                            user.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(
                            " ",
                          )}
                        >
                          {getInitials(
                            user.name,
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {
                              user.name
                            }
                          </p>

                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Cuenta institucional
                          </p>
                        </div>
                      </div>
                    </Td>

                    {/* CORREO */}

                    <Td>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail
                          size={14}
                          className="shrink-0 text-slate-400"
                        />

                        <span>
                          {
                            user.email
                          }
                        </span>
                      </div>
                    </Td>

                    {/* ROL */}

                    <Td>
                      <RoleBadge
                        role={
                          user.role
                            ?.name
                        }
                        label={
                          roleLabel
                        }
                      />
                    </Td>

                    {/* ESTADO */}

                    <Td>
                      {user.active ? (
                        <Badge tone="green">
                          Activo
                        </Badge>
                      ) : (
                        <Badge tone="slate">
                          Inactivo
                        </Badge>
                      )}
                    </Td>

                    {/* FECHA */}

                    <Td className="text-slate-500">
                      {formatDateTime(
                        user.createdAt,
                      )}
                    </Td>

                    {/* ACCIONES */}

                    <Td>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              user,
                            )
                          }
                          title="Editar usuario"
                          aria-label="Editar usuario"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition hover:bg-sky-100 hover:text-sky-700"
                        >
                          <Pencil
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
            ? "Editar usuario"
            : "Nuevo usuario"
        }
      >
        <form
          onSubmit={submit}
          className="space-y-5"
        >
          {/* INTRO */}

          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <UserRound
                  size={17}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Cuenta de acceso
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                  Define los datos del usuario y el rol que determinará sus permisos dentro del sistema.
                </p>
              </div>
            </div>
          </div>

          {/* NOMBRE */}

          <Field
            label="Nombre completo"
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
              placeholder="Ej.: María González"
              required
            />
          </Field>

          {/* EMAIL */}

          <Field
            label="Correo electrónico"
            required
          >
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    email:
                      e.target
                        .value,
                  }),
                )
              }
              placeholder="usuario@escuela.cl"
              required
            />
          </Field>

          {/* PASSWORD */}

          <Field
            label={
              editing
                ? "Nueva contraseña"
                : "Contraseña"
            }
            required={!editing}
          >
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <Input
                type="password"
                value={
                  form.password
                }
                onChange={(e) =>
                  setForm(
                    (current) => ({
                      ...current,
                      password:
                        e.target
                          .value,
                    }),
                  )
                }
                required={
                  !editing
                }
                minLength={6}
                placeholder={
                  editing
                    ? "Dejar vacío para mantener la actual"
                    : "Mínimo 6 caracteres"
                }
                className="pl-9"
              />
            </div>

            {editing && (
              <p className="mt-1.5 text-xs text-slate-400">
                Si no deseas cambiar la contraseña, deja este campo vacío.
              </p>
            )}
          </Field>

          {/* ROL */}

          <Field
            label="Rol"
            required
          >
            <Select
              value={
                form.roleId
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    roleId:
                      e.target
                        .value,
                  }),
                )
              }
              required
            >
              <option value="">
                Seleccione…
              </option>

              {(roles ?? []).map(
                (role) => (
                  <option
                    key={
                      role.id
                    }
                    value={
                      role.id
                    }
                  >
                    {ROLE_LABELS[
                      role.name
                    ] ??
                      role.name}
                  </option>
                ),
              )}
            </Select>
          </Field>

          {/* ACTIVO */}

          {editing && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Usuario activo
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Un usuario inactivo no podrá acceder al sistema.
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
          )}

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
                : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ============================================================
   SUMMARY
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

/* ============================================================
   ROLE BADGE
============================================================ */

function RoleBadge({
  role,
  label,
}: {
  role?: string | null;
  label: string;
}) {
  const normalized =
    role?.toLowerCase() ??
    "";

  if (
    normalized.includes(
      "super",
    ) ||
    normalized.includes(
      "admin",
    )
  ) {
    return (
      <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
        {label}
      </span>
    );
  }

  if (
    normalized.includes(
      "encargado",
    )
  ) {
    return (
      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
        {label}
      </span>
    );
  }

  if (
    normalized.includes(
      "funcionario",
    )
  ) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {label}
    </span>
  );
}

/* ============================================================
   INITIALS
============================================================ */

function getInitials(
  name: string,
) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word[0],
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}