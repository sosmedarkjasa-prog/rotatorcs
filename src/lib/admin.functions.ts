import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { normalizeIndoPhone } from "@/lib/phone";

type AdminSession = { admin?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "wa-rotator-admin",
    maxAge: 60 * 60 * 24 * 7,
    // SameSite=None so the session also works inside the editor preview frame.
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (session.data.admin !== true) throw new Error("UNAUTHORIZED");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function fail(error: { message: string } | null, context: string) {
  if (error) {
    console.error(`${context}:`, error.message);
    throw new Error(error.message);
  }
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) =>
    z.object({ password: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("ADMIN_PASSWORD belum diatur");
    if (!passwordMatches(data.password, expected)) {
      await new Promise((r) => setTimeout(r, 600));
      return { ok: false as const };
    }
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ admin: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { authed: session.data.admin === true };
});

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const db = await requireAdmin();
  const [agents, settings, campaigns, campaignStats, stats, logs, clicks, chats] = await Promise.all([
    db.from("cs_agents").select("*").order("slot"),
    db.from("rotator_settings").select("*").eq("id", 1).single(),
    db.from("campaigns").select("*").order("created_at", { ascending: false }),
    db.rpc("campaign_stats"),
    db.rpc("dashboard_stats"),
    db.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
    db
      .from("clicks")
      .select("id, ref_code, routed_to, phone, created_at, campaign_id")
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("chats")
      .select("id, ref_code, routed_to, sender, message, source, is_duplicate, click_id, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  fail(agents.error, "agents");
  fail(settings.error, "settings");
  fail(campaigns.error, "campaigns");
  fail(campaignStats.error, "campaign_stats");
  fail(stats.error, "dashboard_stats");
  fail(logs.error, "activity_logs");
  fail(clicks.error, "clicks");
  fail(chats.error, "chats");

  const s = (stats.data ?? {}) as Record<string, number>;
  return {
    agents: agents.data ?? [],
    settings: settings.data!,
    campaigns: campaigns.data ?? [],
    campaignStats: campaignStats.data ?? [],
    stats: {
      total_clicks: Number(s.total_clicks ?? 0),
      clicks_cs1: Number(s.clicks_cs1 ?? 0),
      clicks_cs2: Number(s.clicks_cs2 ?? 0),
      clicks_backup: Number(s.clicks_backup ?? 0),
      clicks_today: Number(s.clicks_today ?? 0),
      total_chats: Number(s.total_chats ?? 0),
      matched_chats: Number(s.matched_chats ?? 0),
      unmatched_chats: Number(s.unmatched_chats ?? 0),
      chats_today: Number(s.chats_today ?? 0),
    },
    logs: logs.data ?? [],
    clicks: clicks.data ?? [],
    chats: chats.data ?? [],
  };
});

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export const updateAgent = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; name?: string; phone?: string; status?: "active" | "banned" }) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(40).optional(),
        phone: z.string().max(30).optional(),
        status: z.enum(["active", "banned"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const patch: {
      name?: string;
      phone?: string;
      previous_phone?: string | null;
      status?: string;
      last_actor: string;
      last_action: string;
    } = { last_actor: "Admin", last_action: "admin_override" };

    if (data.name) patch.name = data.name;
    if (data.status) patch.status = data.status;

    if (data.phone !== undefined) {
      const res = normalizeIndoPhone(data.phone);
      if (!res.ok) return { ok: false as const, error: res.error };
      const { data: current, error } = await db.from("cs_agents").select("phone").eq("id", data.id).single();
      fail(error, "load agent");
      const { data: clash } = await db
        .from("cs_agents")
        .select("id")
        .eq("phone", res.value)
        .neq("id", data.id);
      if (clash && clash.length > 0) return { ok: false as const, error: "Nomor ini sudah dipakai CS lain" };
      if (current && current.phone !== res.value) {
        patch.phone = res.value;
        patch.previous_phone = current.phone || null;
      }
    }

    const { error } = await db.from("cs_agents").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const updateBackup = createServerFn({ method: "POST" })
  .inputValidator((input: { backup_name: string; backup_phone: string }) =>
    z
      .object({ backup_name: z.string().trim().min(1).max(40), backup_phone: z.string().max(30) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    let phone = "";
    if (data.backup_phone.trim()) {
      const res = normalizeIndoPhone(data.backup_phone);
      if (!res.ok) return { ok: false as const, error: res.error };
      phone = res.value;
    }
    const { error } = await db
      .from("rotator_settings")
      .update({ backup_name: data.backup_name, backup_phone: phone })
      .eq("id", 1);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; slug: string; message_template: string }) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        slug: z.string().trim().max(60),
        message_template: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const slug = slugify(data.slug || data.name);
    if (slug.length < 2) return { ok: false as const, error: "Slug minimal 2 karakter (huruf/angka)" };
    const template = data.message_template.includes("{ref}")
      ? data.message_template
      : `${data.message_template} [{ref}]`;
    const { error } = await db
      .from("campaigns")
      .insert({ name: data.name, slug, message_template: template });
    if (error) {
      if (error.code === "23505") return { ok: false as const, error: "Slug sudah dipakai kampanye lain" };
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, slug };
  });

export const updateCampaign = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; is_active?: boolean; message_template?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        is_active: z.boolean().optional(),
        message_template: z.string().trim().min(1).max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const patch: { is_active?: boolean; message_template?: string } = {};
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.message_template !== undefined) {
      patch.message_template = data.message_template.includes("{ref}")
        ? data.message_template
        : `${data.message_template} [{ref}]`;
    }
    const { error } = await db.from("campaigns").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const { error } = await db.from("campaigns").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const regeneratePortalLink = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const { error } = await db
      .from("cs_agents")
      .update({ portal_token: crypto.randomUUID() })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const regenerateWebhookSecret = createServerFn({ method: "POST" }).handler(async () => {
  const db = await requireAdmin();
  const secret = crypto.randomUUID().replace(/-/g, "");
  const { error } = await db.from("rotator_settings").update({ webhook_secret: secret }).eq("id", 1);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
});

