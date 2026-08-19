"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { initials } from "@/lib/format";

const NAV: { href: string; label: string; icon: string; perm?: string }[] = [
  { href: "/", label: "Panel", icon: "📊" },
  { href: "/inventario", label: "Inventario", icon: "📦", perm: "asset.read" },
  { href: "/movimientos", label: "Movimientos", icon: "🔄", perm: "movement.read" },
  { href: "/auditoria", label: "Auditoría", icon: "🛡️", perm: "audit.read" },
  { href: "/ubicaciones", label: "Ubicaciones", icon: "📐", perm: "location.manage" },
  { href: "/categorias", label: "Categorías", icon: "🏷️", perm: "category.manage" },
  { href: "/responsables", label: "Responsables", icon: "🧑‍🏫", perm: "responsible.manage" },
  { href: "/importar", label: "Importar Excel", icon: "⬆️", perm: "inventory.import" },
  { href: "/exportar", label: "Exportar", icon: "⬇️", perm: "report.export" },
];

const ADMIN_NAV: { href: string; label: string; icon: string; perm?: string }[] = [
  { href: "/usuarios", label: "Usuarios", icon: "👤", perm: "user.manage" },
  { href: "/roles", label: "Roles y permisos", icon: "🔐", perm: "role.manage" },
];

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  const items = NAV.filter((n) => !n.perm || hasPermission(n.perm));
  const adminItems = ADMIN_NAV.filter((n) => !n.perm || hasPermission(n.perm));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-700 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg text-white">🏫</span>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Inventario Escolar</p>
            <p className="text-[11px] text-slate-400">Sistema SIGAE</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} icon={n.icon} />
          ))}
          {adminItems.length > 0 && (
            <>
              <p className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Administración</p>
              {adminItems.map((n) => (
                <NavLink key={n.href} href={n.href} label={n.label} icon={n.icon} />
              ))}
            </>
          )}
        </nav>
        <div className="border-t border-slate-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
            </div>
          </div>
          <button onClick={logout} className="mt-3 w-full rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}