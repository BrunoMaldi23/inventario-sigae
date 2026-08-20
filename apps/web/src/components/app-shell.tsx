"use client";

import {
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  FileDown,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MapPin,
  PackageSearch,
  Tags,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/components/auth-provider";

const NAV: {
  href: string;
  label: string;
  icon: ReactNode;
  perm?: string;
}[] = [
  {
    href: "/",
    label: "Panel",
    icon: <LayoutDashboard size={18} />,
  },
  {
    href: "/inventario",
    label: "Inventario",
    icon: <Boxes size={18} />,
    perm: "asset.read",
  },
  {
    href: "/movimientos",
    label: "Movimientos",
    icon: <ClipboardList size={18} />,
    perm: "movement.read",
  },
  {
    href: "/ubicaciones",
    label: "Ubicaciones",
    icon: <MapPin size={18} />,
    perm: "location.manage",
  },
  {
    href: "/categorias",
    label: "Categorías",
    icon: <Tags size={18} />,
    perm: "category.manage",
  },
  {
    href: "/responsables",
    label: "Responsables",
    icon: <UsersRound size={18} />,
    perm: "responsible.manage",
  },
  {
    href: "/importar",
    label: "Importar Excel",
    icon: <FileUp size={18} />,
    perm: "inventory.import",
  },
  {
    href: "/exportar",
    label: "Exportar",
    icon: <FileDown size={18} />,
    perm: "report.export",
  },
];

const ADMIN_NAV: {
  href: string;
  label: string;
  icon: ReactNode;
  perm?: string;
}[] = [
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: <UserRoundCog size={18} />,
    perm: "user.manage",
  },
  {
    href: "/roles",
    label: "Roles y permisos",
    icon: <FolderKanban size={18} />,
    perm: "role.manage",
  },
];

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  const pathname = usePathname();

  const active =
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-2.5",
        "text-sm font-medium transition-all duration-150",
        active
          ? "bg-emerald-50 text-emerald-800"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-800",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="flex-1 truncate">
        {label}
      </span>

      {active && (
        <ChevronRight
          size={16}
          className="shrink-0 text-emerald-600"
        />
      )}
    </Link>
  );
}

function SidebarUser({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-semibold text-white">
          {initials || "US"}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {name}
          </p>

          <p className="truncate text-xs text-slate-500">
            {email}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    logout,
    hasPermission,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (
      mounted &&
      !user
    ) {
      router.replace("/login");
    }
  }, [
    mounted,
    user,
    router,
  ]);

  /*
   * IMPORTANTE:
   *
   * Durante SSR:
   * mounted === false
   *
   * Primer render del navegador:
   * mounted === false
   *
   * Por lo tanto ambos árboles coinciden
   * y evitamos el hydration mismatch.
   */
  if (!mounted) {
    return null;
  }

  if (!user) {
    return null;
  }

  const items = NAV.filter(
    (item) =>
      !item.perm ||
      hasPermission(item.perm),
  );

  const adminItems =
    ADMIN_NAV.filter(
      (item) =>
        !item.perm ||
        hasPermission(item.perm),
    );

  const currentPage = [
    ...NAV,
    ...ADMIN_NAV,
  ].find((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(
          item.href,
        ),
  );

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F5F7F8] text-slate-900">
      {/* =====================================================
          SIDEBAR FIJO
      ===================================================== */}

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[260px] border-r border-slate-200 bg-white lg:flex lg:flex-col">
        {/* BRAND */}

        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
            <Building2 size={22} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight text-slate-950">
              Inventario Escolar
            </p>

            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              Gestión institucional
            </p>
          </div>
        </div>

        {/* =====================================================
            NAVEGACIÓN
            SCROLL INTERNO OCULTO
        ===================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-3
            py-4
            [&::-webkit-scrollbar]:hidden
            [-ms-overflow-style:none]
            [scrollbar-width:none]
          "
        >
<nav className="space-y-1">
            {items.map(
              (item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={
                    item.label
                  }
                  icon={
                    item.icon
                  }
                />
              ),
            )}
          </nav>

          {adminItems.length >
            0 && (
            <div className="mt-6">
              <div className="mb-3 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Administración
                </p>
              </div>

              <nav className="space-y-1">
                {adminItems.map(
                  (item) => (
                    <NavLink
                      key={
                        item.href
                      }
                      href={
                        item.href
                      }
                      label={
                        item.label
                      }
                      icon={
                        item.icon
                      }
                    />
                  ),
                )}
              </nav>
            </div>
          )}
        </div>

        {/* =====================================================
            USUARIO / CERRAR SESIÓN
            SIEMPRE VISIBLE
        ===================================================== */}

        <div className="shrink-0 border-t border-slate-100 bg-white p-3">
          <SidebarUser
            name={user.name}
            email={user.email}
          />

          <button
            type="button"
            onClick={logout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut size={17} />

            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* =====================================================
          CONTENIDO PRINCIPAL
      ===================================================== */}

      <div className="min-h-screen lg:pl-[260px]">
        {/* HEADER */}

        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
          <div className="flex h-[76px] items-center justify-between px-5 md:px-8">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-400">
                Inventario Escolar
              </p>

              <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-950">
                {currentPage?.label ??
                  "Panel"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {pathname !==
                "/inventario" && (
                <Link
                  href="/inventario"
                  className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 md:flex"
                >
                  <PackageSearch
                    size={17}
                  />

                  Ver inventario
                </Link>
              )}

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-xs font-semibold text-white lg:hidden">
                {initials ||
                  "US"}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}

        <main className="min-h-[calc(100vh-76px)]">
          <div className="mx-auto w-full max-w-[1480px] px-5 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}