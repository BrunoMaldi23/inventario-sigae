"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Printer, Trash2 } from "lucide-react";

import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Button, EmptyState, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { useData } from "@/hooks/use-fetch";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { AssetDTO, AssetStatusDTO, CategoryDTO, ResponsibleDTO } from "@/lib/types";

interface LocationSheet {
  location: {
    id: string;
    name: string;
    path: string;
    type: string;
    active: boolean;
    description?: string | null;
  };
  assets: AssetDTO[];
}

interface AssetFormState {
  assetCode: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  serialNumber: string;
  statusId: string;
  categoryId: string;
  responsibleId: string;
  quantity: string;
}

const emptyAssetForm: AssetFormState = {
  assetCode: "",
  name: "",
  description: "",
  brand: "",
  model: "",
  serialNumber: "",
  statusId: "",
  categoryId: "",
  responsibleId: "",
  quantity: "1",
};

function nextAssetForm(current: AssetFormState): AssetFormState {
  return {
    ...emptyAssetForm,
    statusId: current.statusId,
    categoryId: current.categoryId,
    responsibleId: current.responsibleId,
    quantity: "1",
  };
}

export default function LocationInventorySheetPage() {
  const params = useParams<{ id: string }>();
  const { notify } = useToast();
  const { data, loading, reload } = useData<LocationSheet>(`/assets/locations/${params.id}`);
  const { data: statuses } = useData<AssetStatusDTO[]>("/statuses");
  const { data: categories } = useData<CategoryDTO[]>("/categories");
  const { data: responsibles } = useData<ResponsibleDTO[]>("/responsibles");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetDTO | null>(null);
  const [form, setForm] = useState<AssetFormState>(emptyAssetForm);
  const [sheetData, setSheetData] = useState<LocationSheet | null>(null);
  const [busy, setBusy] = useState(false);

  const defaultStatusId = statuses?.[0]?.id ?? "";

  useEffect(() => {
    if (data) setSheetData(data);
  }, [data]);

  useEffect(() => {
    if (!modalOpen && defaultStatusId) {
      setForm((current) => ({ ...current, statusId: current.statusId || defaultStatusId }));
    }
  }, [defaultStatusId, modalOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-emerald-700" />
      </div>
    );
  }

  const sheet = sheetData ?? data;

  if (!sheet) {
    return (
      <div className="space-y-4">
        <Link href="/inventario" className="text-sm font-medium text-emerald-700 hover:underline">
          Volver al inventario
        </Link>
        <EmptyState title="Ubicación no encontrada" />
      </div>
    );
  }

  const responsible = mainResponsible(sheet.assets);
  const rut = firstImportedValue(sheet.assets, "RUT responsable");
  const floor = firstImportedValue(sheet.assets, "Piso/Sector") ?? firstImportedValue(sheet.assets, "Sector");
  const updatedAt = latestUpdatedAt(sheet.assets);

  function openCreateAsset() {
    setEditingAsset(null);
    setForm({ ...emptyAssetForm, statusId: defaultStatusId });
    setModalOpen(true);
  }

  function openEditAsset(asset: AssetDTO) {
    setEditingAsset(asset);
    setForm({
      assetCode: asset.assetCode ?? "",
      name: asset.name ?? "",
      description: visibleDescription(asset.description),
      brand: asset.brand ?? "",
      model: asset.model ?? "",
      serialNumber: asset.serialNumber ?? "",
      statusId: asset.statusId ?? defaultStatusId,
      categoryId: asset.categoryId ?? "",
      responsibleId: asset.responsibleId ?? "",
      quantity: "1",
    });
    setModalOpen(true);
  }

  async function saveAsset(keepAdding = false) {
    if (!sheet) return;
    if (!form.statusId) {
      notify("Seleccione un estado para el bien", "error");
      return;
    }
    if (!form.name.trim()) {
      notify("Ingrese la denominación del bien", "error");
      return;
    }
    const quantity = editingAsset ? 1 : Math.max(1, Math.min(200, Number(form.quantity) || 1));
    if (quantity > 1 && form.assetCode.trim()) {
      notify("Para varias unidades, deje el código vacío para generar códigos únicos", "error");
      return;
    }

    const payload = {
      assetCode: form.assetCode.trim() || undefined,
      name: form.name.trim(),
      description: editingAsset
        ? mergeVisibleDescription(editingAsset.description, form.description)
        : form.description.trim() || undefined,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      statusId: form.statusId,
      categoryId: form.categoryId || undefined,
      responsibleId: form.responsibleId || undefined,
      locationId: sheet.location.id,
      version: editingAsset?.version,
    };

    setBusy(true);
    try {
      if (editingAsset) {
        const updatedAsset = await apiPatch<AssetDTO>(`/assets/${editingAsset.id}`, payload);
        setSheetData((current) =>
          current
            ? {
                ...current,
                assets: current.assets.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset)),
              }
            : current,
        );
        notify("Bien actualizado");
      } else {
        const createdAssets: AssetDTO[] = [];
        for (let index = 0; index < quantity; index += 1) {
          const createdAsset = await apiPost<AssetDTO>("/assets", payload);
          createdAssets.push(createdAsset);
        }
        setSheetData((current) =>
          current
            ? {
                ...current,
                assets: [...current.assets, ...createdAssets],
              }
            : current,
        );
        notify(
          quantity > 1
            ? `${quantity} bienes agregados a la ubicación`
            : keepAdding
              ? "Bien agregado, listo para la siguiente fila"
              : "Bien agregado a la ubicación",
        );
      }
      if (keepAdding && !editingAsset) {
        setForm((current) => nextAssetForm(current));
      } else {
        setModalOpen(false);
      }
      window.setTimeout(() => reload(), 0);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo guardar el bien", "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitAsset(event: FormEvent) {
    event.preventDefault();
    await saveAsset(false);
  }

  async function removeAsset(asset: AssetDTO) {
    if (!window.confirm(`¿Eliminar "${asset.name}" de esta ficha?`)) return;
    try {
      await apiDelete(`/assets/${asset.id}`);
      notify("Bien eliminado");
      setSheetData((current) =>
        current
          ? {
              ...current,
              assets: current.assets.filter((item) => item.id !== asset.id),
            }
          : current,
      );
      reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo eliminar el bien", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-medium text-slate-500">Ficha mural por ubicación</p>
          <h2 className="text-xl font-semibold text-slate-950">{sheet.location.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateAsset} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Agregar bien
          </Button>
          <Link href="/inventario" className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Inventario
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Imprimir hoja
          </button>
        </div>
      </div>

      <section
        className="mx-auto min-h-[1120px] w-full max-w-[1280px] overflow-hidden bg-[#fffefd] px-4 py-8 text-slate-950 shadow-sm ring-1 ring-slate-200 sm:px-8 md:px-12 lg:px-[74px] lg:py-[86px] print:min-h-0 print:max-w-none print:overflow-visible print:px-0 print:py-0 print:shadow-none print:ring-0"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div className="grid gap-6 md:grid-cols-[240px_1fr] md:items-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/images/logo-costa-araucania.png"
              alt="Servicio Local de Educación Pública Costa Araucanía"
              className="h-auto w-[220px] max-w-full print:w-[200px]"
            />
          </div>

          <div className="text-center md:pt-20">
            <p className="text-[13px] font-semibold text-[#12335c]">Servicio Local de Educación Pública Costa Araucanía</p>
            <p className="text-[13px] font-semibold text-slate-900">Hoja Mural de Inventario de Bienes de Uso.</p>
          </div>
        </div>

        <dl className="mt-10 grid max-w-[760px] grid-cols-[150px_1fr] gap-x-5 text-[13px] font-normal leading-[1.38] sm:grid-cols-[190px_1fr] md:mt-16">
          <SheetMeta label="Nombre de Funcionario:" value={responsible} />
          <SheetMeta label="RUT:" value={rut} />
          <SheetMeta label="Dependencia:" value="Escuela Pública Alejandro Gorostiaga" />
          <SheetMeta label="Ubicación:" value={sheet.location.name} />
          <SheetMeta label="Piso:" value={floor} />
          <SheetMeta label="Fecha de actualización:" value={formatLongSpanishDate(updatedAt)} />
          <SheetMeta label="Página:" value="1 de 1" />
        </dl>

        <div className="mt-5 max-h-[68vh] overflow-auto overscroll-contain rounded-sm ring-1 ring-slate-200 print:max-h-none print:overflow-visible print:ring-0">
          <table className="w-full min-w-[960px] table-fixed border-collapse text-[10px] font-normal leading-tight text-slate-950 print:min-w-[830px]">
            <colgroup>
              <col className="w-[44px]" />
              <col className="w-[112px]" />
              <col className="w-[150px]" />
              <col className="w-[248px]" />
              <col className="w-[78px]" />
              <col className="w-[88px]" />
              <col className="w-[104px]" />
              <col className="w-[60px]" />
              <col className="w-[130px] print:hidden" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#dbeafe] text-[#0f315e]">
                <SheetTh>N°</SheetTh>
                <SheetTh>Código del bien</SheetTh>
                <SheetTh>Denominación</SheetTh>
                <SheetTh>Descripción</SheetTh>
                <SheetTh>Marca</SheetTh>
                <SheetTh>Modelo</SheetTh>
                <SheetTh>Número de serie</SheetTh>
                <SheetTh>Estado</SheetTh>
                <SheetTh className="print:hidden">Acciones</SheetTh>
              </tr>
            </thead>
            <tbody>
              {sheet.assets.map((asset, index) => {
                const originalCode = importedValue(asset.description, "Código original") ?? asset.assetCode;
                const description = visibleDescription(asset.description);
                return (
                  <tr key={asset.id}>
                    <SheetTd center>{index + 1}</SheetTd>
                    <SheetTd center>{originalCode}</SheetTd>
                    <SheetTd>{asset.name}</SheetTd>
                    <SheetTd>{description || "Sin descripción registrada"}</SheetTd>
                    <SheetTd center>{asset.brand || "SIN MARCA"}</SheetTd>
                    <SheetTd center>{asset.model || ""}</SheetTd>
                    <SheetTd center>{asset.serialNumber || ""}</SheetTd>
                    <SheetTd center>{asset.status?.name ?? ""}</SheetTd>
                    <SheetTd center className="print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditAsset(asset)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                          title="Editar bien"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAsset(asset)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar bien"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </SheetTd>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 border border-[#334155] bg-[#f8fafc] p-2 text-[9px] leading-snug text-slate-700">
          <p className="font-semibold text-[#0f315e]">NOTA:</p>
          <p>Los bienes detallados en esta hoja mural deben permanecer registrados en la ubicación indicada. Cualquier traslado, cambio de estado o ajuste debe quedar actualizado en el sistema de inventario institucional.</p>
        </div>

        <div className="mt-4 border border-[#334155] bg-[#fff7ed] p-2 text-[9px] leading-snug text-slate-700">
          <p className="font-semibold text-[#9a3412]">Datos de Responsabilidad de Bienes de Uso</p>
          <p><span className="font-semibold text-slate-900">A cargo de:</span> {responsible || "Sin responsable"}</p>
          <p><span className="font-semibold text-slate-900">Ubicación:</span> {sheet.location.path}</p>
          <p><span className="font-semibold text-slate-900">Total de bienes:</span> {sheet.assets.length}</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-16 text-center text-[10px] text-slate-700">
          <div className="border-t border-[#334155] pt-2">Firma funcionario responsable</div>
          <div className="border-t border-[#334155] pt-2">Firma encargado inventario</div>
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => !busy && setModalOpen(false)} title={editingAsset ? "Editar bien de la ficha" : `Agregar bien a ${sheet.location.name}`} size="xl">
        <form onSubmit={submitAsset} className="space-y-4">
          {!editingAsset && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
              Para bienes repetidos, define la cantidad y se crearán filas independientes con código interno automático. Se mantienen estado, categoría y responsable para seguir cargando rápido.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Código del bien" hint="Déjelo vacío para generar el siguiente código automáticamente.">
              <Input value={form.assetCode} onChange={(event) => setForm((current) => ({ ...current, assetCode: event.target.value }))} maxLength={40} disabled={!editingAsset && Number(form.quantity) > 1} />
            </Field>
            <Field label="Denominación" required>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={200} required />
            </Field>
            {!editingAsset && (
              <Field label="Cantidad" hint="Máximo 200 por carga. Cada unidad queda como fila independiente.">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                />
              </Field>
            )}
            <Field label="Marca">
              <Input value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} maxLength={120} />
            </Field>
            <Field label="Modelo">
              <Input value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} maxLength={120} />
            </Field>
            <Field label="Número de serie">
              <Input value={form.serialNumber} onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))} maxLength={200} />
            </Field>
            <Field label="Estado" required>
              <Select value={form.statusId} onChange={(event) => setForm((current) => ({ ...current, statusId: event.target.value }))} required>
                <option value="">Seleccione estado</option>
                {(statuses ?? []).map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Categoría">
              <Select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                <option value="">Sin categoría</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Responsable">
              <Select value={form.responsibleId} onChange={(event) => setForm((current) => ({ ...current, responsibleId: event.target.value }))}>
                <option value="">Sin responsable</option>
                {(responsibles ?? []).map((responsibleItem) => (
                  <option key={responsibleItem.id} value={responsibleItem.id}>{responsibleItem.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descripción">
            <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} maxLength={500} />
          </Field>
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Se guardará en la ubicación: <span className="font-semibold">{sheet.location.path || sheet.location.name}</span>.
          </div>
          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 pt-3 sm:-mx-5 sm:flex-row sm:justify-end sm:px-5">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={busy} className="w-full sm:w-auto">Cancelar</Button>
            {!editingAsset && (
              <Button type="button" variant="secondary" loading={busy} onClick={() => saveAsset(true)} className="w-full sm:w-auto">
                Guardar y agregar otro
              </Button>
            )}
            <Button type="submit" loading={busy} className="w-full sm:w-auto">{editingAsset ? "Guardar cambios" : "Agregar fila"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SheetMeta({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="font-medium text-slate-700">{label}</dt>
      <dd className="font-normal text-slate-950">{value || "Sin dato"}</dd>
    </>
  );
}

function SheetTh({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`border border-[#334155] px-1.5 py-2 text-center font-semibold ${className}`}>{children}</th>;
}

function SheetTd({
  children,
  center,
  className,
}: {
  children: React.ReactNode;
  center?: boolean;
  className?: string;
}) {
  return <td className={`break-words border border-[#475569] px-1 py-0.5 align-top ${center ? "text-center" : ""} ${className ?? ""}`}>{children}</td>;
}

function importedValue(description: string | null | undefined, label: string) {
  return (description ?? "")
    .split("|")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith(label.toLowerCase()))
    ?.slice(label.length)
    .replace(/^:\s*/, "")
    .trim();
}

function firstImportedValue(assets: AssetDTO[], label: string) {
  for (const asset of assets) {
    const value = importedValue(asset.description, label);
    if (value) return value;
  }
  return undefined;
}

function visibleDescription(description?: string | null) {
  return (description ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !/^(Código original|Ubicación detalle origen|Piso\/Sector|Sector|RUT responsable):/i.test(part))
    .join(" | ");
}

function mergeVisibleDescription(originalDescription: string | null | undefined, visibleValue: string) {
  const preservedImportedParts = (originalDescription ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter((part) => /^(Código original|Ubicación detalle origen|Piso\/Sector|Sector|RUT responsable):/i.test(part));

  return [visibleValue.trim(), ...preservedImportedParts].filter(Boolean).join(" | ");
}

function mainResponsible(assets: AssetDTO[]) {
  const counts = new Map<string, number>();
  for (const asset of assets) {
    if (!asset.responsible?.name) continue;
    counts.set(asset.responsible.name, (counts.get(asset.responsible.name) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function latestUpdatedAt(assets: AssetDTO[]) {
  return assets.reduce<string | null>((latest, asset) => {
    if (!latest || new Date(asset.updatedAt) > new Date(latest)) return asset.updatedAt;
    return latest;
  }, null);
}

function formatLongSpanishDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
