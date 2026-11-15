import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// MacroDroid webhook: records an incoming WhatsApp chat and matches it to a click by its REF code.
// Caller must send the webhook secret (header x-webhook-secret, or "secret" in body/query).

const payloadSchema = z.object({
  secret: z.string().min(8).max(200),
  message: z.string().trim().min(1).max(2000),
  sender: z.string().trim().max(100).optional(),
  source: z.string().trim().max(40).optional(),
});

async function readPayload(request: Request): Promise<Record<string, string>> {
  const url = new URL(request.url);
  const out: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (out[k] = v));

  if (request.method === "POST") {
    const type = request.headers.get("content-type") ?? "";
    const text = await request.text();
    if (text) {
      if (type.includes("application/x-www-form-urlencoded")) {
        new URLSearchParams(text).forEach((v, k) => (out[k] = v));
      } else {
        try {
          const json = JSON.parse(text) as Record<string, unknown>;
          for (const [k, v] of Object.entries(json)) if (v != null) out[k] = String(v);
        } catch {
          out["message"] = out["message"] ?? text;
        }
      }
    }
  }
  const header = request.headers.get("x-webhook-secret");
  if (header) out["secret"] = header;
  const sender = out["sender"] ?? out["from"] ?? out["title"];
  return {
    secret: out["secret"] ?? out["key"] ?? "",
    message: out["message"] ?? out["text"] ?? out["notification"] ?? "",
    ...(sender ? { sender } : {}),
    ...(out["source"] ? { source: out["source"] } : {}),
  };
}

async function handle(request: Request) {
  const parsed = payloadSchema.safeParse(await readPayload(request));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "invalid_payload", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("record_chat", {
    p_secret: parsed.data.secret,
    p_message: parsed.data.message,
    p_sender: parsed.data.sender ?? "",
    p_source: parsed.data.source ?? "macrodroid",
  });
  if (error) {
    console.error("record_chat failed:", error.message);
    return Response.json({ ok: false, error: "server_error" }, { status: 500 });
  }
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return Response.json(r, { headers: { "cache-control": "no-store" } });
}

export const Route = createFileRoute("/api/public/macrodroid")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});
