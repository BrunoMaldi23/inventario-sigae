"use client";

import {
  ChevronRight,
  Folder,
  FolderPlus,
  Layers3,
  Pencil,
  Plus,
  Power,
  Search,
  Tags,
  Trash2,
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
  Spinner,
  Textarea,
} from "@/components/ui";
import { useData } from "@/hooks/use-fetch";
import {
  apiDelete,
  apiPatch,
  apiPost,
} from "@/lib/api";
import { CategoryDTO } from "@/lib/types";

interface TreeNode extends CategoryDTO {
  children: TreeNode[];
}

function buildTree(
  list: CategoryDTO[],
): TreeNode[] {
  const map =
    new Map<string, TreeNode>();

  list.forEach((category) => {
    map.set(category.id, {
      ...category,
      children: [],
    });
  });

  const roots: TreeNode[] = [];

  for (const category of list) {
    const node =
      map.get(category.id)!;

    if (
      category.parentId &&
      map.has(category.parentId)
    ) {
      map
        .get(category.parentId)!
        .children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default function CategoriasPage() {
  const { notify } = useToast();

  const {
    data,
    loading,
    reload,
  } = useData<CategoryDTO[]>(
    "/categories",
  );

  const all = data ?? [];

  const [search, setSearch] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<CategoryDTO | null>(
      null,
    );

  const [form, setForm] =
    useState({
      name: "",
      parentId: "",
      description: "",
    });

  const [busy, setBusy] =
    useState(false);

  const filtered = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    if (!term) {
      return all;
    }

    return all.filter(
      (category) =>
        category.name
          .toLowerCase()
          .includes(term) ||
        category.description
          ?.toLowerCase()
          .includes(term),
    );
  }, [all, search]);

  const tree =
    buildTree(filtered);

  const activeCount =
    all.filter(
      (category) => category.active,
    ).length;

  const subcategoryCount =
    all.filter(
      (category) =>
        Boolean(category.parentId),
    ).length;

  function openCreate(
    parentId?: string,
  ) {
    setEditing(null);

    setForm({
      name: "",
      parentId:
        parentId ?? "",
      description: "",
    });

    setModalOpen(true);
  }

  function openEdit(
    category: CategoryDTO,
  ) {
    setEditing(category);

    setForm({
      name:
        category.name,

      parentId:
        category.parentId ?? "",

      description:
        category.description ?? "",
    });

    setModalOpen(true);
  }

  async function submit(
    e: FormEvent,
  ) {
    e.preventDefault();

    setBusy(true);

    try {
      const payload = {
        name:
          form.name.trim(),

        parentId:
          form.parentId ||
          undefined,

        description:
          form.description.trim() ||
          undefined,
      };

      if (editing) {
        await apiPatch(
          `/categories/${editing.id}`,
          payload,
        );

        notify(
          "Categoría actualizada",
        );
      } else {
        await apiPost(
          "/categories",
          payload,
        );

        notify(
          "Categoría creada",
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

  async function toggleActive(
    category: CategoryDTO,
  ) {
    try {
      await apiPatch(
        `/categories/${category.id}`,
        {
          active:
            !category.active,
        },
      );

      notify(
        category.active
          ? "Categoría desactivada"
          : "Categoría activada",
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

  async function remove(
    category: CategoryDTO,
  ) {
    if (
      !window.confirm(
        `¿Eliminar la categoría "${category.name}"?`,
      )
    ) {
      return;
    }

    try {
      await apiDelete(
        `/categories/${category.id}`,
      );

      notify(
        "Categoría eliminada",
      );

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

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <PageHeader
        title="Categorías"
        description="Organiza los bienes mediante categorías y subcategorías."
        actions={
          <Button
            onClick={() =>
              openCreate()
            }
          >
            <Plus size={16} />
            Nueva categoría
          </Button>
        }
      />

      {/* RESUMEN */}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryItem
          label="Total"
          value={all.length}
          icon={<Tags size={18} />}
        />

        <SummaryItem
          label="Activas"
          value={activeCount}
          icon={<Folder size={18} />}
        />

        <SummaryItem
          label="Subcategorías"
          value={
            subcategoryCount
          }
          icon={<Layers3 size={18} />}
        />
      </div>

      {/* BUSCADOR */}

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
            placeholder="Buscar categoría o descripción..."
            className="pl-9"
          />
        </div>
      </section>

      {/* LISTADO */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Clasificación de bienes
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Gestiona categorías principales y subcategorías.
            </p>
          </div>

          {!loading && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filtered.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Spinner className="h-8 w-8 text-emerald-700" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="min-h-[280px]">
            <EmptyState
              title={
                search
                  ? "No se encontraron categorías"
                  : "Sin categorías"
              }
              description={
                search
                  ? "Prueba con otro nombre o descripción."
                  : "Crea una categoría para comenzar a clasificar los bienes."
              }
            />
          </div>
        ) : (
          <div className="p-3">
            <CategoryNodes
              nodes={tree}
              onAdd={openCreate}
              onEdit={openEdit}
              onToggle={
                toggleActive
              }
              onDelete={remove}
              depth={0}
            />
          </div>
        )}
      </section>

      {/* MODAL */}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!busy) {
            setModalOpen(false);
          }
        }}
        title={
          editing
            ? "Editar categoría"
            : form.parentId
              ? "Nueva subcategoría"
              : "Nueva categoría"
        }
      >
        <form
          onSubmit={submit}
          className="space-y-5"
        >
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Tags size={17} />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Clasificación del inventario
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                  Puedes crear categorías principales o depender de otra categoría existente.
                </p>
              </div>
            </div>
          </div>

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
              placeholder="Ej.: Tecnología"
              required
              maxLength={120}
            />
          </Field>

          <Field label="Categoría padre">
            <select
              value={form.parentId}
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    parentId:
                      e.target
                        .value,
                  }),
                )
              }
              className="
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
                Sin categoría padre
              </option>

              {all
                .filter(
                  (category) =>
                    category.id !==
                    editing?.id,
                )
                .map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  ),
                )}
            </select>
          </Field>

          <Field label="Descripción">
            <Textarea
              value={
                form.description
              }
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
              rows={3}
              maxLength={500}
              placeholder="Describe brevemente qué tipo de bienes pertenecen a esta categoría."
            />
          </Field>

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
                : form.parentId
                  ? "Crear subcategoría"
                  : "Crear categoría"}
            </Button>
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
  depth,
}: {
  nodes: TreeNode[];
  onAdd: (
    parentId?: string,
  ) => void;
  onEdit: (
    category: CategoryDTO,
  ) => void;
  onToggle: (
    category: CategoryDTO,
  ) => void;
  onDelete: (
    category: CategoryDTO,
  ) => void;
  depth: number;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div
          key={node.id}
        >
          <div
            className={[
              "group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
              node.active
                ? "hover:bg-slate-50"
                : "bg-slate-50/60 opacity-60",
            ].join(" ")}
            style={{
              marginLeft:
                depth * 22,
            }}
          >
            {/* JERARQUÍA */}

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              {node.children.length >
              0 ? (
                <Folder
                  size={16}
                />
              ) : (
                <Tags
                  size={16}
                />
              )}
            </div>

            {/* TEXTO */}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {node.name}
                </p>

                {!node.active && (
                  <Badge tone="slate">
                    Inactiva
                  </Badge>
                )}

                {node.children.length >
                  0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {
                      node.children
                        .length
                    }{" "}
                    subcategoría
                    {node.children
                      .length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                )}
              </div>

              {node.description && (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {
                    node.description
                  }
                </p>
              )}
            </div>

            {/* ACCIONES */}

            <div className="flex shrink-0 items-center gap-2">
              <CategoryAction
                title="Agregar subcategoría"
                variant="add"
                onClick={() =>
                  onAdd(
                    node.id,
                  )
                }
              >
                <FolderPlus
                  size={15}
                />
              </CategoryAction>

              <CategoryAction
                title="Editar"
                variant="edit"
                onClick={() =>
                  onEdit(node)
                }
              >
                <Pencil
                  size={15}
                />
              </CategoryAction>

              <CategoryAction
                title={
                  node.active
                    ? "Desactivar"
                    : "Activar"
                }
                variant={
                  node.active
                    ? "toggle-off"
                    : "toggle-on"
                }
                onClick={() =>
                  onToggle(
                    node,
                  )
                }
              >
                <Power
                  size={15}
                />
              </CategoryAction>

              <CategoryAction
                title="Eliminar"
                variant="delete"
                onClick={() =>
                  onDelete(
                    node,
                  )
                }
              >
                <Trash2
                  size={15}
                />
              </CategoryAction>
            </div>
          </div>

          {/* HIJOS */}

          {node.children.length >
            0 && (
            <div className="relative">
              <div
                className="absolute bottom-0 top-0 w-px bg-slate-200"
                style={{
                  left:
                    depth *
                      22 +
                    21,
                }}
              />

              <CategoryNodes
                nodes={
                  node.children
                }
                onAdd={onAdd}
                onEdit={onEdit}
                onToggle={
                  onToggle
                }
                onDelete={
                  onDelete
                }
                depth={
                  depth + 1
                }
              />
            </div>
          )}
        </div>
      ))}
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

function CategoryAction({
  children,
  title,
  variant,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  variant:
    | "add"
    | "edit"
    | "toggle-on"
    | "toggle-off"
    | "delete";
  onClick: () => void;
}) {
  const styles = {
    add:
      "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700",

    edit:
      "bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700",

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