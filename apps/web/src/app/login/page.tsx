"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiClientError } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-3xl">🏫</span>
          <h1 className="mt-4 text-2xl font-bold text-white">Inventario Escolar</h1>
          <p className="mt-1 text-sm text-slate-400">Sistema integral de gestión de bienes</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-xl">
          <Field label="Correo electrónico" required>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@escuela.cl" required />
          </Field>
          <Field label="Contraseña" required>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={loading} disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          Usuarios demo: admin@escuela.cl / encargado@escuela.cl / funcionario@escuela.cl
        </p>
      </div>
    </div>
  );
}