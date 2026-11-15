import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { normalizeIndoPhone } from "@/lib/phone";

// CS portal: no login. The private per-CS link token is checked inside the database functions.

export type CsPortalState = {
  id: string;
  slot: number;
  name: string;
  phone: string;
  previous_phone: string | null;
  status: "active" | "banned";
  banned_at: string | null;
  updated_at: string;
  rotation: string;
};

type CsResult = { ok: true; agent: CsPortalState } | { ok: false; error: string };

function portalClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const tokenSchema = z.string().uuid();

export const csGet = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }): Promise<CsResult> => {
    const { data: agent, error } = await portalClient().rpc("cs_portal_get", { p_token: data.token });
    if (error) return { ok: false, error: error.message };
    return { ok: true, agent: agent as unknown as CsPortalState };
  });

export const csAction = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; action: "report" | "undo" | "reuse" }) =>
    z.object({ token: tokenSchema, action: z.enum(["report", "undo", "reuse"]) }).parse(input),
  )
  .handler(async ({ data }): Promise<CsResult> => {
    const fn =
      data.action === "report" ? "cs_report_banned" : data.action === "undo" ? "cs_undo_report" : "cs_reuse_old";
    const { data: agent, error } = await portalClient().rpc(fn, { p_token: data.token });
    if (error) return { ok: false, error: error.message };
    return { ok: true, agent: agent as unknown as CsPortalState };
  });

export const csChangeNumber = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; phone: string }) =>
    z.object({ token: tokenSchema, phone: z.string().max(30) }).parse(input),
  )
  .handler(async ({ data }): Promise<CsResult> => {
    const res = normalizeIndoPhone(data.phone);
    if (!res.ok) return { ok: false, error: res.error };
    const { data: agent, error } = await portalClient().rpc("cs_change_number", {
      p_token: data.token,
      p_phone: res.value,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, agent: agent as unknown as CsPortalState };
  });
