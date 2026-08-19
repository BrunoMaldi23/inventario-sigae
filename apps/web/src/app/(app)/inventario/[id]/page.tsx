"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

  return (
    <div>
      <PageHeader
        title={asset.name}
        description={`${asset.assetCode}${asset.brand ? ` · ${asset.brand}${asset.model ? " " + asset.model : ""}` : ""}`}
        actions={
          <>
            <Link href="/inventario" className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">
              ← Inventario
            </Link>
            {canUpdate && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>Editar</Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Ficha">
          <dl className="space-y-3 text-sm">
            <Row label="Estado">{asset.status ? <Badge>{asset.status.name}</Badge> : "—"}</Row>
            <Row label="Categoría">{asset.category?.name ?? "—"}</Row>
            <Row label="Ubicación">{asset.location?.path ?? "—"}</Row>
            <Row label="Responsable">{asset.responsible?.name ?? "—"}</Row>
            <Row label="N° serie">{asset.serialNumber ?? "—"}</Row>
            <Row label="Código de barras">{asset.barcode ?? "—"}</Row>
            <Row label="Adquisición">{formatDate(asset.acquisitionDate)}</Row>
            <Row label="Valor">{formatCurrency(asset.acquisitionValue)}</Row>
            <Row label="Proveedor">{asset.supplier ?? "—"}</Row>
            <Row label="Factura">{asset.invoiceNumber ?? "—"}</Row>
            <Row label="O. de compra">{asset.purchaseOrder ?? "—"}</Row>
            <Row label="Financiamiento">{asset.fundingSource ?? "—"}</Row>
            <Row label="Procedencia">{asset.provenance ?? "—"}</Row>
            <Row label="Registrado">{formatDateTime(asset.createdAt)}</Row>
            <Row label="Última actualización">{formatDateTime(asset.updatedAt)}</Row>
          </dl>
          {asset.description && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{asset.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {canTransfer && <Button onClick={() => setTransferOpen(true)}>Trasladar</Button>}
            {canStatus && <Button variant="secondary" onClick={() => setStatusOpen(true)}>Cambiar estado</Button>}
            {canDelete && (
              <Button variant="danger" onClick={() => {
                if (!window.confirm(`¿Eliminar el bien ${asset.assetCode}? (eliminación lógica)`)) return;
                apiDelete(`/assets/${asset.id}`)
                  .then(() => { notify("Bien eliminado"); router.push("/inventario"); })
                  .catch((e) => notify(e.message, "error"));
              }}>
                Eliminar
              </Button>
            )}
          </div>
        </Card>

        <Card title="Código QR">
          {qr?.dataUrl ? (
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.dataUrl} alt={`QR ${asset.assetCode}`} className="h-52 w-52 rounded-md border border-slate-200" />
              <p className="mt-2 font-mono text-xs text-slate-500">{qr.qrCode}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => window.print()}>Imprimir QR</Button>
            </div>
          ) : (
            <EmptyState title="QR no disponible" />
          )}
        </Card>

        <Card title="Adjuntos" actions={canUpload ? <UploadButton assetId={asset.id} onUploaded={() => reloadAtt()} /> : undefined}>
          {attachments && attachments.length > 0 ? (
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span>{a.type === "PHOTO" ? "🖼️" : "📄"}</span>
                    <span className="truncate text-slate-600">{a.filename}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">Ver</a>
                    )}
                    {canDeleteAtt && (
                      <button
                        className="text-xs text-red-500 hover:underline"
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
      </div>

      <div className="mt-6">
        <Card title="Historial de movimientos">
          {history && history.movements.length > 0 ? (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {history.movements.map((m) => (
                <MovementItem key={m.id} m={m} />
              ))}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
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