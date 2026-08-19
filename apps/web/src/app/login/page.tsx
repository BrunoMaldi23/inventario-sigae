"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { AuthLayout } from "@/components/auth-layout";
import { ApiClientError } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "No se pudo conectar con el servidor",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex w-full max-w-[390px] flex-col items-center">
        {/* Logo en badge blanca flotante, montado sobre la tarjeta */}
        <div className="relative z-10 -mb-[45px] flex size-[110px] items-center justify-center rounded-full border border-slate-200 bg-white shadow-[0_6px_12px_rgba(15,23,42,0.12)]">
          {!logoFailed && (
            <div className="relative h-[82px] w-[82px]">
              <Image
                src="/assets/images/logo.png"
                alt="Logo Institucional"
                fill
                sizes="82px"
                loading="eager"
                unoptimized
                className="object-contain"
                onError={() => setLogoFailed(true)}
              />
            </div>
          )}
        </div>

        <div className="w-full rounded-3xl border border-slate-200 bg-white px-6 pb-7 pt-14 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
          {/* Header del formulario */}
          <div className="mb-6 text-center">
            <p className="mb-2 inline-block rounded-2xl bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Panel Institucional
            </p>
            <h1 className="text-[22px] font-extrabold text-slate-900">
              Inventario Escolar
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Inicia sesión con tu cuenta institucional
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Correo electrónico" required>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@escuela.cl"
                required
              />
            </Field>

            <Field label="Contraseña" required>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg
                      className="size-[20px]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.007 10.007 0 012.822-.572c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21l-9-9"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="size-[20px]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </Field>

            {error && (
              <div
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5"
                role="alert"
              >
                <svg
                  className="size-[18px] shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full rounded-xl font-semibold"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Ingresando…" : "Iniciar sesión"}
            </Button>

            <Link
              href="/recuperar-contrasena"
              className="block py-1.5 text-center text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} · Inventario Escolar — Sistema SIGAE
        </p>
      </div>
    </AuthLayout>
  );
}
