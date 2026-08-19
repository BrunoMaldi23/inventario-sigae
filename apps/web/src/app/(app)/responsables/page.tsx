"use client";

import { FormEvent, useState } from "react";
import { useData } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { Modal } from "@/components/modal";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { LocationDTO, ResponsibleDTO } from "@/lib/types";

export default function ResponsablesPage() {
  const { notify } = useToast();
  const { data, loading, reload } = useData<ResponsibleDTO[]>("/responsibles");
  const { data: locations } = useData<LocationDTO[]>("/locations?active=true");
  const list = data ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResponsibleDTO | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "", locationId: "" });
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", role: "", locationId: "" });
    setModalOpen(true);
  }

  function openEdit(r: ResponsibleDTO) {
    setEditing(r);
    setForm({ name: r.name, email: r.email ?? "", phone: r.phone ?? "", role: r.role ?? "", locationId: r.locationId ?? "" });
    setModalOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role || undefined,
        locationId: form.locationId || undefined,
      };
      if (editing) {
        await apiPatch(`/responsibles/${editing.id}`, payload);
        notify("Responsable actualizado");
      } else {
        await apiPost("/responsibles", payload);
        notify("Responsable creado");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(r: ResponsibleDTO) {
    try {
      await apiPatch(`/responsibles/${r.id}`, { active: !r.active });
      notify(r.active ? "Responsable desactivado" : "Responsable activado");
      reload();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }

  async function remove(r: ResponsibleDTO) {
    if (!window.confirm(`¿Eliminar a ${r.name}?`)) return;
    try {
      await apiDelete(`/responsibles/${r.id}`);
      notify("Responsable eliminado");
      reload();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Responsables"
        description="Personas encargadas de los bienes por ubicación"
        actions={<Button onClick={openCreate}>+ Nuevo responsable</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : list.length === 0 ? (
        <Card><EmptyState title="Sin responsables" /></Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className={`font-medium text-slate-800 ${r.active ? "" : "opacity-50"}`}>{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.role ?? "Sin cargo"}{r.email && ` · ${r.email}`}{r.phone && ` · ${r.phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {locations?.find((l) => l.id === r.locationId) && (
                    <Badge>{locations.find((l) => l.id === r.locationId)!.path || "Ubicación"}</Badge>
                  )}
                  <button className="text-xs text-slate-500 hover:underline" onClick={() => openEdit(r)}>Editar</button>
                  <button className="text-xs text-slate-500 hover:underline" onClick={() => toggleActive(r)}>{r.active ? "Desactivar" : "Activar"}</button>
                  <button className="text-xs text-red-500 hover:underline" onClick={() => remove(r)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => !busy && setModalOpen(false)} title={editing ? "Editar responsable" : "Nuevo responsable"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre completo" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={200} />
          </Field>
          <Field label="Correo electrónico">
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} maxLength={40} />
          </Field>
          <Field label="Cargo / rol">
            <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} maxLength={200} />
          </Field>
          <Field label="Ubicación">
            <Select value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}>
              <option value="">Sin ubicación</option>
              {(locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.path || l.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={busy}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}