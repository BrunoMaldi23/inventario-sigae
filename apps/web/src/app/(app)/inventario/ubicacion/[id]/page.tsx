"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Printer, Trash2 } from "lucide-react";

import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth-provider";
import { Button, EmptyState, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { useData } from "@/hooks/use-fetch";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { AssetDTO, AssetStatusDTO, CategoryDTO, LocationDTO, ResponsibleDTO } from "@/lib/types";

interface LocationSheet {
  location: {
    id: string;
    name: string;
    path: string;
    type: string;
    parentId?: string | null;
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
  noCode: boolean;
}

interface SheetHeaderFormState {
  responsibleName: string;
  rut: string;
  dependency: string;
  locationName: string;
  floor: string;
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
  noCode: false,
};

const DEFAULT_DEPENDENCY = "Escuela Pública Alejandro Gorostiaga";

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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useToast();
  const { hasPermission } = useAuth();
  const { data, loading, reload } = useData<LocationSheet>(`/assets/locations/${params.id}`);
  const { data: statuses } = useData<AssetStatusDTO[]>("/statuses");
  const { data: categories } = useData<CategoryDTO[]>("/categories");
  const { data: responsibles } = useData<ResponsibleDTO[]>("/responsibles", { pageSize: 500 });
  const { data: locations } = useData<LocationDTO[]>("/locations");
  const [modalOpen, setModalOpen] = useState(false);
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetDTO | null>(null);
  const [form, setForm] = useState<AssetFormState>(emptyAssetForm);
  const [headerForm, setHeaderForm] = useState<SheetHeaderFormState>({
    responsibleName: "",
    rut: "",
    dependency: DEFAULT_DEPENDENCY,
    locationName: "",
    floor: "",
  });
  const [sheetData, setSheetData] = useState<LocationSheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [headerBusy, setHeaderBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState<"sheet" | "location" | null>(null);
  const [autoOpenedHeaderLocationId, setAutoOpenedHeaderLocationId] = useState<string | null>(null);

  const defaultStatusId = statuses?.[0]?.id ?? "";
  const canDeleteSheet = hasPermission("asset.delete");
  const canDeleteLocation = hasPermission("location.manage");

  useEffect(() => {
    const currentSheet = sheetData ?? data;
    if (
      searchParams.get("editarFicha") !== "1" ||
      !currentSheet ||
      headerModalOpen ||
      autoOpenedHeaderLocationId === currentSheet.location.id
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHeaderForm({
        responsibleName: mainResponsible(currentSheet.assets) ?? "",
        rut: sheetHeaderValue(currentSheet, "RUT responsable") ?? "",
        dependency: sheetHeaderValue(currentSheet, "Dependencia") ?? DEFAULT_DEPENDENCY,
        locationName: currentSheet.location.name,
        floor: sheetHeaderValue(currentSheet, "Piso/Sector") ?? sheetHeaderValue(currentSheet, "Sector") ?? "",
      });
      setAutoOpenedHeaderLocationId(currentSheet.location.id);
      setHeaderModalOpen(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [autoOpenedHeaderLocationId, data, headerModalOpen, searchParams, sheetData]);

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
  const rut = sheetHeaderValue(sheet, "RUT responsable");
  const dependency = sheetHeaderValue(sheet, "Dependencia") ?? DEFAULT_DEPENDENCY;
  const floor = sheetHeaderValue(sheet, "Piso/Sector") ?? sheetHeaderValue(sheet, "Sector");
  const updatedAt = latestUpdatedAt(sheet.assets);

  function openHeaderEditor() {
    if (!sheet) return;
    const currentSheet = sheet;
    setHeaderForm({
      responsibleName: responsible ?? "",
      rut: rut ?? "",
      dependency,
      locationName: currentSheet.location.name,
      floor: floor ?? "",
    });
    setHeaderModalOpen(true);
  }

  function closeHeaderEditor() {
    if (headerBusy) return;
    setHeaderModalOpen(false);
    if (searchParams.get("editarFicha") === "1") {
      router.replace(pathname, { scroll: false });
    }
  }

  function openCreateAsset() {
    setEditingAsset(null);
    setForm({ ...emptyAssetForm, statusId: defaultStatusId });
    setModalOpen(true);
  }

  function openEditAsset(asset: AssetDTO) {
    const originalCode = importedValue(asset.description, "Código original");
    const hasNoHmCode = isNoCodeValue(originalCode);
    setEditingAsset(asset);
    setForm({
      assetCode: hasNoHmCode ? "" : displayOriginalCode(originalCode ?? asset.assetCode),
      name: asset.name ?? "",
      description: visibleDescription(asset.description),
      brand: asset.brand ?? "",
      model: asset.model ?? "",
      serialNumber: asset.serialNumber ?? "",
      statusId: asset.statusId ?? defaultStatusId,
      categoryId: asset.categoryId ?? "",
      responsibleId: asset.responsibleId ?? "",
      quantity: "1",
      noCode: hasNoHmCode,
    });
    setModalOpen(true);
  }

  async function saveAsset(keepAdding = false) {
    if (!sheet) return;
    const selectedStatusId = form.statusId || defaultStatusId;
    if (!selectedStatusId) {
      notify("Seleccione un estado para el bien", "error");
      return;
    }
    if (!form.name.trim()) {
      notify("Ingrese la denominación del bien", "error");
      return;
    }
    const quantity = editingAsset ? 1 : Math.max(1, Math.min(200, Number(form.quantity) || 1));
    const withoutHmCode = form.noCode || (!editingAsset && quantity > 1);
    const nextAssetCode = editingAsset
      ? withoutHmCode
        ? ""
        : form.assetCode.trim() || undefined
      : withoutHmCode
        ? undefined
        : form.assetCode.trim() || undefined;

    const payload = {
      assetCode: nextAssetCode,
      name: form.name.trim(),
      description: editingAsset
        ? mergeVisibleDescription(editingAsset.description, form.description, withoutHmCode ? "" : form.assetCode)
        : form.description.trim() || undefined,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      statusId: selectedStatusId,
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

  async function saveHeader(event: FormEvent) {
    event.preventDefault();
    if (!sheet) return;
    const currentSheet = sheet;
    if (!headerForm.locationName.trim()) {
      notify("Ingrese la ubicación", "error");
      return;
    }

    const matchingResponsible = findResponsibleByName(responsibles ?? [], headerForm.responsibleName);
    if (headerForm.responsibleName.trim() && !matchingResponsible) {
      notify("El funcionario no existe en Responsables. Créelo primero o seleccione un nombre existente.", "error");
      return;
    }

    const nextLocationName = headerForm.locationName.trim();
    const nextRut = headerForm.rut.trim();
    const nextDependency = headerForm.dependency.trim() || DEFAULT_DEPENDENCY;
    const nextFloor = headerForm.floor.trim();
    const matchingFloor = findFloorByName(locations ?? [], nextFloor);

    setHeaderBusy(true);
    try {
      const updatedLocation = await apiPatch<LocationDTO>(`/locations/${currentSheet.location.id}`, {
        name: nextLocationName,
        parentId: matchingFloor?.id ?? undefined,
        description: mergeSheetMetadata(currentSheet.location.description, {
          dependency: nextDependency,
          sourceLocation: nextLocationName,
          floor: nextFloor,
          rut: nextRut,
        }),
      });
      const updatedAssets = await mapWithConcurrency(currentSheet.assets, 6, (asset) =>
        apiPatch<AssetDTO>(`/assets/${asset.id}`, {
          description: mergeSheetMetadata(asset.description, {
            dependency: nextDependency,
            sourceLocation: nextLocationName,
            floor: nextFloor,
            rut: nextRut,
          }),
          responsibleId: matchingResponsible?.id ?? asset.responsibleId ?? undefined,
        }),
      );

      setSheetData((current) =>
        current
          ? {
              location: {
                ...current.location,
                ...updatedLocation,
                name: updatedLocation.name,
                path: updatedLocation.path ?? current.location.path,
              },
              assets: updatedAssets,
            }
          : current,
      );
      setHeaderModalOpen(false);
      notify("Datos de la ficha actualizados");
      window.setTimeout(() => reload(), 0);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudieron guardar los datos de la ficha", "error");
    } finally {
      setHeaderBusy(false);
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

  async function removeSheet(deleteLocation: boolean) {
    if (!sheet) return;
    setDeleteBusy(deleteLocation ? "location" : "sheet");
    try {
      const result = await apiDelete<{ success: true; deletedAssets: number; deletedLocation: boolean }>(
        `/assets/locations/${sheet.location.id}/sheet`,
        undefined,
        { deleteLocation },
      );
      setDeleteModalOpen(false);
      notify(
        result.deletedLocation
          ? `Ficha y ubicación eliminadas (${result.deletedAssets} bienes)`
          : `Ficha eliminada (${result.deletedAssets} bienes)`,
      );
      if (deleteLocation) {
        router.push("/inventario");
        return;
      }
      setSheetData((current) => (current ? { ...current, assets: [] } : current));
      window.setTimeout(() => reload(), 0);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo eliminar la ficha", "error");
    } finally {
      setDeleteBusy(null);
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
          <Button onClick={openHeaderEditor} variant="secondary">
            <Pencil className="h-4 w-4" />
            Editar ficha
          </Button>
          <Button onClick={openCreateAsset} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Agregar bien
          </Button>
          {canDeleteSheet && (
            <Button onClick={() => setDeleteModalOpen(true)} variant="danger">
              <Trash2 className="h-4 w-4" />
              Eliminar ficha
            </Button>
          )}
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
        className="print-sheet mx-auto min-h-[1120px] w-full max-w-[1280px] overflow-hidden bg-[#fffefd] px-4 py-8 text-slate-950 shadow-sm ring-1 ring-slate-200 sm:px-8 md:px-12 lg:px-[74px] lg:py-[72px] print:min-h-0 print:max-w-none print:overflow-visible print:px-0 print:py-0 print:shadow-none print:ring-0"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div className="grid gap-5 md:grid-cols-[220px_1fr_120px] md:items-start print:grid-cols-[170px_1fr_90px] print:gap-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/images/logo-costa-araucania.png"
              alt="Servicio Local de Educación Pública Costa Araucanía"
              className="h-auto w-[220px] max-w-full print:w-[155px]"
            />
          </div>

          <div className="text-center md:pt-10 print:pt-8">
            <p className="text-[13px] font-semibold text-[#12335c] print:text-[10px]">Servicio Local de Educación Pública Costa Araucanía</p>
            <p className="text-[13px] font-semibold text-slate-900 print:text-[10px]">Hoja Mural de Inventario de Bienes de Uso.</p>
          </div>

          <div className="hidden text-center text-[7px] leading-tight text-slate-700 md:block">
            <div className="ml-auto flex h-[76px] w-[76px] items-center justify-center border border-slate-300 text-[8px] text-slate-400 print:h-[62px] print:w-[62px]">
              QR
            </div>
          </div>
        </div>

        <dl className="mt-10 grid max-w-[760px] grid-cols-[150px_1fr] gap-x-5 text-[13px] font-normal leading-[1.38] sm:grid-cols-[190px_1fr] md:mt-12 print:mt-8 print:max-w-[620px] print:grid-cols-[150px_1fr] print:text-[9px] print:leading-[1.25]">
          <SheetMeta label="Nombre de Funcionario:" value={responsible} />
          <SheetMeta label="RUT:" value={rut} />
          <SheetMeta label="Dependencia:" value={dependency} />
          <SheetMeta label="Ubicación:" value={sheet.location.name} />
          <SheetMeta label="Piso:" value={floor} />
          <SheetMeta label="Fecha de actualización:" value={formatLongSpanishDate(updatedAt)} />
          <SheetMeta label="Página:" value="1 de 1" />
        </dl>

        <div className="mt-5 max-h-[68vh] overflow-x-auto overflow-y-auto overscroll-contain rounded-sm ring-1 ring-slate-200 print:mt-4 print:max-h-none print:overflow-visible print:ring-0">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-[9px] font-normal leading-tight text-slate-950 sm:min-w-0 sm:text-[10px] print:min-w-0 print:text-[7.2px] print:leading-[1.12]">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[14%]" />
              <col className="w-[17%]" />
              <col className="w-[30%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[5%]" />
              <col className="w-[12%] print:hidden" />
            </colgroup>
            <thead className="sticky top-0 z-10 print:static">
              <tr className="bg-[#d7d7d7] text-slate-950">
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
                const originalCode = displayAssetCode(asset);
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

        <div className="mt-5 border border-[#334155] bg-[#f8fafc] p-2 text-[9px] leading-snug text-slate-700 print:mt-4 print:text-[6.8px]">
          <p className="font-semibold text-[#0f315e]">NOTA:</p>
          <p>Los bienes detallados en esta hoja mural deben permanecer registrados en la ubicación indicada. Cualquier traslado, cambio de estado o ajuste debe quedar actualizado en el sistema de inventario institucional.</p>
        </div>

        <div className="mt-4 border border-[#334155] bg-[#fff7ed] p-2 text-[9px] leading-snug text-slate-700 print:mt-3 print:text-[6.8px]">
          <p className="font-semibold text-[#9a3412]">Datos de Responsabilidad de Bienes de Uso</p>
          <p><span className="font-semibold text-slate-900">A cargo de:</span> {responsible || "Sin responsable"}</p>
          <p><span className="font-semibold text-slate-900">Ubicación:</span> {sheet.location.path}</p>
          <p><span className="font-semibold text-slate-900">Total de bienes:</span> {sheet.assets.length}</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-16 text-center text-[10px] text-slate-700 print:mt-8 print:text-[7px]">
          <div className="border-t border-[#334155] pt-2">Firma funcionario responsable</div>
          <div className="border-t border-[#334155] pt-2">Firma encargado inventario</div>
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => !busy && setModalOpen(false)} title={editingAsset ? "Editar bien de la ficha" : `Agregar bien a ${sheet.location.name}`} size="xl">
        <form onSubmit={submitAsset} className="space-y-4">
          {!editingAsset && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
              Para bienes repetidos, define la cantidad y deja el código vacío si no existe código HM. La ficha mostrará “Sin código” y cada unidad quedará como fila independiente.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Código del bien" hint="Si no hay código HM, active la opción o deje este campo vacío.">
              <Input value={form.assetCode} onChange={(event) => setForm((current) => ({ ...current, assetCode: event.target.value }))} placeholder="Sin código" maxLength={40} disabled={form.noCode || (!editingAsset && Number(form.quantity) > 1)} />
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.noCode || (!editingAsset && Number(form.quantity) > 1)}
                  disabled={!editingAsset && Number(form.quantity) > 1}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    noCode: event.target.checked,
                    assetCode: event.target.checked ? "" : current.assetCode,
                  }))}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Sin código HM
              </label>
            </Field>
            <Field label="Denominación" required>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={200} required />
            </Field>
            {!editingAsset && (
              <Field label="Cantidad" hint="Ej.: 40 sillas. Se crean 40 filas independientes dentro de esta ubicación.">
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
              <Select value={form.statusId || defaultStatusId} onChange={(event) => setForm((current) => ({ ...current, statusId: event.target.value }))} required>
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
          <Field label="Descripción" hint="Escriba color, material y detalles visibles. El texto de “Sin código” se agrega solo cuando corresponde.">
            <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ej.: plástico rojo patas metal gris" rows={3} maxLength={500} />
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

      <Modal open={headerModalOpen} onClose={closeHeaderEditor} title="Editar datos de la ficha" size="lg">
        <form onSubmit={saveHeader} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de Funcionario">
              <Input
                value={headerForm.responsibleName}
                onChange={(event) => setHeaderForm((current) => ({ ...current, responsibleName: event.target.value }))}
                list="sheet-responsibles"
                maxLength={160}
              />
              <datalist id="sheet-responsibles">
                {(responsibles ?? []).map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
              </datalist>
            </Field>
            <Field label="RUT">
              <Input value={headerForm.rut} onChange={(event) => setHeaderForm((current) => ({ ...current, rut: event.target.value }))} maxLength={20} placeholder="16.532.213-4" />
            </Field>
            <Field label="Dependencia">
              <Input value={headerForm.dependency} onChange={(event) => setHeaderForm((current) => ({ ...current, dependency: event.target.value }))} maxLength={160} />
            </Field>
            <Field label="Ubicación" required>
              <Input value={headerForm.locationName} onChange={(event) => setHeaderForm((current) => ({ ...current, locationName: event.target.value }))} maxLength={160} required />
            </Field>
            <Field label="Piso">
              <Input
                value={headerForm.floor}
                onChange={(event) => setHeaderForm((current) => ({ ...current, floor: event.target.value }))}
                list="sheet-floors"
                maxLength={160}
              />
              <datalist id="sheet-floors">
                {(locations ?? []).filter((item) => item.type === "floor").map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Estos datos se aplican a la cabecera y a los bienes activos de esta ficha.
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeHeaderEditor} disabled={headerBusy} className="w-full sm:w-auto">Cancelar</Button>
            <Button type="submit" loading={headerBusy} className="w-full sm:w-auto">Guardar ficha</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteModalOpen} onClose={() => !deleteBusy && setDeleteModalOpen(false)} title="Eliminar ficha" size="md">
        <div className="space-y-4">
          <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
            Esta acción eliminará los bienes activos de la ficha <span className="font-semibold">{sheet.location.name}</span>. Puedes conservar la ubicación para volver a cargar inventario después, o eliminarla también si ya no se usará.
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
            Bienes activos en esta ficha: <span className="font-semibold text-slate-800">{sheet.assets.length}</span>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={Boolean(deleteBusy)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="button" variant="danger" loading={deleteBusy === "sheet"} disabled={Boolean(deleteBusy)} onClick={() => removeSheet(false)} className="w-full sm:w-auto">
              Eliminar solo ficha
            </Button>
            <Button type="button" variant="danger" loading={deleteBusy === "location"} disabled={Boolean(deleteBusy) || !canDeleteLocation} onClick={() => removeSheet(true)} className="w-full sm:w-auto">
              Eliminar ficha y ubicación
            </Button>
          </div>
          {!canDeleteLocation && (
            <p className="text-xs text-slate-500">
              Para eliminar también la ubicación se requiere permiso de administración de ubicaciones.
            </p>
          )}
        </div>
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
  return <th className={`border border-[#1f2937] px-1 py-1.5 text-center font-semibold print:px-0.5 print:py-0.5 ${className}`}>{children}</th>;
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
  return <td className={`break-words border border-[#334155] px-1 py-0.5 align-top print:px-0.5 print:py-[1px] ${center ? "text-center" : ""} ${className ?? ""}`}>{children}</td>;
}

function importedValue(description: string | null | undefined, label: string) {
  const normalizedLabel = label.toLowerCase();
  const part = (description ?? "")
    .split("|")
    .map((chunk) => chunk.trim())
    .find((chunk) => {
      const colonIndex = chunk.indexOf(":");
      if (colonIndex === -1) return false;
      return chunk.slice(0, colonIndex).trim().toLowerCase().startsWith(normalizedLabel);
    });
  if (!part) return undefined;
  return part.slice(part.indexOf(":") + 1).trim();
}

function displayOriginalCode(value: string | null | undefined) {
  const clean = (value ?? "").replace(/^HM:\s*/i, "").trim();
  return clean || "Sin código";
}

function displayAssetCode(asset: AssetDTO) {
  const originalCode = importedValue(asset.description, "Código original");
  if (isNoCodeValue(originalCode)) return "Sin código";
  return displayOriginalCode(originalCode ?? asset.assetCode);
}

function firstImportedValue(assets: AssetDTO[], label: string) {
  for (const asset of assets) {
    const value = importedValue(asset.description, label);
    if (value) return value;
  }
  return undefined;
}

function sheetHeaderValue(sheet: LocationSheet, label: string) {
  return firstImportedValue(sheet.assets, label) ?? importedValue(sheet.location.description, label);
}

function visibleDescription(description?: string | null) {
  return (description ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !isSheetMetadataPart(part))
    .join(" | ");
}

function mergeVisibleDescription(originalDescription: string | null | undefined, visibleValue: string, originalCode?: string) {
  const normalizedCode = originalCode?.trim();
  const preservedImportedParts = (originalDescription ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(isSheetMetadataPart);

  const mergedParts = upsertMetadataPart(
    preservedImportedParts,
    "Código original HM",
    normalizedCode || "Sin código",
  );

  return [visibleValue.trim(), ...mergedParts].filter(Boolean).join(" | ");
}

function mergeSheetMetadata(
  originalDescription: string | null | undefined,
  metadata: { dependency: string; sourceLocation: string; floor: string; rut: string },
) {
  let parts = (originalDescription ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  parts = upsertMetadataPart(parts, "Dependencia", metadata.dependency);
  parts = upsertMetadataPart(parts, "Ubicación detalle origen", metadata.sourceLocation);
  parts = upsertMetadataPart(parts, "Piso/Sector", metadata.floor);
  parts = upsertMetadataPart(parts, "RUT responsable", metadata.rut);
  return parts.join(" | ");
}

function upsertMetadataPart(parts: string[], label: string, value: string) {
  const normalizedValue = value.trim();
  const prefix = label.toLowerCase();
  const nextParts = parts.filter((part) => {
    const colonIndex = part.indexOf(":");
    if (colonIndex === -1) return true;
    return part.slice(0, colonIndex).trim().toLowerCase() !== prefix;
  });
  if (normalizedValue) nextParts.push(`${label}: ${normalizedValue}`);
  return nextParts;
}

function isSheetMetadataPart(part: string) {
  const colonIndex = part.indexOf(":");
  if (colonIndex === -1) return false;
  const label = part.slice(0, colonIndex).trim().toLowerCase();
  return (
    label.startsWith("código original") ||
    label === "ubicación detalle origen" ||
    label === "dependencia" ||
    label === "piso/sector" ||
    label === "sector" ||
    label === "rut responsable"
  );
}

function findResponsibleByName(responsibles: ResponsibleDTO[], name: string) {
  const target = normalizeLookup(name);
  if (!target) return undefined;
  return responsibles.find((item) => normalizeLookup(item.name) === target);
}

function findFloorByName(locations: LocationDTO[], name: string) {
  const target = normalizeLookup(name);
  if (!target) return undefined;
  return locations.find((item) => item.type === "floor" && normalizeLookup(item.name) === target);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function normalizeLookup(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isNoCodeValue(value: string | null | undefined) {
  return normalizeLookup(value ?? "").replace(/\s+/g, " ") === "sin codigo";
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
