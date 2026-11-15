import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, KeyRound, Pencil, Power, Siren, X } from "lucide-react";
import { useState } from "react";

import { TimeAgo } from "@/components/TimeAgo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { regeneratePortalLink, updateAgent, type DashboardData } from "@/lib/admin.functions";
import { formatIndoPhone, normalizeIndoPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { CopyButton } from "./CopyButton";
import { PhoneInput } from "./PhoneInput";
import { useRunAction } from "./use-run-action";

type Agent = DashboardData["agents"][number];

export function AgentCard({
  agent,
  clicks,
  share,
  origin,
}: {
  agent: Agent;
  clicks: number;
  share: number;
  origin: string;
}) {
  const { run, pending } = useRunAction();
  const update = useServerFn(updateAgent);
  const regen = useServerFn(regeneratePortalLink);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [phone, setPhone] = useState(agent.phone ? agent.phone.slice(2) : "");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const banned = agent.status === "banned";
  const empty = !agent.phone;
  const portalUrl = origin ? `${origin}/cs/${agent.portal_token}` : "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const check = normalizeIndoPhone(phone);
    if (!check.ok) {
      setPhoneError(check.error);
      return;
    }
    const res = await run(
      "save",
      () => update({ data: { id: agent.id, name: name.trim(), phone: check.value } }),
      "Data CS disimpan",
    );
    if (res?.ok) setEditing(false);
  }

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-5",
        banned ? "border-destructive/70" : empty ? "border-warning/60" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Slot {agent.slot}</p>
          <h3 className="text-xl font-bold">{agent.name}</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
            banned
              ? "bg-destructive text-destructive-foreground"
              : empty
                ? "bg-warning text-warning-foreground"
                : "bg-success text-success-foreground",
          )}
        >
          {banned ? <Siren className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          {banned ? "Banned" : empty ? "Belum diisi" : "Aktif"}
        </span>
      </div>

      <p className="mt-4 font-data text-2xl font-semibold">{formatIndoPhone(agent.phone)}</p>
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {agent.previous_phone && (
          <p>
            Nomor lama: <span className="font-data">{formatIndoPhone(agent.previous_phone)}</span>
          </p>
        )}
        {banned && agent.banned_at && (
          <p className="text-destructive">
            <TimeAgo date={agent.banned_at} prefix="Banned " />
          </p>
        )}
        <p>
          Diubah <TimeAgo date={agent.updated_at} /> oleh {agent.last_actor}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-secondary px-2 py-2">
          <p className="font-data text-lg font-semibold">{clicks}</p>
          <p className="text-[11px] text-muted-foreground">total klik</p>
        </div>
        <div className="rounded-lg bg-secondary px-2 py-2">
          <p className={cn("font-data text-lg font-semibold", share > 0 ? "text-primary" : "text-muted-foreground")}>
            {share}%
          </p>
          <p className="text-[11px] text-muted-foreground">porsi trafik</p>
        </div>
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor={`name-${agent.id}`} className="text-xs">Nama</Label>
            <Input id={`name-${agent.id}`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`phone-${agent.id}`} className="text-xs">Nomor WhatsApp</Label>
            <PhoneInput
              id={`phone-${agent.id}`}
              value={phone}
              onChange={(v) => {
                setPhone(v);
                setPhoneError(null);
              }}
              error={phoneError}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending === "save"}>
              {pending === "save" ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="mr-1 h-3.5 w-3.5" /> Batal
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {banned ? (
            <Button
              size="sm"
              disabled={!!pending || empty}
              onClick={() =>
                run("status", () => update({ data: { id: agent.id, status: "active" } }), `${agent.name} diaktifkan`)
              }
            >
              <Power className="mr-1 h-3.5 w-3.5" /> Override: Aktifkan
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              disabled={!!pending}
              onClick={() =>
                run("status", () => update({ data: { id: agent.id, status: "banned" } }), `${agent.name} di-set banned`)
              }
            >
              <Siren className="mr-1 h-3.5 w-3.5" /> Override: Set Banned
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setName(agent.name);
              setPhone(agent.phone ? agent.phone.slice(2) : "");
              setPhoneError(null);
              setEditing(true);
            }}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Link portal darurat</p>
        <p className="mt-1 truncate font-data text-xs text-muted-foreground">{portalUrl || "…"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyButton value={portalUrl} label="Salin link" />
          <Button size="sm" variant="secondary" asChild disabled={!portalUrl}>
            <a href={portalUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Buka
            </a>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!!pending}
            onClick={() => {
              if (window.confirm(`Buat link portal baru untuk ${agent.name}? Link lama langsung tidak berlaku.`)) {
                void run("regen", () => regen({ data: { id: agent.id } }), "Link portal baru dibuat");
              }
            }}
          >
            <KeyRound className="mr-1 h-3.5 w-3.5" /> Link baru
          </Button>
        </div>
      </div>
    </article>
  );
}
