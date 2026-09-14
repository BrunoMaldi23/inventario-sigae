# Sistema Integral de Inventario Escolar — Fase 1

Monorepo pnpm con tres piezas:

| App | Ruta | Stack | Estado |
|---|---|---|---|
| **API** | `apps/api` | NestJS 11 + Prisma + PostgreSQL | Corriendo en el servidor Debian (pm2) |
| **Web** | `apps/web` | Next.js 16 (App Router) + React 19 + Tailwind 4 | Desplegada en Vercel |
| **Móvil** | `apps/mobile` | Expo Router | Pendiente (Fase 2) |

Paquetes compartidos: `packages/types`, `packages/config`, `packages/validation` (`@inventario/*`).

## Arquitectura

```
Navegador (Vercel) ──HTTPS──▶ https://debian-server.tailfb30e3.ts.net/inventario/api  (Tailscale Funnel)
                                  │
                                  ▼
                         Servidor Debian (100.74.242.36)
                         API en pm2 (:3000) → PostgreSQL Docker (:5432, inventario_sigae_db)
```

- **Frontend**: Vercel → https://inventario-sigae.vercel.app (Root Directory: `apps/web`).
- **API**: servidor Debian, gestionado por pm2 (`inventario-api`), expuesto públicamente con **Tailscale Funnel**.
- **DB**: container `postgres_db` (Docker Compose en `~/postgres`).

## Requisitos previos

- Node ≥ 20 (local: v22; server: v22.23.2) y pnpm 11.
- Acceso SSH al server (`admin-server@100.74.242.36`, Tailnet `brunopsg061`).
- Vercel CLI con sesión iniciada para desplegar la web.

## Local (desarrollo)

```powershell
cd apps/web
Copy-Item .env.example .env.local   # API_PROXY_URL=http://localhost:3000
pnpm dev                            # http://localhost:3001
```

```powershell
cd apps/api
pnpm dev                            # watch mode; usa .env (DATABASE_URL remota o local)
```

Credenciales demo seed: `admin@escuela.cl / Admin.1234` · `encargado@escuela.cl / Encargado.1234` · `funcionario@escuela.cl / Funcionario.1234`.

## Check gates

```powershell
pnpm --filter web lint;  pnpm --filter web typecheck; pnpm --filter web build
pnpm --filter api lint;  pnpm --filter api typecheck; pnpm --filter api build; pnpm --filter api test
```

## Deploy web a Vercel (CLI)

```powershell
cd apps/web
# En production la web usa siempre el proxy /api de Next.js y ese proxy apunta a:
# https://debian-server.tailfb30e3.ts.net/inventario
#
# Para preview o desarrollo remoto opcional:
npx vercel env add INVENTARIO_API_PROXY_URL
#   valor: URL base pública de inventario, sin /api.
#   Debe responder /api/health con la respuesta del inventario.
npx vercel deploy --prod --yes
```

La URL de producción es https://inventario-sigae.vercel.app (CORS ya acepta `*.vercel.app`).

## Deploy API al servidor (actualizar)

```powershell
# local
cd C:\Bruno\Proyectos\Inventario-sigae
git add -A; git commit -m "..."            # el deploy se basa en HEAD
git archive -o $env:TEMP\inv.tar.gz HEAD
# subir con pscp a /home/admin-server/inventario-sigae.tar.gz

# server
cd ~/inventario-sigae && tar xzf ~/inventario-sigae.tar.gz
pnpm exec turbo run build --filter=api
pm2 restart inventario-api                  # ojo: apps/api/.env se conserva (no está en git)
```

Funnel (si se resetea el server): mantener `/api` para asistencia y `/inventario` para inventario.

## Limpieza de BD

```powershell
cd apps/api
pnpm db:migrate      # aplica migraciones (Prisma)
pnpm db:seed         # datos demo
```

## Estructura de funciones

- Inventario: ficha, QR, adjuntos, traslado atómico (ubicación + movimiento + auditoría), cambio de estado, traslado masivo, filtros y búsqueda con paginación en backend.
- Movimientos y auditoría (inmutable, soft-delete, optimistic locking con `version`).
- Catálogos: ubicaciones (árbol), categorías (árbol), responsables, estados.
- Importación/Exportación Excel (validación, jobs, confirmación) y plantilla.
- RBAC: roles y permisos por endpoint; login JWT con refresh automático en el cliente.
