import { NextRequest } from "next/server";

const API_PROXY_URL =
  process.env.INVENTARIO_API_PROXY_URL ??
  (process.env.NODE_ENV === "production" ? undefined : process.env.API_PROXY_URL) ??
  (process.env.NODE_ENV === "production"
    ? "https://debian-server.tailfb30e3.ts.net/inventario"
    : "http://localhost:3000");

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!API_PROXY_URL) {
    return Response.json(
      {
        error: {
          code: "API_PROXY_NOT_CONFIGURED",
          message: "API_PROXY_URL no está configurado para conectar con la API de inventario.",
        },
      },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const target = new URL(`/api/${path.join("/")}${request.nextUrl.search}`, API_PROXY_URL);
  const headers = new Headers(request.headers);
  headers.delete("host");

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
