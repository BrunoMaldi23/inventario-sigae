"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Building2,
  Eye,
  FileText,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
} from "lucide-react";

import { useData } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
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
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => flatten(tree ?? []), [tree]);
  const filteredTree = useMemo(() => filterTree(tree ?? [], search), [tree, search]);
  const locationsWithAssets = all.filter((location) => (location.assetCount ?? 0) > 0);
  const totalAssets = locationsWithAssets.reduce((sum, location) => sum + (location.assetCount ?? 0), 0);
  const emptyLocations = all.length - locationsWithAssets.length;

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
        description="Estructura de espacios para ordenar las fichas murales y los bienes importados."
        actions={
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Nueva ubicación
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : (all ?? []).length === 0 ? (
        <Card><EmptyState title="Sin ubicaciones" description="Cree la primera ubicación para comenzar" /></Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LocationStat icon={MapPin} label="Ubicaciones activas" value={all.length} tone="blue" />
            <LocationStat icon={Archive} label="Con bienes cargados" value={locationsWithAssets.length} tone="emerald" />
            <LocationStat icon={Layers3} label="Bienes asignados" value={totalAssets} tone="violet" />
            <LocationStat icon={Building2} label="Sin bienes directos" value={emptyLocations} tone="amber" />
          </div>

          <Card
            title={
              <div>
                <p className="text-sm font-semibold text-slate-900">Árbol de ubicaciones</p>
                <p className="mt-0.5 text-xs font-normal text-slate-500">Las fichas se abren por ubicación y muestran todos los bienes asociados.</p>
              </div>
            }
            actions={<Badge tone="green">{locationsWithAssets.length} con inventario</Badge>}
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative block w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por ubicación, ruta o tipo"
                  className="pl-9"
                />
              </label>
              <div className="text-xs text-slate-500">
                {filteredTree.length === 0 ? "Sin coincidencias" : `${flatten(filteredTree).length} ubicaciones visibles`}
              </div>
            </div>

            {filteredTree.length === 0 ? (
              <EmptyState title="No se encontraron ubicaciones" description="Pruebe con otro nombre, ruta o tipo." />
            ) : (
              <TreeNodes nodes={filteredTree} onAdd={openCreate} onEdit={openEdit} onToggle={toggleActive} onDelete={remove} />
            )}
          </Card>
        </div>
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
    <ul className="space-y-2">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="group flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-semibold text-slate-900 ${n.active ? "" : "opacity-50"}`}>{n.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{locationTypeLabel(n.type)}</span>
                    {n.assetCount ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{n.assetCount} bienes</span>
                    ) : (
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">Sin bienes</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{n.path || n.name}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {(n.assetCount ?? 0) > 0 && (
                <Link
                  href={`/inventario/ubicacion/${n.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ver ficha
                </Link>
              )}
              <button className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50" onClick={() => onAdd(n.id)}>
                <Plus className="h-3.5 w-3.5" />
                Hijo
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100" onClick={() => onEdit(n)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100" onClick={() => onToggle(n)}>
                {n.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                {n.active ? "Desactivar" : "Activar"}
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-red-600 hover:bg-red-50" onClick={() => onDelete(n)}>
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          </div>
          {n.children.length > 0 && (
            <ul className="ml-4 mt-2 border-l border-slate-200 pl-4">
              <TreeNodes nodes={n.children} onAdd={onAdd} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function filterTree(nodes: TreeNode[], rawQuery: string): TreeNode[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return nodes;

  return nodes
    .map((node) => {
      const children = filterTree(node.children, query);
      const haystack = `${node.name} ${node.path ?? ""} ${locationTypeLabel(node.type)}`.toLowerCase();
      if (haystack.includes(query) || children.length > 0) {
        return { ...node, children };
      }
      return null;
    })
    .filter((node): node is TreeNode => Boolean(node));
}

function locationTypeLabel(type: string) {
  return LOCATION_TYPE_LABELS[type] ?? "Ubicación";
}

function LocationStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const tones = {
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-semibold text-slate-950">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
