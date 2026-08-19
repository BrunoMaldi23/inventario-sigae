"use client";

import { FormEvent, useState } from "react";
import { usePage } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { Table, Td, Th } from "@/components/table";
import { apiPost, apiPatch } from "@/lib/api";
import { RoleDTO, ROLE_LABELS, UserDTO } from "@/lib/types";
import { useData } from "@/hooks/use-fetch";
import { formatDateTime } from "@/lib/format";

export default function UsuariosPage() {
  const { notify } = useToast();
  const { items, meta, loading, setPage, reload } = usePage<UserDTO>("/users", { pageSize: 25 });
  const { data: roles } = useData<RoleDTO[]>("/roles");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserDTO | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "", active: true });
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", roleId: "", active: true });
    setModalOpen(true);
  }

  function openEdit(u: UserDTO) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", roleId: u.roleId, active: u.active });
    setModalOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await apiPatch(`/users/${editing.id}`, {
          name: form.name,
          email: form.email,
          roleId: form.roleId,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
        notify("Usuario actualizado");
      } else {
        await apiPost("/users", { name: form.name, email: form.email, password: form.password, roleId: form.roleId });
        notify("Usuario creado");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Cuentas del sistema con acceso por rol"
        actions={<Button onClick={openCreate}>+ Nuevo usuario</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="Sin usuarios" /></Card>
      ) : (
        <Table
          head={
            <>
              <Th>Nombre</Th>
              <Th>Correo</Th>
              <Th>Rol</Th>
              <Th>Estado</Th>
              <Th>Creado</Th>
              <Th></Th>
            </>
          }
        >
          {items.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <Td className="font-medium text-slate-900">{u.name}</Td>
              <Td className="text-slate-600">{u.email}</Td>
              <Td><Badge tone="indigo">{ROLE_LABELS[(u.role?.name as keyof typeof ROLE_LABELS)] ?? u.role?.name ?? "—"}</Badge></Td>
              <Td>{u.active ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</Td>
              <Td className="text-slate-500">{formatDateTime(u.createdAt)}</Td>
              <Td className="text-right">
                <button onClick={() => openEdit(u)} className="text-xs font-medium text-indigo-600 hover:underline">Editar</button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />

      <Modal open={modalOpen} onClose={() => !busy && setModalOpen(false)} title={editing ? "Editar usuario" : "Nuevo usuario"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </Field>
          <Field label="Correo electrónico" required>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </Field>
          <Field label={editing ? "Nueva contraseña (opcional)" : "Contraseña"} required={!editing}>
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editing} minLength={6} placeholder="Mínimo 6 caracteres" />
          </Field>
          <Field label="Rol" required>
            <Select value={form.roleId} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))} required>
              <option value="">Seleccione…</option>
              {(roles ?? []).map((r) => (
                <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</option>
              ))}
            </Select>
          </Field>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Usuario activo
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={busy}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}