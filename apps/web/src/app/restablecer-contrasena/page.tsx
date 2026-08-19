"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { ApiClientError, resetPassword } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("El enlace no es válido. Solicita uno nuevo.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-[390px]">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100 text-2xl">✅</div>
          <h1 className="mt-4 text-[22px] font-extrabold text-slate-900">¡Contraseña actualizada!</h1>
          <p className="mt-1.5 text-[13px] text-slate-500">
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Link
            href="/login"
            className="mt-6 block rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[390px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
        <div className="mb-6 text-center">
          <p className="mb-2 inline-block rounded-2xl bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            Panel Institucional
          </p>
          <h1 className="text-[22px] font-extrabold text-slate-900">Restablecer contraseña</h1>
          <p className="mt-1 text-[13px] text-slate-500">Ingresa tu nueva contraseña para continuar.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Nueva contraseña" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          <Field label="Confirmar contraseña" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
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
            {loading ? "Guardando…" : "Guardar contraseña"}
          </Button>

          <Link
            href="/login"
            className="block py-1.5 text-center text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}