export const simulateClick = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const { data: result, error } = await db.rpc("route_click", {
      p_slug: data.slug,
      p_user_agent: "Simulator Dashboard",
    });
    if (error) return { ok: false as const, error: error.message };
    const r = result as { ok: boolean; error?: string; phone?: string; message?: string; ref_code?: string; routed_to?: string };
    if (!r.ok) {
      return {
        ok: false as const,
        error: r.error === "campaign_not_found" ? "Kampanye tidak ditemukan / nonaktif" : "Tidak ada nomor aktif (isi nomor CS atau backup)",
      };
    }
    return {
      ok: true as const,
      phone: r.phone!,
      message: r.message!,
      ref_code: r.ref_code!,
      routed_to: r.routed_to!,
    };
  });

export const simulateChat = createServerFn({ method: "POST" })
  .inputValidator((input: { message: string; sender?: string }) =>
    z
      .object({ message: z.string().trim().min(1).max(2000), sender: z.string().trim().max(100).optional() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await requireAdmin();
    const { data: settings, error: sErr } = await db
      .from("rotator_settings")
      .select("webhook_secret")
      .eq("id", 1)
      .single();
    fail(sErr, "settings");
    const { data: result, error } = await db.rpc("record_chat", {
      p_secret: settings!.webhook_secret,
      p_message: data.message,
      p_sender: data.sender || "Simulator",
      p_source: "simulator",
    });
    if (error) return { ok: false as const, error: error.message };
    const r = result as { ok: boolean; ref_code?: string | null; matched?: boolean; routed_to?: string | null; duplicate?: boolean };
    return {
      ok: true as const,
      ref_code: r.ref_code ?? null,
      matched: !!r.matched,
      routed_to: r.routed_to ?? null,
      duplicate: !!r.duplicate,
    };
  });
