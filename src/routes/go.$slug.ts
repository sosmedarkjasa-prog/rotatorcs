import { createFileRoute } from "@tanstack/react-router";

// Public rotator link: /go/<campaign-slug> -> wa.me/<CS number>?text=<message with REF code>

const BOT_UA =
  /bot|crawler|spider|facebookexternalhit|whatsapp|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|embedly|preview|headless/i;

function page(title: string, body: string, status: number) {
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><meta property="og:title" content="${title}"><style>body{font-family:system-ui,sans-serif;background:#0d1a15;color:#e8f2ec;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}h1{font-size:20px;margin:0 0 8px}p{opacity:.75;margin:0}</style></head><body><div><h1>${title}</h1><p>${body}</p></div></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/go/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const slug = String(params.slug ?? "").toLowerCase();
        if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
          return page("Link tidak ditemukan", "Periksa kembali link yang kamu buka.", 404);
        }
        const userAgent = request.headers.get("user-agent") ?? "";

        // Link previews (WhatsApp, Facebook, etc.) must not count as clicks or move the rotation.
        if (BOT_UA.test(userAgent)) {
          return page("Chat via WhatsApp", "Klik untuk langsung terhubung dengan CS kami.", 200);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("route_click", {
          p_slug: slug,
          p_user_agent: userAgent,
        });
        if (error) {
          console.error("route_click failed:", error.message);
          return page("Sedang ada gangguan", "Silakan coba lagi beberapa saat lagi.", 500);
        }
        const r = data as { ok: boolean; error?: string; phone?: string; message?: string };
        if (!r.ok) {
          if (r.error === "campaign_not_found") {
            return page("Promo tidak ditemukan", "Link promo ini sudah tidak aktif.", 404);
          }
          return page("CS sedang tidak tersedia", "Silakan coba lagi beberapa saat lagi.", 503);
        }
        const target = `https://wa.me/${r.phone}?text=${encodeURIComponent(r.message ?? "")}`;
        return new Response(null, {
          status: 302,
          headers: { location: target, "cache-control": "no-store" },
        });
      },
    },
  },
});
