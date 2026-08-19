"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { apiPost } from "@/lib/api";
import { AssetDTO, AssetStatusDTO, CategoryDTO, LocationDTO, ResponsibleDTO } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

export default function NuevoBienPage() {
  const router = useRouter();
  const { notify } = useToast();
  const { data: categories } = useData<CategoryDTO[]>("/categories");
  const { data: statuses } = useData<AssetStatusDTO[]>("/statuses");
  const { data: locations } = useData<LocationDTO[]>("/locations?active=true");
  const { data: responsibles } = useData<ResponsibleDTO[]>("/responsibles?active=true");

  const [form, setForm] = useState({
    assetCode: "",
    name: "",
    description: "",
    brand: "",
    model: "",
    serialNumber: "",
    barcode: "",
    categoryId: "",
    statusId: "",
    locationId: "",
    responsibleId: "",
    acquisitionDate: "",
    acquisitionValue: "",
    supplier: "",
    invoiceNumber: "",
    purchaseOrder: "",
    fundingSource: "",
    provenance: "",
    notes: "",
    active: true,
  });
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiPost<AssetDTO>("/assets", {
        assetCode: form.assetCode || undefined,
        name: form.name,
        description: form.description,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber,
        barcode: form.barcode,
        categoryId: form.categoryId || undefined,
        statusId: form.statusId,
        locationId: form.locationId || undefined,
        responsibleId: form.responsibleId || undefined,
        acquisitionDate: form.acquisitionDate || undefined,
        acquisitionValue: form.acquisitionValue ? Number(form.acquisitionValue) : undefined,
        supplier: form.supplier,
        invoiceNumber: form.invoiceNumber,
        purchaseOrder: form.purchaseOrder,
        fundingSource: form.fundingSource,
        provenance: form.provenance,
        notes: form.notes,
        active: form.active,
      });
      notify(`Bien ${res.assetCode} registrado correctamente`);
      router.push(`/inventario/${res.id}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Error al registrar el bien", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Registrar bien"
        description="Ingrese los datos del nuevo bien. El QR se genera automáticamente."
        actions={
          <Link href="/inventario" className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">
            ← Volver
          </Link>
        }
      />

      <form onSubmit={onSubmit}>
        <Card title="Datos de identificación">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Denominación del bien" required>
              <Input value={form.name} onChange={set("name")} placeholder="Ej.: Notebook HP" required maxLength={200} />
            </Field>
            <Field label="Código (opcional — se autogenera)">
              <Input value={form.assetCode} onChange={set("assetCode")} placeholder="INV-000002" maxLength={40} />
            </Field>
            <Field label="Estado" required>
              <Select value={form.statusId} onChange={set("statusId")} required>
                <option value="">Seleccione…</option>
                {(statuses ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Categoría">
              <Select value={form.categoryId} onChange={set("categoryId")}>
                <option value="">Sin categoría</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Descripción">
              <Textarea value={form.description} onChange={set("description")} rows={2} maxLength={500} />
            </Field>
            <Field label="Notas internas">
              <Textarea value={form.notes} onChange={set("notes")} rows={2} maxLength={2000} />
            </Field>
          </div>
        </Card>

        <Card title="Detalles técnicos">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Marca">
              <Input value={form.brand} onChange={set("brand")} maxLength={120} />
            </Field>
            <Field label="Modelo">
              <Input value={form.model} onChange={set("model")} maxLength={120} />
            </Field>
            <Field label="N° de serie">
              <Input value={form.serialNumber} onChange={set("serialNumber")} maxLength={200} />
            </Field>
            <Field label="Código de barras">
              <Input value={form.barcode} onChange={set("barcode")} maxLength={200} />
            </Field>
            <Field label="Proveedor">
              <Input value={form.supplier} onChange={set("supplier")} maxLength={200} />
            </Field>
            <Field label="Factura">
              <Input value={form.invoiceNumber} onChange={set("invoiceNumber")} maxLength={120} />
            </Field>
            <Field label="Orden de compra">
              <Input value={form.purchaseOrder} onChange={set("purchaseOrder")} maxLength={120} />
            </Field>
            <Field label="Fuente de financiamiento">
              <Input value={form.fundingSource} onChange={set("fundingSource")} maxLength={200} />
            </Field>
            <Field label="Procedencia">
              <Input value={form.provenance} onChange={set("provenance")} maxLength={200} />
            </Field>
          </div>
        </Card>

        <Card title="Ubicación y adquisición">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Ubicación actual">
              <Select value={form.locationId} onChange={set("locationId")}>
                <option value="">Sin ubicación</option>
                {(locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>{l.path || l.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Responsable">
              <Select value={form.responsibleId} onChange={set("responsibleId")}>
                <option value="">Sin responsable</option>
                {(responsibles ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha de adquisición">
              <Input type="date" value={form.acquisitionDate} onChange={set("acquisitionDate")} />
            </Field>
            <Field label="Valor de adquisición (CLP)">
              <Input type="number" min={0} value={form.acquisitionValue} onChange={set("acquisitionValue")} placeholder="0" />
            </Field>
          </div>
        </Card>

        <div className="mt-4 flex items-center justify-end gap-2">
          <label className="mr-auto flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.active} onChange={set("active")} className="h-4 w-4 rounded border-slate-300" />
            Bien activo
          </label>
          <Link href="/inventario" className="rounded-md bg-white px-3.5 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">
            Cancelar
          </Link>
          <Button type="submit" loading={busy}>Registrar bien</Button>
        </div>
      </form>
    </div>
  );
}