import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Pencil, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBackup, type DashboardData } from "@/lib/admin.functions";
import { formatIndoPhone, normalizeIndoPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { PhoneInput } from "./PhoneInput";
import { useRunAction } from "./use-run-action";

export function BackupCard({
  settings,
  clicks,
  engaged,
}: {
  settings: DashboardData["settings"];
  clicks: number;
  engaged: boolean;
}) {
  const { run, pending } = useRunAction();
  const save = useServerFn(updateBackup);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(settings.backup_name);
  const [phone, setPhone] = useState(settings.backup_phone ? settings.backup_phone.slice(2) : "");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    let value = "";
    if (phone.trim()) {
      const check = normalizeIndoPhone(phone);
      if (!check.ok) {
        setError(check.error);
        return;
      }
      value = check.value;
    }
    const res = await run(
      "backup",
      () => save({ data: { backup_name: name.trim() || "Owner (Cadangan)", backup_phone: value } }),
      "Nomor cadangan disimpan",
    );
    if (res?.ok) setEditing(false);
  }

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border border-dashed bg-card/60 p-5",
        engaged ? "border-warning" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Cadangan darurat</p>
          <h3 className="text-xl font-bold">{settings.backup_name}</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
            engaged ? "bg-warning text-warning-foreground animate-live" : "bg-secondary text-muted-foreground",
          )}
        >
          <LifeBuoy className="h-3 w-3" />
          {engaged ? "Sedang dipakai" : "Standby"}
        </span>
      </div>
      <p className="mt-4 font-data text-2xl font-semibold">{formatIndoPhone(settings.backup_phone)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Menerima 100% trafik hanya jika CS 1 dan CS 2 sama-sama nonaktif.
      </p>
      {!settings.backup_phone && (
        <p className="mt-2 text-xs text-warning">Belum diisi — jika kedua CS banned, pengunjung tidak bisa chat.</p>
      )}
      <div className="mt-4 rounded-lg bg-secondary px-2 py-2 text-center">
        <p className="font-data text-lg font-semibold">{clicks}</p>
        <p className="text-[11px] text-muted-foreground">total klik ke cadangan</p>
      </div>

      {editing ? (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-xl border border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="backup-name" className="text-xs">Nama</Label>
            <Input id="backup-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="backup-phone" className="text-xs">Nomor WhatsApp (kosongkan untuk menghapus)</Label>
            <PhoneInput
              id="backup-phone"
              value={phone}
              onChange={(v) => {
                setPhone(v);
                setError(null);
              }}
              error={error}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending === "backup"}>
              {pending === "backup" ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="mr-1 h-3.5 w-3.5" /> Batal
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit cadangan
          </Button>
        </div>
      )}
    </article>
  );
}
