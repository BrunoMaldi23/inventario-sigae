"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  MoveRight,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { useData } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth-provider";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { apiDelete, apiPatch, apiPost, apiUpload } from "@/lib/api";
import { AssetDTO, AssetHistory, AssetMovementDTO, AssetStatusDTO, AttachmentDTO, CategoryDTO, LocationDTO, MOVEMENT_TYPE_LABELS, ResponsibleDTO } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export default function FichaBienPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { notify } = useToast();
  const { hasPermission } = useAuth();

  const canTransfer = hasPermission("asset.transfer");
  const canStatus = hasPermission("asset.status");
  const canUpdate = hasPermission("asset.update");
  const canDelete = hasPermission("asset.delete");
  const canUpload = hasPermission("attachment.upload");
  const canDeleteAtt = hasPermission("attachment.delete");

  const { data: asset, loading, reload } = useData<AssetDTO>(`/assets/${id}`);
  const { data: history } = useData<AssetHistory>(`/assets/${id}/history?pageSize=50`);
  const { data: attachments, reload: reloadAtt } = useData<AttachmentDTO[]>(`/assets/${id}/attachments`);
  const { data: qr } = useData<{ dataUrl: string; qrCode: string; assetCode: string }>(`/assets/${id}/qr`);

  const [transferOpen, setTransferOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (!asset) {
    return (
      <PageHeader
        title="Bien no encontrado"
        actions={<Link href="/inventario" className="text-sm text-indigo-600 hover:underline">← Volver al inventario</Link>}
      />
    );
  }

  const hm = extractImportedHeader(asset.description);
  const cleanDescription = visibleDescription(asset.description);
  const codeParts = splitAssetCode(asset.assetCode);
  const officialLocation = asset.location?.path ?? asset.location?.name ?? hm.sourceLocation ?? "Sin ubicación";
  const responsibleName = asset.responsible?.name ?? "Sin responsable";
  const usefulSpecs = [
    { label: "Marca", value: asset.brand },
    { label: "Modelo", value: asset.model },
    { label: "N° de serie", value: asset.serialNumber },
    { label: "Código de barras", value: asset.barcode },
    { label: "Adquisición", value: formatDate(asset.acquisitionDate) },
    { label: "Valor", value: formatCurrency(asset.acquisitionValue) },
    { label: "Proveedor", value: asset.supplier },
    { label: "Factura", value: asset.invoiceNumber },
    { label: "O. de compra", value: asset.purchaseOrder },
    { label: "Financiamiento", value: asset.fundingSource },
    { label: "Procedencia", value: asset.provenance },
  ].filter((item) => hasText(item.value));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-medium text-slate-500">Ficha del inventario</p>
          <h2 className="text-xl font-semibold text-slate-950">{asset.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventario" className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Inventario
          </Link>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir hoja
          </Button>
          {canUpdate && (
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Edit3 className="h-4 w-4" />
              Editar
            </Button>
          )}
          {canTransfer && (
            <Button onClick={() => setTransferOpen(true)}>
              <MoveRight className="h-4 w-4" />
              Trasladar
            </Button>
          )}
          {canStatus && (
            <Button variant="secondary" onClick={() => setStatusOpen(true)}>
              <ShieldCheck className="h-4 w-4" />
              Estado
            </Button>
          )}
        </div>
      </div>

      <section className="mx-auto min-h-[1120px] w-full max-w-[980px] bg-white px-[74px] py-[86px] text-black shadow-sm ring-1 ring-slate-200 print:min-h-0 print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0">
        <div className="grid grid-cols-[240px_1fr_130px] items-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/images/logo-costa-araucania.png"
              alt="Servicio Local de Educación Pública Costa Araucanía"
              className="h-auto w-[220px] max-w-full print:w-[200px]"
            />
          </div>

          <div className="pt-20 text-center">
            <p className="text-[13px] font-bold">Servicio Local de Educación Pública Costa Araucanía</p>
            <p className="text-[13px] font-bold">Hoja Mural de Inventario de Bienes de Uso.</p>
          </div>

          <div className="flex justify-end">
            {qr?.dataUrl && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.dataUrl} alt={`QR ${asset.assetCode}`} className="h-[92px] w-[92px]" />
                <p className="mt-1 font-mono text-[7px] leading-tight">{asset.assetCode}</p>
              </div>
            )}
          </div>
        </div>

        <dl className="mt-16 grid max-w-[640px] grid-cols-[190px_1fr] gap-x-5 text-[13px] leading-[1.35]">
          <SheetMeta label="Nombre de Funcionario:" value={responsibleName} />
          <SheetMeta label="RUT:" value={hm.responsibleRut} />
          <SheetMeta label="Dependencia:" value="Escuela Pública Alejandro Gorostiaga" />
          <SheetMeta label="Ubicación:" value={asset.location?.name ?? hm.sourceLocation ?? officialLocation} />
          <SheetMeta label="Piso:" value={hm.sector} />
          <SheetMeta label="Fecha de actualización:" value={formatLongSpanishDate(asset.updatedAt)} />
          <SheetMeta label="Página:" value="1 de 1" />
        </dl>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[830px] table-fixed border-collapse text-[11px] leading-tight">
            <colgroup>
              <col className="w-[46px]" />
              <col className="w-[116px]" />
              <col className="w-[150px]" />
              <col className="w-[245px]" />
              <col className="w-[78px]" />
              <col className="w-[88px]" />
              <col className="w-[104px]" />
              <col className="w-[60px]" />
            </colgroup>
            <thead>
              <tr className="bg-[#d9d9d9]">
                <SheetTh>N°</SheetTh>
                <SheetTh>Código del bien</SheetTh>
                <SheetTh>Denominación</SheetTh>
                <SheetTh>Descripción</SheetTh>
                <SheetTh>Marca</SheetTh>
                <SheetTh>Modelo</SheetTh>
                <SheetTh>Número de serie</SheetTh>
                <SheetTh>Estado</SheetTh>
              </tr>
            </thead>
            <tbody>
              <tr>
                <SheetTd center>{codeParts.sequence}</SheetTd>
                <SheetTd center>{hm.originalCode ?? asset.assetCode}</SheetTd>
                <SheetTd>{asset.name}</SheetTd>
                <SheetTd>{cleanDescription || "Sin descripción registrada"}</SheetTd>
                <SheetTd center>{asset.brand || "SIN MARCA"}</SheetTd>
                <SheetTd center>{asset.model || ""}</SheetTd>
                <SheetTd center>{asset.serialNumber || ""}</SheetTd>
                <SheetTd center>{asset.status?.name ?? ""}</SheetTd>
              </tr>
              {usefulSpecs.length > 0 && (
                <tr>
                  <SheetTd center>2</SheetTd>
                  <SheetTd center>{asset.assetCode}</SheetTd>
                  <SheetTd>Código interno SIGAE</SheetTd>
                  <SheetTd>{usefulSpecs.map((item) => `${item.label}: ${item.value}`).join(" | ")}</SheetTd>
                  <SheetTd center>{asset.brand || ""}</SheetTd>
                  <SheetTd center>{asset.model || ""}</SheetTd>
                  <SheetTd center>{asset.barcode || ""}</SheetTd>
                  <SheetTd center>{asset.active ? "Activo" : "Inactivo"}</SheetTd>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 border border-black p-2 text-[9px] leading-snug">
          <p className="font-bold">NOTA:</p>
          <p>Los bienes detallados en esta hoja mural deben mantenerse actualizados, visibles y asociados a su ubicación física vigente. Cualquier traslado, cambio de estado o corrección debe registrarse en el sistema de inventario institucional.</p>
        </div>

        <div className="mt-4 border border-black p-2 text-[9px] leading-snug">
          <p className="font-bold">Datos de Responsabilidad de Bienes de Uso</p>
          <p><span className="font-bold">A cargo de:</span> {responsibleName}</p>
          <p><span className="font-bold">Ubicación:</span> {officialLocation}</p>
          <p><span className="font-bold">Registro:</span> {formatDateTime(asset.createdAt)} | <span className="font-bold">Última actualización:</span> {formatDateTime(asset.updatedAt)}</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-16 text-center text-[10px]">
          <div className="border-t border-black pt-2">Firma funcionario responsable</div>
          <div className="border-t border-black pt-2">Firma encargado inventario</div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2 print:hidden">
        <Card title="Adjuntos" actions={canUpload ? <UploadButton assetId={asset.id} onUploaded={() => reloadAtt()} /> : undefined}>
          {attachments && attachments.length > 0 ? (
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="truncate text-slate-700">{a.filename}</span>
                  <div className="flex items-center gap-2">
                    {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-600 hover:underline">Ver</a>}
                    {canDeleteAtt && (
                      <button
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={async () => {
                          try {
                            await apiDelete(`/assets/${asset.id}/attachments/${a.id}`);
                            reloadAtt();
                            notify("Adjunto eliminado");
                          } catch (e) { notify((e as Error).message, "error"); }
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin adjuntos" description="Fotografías y documentos del bien" />
          )}
        </Card>

        <Card title="Historial de movimientos">
          {history && history.movements.length > 0 ? (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {history.movements.map((m) => <MovementItem key={m.id} m={m} />)}
            </ol>
          ) : (
            <EmptyState title="Sin movimientos" description="Este bien no tiene historial de movimientos" />
          )}
        </Card>
      </div>

      {asset && (
        <>
          <TransferModal asset={asset} open={transferOpen} onClose={() => setTransferOpen(false)} onDone={() => { setTransferOpen(false); reload(); }} />
          <StatusModal asset={asset} open={statusOpen} onClose={() => setStatusOpen(false)} onDone={() => { setStatusOpen(false); reload(); }} />
          {canUpdate && <EditModal asset={asset} open={editOpen} onClose={() => setEditOpen(false)} onDone={() => { setEditOpen(false); reload(); }} />}
        </>
      )}
    </div>
  );
}

function hasText(value?: string | number | null): value is string | number {
  return value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== "—";
}

function extractImportedHeader(description?: string | null) {
  const chunks = (description ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const take = (label: string) => {
    const found = chunks.find((part) => part.toLowerCase().startsWith(label.toLowerCase()));
    return found?.slice(label.length).replace(/^:\s*/, "").trim() || undefined;
  };

  const plainDescription = chunks.find((part) => !/^(Código original|Ubicación detalle origen|Piso\/Sector|Sector|RUT responsable):/i.test(part));

  return {
    originalCode: take("Código original"),
    sourceLocation: take("Ubicación detalle origen"),
    sector: take("Piso/Sector") ?? take("Sector"),
    responsibleRut: take("RUT responsable"),
    plainDescription,
  };
}

function visibleDescription(description?: string | null) {
  return extractImportedHeader(description).plainDescription;
}

function splitAssetCode(assetCode: string) {
  const match = assetCode.match(/^([A-Za-z]+)(.*?)(\d+)$/);
  if (!match) {
    const [prefix = assetCode, ...rest] = assetCode.split("-");
    return { prefix, sequence: rest.join("-") || assetCode };
  }
  return {
    prefix: match[1],
    sequence: match[3],
  };
}

function statusTone(status?: string | null): "green" | "amber" | "red" | "slate" | "indigo" {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("bueno")) return "green";
  if (normalized.includes("regular") || normalized.includes("mantención") || normalized.includes("repar")) return "amber";
  if (normalized.includes("malo") || normalized.includes("baja") || normalized.includes("extraviado")) return "red";
  return "slate";
}

function StatusPill({ status }: { status?: string | null }) {
  return <Badge tone={statusTone(status)}>{status || "Sin estado"}</Badge>;
}

function formatLongSpanishDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SheetMeta({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value || "Sin dato"}</dd>
    </>
  );
}

function SheetTh({ children }: { children: React.ReactNode }) {
  return <th className="border border-black px-1.5 py-2 text-center font-bold">{children}</th>;
}

function SheetTd({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <td className={`border border-black px-1.5 py-1 align-top ${center ? "text-center" : ""}`}>
      {children}
    </td>
  );
}

function MovementItem({ m }: { m: AssetMovementDTO }) {
  const label = MOVEMENT_TYPE_LABELS[m.type] ?? m.type;
  return (
    <li className="relative">
      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-indigo-600 bg-white" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="text-xs text-slate-400">{formatDateTime(m.createdAt)}</span>
      </div>
      <p className="mt-0.5 text-sm text-slate-600">
        {m.fromLocation?.name ?? "—"} → {m.toLocation?.name ?? "—"}
        {m.reason && <span className="text-slate-500"> · {m.reason}</span>}
      </p>
      <p className="text-xs text-slate-400">por {m.performedBy?.name ?? "Sistema"}</p>
    </li>
  );
}

function UploadButton({ assetId, onUploaded }: { assetId: string; onUploaded: () => void }) {
  const { notify } = useToast();
  return (
    <label className="cursor-pointer text-sm font-medium text-indigo-600 hover:underline">
      Subir
      <input
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.append("file", file);
          try {
            await apiUpload<AttachmentDTO>(`/assets/${assetId}/attachments`, fd);
            notify("Adjunto subido");
            onUploaded();
          } catch (err) {
            notify(err instanceof Error ? err.message : "Error al subir adjunto", "error");
          }
          e.target.value = "";
        }}
      />
    </label>
  );
}

function TransferModal({ asset, open, onClose, onDone }: { asset: AssetDTO; open: boolean; onClose: () => void; onDone: () => void }) {
  const { notify } = useToast();
  const { data: locations } = useData<LocationDTO[]>("/locations?active=true");
  const { data: responsibles } = useData<ResponsibleDTO[]>("/responsibles?active=true");
  const [toLocationId, setToLocationId] = useState("");
  const [toResponsibleId, setToResponsibleId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost(`/assets/${asset.id}/transfer`, {
        toLocationId,
        toResponsibleId: toResponsibleId || undefined,
        reason,
        notes: notes || undefined,
        version: asset.version,
      });
      notify(`Bien trasladado correctamente`);
      onDone();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error en el traslado", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={`Trasladar ${asset.assetCode}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Ubicación de destino" required>
          <Select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} required>
            <option value="">Seleccione…</option>
            {(locations ?? []).filter((l) => l.id !== asset.locationId).map((l) => (
              <option key={l.id} value={l.id}>{l.path || l.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Responsable de destino (opcional)">
          <Select value={toResponsibleId} onChange={(e) => setToResponsibleId(e.target.value)}>
            <option value="">Mantener actual</option>
            {(responsibles ?? []).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Motivo" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: Traslado de sala" required maxLength={200} />
        </Field>
        <Field label="Observaciones">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={busy}>Confirmar traslado</Button>
        </div>
      </form>
    </Modal>
  );
}

function StatusModal({ asset, open, onClose, onDone }: { asset: AssetDTO; open: boolean; onClose: () => void; onDone: () => void }) {
  const { notify } = useToast();
  const { data: statuses } = useData<AssetStatusDTO[]>("/statuses");
  const [toStatusId, setToStatusId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost(`/assets/${asset.id}/status`, {
        toStatusId,
        reason,
        notes: notes || undefined,
        version: asset.version,
      });
      notify("Estado actualizado");
      onDone();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al cambiar estado", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={`Cambiar estado — ${asset.assetCode}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nuevo estado" required>
          <Select value={toStatusId} onChange={(e) => setToStatusId(e.target.value)} required>
            <option value="">Seleccione…</option>
            {(statuses ?? []).filter((s) => s.id !== asset.statusId).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Motivo" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: Daño detectado" required maxLength={200} />
        </Field>
        <Field label="Observaciones">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={busy}>Confirmar</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ asset, open, onClose, onDone }: { asset: AssetDTO; open: boolean; onClose: () => void; onDone: () => void }) {
  const { notify } = useToast();
  const { data: categories } = useData<CategoryDTO[]>("/categories");
  const { data: statuses } = useData<AssetStatusDTO[]>("/statuses");
  const { data: locations } = useData<LocationDTO[]>("/locations?active=true");
  const { data: responsibles } = useData<ResponsibleDTO[]>("/responsibles?active=true");
  const [form, setForm] = useState(() => ({
    name: asset.name,
    description: asset.description ?? "",
    brand: asset.brand ?? "",
    model: asset.model ?? "",
    serialNumber: asset.serialNumber ?? "",
    barcode: asset.barcode ?? "",
    categoryId: asset.categoryId ?? "",
    statusId: asset.statusId ?? "",
    locationId: asset.locationId ?? "",
    responsibleId: asset.responsibleId ?? "",
    active: asset.active,
  }));
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPatch(`/assets/${asset.id}`, {
        name: form.name,
        description: form.description,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber,
        barcode: form.barcode,
        categoryId: form.categoryId || undefined,
        statusId: form.statusId || asset.statusId,
        locationId: form.locationId || undefined,
        responsibleId: form.responsibleId || undefined,
        active: form.active,
        version: asset.version,
      });
      notify("Bien actualizado");
      onDone();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al actualizar", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={`Editar ${asset.assetCode}`} size="lg">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre" required>
          <Input value={form.name} onChange={set("name")} required maxLength={200} />
        </Field>
        <Field label="Categoría">
          <Select value={form.categoryId} onChange={set("categoryId")}>
            <option value="">Sin categoría</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={form.statusId} onChange={set("statusId")}>
            {(statuses ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Marca">
          <Input value={form.brand} onChange={set("brand")} maxLength={120} />
        </Field>
        <Field label="Modelo">
          <Input value={form.model} onChange={set("model")} maxLength={120} />
        </Field>
        <Field label="N° serie">
          <Input value={form.serialNumber} onChange={set("serialNumber")} maxLength={200} />
        </Field>
        <Field label="Código de barras">
          <Input value={form.barcode} onChange={set("barcode")} maxLength={200} />
        </Field>
        <Field label="Ubicación">
          <Select value={form.locationId} onChange={set("locationId")}>
            <option value="">Sin ubicación</option>
            {(locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.path || l.name}</option>)}
          </Select>
        </Field>
        <Field label="Responsable">
          <Select value={form.responsibleId} onChange={set("responsibleId")}>
            <option value="">Sin responsable</option>
            {(responsibles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Descripción">
            <Textarea value={form.description} onChange={set("description")} rows={2} maxLength={500} />
          </Field>
        </div>
        <div className="md:col-span-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.active} onChange={set("active")} className="h-4 w-4 rounded" />
            Bien activo
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={busy}>Guardar</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
