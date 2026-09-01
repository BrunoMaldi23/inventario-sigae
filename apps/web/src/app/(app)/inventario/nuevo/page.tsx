"use client";

import {
  Archive,
  Building2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Hash,
  Info,
  MapPin,
  PackagePlus,
  Save,
  Tag,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast";
import {
  Button,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { useData } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import {
  AssetDTO,
  AssetStatusDTO,
  CategoryDTO,
  LocationDTO,
  ResponsibleDTO,
} from "@/lib/types";

export default function NuevoBienPage() {
  const router = useRouter();
  const { notify } = useToast();

  const { data: categories } =
    useData<CategoryDTO[]>("/categories");

  const { data: statuses } =
    useData<AssetStatusDTO[]>("/statuses");

  const { data: locations } =
    useData<LocationDTO[]>("/locations?active=true");

  const { data: responsibles } =
    useData<ResponsibleDTO[]>("/responsibles?active=true");

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
    quantity: "1",
    noCode: false,
  });

  const [busy, setBusy] = useState(false);
  const [showAdminData, setShowAdminData] = useState(false);

  const set =
    (key: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >,
    ) =>
      setForm((current) => ({
        ...current,
        [key]:
          e.target.type === "checkbox"
            ? (e.target as HTMLInputElement).checked
            : e.target.value,
      }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    setBusy(true);

    try {
      const quantity = Math.max(1, Math.min(200, Number(form.quantity) || 1));
      const withoutHmCode = form.noCode || quantity > 1;

      const created: AssetDTO[] = [];
      for (let index = 0; index < quantity; index += 1) {
        const res = await apiPost<AssetDTO>(
          "/assets",
          {
            assetCode:
              withoutHmCode ? undefined : form.assetCode.trim() || undefined,

            name:
              form.name,

            description:
              form.description,

            brand:
              form.brand,

            model:
              form.model,

            serialNumber:
              form.serialNumber,

            barcode:
              form.barcode,

            categoryId:
              form.categoryId || undefined,

            statusId:
              form.statusId,

            locationId:
              form.locationId || undefined,

            responsibleId:
              form.responsibleId || undefined,

            acquisitionDate:
              form.acquisitionDate || undefined,

            acquisitionValue:
              form.acquisitionValue
                ? Number(form.acquisitionValue)
                : undefined,

            supplier:
              form.supplier,

            invoiceNumber:
              form.invoiceNumber,

            purchaseOrder:
              form.purchaseOrder,

            fundingSource:
              form.fundingSource,

            provenance:
              form.provenance,

            notes:
              form.notes,

            active:
              form.active,
          },
        );
        created.push(res);
      }

      notify(
        quantity > 1
          ? `${quantity} bienes registrados correctamente`
          : `Bien ${created[0].assetCode} registrado correctamente`,
      );

      if (quantity > 1 && form.locationId) {
        router.push(`/inventario/ubicacion/${form.locationId}`);
      } else {
        router.push(`/inventario/${created[0].id}`);
      }
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Error al registrar el bien",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader
        title="Registrar bien"
        description="Crea la ficha del bien. El código QR se generará automáticamente al guardar."
        actions={
          <Link
            href="/inventario"
            className="
              inline-flex
              items-center
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-medium
              text-slate-600
              shadow-sm
              transition
              hover:bg-slate-50
              hover:text-slate-900
            "
          >
            ← Volver
          </Link>
        }
      />

      <form
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {/* =====================================================
            DATOS PRINCIPALES
        ===================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={<PackagePlus size={18} />}
            title="Datos principales"
            description="Información esencial para identificar el bien."
          />

          <div className="grid gap-5 p-5 md:grid-cols-2">
            <Field
              label="Denominación del bien"
              required
            >
              <Input
                value={form.name}
                onChange={set("name")}
                placeholder="Ej.: Silla escolar azul"
                required
                maxLength={200}
              />
            </Field>

            <Field label="Código del bien" hint="Para bienes sin código HM, active la opción o deje este campo vacío.">
              <Input
                value={form.assetCode}
                onChange={set("assetCode")}
                placeholder="Sin código"
                maxLength={40}
                disabled={form.noCode || Number(form.quantity) > 1}
              />
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.noCode || Number(form.quantity) > 1}
                  disabled={Number(form.quantity) > 1}
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

            <Field label="Cantidad" hint="Ej.: 40 sillas. Cada unidad se crea como fila independiente sin repetir trabajo.">
              <Input
                type="number"
                min={1}
                max={200}
                step={1}
                value={form.quantity}
                onChange={set("quantity")}
              />
            </Field>

            <Field
              label="Estado"
              required
            >
              <Select
                value={form.statusId}
                onChange={set("statusId")}
                required
              >
                <option value="">
                  Seleccione…
                </option>

                {(statuses ?? []).map(
                  (status) => (
                    <option
                      key={status.id}
                      value={status.id}
                    >
                      {status.name}
                    </option>
                  ),
                )}
              </Select>
            </Field>

            <Field label="Categoría">
              <Select
                value={form.categoryId}
                onChange={set("categoryId")}
              >
                <option value="">
                  Sin categoría
                </option>

                {(categories ?? []).map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ),
                )}
              </Select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Descripción" hint="Escriba color, material y detalles visibles. Si el código queda vacío, el sistema agrega la marca “Código original HM: Sin código”.">
                <Textarea
                  value={form.description}
                  onChange={set("description")}
                  rows={3}
                  maxLength={500}
                  placeholder="Ej.: plástico rojo patas metal gris"
                />
              </Field>
            </div>
          </div>
        </section>

        {/* =====================================================
            UBICACIÓN Y RESPONSABLE
        ===================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={<MapPin size={18} />}
            title="Ubicación y responsable"
            description="Define dónde se encuentra el bien y quién queda asociado actualmente."
          />

          <div className="grid gap-5 p-5 md:grid-cols-2">
            <Field label="Ubicación actual">
              <Select
                value={form.locationId}
                onChange={set("locationId")}
              >
                <option value="">
                  Sin ubicación
                </option>

                {(locations ?? []).map(
                  (location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.path ||
                        location.name}
                    </option>
                  ),
                )}
              </Select>
            </Field>

            <Field label="Responsable">
              <Select
                value={form.responsibleId}
                onChange={set("responsibleId")}
              >
                <option value="">
                  Sin responsable
                </option>

                {(responsibles ?? []).map(
                  (responsible) => (
                    <option
                      key={responsible.id}
                      value={responsible.id}
                    >
                      {responsible.name}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>
        </section>

        {/* =====================================================
            DETALLES TÉCNICOS
        ===================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={<Wrench size={18} />}
            title="Detalles técnicos"
            description="Datos opcionales útiles para identificar equipos, mobiliario y otros bienes."
          />

          <div className="grid gap-5 p-5 md:grid-cols-3">
            <Field label="Marca">
              <Input
                value={form.brand}
                onChange={set("brand")}
                placeholder="Ej.: HP"
                maxLength={120}
              />
            </Field>

            <Field label="Modelo">
              <Input
                value={form.model}
                onChange={set("model")}
                placeholder="Ej.: ProBook 450"
                maxLength={120}
              />
            </Field>

            <Field label="N° de serie">
              <Input
                value={form.serialNumber}
                onChange={set("serialNumber")}
                placeholder="Serie del fabricante"
                maxLength={200}
              />
            </Field>

            <Field label="Código de barras">
              <Input
                value={form.barcode}
                onChange={set("barcode")}
                placeholder="Opcional"
                maxLength={200}
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notas internas">
                <Textarea
                  value={form.notes}
                  onChange={set("notes")}
                  rows={2}
                  maxLength={2000}
                  placeholder="Observaciones internas sobre el bien."
                />
              </Field>
            </div>
          </div>
        </section>

        {/* =====================================================
            DATOS ADMINISTRATIVOS DESPLEGABLES
        ===================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() =>
              setShowAdminData(
                (current) => !current,
              )
            }
            className="
              flex
              w-full
              items-center
              justify-between
              gap-4
              px-5
              py-4
              text-left
              transition
              hover:bg-slate-50
            "
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Archive size={18} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Datos administrativos
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Información de adquisición, proveedor y financiamiento.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              {showAdminData
                ? "Ocultar"
                : "Mostrar"}

              {showAdminData ? (
                <ChevronUp size={17} />
              ) : (
                <ChevronDown size={17} />
              )}
            </div>
          </button>

          {showAdminData && (
            <div className="border-t border-slate-100 p-5">
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Proveedor">
                  <Input
                    value={form.supplier}
                    onChange={set("supplier")}
                    placeholder="Nombre del proveedor"
                    maxLength={200}
                  />
                </Field>

                <Field label="Factura">
                  <Input
                    value={form.invoiceNumber}
                    onChange={set("invoiceNumber")}
                    placeholder="N° factura"
                    maxLength={120}
                  />
                </Field>

                <Field label="Orden de compra">
                  <Input
                    value={form.purchaseOrder}
                    onChange={set("purchaseOrder")}
                    placeholder="N° orden"
                    maxLength={120}
                  />
                </Field>

                <Field label="Fuente de financiamiento">
                  <Input
                    value={form.fundingSource}
                    onChange={set("fundingSource")}
                    placeholder="Ej.: SEP, PIE, FAEP..."
                    maxLength={200}
                  />
                </Field>

                <Field label="Procedencia">
                  <Input
                    value={form.provenance}
                    onChange={set("provenance")}
                    placeholder="Origen del bien"
                    maxLength={200}
                  />
                </Field>

                <Field label="Fecha de adquisición">
                  <Input
                    type="date"
                    value={form.acquisitionDate}
                    onChange={set(
                      "acquisitionDate",
                    )}
                  />
                </Field>

                <Field label="Valor de adquisición (CLP)">
                  <Input
                    type="number"
                    min={0}
                    value={form.acquisitionValue}
                    onChange={set(
                      "acquisitionValue",
                    )}
                    placeholder="0"
                  />
                </Field>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================
            ESTADO GENERAL DEL REGISTRO
        ===================================================== */}

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Info size={17} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-800">
                Estado del registro
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Un bien activo podrá utilizarse en inventario, movimientos y reportes.
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-2.5 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={form.active}
              onChange={set("active")}
              className="
                h-4
                w-4
                rounded
                border-slate-300
                text-emerald-700
                focus:ring-emerald-600
              "
            />

            <span className="text-sm font-medium text-slate-700">
              Bien activo
            </span>
          </label>
        </section>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="sticky bottom-0 z-20 -mx-2 border-t border-slate-200 bg-[#F5F7F8]/95 px-2 py-4 backdrop-blur">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Hash size={14} />
              El código puede generarse automáticamente.
            </div>

            <div className="flex items-center justify-end gap-2">
              <Link
                href="/inventario"
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-medium
                  text-slate-600
                  shadow-sm
                  transition
                  hover:bg-slate-50
                  hover:text-slate-900
                "
              >
                Cancelar
              </Link>

              <Button
                type="submit"
                loading={busy}
              >
                <Save size={16} />
                Registrar bien
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
