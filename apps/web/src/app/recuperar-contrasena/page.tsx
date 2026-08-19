"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { ApiClientError, forgotPassword } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setResetUrl(res.resetUrl);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="w-full max-w-[390px]">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-50 text-2xl">✉️</div>
            <h1 className="mt-4 text-[22px] font-extrabold text-slate-900">¡Correo enviado!</h1>
            <p className="mt-1.5 text-[13px] text-slate-500">
              Revisa tu bandeja de entrada. Te enviamos un enlace para restablecer tu contraseña.
            </p>
            {resetUrl && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Enlace de prueba (correo aún no configurado)
                </p>
                <p className="mt-1 break-all font-mono text-xs text-slate-600">{resetUrl}</p>
              </div>
            )}
            <Link
              href="/login"
              className="mt-6 block rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Volver al inicio de sesión
            </Link>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} · Inventario Escolar — Sistema SIGAE
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[390px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
          <div className="mb-6 text-center">
            <p className="mb-2 inline-block rounded-2xl bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Panel Institucional
            </p>
            <h1 className="text-[22px] font-extrabold text-slate-900">Recuperar contraseña</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Ingresa tu correo institucional asociado a la cuenta para continuar.
            </p>
          </div>

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

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5" role="alert">
                <svg className="size-[18px] shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full rounded-xl font-semibold" loading={loading} disabled={loading}>
              {loading ? "Enviando…" : "Enviar enlace"}
            </Button>

            <Link
              href="/login"
              className="block py-1.5 text-center text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
            >
              Volver al inicio de sesión
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