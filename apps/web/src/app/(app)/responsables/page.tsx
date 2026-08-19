"use client";

import {
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Modal } from "@/components/modal";
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
import { useData } from "@/hooks/use-fetch";
import {
  apiDelete,
  apiPatch,
  apiPost,
} from "@/lib/api";
import {
  LocationDTO,
  ResponsibleDTO,
} from "@/lib/types";

export default function ResponsablesPage() {
  const { notify } = useToast();

  const {
    data,
    loading,
    reload,
  } = useData<ResponsibleDTO[]>("/responsibles");

  const { data: locations } =
    useData<LocationDTO[]>("/locations?active=true");

  const list = data ?? [];

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] =
    useState<ResponsibleDTO | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    locationId: "",
  });

  const [busy, setBusy] = useState(false);

  const filteredList = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return list;
    }

    return list.filter((responsible) => {
      const location = locations?.find(
        (item) => item.id === responsible.locationId,
      );

      return [
        responsible.name,
        responsible.role,
        responsible.email,
        responsible.phone,
        location?.name,
        location?.path,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(term),
        );
    });
  }, [list, locations, search]);

  const activeCount = list.filter(
    (item) => item.active,
  ).length;

  const inactiveCount = list.length - activeCount;

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      role: "",
      locationId: "",
    });
    setModalOpen(true);
  }

  function openEdit(responsible: ResponsibleDTO) {
    setEditing(responsible);
    setForm({
      name: responsible.name,
      email: responsible.email ?? "",
      phone: responsible.phone ?? "",
      role: responsible.role ?? "",
      locationId: responsible.locationId ?? "",
    });
    setModalOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: form.role.trim() || undefined,
        locationId: form.locationId || undefined,
      };

      if (editing) {
        await apiPatch(
          `/responsibles/${editing.id}`,
          payload,
        );
        notify("Responsable actualizado");
      } else {
        await apiPost("/responsibles", payload);
        notify("Responsable creado");
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

  async function toggleActive(responsible: ResponsibleDTO) {
    try {
      await apiPatch(`/responsibles/${responsible.id}`, {
        active: !responsible.active,
      });

      notify(
        responsible.active
          ? "Responsable desactivado"
          : "Responsable activado",
      );

      reload();
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "Error al actualizar",
        "error",
      );
    }
  }

  async function remove(responsible: ResponsibleDTO) {
    const confirmed = window.confirm(
      `¿Eliminar a ${responsible.name}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiDelete(`/responsibles/${responsible.id}`);
      notify("Responsable eliminado");
      reload();
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "Error al eliminar",
        "error",
      );
    }
  }

  function getLocation(responsible: ResponsibleDTO) {
    return locations?.find(
      (location) => location.id === responsible.locationId,
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Responsables"
        description="Personas asociadas a la custodia y gestión de bienes institucionales."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Nuevo responsable
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryItem
          label="Total"
          value={list.length}
          icon={<UsersRound size={18} />}
        />

        <SummaryItem
          label="Activos"
          value={activeCount}
          icon={<UserRound size={18} />}
        />

        <SummaryItem
          label="Inactivos"
          value={inactiveCount}
          icon={<Power size={18} />}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-xl">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cargo, correo o ubicación..."
            className="pl-9"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Personas responsables
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Consulta cargo, contacto y ubicación asociada.
            </p>
          </div>

          {!loading && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredList.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Spinner className="h-8 w-8 text-emerald-700" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="min-h-[280px]">
            <EmptyState
              title={
                search
                  ? "No se encontraron responsables"
                  : "Sin responsables"
              }
              description={
                search
                  ? "Prueba con otro nombre, cargo o ubicación."
                  : "Agrega un responsable para comenzar."
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredList.map((responsible) => {
              const location = getLocation(responsible);

              return (
                <div
                  key={responsible.id}
                  className={[
                    "group flex flex-col gap-4 px-5 py-4 transition-colors md:flex-row md:items-center",
                    responsible.active
                      ? "hover:bg-slate-50/80"
                      : "bg-slate-50/60 opacity-65",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                        responsible.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {getInitials(responsible.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {responsible.name}
                        </p>

                        {!responsible.active && (
                          <Badge tone="slate">
                            Inactivo
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {responsible.role ?? "Sin cargo definido"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        {responsible.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail size={13} />
                            {responsible.email}
                          </span>
                        )}

                        {responsible.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone size={13} />
                            {responsible.phone}
                          </span>
                        )}

                        {location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={13} />
                            {location.path || location.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:w-[220px]">
                    {location ? (
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                          <Building2 size={14} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Ubicación
                          </p>

                          <p className="mt-0.5 truncate text-xs font-medium text-slate-700">
                            {location.path || location.name}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-400">
                        Sin ubicación asociada
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2 md:justify-end">
                    <ActionButton
                      title="Editar"
                      variant="edit"
                      onClick={() => openEdit(responsible)}
                    >
                      <Pencil size={15} />
                    </ActionButton>

                    <ActionButton
                      title={
                        responsible.active
                          ? "Desactivar"
                          : "Activar"
                      }
                      variant={
                        responsible.active
                          ? "toggle-off"
                          : "toggle-on"
                      }
                      onClick={() =>
                        toggleActive(responsible)
                      }
                    >
                      <Power size={15} />
                    </ActionButton>

                    <ActionButton
                      title="Eliminar"
                      variant="delete"
                      onClick={() => remove(responsible)}
                    >
                      <Trash2 size={15} />
                    </ActionButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!busy) {
            setModalOpen(false);
          }
        }}
        title={
          editing
            ? "Editar responsable"
            : "Nuevo responsable"
        }
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <UserRound size={17} />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Datos del responsable
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                  Esta persona podrá quedar asociada a uno o varios bienes del inventario.
                </p>
              </div>
            </div>
          </div>

          <Field label="Nombre completo" required>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  name: e.target.value,
                }))
              }
              placeholder="Ej.: María González"
              required
              maxLength={200}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo electrónico">
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    email: e.target.value,
                  }))
                }
                placeholder="correo@escuela.cl"
              />
            </Field>

            <Field label="Teléfono">
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    phone: e.target.value,
                  }))
                }
                placeholder="+56 9..."
                maxLength={40}
              />
            </Field>
          </div>

          <Field label="Cargo / función">
            <Input
              value={form.role}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  role: e.target.value,
                }))
              }
              placeholder="Ej.: Encargado TIC"
              maxLength={200}
            />
          </Field>

          <Field label="Ubicación asociada">
            <Select
              value={form.locationId}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  locationId: e.target.value,
                }))
              }
            >
              <option value="">
                Sin ubicación
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
          </Field>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!busy) {
                  setModalOpen(false);
                }
              }}
            >
              Cancelar
            </Button>

            <Button type="submit" loading={busy}>
              {editing
                ? "Guardar cambios"
                : "Crear responsable"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

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

function ActionButton({
  children,
  title,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  variant:
    | "edit"
    | "toggle-on"
    | "toggle-off"
    | "delete";
}) {
  const styles = {
    edit: "bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700",
    "toggle-on":
      "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700",
    "toggle-off":
      "bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700",
    delete:
      "bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={[
        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        styles[variant],
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}