"use client";

import { FormEvent, useState } from "react";
import { useData } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { Button, Card, EmptyState, Field, Input, PageHeader, Spinner, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { CategoryDTO } from "@/lib/types";

interface TreeNode extends CategoryDTO {
  children: TreeNode[];
}

function buildTree(list: CategoryDTO[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  list.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: TreeNode[] = [];
  for (const c of list) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export default function CategoriasPage() {
  const { notify } = useToast();
  const { data, loading, reload } = useData<CategoryDTO[]>("/categories");
  const all = data ?? [];
  const tree = buildTree(all);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [form, setForm] = useState({ name: "", parentId: "", description: "" });
  const [busy, setBusy] = useState(false);

  function openCreate(parentId?: string) {
    setEditing(null);
    setForm({ name: "", parentId: parentId ?? "", description: "" });
    setModalOpen(true);
  }

  function openEdit(c: CategoryDTO) {
    setEditing(c);
    setForm({ name: c.name, parentId: c.parentId ?? "", description: c.description ?? "" });
    setModalOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { name: form.name, parentId: form.parentId || undefined, description: form.description || undefined };
      if (editing) {
        await apiPatch(`/categories/${editing.id}`, payload);
        notify("Categoría actualizada");
      } else {
        await apiPost("/categories", payload);
        notify("Categoría creada");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: CategoryDTO) {
    try {
      await apiPatch(`/categories/${c.id}`, { active: !c.active });
      notify(c.active ? "Categoría desactivada" : "Categoría activada");
      reload();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }

  async function remove(c: CategoryDTO) {
    if (!window.confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    try {
      await apiDelete(`/categories/${c.id}`);
      notify("Categoría eliminada");
      reload();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Clasificación jerárquica de los bienes"
        actions={<Button onClick={() => openCreate()}>+ Nueva categoría</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : all.length === 0 ? (
        <Card><EmptyState title="Sin categorías" /></Card>
      ) : (
        <Card>
          <CategoryNodes nodes={tree} onAdd={openCreate} onEdit={openEdit} onToggle={toggleActive} onDelete={remove} />
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => !busy && setModalOpen(false)} title={editing ? "Editar categoría" : "Nueva categoría"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={120} />
          </Field>
          <Field label="Categoría padre (opcional)">
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className="block w-full rounded-md ring-1 ring-inset ring-slate-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">Sin padre</option>
              {all.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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

function CategoryNodes({
  nodes,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
}: {
  nodes: TreeNode[];
  onAdd: (parentId?: string) => void;
  onEdit: (c: CategoryDTO) => void;
  onToggle: (c: CategoryDTO) => void;
  onDelete: (c: CategoryDTO) => void;
}) {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="group flex items-center justify-between rounded-md px-3 py-2 hover:bg-slate-50">
            <span className={`font-medium text-slate-800 ${n.active ? "" : "opacity-50"}`}>{n.name}</span>
            <div className="hidden items-center gap-2 text-xs group-hover:flex">
              <button className="text-indigo-600 hover:underline" onClick={() => onAdd(n.id)}>+ subcategoría</button>
              <button className="text-slate-500 hover:underline" onClick={() => onEdit(n)}>Editar</button>
              <button className="text-slate-500 hover:underline" onClick={() => onToggle(n)}>{n.active ? "Desactivar" : "Activar"}</button>
              <button className="text-red-500 hover:underline" onClick={() => onDelete(n)}>Eliminar</button>
            </div>
          </div>
          {n.children.length > 0 && (
            <ul className="ml-5 border-l border-slate-200 pl-3">
              <CategoryNodes nodes={n.children} onAdd={onAdd} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}