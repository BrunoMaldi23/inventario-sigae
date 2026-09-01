import { NextRequest } from "next/server";

const API_PROXY_URL = process.env.API_PROXY_URL ?? "https://debian-server.tailfb30e3.ts.net";

async function proxyFile(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`/files/${path.join("/")}${request.nextUrl.search}`, API_PROXY_URL);

  const upstream = await fetch(target, {
    method: request.method,
    headers: {
      accept: request.headers.get("accept") ?? "*/*",
    },
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.set("cache-control", "public, max-age=300");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyFile;
export const HEAD = proxyFile;

