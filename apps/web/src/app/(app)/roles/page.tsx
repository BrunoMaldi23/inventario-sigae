"use client";

import {
  BriefcaseBusiness,
  Building2,
  Eye,
  Shield,
  ShieldCheck,
  UserCog,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useToast } from "@/components/toast";
import {
  Button,
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { useData } from "@/hooks/use-fetch";
import {
  ROLE_LABELS,
  RoleDTO,
} from "@/lib/types";

export default function RolesPage() {
  const {
    data,
    loading,
  } = useData<RoleDTO[]>("/roles");

  const { notify } = useToast();

  const roles = data ?? [];

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader
        title="Roles y permisos"
        description="Define los niveles de acceso y responsabilidades dentro del sistema."
      />

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryItem
          label="Roles configurados"
          value={roles.length}
          icon={<ShieldCheck size={18} />}
        />

        <SummaryItem
          label="Acceso administrativo"
          value={
            roles.filter((role) =>
              role.name
                .toLowerCase()
                .includes("admin"),
            ).length
          }
          icon={<UserCog size={18} />}
        />

        <SummaryItem
          label="Perfiles operativos"
          value={
            roles.filter((role) => {
              const name =
                role.name.toLowerCase();

              return (
                !name.includes("admin") &&
                !name.includes("lectura")
              );
            }).length
          }
          icon={<UsersRound size={18} />}
        />
      </div>

      {/* =====================================================
          INFORMACIÓN
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Shield size={18} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Control de acceso
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Cada usuario debe tener un rol asociado. El rol determina qué
              módulos y operaciones puede utilizar dentro del inventario.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          LISTADO
      ===================================================== */}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-emerald-700" />
        </div>
      ) : roles.length === 0 ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-h-[280px]">
            <EmptyState
              title="Sin roles"
              description="No existen roles configurados en el sistema."
            />
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Roles disponibles
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Revisa el propósito de cada rol y administra su asignación.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {roles.map((role) => {
              const config =
                getRoleVisual(role.name);

              const label =
                ROLE_LABELS[
                  role.name as keyof typeof ROLE_LABELS
                ] ??
                role.name;

              return (
                <article
                  key={role.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  {/* TOP */}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={[
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                            config.iconClass,
                          ].join(" ")}
                        >
                          {config.icon}
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {label}
                          </h3>

                          <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            {role.name}
                          </p>
                        </div>
                      </div>

                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          config.badgeClass,
                        ].join(" ")}
                      >
                        {config.level}
                      </span>
                    </div>

                    {/* DESCRIPTION */}

                    <p className="mt-4 min-h-[40px] text-sm leading-6 text-slate-500">
                      {role.description ||
                        config.description}
                    </p>

                    {/* ACCESS */}

                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Alcance principal
                      </p>

                      <div className="mt-3 space-y-2">
                        {config.capabilities.map(
                          (capability) => (
                            <div
                              key={capability}
                              className="flex items-center gap-2 text-xs text-slate-600"
                            >
                              <span
                                className={[
                                  "h-1.5 w-1.5 rounded-full",
                                  config.dotClass,
                                ].join(" ")}
                              />

                              {capability}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}

                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <UsersRound size={14} />

                      Usuarios asignados
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        notify(
                          `Selecciona un usuario para asignarle el rol ${label}`,
                        )
                      }
                    >
                      <UserCog size={14} />

                      Reasignar
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================
          NOTA
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs leading-5 text-slate-500">
          Los roles definen niveles generales de acceso. Los permisos efectivos
          deben seguir validándose en el backend; ocultar una opción en la
          interfaz no reemplaza la autorización del servidor.
        </p>
      </section>
    </div>
  );
}

/* ============================================================
   SUMMARY
============================================================ */

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

/* ============================================================
   ROLE VISUAL
============================================================ */

function getRoleVisual(
  roleName: string,
) {
  const normalized =
    roleName.toLowerCase();

  if (
    normalized.includes("super")
  ) {
    return {
      icon: (
        <ShieldCheck size={21} />
      ),

      iconClass:
        "bg-violet-50 text-violet-700",

      badgeClass:
        "bg-violet-50 text-violet-700",

      dotClass:
        "bg-violet-500",

      level:
        "Acceso total",

      description:
        "Control completo sobre configuración, usuarios, inventario y operaciones administrativas.",

      capabilities: [
        "Administración completa del sistema",
        "Gestión de usuarios y roles",
        "Acceso total al inventario",
      ],
    };
  }

  if (
    normalized.includes(
      "administrador",
    )
  ) {
    return {
      icon: (
        <UserCog size={21} />
      ),

      iconClass:
        "bg-indigo-50 text-indigo-700",

      badgeClass:
        "bg-indigo-50 text-indigo-700",

      dotClass:
        "bg-indigo-500",

      level:
        "Administrativo",

      description:
        "Gestión administrativa del inventario y de las configuraciones operativas.",

      capabilities: [
        "Crear y modificar bienes",
        "Gestionar ubicaciones y categorías",
        "Consultar reportes y movimientos",
      ],
    };
  }

  if (
    normalized.includes(
      "direccion",
    ) ||
    normalized.includes(
      "dirección",
    )
  ) {
    return {
      icon: (
        <Building2 size={21} />
      ),

      iconClass:
        "bg-sky-50 text-sky-700",

      badgeClass:
        "bg-sky-50 text-sky-700",

      dotClass:
        "bg-sky-500",

      level:
        "Supervisión",

      description:
        "Perfil orientado a supervisión institucional, consulta y seguimiento del inventario.",

      capabilities: [
        "Consultar inventario",
        "Revisar estados y ubicaciones",
        "Acceder a información de gestión",
      ],
    };
  }

  if (
    normalized.includes(
      "encargado",
    )
  ) {
    return {
      icon: (
        <BriefcaseBusiness
          size={21}
        />
      ),

      iconClass:
        "bg-emerald-50 text-emerald-700",

      badgeClass:
        "bg-emerald-50 text-emerald-700",

      dotClass:
        "bg-emerald-500",

      level:
        "Operativo avanzado",

      description:
        "Responsable de la operación cotidiana del inventario y de sus movimientos.",

      capabilities: [
        "Registrar y actualizar bienes",
        "Realizar traslados",
        "Importar y exportar información",
      ],
    };
  }

  if (
    normalized.includes(
      "funcionario",
    )
  ) {
    return {
      icon: (
        <UserRound size={21} />
      ),

      iconClass:
        "bg-teal-50 text-teal-700",

      badgeClass:
        "bg-teal-50 text-teal-700",

      dotClass:
        "bg-teal-500",

      level:
        "Operativo",

      description:
        "Perfil para consulta y operaciones autorizadas desde web o aplicación móvil.",

      capabilities: [
        "Consultar bienes",
        "Registrar movimientos autorizados",
        "Ver ubicación y estado",
      ],
    };
  }

  if (
    normalized.includes(
      "lectura",
    )
  ) {
    return {
      icon: (
        <Eye size={21} />
      ),

      iconClass:
        "bg-slate-100 text-slate-600",

      badgeClass:
        "bg-slate-100 text-slate-600",

      dotClass:
        "bg-slate-400",

      level:
        "Solo consulta",

      description:
        "Acceso exclusivamente de lectura, sin capacidad para modificar información.",

      capabilities: [
        "Consultar inventario",
        "Consultar ubicaciones",
        "Sin permisos de edición",
      ],
    };
  }

  return {
    icon: (
      <Shield size={21} />
    ),

    iconClass:
      "bg-slate-100 text-slate-600",

    badgeClass:
      "bg-slate-100 text-slate-600",

    dotClass:
      "bg-slate-400",

    level:
      "Personalizado",

    description:
      "Rol configurado para un conjunto específico de responsabilidades.",

    capabilities: [
      "Acceso según permisos asignados",
      "Configuración administrable",
      "Aplicación de permisos desde backend",
    ],
  };
}