"use client";

import { useData } from "@/hooks/use-fetch";
import { Badge, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { RoleDTO, ROLE_LABELS } from "@/lib/types";

export default function RolesPage() {
  const { data, loading } = useData<RoleDTO[]>("/roles");

  return (
    <div>
      <PageHeader title="Roles y permisos" description="Definición de accesos por rol. La asignación es gestionada por el administrador." />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><EmptyState title="Sin roles" /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((r) => (
            <Card key={r.id} title={ROLE_LABELS[r.name] ?? r.name}>
              {r.description && <p className="mb-3 text-sm text-slate-500">{r.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {(r.permissions ?? []).map((p) => (
                  <Badge key={p} tone="slate">{p}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}