"use client";

import { useData } from "@/hooks/use-fetch";
import { useToast } from "@/components/toast";
import { Button, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { RoleDTO, ROLE_LABELS } from "@/lib/types";

export default function RolesPage() {
  const { data, loading } = useData<RoleDTO[]>("/roles");
  const { notify } = useToast();

  return (
    <div>
      <PageHeader
        title="Roles y permisos"
        description="Definición de roles y reasignación de usuarios"
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-indigo-600" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><EmptyState title="Sin roles" /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((r) => (
            <Card key={r.id} title={ROLE_LABELS[r.name] ?? r.name}>
              <p className="mb-3 text-sm text-slate-500">{r.description ?? ""}</p>
              <div className="text-center">
                <span className="text-sm text-slate-600">Usuarios estimados: 5</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => notify("Haz clic para reasignar rol a un usuario")}
                >
                  Reasignar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}