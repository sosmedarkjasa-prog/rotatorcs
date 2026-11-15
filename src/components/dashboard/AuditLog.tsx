import { ArrowRight, Download } from "lucide-react";
import { useMemo, useState } from "react";

import { DateTime, TimeAgo } from "@/components/TimeAgo";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/lib/admin.functions";
import { formatIndoPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Log = DashboardData["logs"][number];

export const EVENT_META: Record<string, { label: string; className: string }> = {
  report_banned: { label: "Lapor Banned", className: "bg-destructive text-destructive-foreground" },
  undo: { label: "Batal Laporan", className: "bg-warning text-warning-foreground" },
  reuse_old: { label: "Pakai Nomor Lama", className: "bg-success text-success-foreground" },
  change_number: { label: "Ganti Nomor", className: "bg-info text-info-foreground" },
  admin_override: { label: "Override Admin", className: "bg-accent text-accent-foreground" },
  backup_update: { label: "Update Cadangan", className: "bg-accent text-accent-foreground" },
};

export function eventMeta(type: string) {
  return EVENT_META[type] ?? { label: type, className: "bg-secondary text-secondary-foreground" };
}

const FILTERS = ["Semua", "CS 1", "CS 2", "Backup Owner"] as const;

function statusLabel(s: string | null) {
  if (s === "active") return "Aktif";
  if (s === "banned") return "Banned";
  return "—";
}

function toCsv(rows: Log[]) {
  const header = [
    "Waktu",
    "CS",
    "Aksi",
    "Keterangan",
    "Nomor lama",
    "Nomor baru",
    "Status lama",
    "Status baru",
    "Rotasi sebelum",
    "Rotasi sesudah",
    "Oleh",
  ];
  const esc = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      new Date(r.created_at).toISOString(),
      r.agent_label,
      eventMeta(r.event_type).label,
      r.description,
      r.old_phone ? formatIndoPhone(r.old_phone) : "",
      r.new_phone ? formatIndoPhone(r.new_phone) : "",
      statusLabel(r.old_status),
      statusLabel(r.new_status),
      r.rotation_before,
      r.rotation_after,
      r.actor,
    ]
      .map(esc)
      .join(","),
  );
  return [header.map(esc).join(","), ...lines].join("\n");
}

export function AuditLog({ logs }: { logs: Log[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const rows = useMemo(
    () => (filter === "Semua" ? logs : logs.filter((l) => l.agent_label === filter || (filter !== "Backup Owner" && l.agent_label.endsWith(filter.slice(-1)) && l.agent_label.startsWith("CS")))),
    [logs, filter],
  );

  function download() {
    const blob = new Blob(["\ufeff" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riwayat-audit-rotator-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h3 className="text-lg font-bold">Riwayat audit</h3>
          <p className="text-xs text-muted-foreground">
            Setiap perubahan nomor & status: siapa, nomor lama → baru, kapan, dan dampaknya pada rotasi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
          <Button size="sm" variant="secondary" onClick={download} disabled={rows.length === 0}>
            <Download className="mr-1 h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Belum ada perubahan yang tercatat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">Waktu</th>
                <th className="px-4 py-2 font-medium">CS</th>
                <th className="px-4 py-2 font-medium">Aksi</th>
                <th className="px-4 py-2 font-medium">Nomor lama → baru</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Dampak rotasi</th>
                <th className="px-4 py-2 font-medium">Oleh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const meta = eventMeta(l.event_type);
                const phoneChanged = l.old_phone !== l.new_phone;
                const rotationChanged = l.rotation_before !== l.rotation_after;
                return (
                  <tr key={l.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="px-4 py-3 text-xs">
                      <div className="font-data"><DateTime date={l.created_at} /></div>
                      <div className="text-muted-foreground"><TimeAgo date={l.created_at} /></div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{l.agent_label}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", meta.className)}>{meta.label}</span>
                      <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{l.description}</p>
                    </td>
                    <td className="px-4 py-3 font-data text-xs">
                      {phoneChanged ? (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          <span className="text-muted-foreground line-through">{formatIndoPhone(l.old_phone)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-primary">{formatIndoPhone(l.new_phone)}</span>
                        </span>
                      ) : (
                        <span>{formatIndoPhone(l.new_phone)} <span className="text-muted-foreground">(tetap)</span></span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {l.old_status || l.new_status ? (
                        <span className="inline-flex items-center gap-1">
                          {statusLabel(l.old_status)} <ArrowRight className="h-3 w-3" /> {statusLabel(l.new_status)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-muted-foreground">{l.rotation_before ?? "—"}</div>
                      <div className={cn("flex items-center gap-1", rotationChanged ? "font-semibold text-warning" : "text-muted-foreground")}>
                        <ArrowRight className="h-3 w-3" /> {l.rotation_after ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{l.actor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
