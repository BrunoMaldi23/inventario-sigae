"use client";

import {
  Boxes,
  Building2,
  Camera,
  ChevronRight,
  ClipboardList,
  FileDown,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PackageSearch,
  Save,
  Tags,
  UserRound,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ReactNode,
  useMemo,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Button, Field, Input } from "@/components/ui";
import { apiAssetUrl, apiPatch, apiUpload } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

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
  avatarUrl,
  onOpenProfile,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onOpenProfile: () => void;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onOpenProfile}
      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60"
    >
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={apiAssetUrl(avatarUrl) ?? ""}
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-semibold text-white">
            {initials || "US"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {name}
          </p>

          <p className="truncate text-xs text-slate-500">
            {email}
          </p>
        </div>
      </div>
    </button>
  );
}

function ProfileModal({
  open,
  user,
  onClose,
  onUpdated,
}: {
  open: boolean;
  user: AuthUser;
  onClose: () => void;
  onUpdated: (user: AuthUser) => void;
}) {
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user.name);
    setEmail(user.email);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [open, user.email, user.name]);

  const avatarSrc = apiAssetUrl(user.avatarUrl);
  const initials = useMemo(
    () =>
      user.name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [user.name],
  );

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const updated = await apiPatch<AuthUser>("/auth/profile", {
        name,
        email,
      });
      onUpdated(updated);
      notify("Perfil actualizado");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo actualizar el perfil", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      notify("La confirmación no coincide", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await apiPatch<{ success: boolean }>("/auth/password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Contraseña actualizada");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo cambiar la contraseña", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setSavingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const updated = await apiUpload<AuthUser>("/auth/avatar", fd);
      onUpdated(updated);
      notify("Avatar actualizado");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo subir el avatar", "error");
    } finally {
      setSavingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Perfil de usuario" size="lg">
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col items-center text-center">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="h-28 w-28 rounded-2xl object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-emerald-700 text-2xl font-semibold text-white">
                {initials || "US"}
              </div>
            )}
            <p className="mt-3 text-sm font-semibold text-slate-950">{user.name}</p>
            <p className="mt-1 max-w-full truncate text-xs text-slate-500">{user.email}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void uploadAvatar(event.target.files?.[0])}
            />
            <Button
              className="mt-4 w-full"
              variant="secondary"
              loading={savingAvatar}
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={16} />
              Cambiar avatar
            </Button>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRound size={17} className="text-emerald-700" />
              Datos de cuenta
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre" required>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Correo electrónico" required>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button loading={savingProfile} onClick={() => void saveProfile()}>
                <Save size={16} />
                Guardar perfil
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRoundCog size={17} className="text-indigo-600" />
              Cambiar contraseña
            </div>
            <div className="grid gap-3">
              <Field label="Contraseña actual" required>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nueva contraseña" required>
                  <Input
                    type="password"
                    minLength={6}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </Field>
                <Field label="Confirmar contraseña" required>
                  <Input
                    type="password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </Field>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="secondary"
                loading={savingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
                onClick={() => void savePassword()}
              >
                Actualizar contraseña
              </Button>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    ready,
    logout,
    updateUser,
    hasPermission,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] =
    useState(false);
  const [mobileOpen, setMobileOpen] =
    useState(false);
  const [profileOpen, setProfileOpen] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (
      mounted &&
      ready &&
      !user
    ) {
      router.replace("/login");
    }
  }, [
    mounted,
    ready,
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

  if (!ready || !user) {
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
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* =====================================================
          SIDEBAR FIJO
      ===================================================== */}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:w-[260px] lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "flex flex-col",
        ].join(" ")}
      >
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

          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
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
          <nav className="space-y-1" onClick={() => setMobileOpen(false)}>
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

              <nav className="space-y-1" onClick={() => setMobileOpen(false)}>
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
            avatarUrl={user.avatarUrl}
            onOpenProfile={() => setProfileOpen(true)}
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
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menú"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-400">
                  Inventario Escolar
                </p>

                <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-950">
                  {currentPage?.label ??
                    "Panel"}
                </h1>
              </div>
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

              <button
                type="button"
                aria-label="Abrir perfil"
                onClick={() => setProfileOpen(true)}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-emerald-700 text-xs font-semibold text-white ring-1 ring-slate-200 lg:hidden"
              >
                {user.avatarUrl ? (
                  <img
                    src={apiAssetUrl(user.avatarUrl) ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials ||
                  "US"
                )}
              </button>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}

        <main className="min-h-[calc(100vh-76px)]">
          <div className="mx-auto w-full max-w-[1680px] px-3 py-4 sm:px-5 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>

      <ProfileModal
        open={profileOpen}
        user={user}
        onClose={() => setProfileOpen(false)}
        onUpdated={updateUser}
      />
    </div>
  );
}
