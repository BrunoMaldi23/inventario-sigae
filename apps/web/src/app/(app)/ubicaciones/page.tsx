"use client";

import { FormEvent, useMemo, useState } from "react";
import { useData } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { LocationDTO, LocationDTO as TLocationNode, LOCATION_TYPE_LABELS } from "@/lib/types";

interface TreeNode extends TLocationNode {
  children: TreeNode[];
}

const LOC_TYPES = Object.keys(LOCATION_TYPE_LABELS);

function flatten(nodes: TreeNode[]): LocationDTO[] {
  const out: LocationDTO[] = [];
  for (const n of nodes) {
    out.push(n);
    out.push(...flatten(n.children));
  }
  return out;
}

export default function UbicacionesPage() {
  const { notify } = useToast();
  const { data: tree, loading, reload } = useData<TreeNode[]>("/locations/tree");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocationDTO | null>(null);
  const [form, setForm] = useState({ name: "", type: "floor", parentId: "", description: "" });
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => flatten(tree ?? []), [tree]);

  function openCreate(parentId?: string) {
    setEditing(null);
    setForm({ name: "", type: "floor", parentId: parentId ?? "", description: "" });
    setModalOpen(true);
  }

  function openEdit(loc: LocationDTO) {
    setEditing(loc);
    setForm({ name: loc.name, type: loc.type, parentId: loc.parentId ?? "", description: loc.description ?? "" });
    setModalOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { name: form.name, type: form.type, parentId: form.parentId || undefined, description: form.description || undefined };
      if (editing) {
        await apiPatch(`/locations/${editing.id}`, payload);
        notify("Ubicación actualizada");
      } else {
        await apiPost("/locations", payload);
        notify("Ubicación creada");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(loc: LocationDTO) {
    try {
      await apiPatch(`/locations/${loc.id}`, { active: !loc.active });
      notify(loc.active ? "Ubicación desactivada" : "Ubicación activada");
      reload();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }

  async function remove(loc: LocationDTO) {
    if (loc.assetCount && loc.assetCount > 0) {
      notify("No se puede eliminar: la ubicación tiene bienes asociados", "error");
      return;
    }
    if (!window.confirm(`¿Eliminar la ubicación "${loc.name}"?`)) return;
    try {
      await apiDelete(`/locations/${loc.id}`);
      notify("Ubicación eliminada");
      reload();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Ubicaciones"
        description="Estructura jerárquica de la escuela (edificios, pisos, salas, oficinas…)"
        actions={<Button onClick={() => openCreate()}>+ Nueva ubicación</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : (all ?? []).length === 0 ? (
        <Card><EmptyState title="Sin ubicaciones" description="Cree la primera ubicación para comenzar" /></Card>
      ) : (
        <Card>
          <TreeNodes nodes={tree ?? []} onAdd={openCreate} onEdit={openEdit} onToggle={toggleActive} onDelete={remove} />
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => !busy && setModalOpen(false)} title={editing ? "Editar ubicación" : "Nueva ubicación"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={160} />
          </Field>
          <Field label="Tipo" required>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {LOC_TYPES.map((t) => (
                <option key={t} value={t}>{LOCATION_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ubicación padre (opcional)">
            <Select value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
              <option value="">Sin padre (raíz)</option>
              {all.filter((l) => l.id !== editing?.id).map((l) => (
                <option key={l.id} value={l.id}>{l.path || l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Descripción">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} maxLength={500} />
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

function TreeNodes({
  nodes,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
}: {
  nodes: TreeNode[];
  onAdd: (parentId?: string) => void;
  onEdit: (loc: LocationDTO) => void;
  onToggle: (loc: LocationDTO) => void;
  onDelete: (loc: LocationDTO) => void;
}) {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="group flex items-center justify-between rounded-md px-3 py-2 hover:bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{LOCATION_TYPE_LABELS[n.type]}</span>
              <span className={`font-medium text-slate-800 ${n.active ? "" : "opacity-50"}`}>{n.name}</span>
              {n.assetCount ? (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">{n.assetCount} bienes</span>
              ) : null}
            </div>
            <div className="hidden items-center gap-2 text-xs group-hover:flex">
              <button className="text-indigo-600 hover:underline" onClick={() => onAdd(n.id)}>+ hijo</button>
              <button className="text-slate-500 hover:underline" onClick={() => onEdit(n)}>Editar</button>
              <button className="text-slate-500 hover:underline" onClick={() => onToggle(n)}>{n.active ? "Desactivar" : "Activar"}</button>
              <button className="text-red-500 hover:underline" onClick={() => onDelete(n)}>Eliminar</button>
            </div>
          </div>
          {n.children.length > 0 && (
            <ul className="ml-5 border-l border-slate-200 pl-3">
              <TreeNodes nodes={n.children} onAdd={onAdd} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}