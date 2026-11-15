import { MessageCircle, MousePointerClick } from "lucide-react";

import { TimeAgo } from "@/components/TimeAgo";
import type { DashboardData } from "@/lib/admin.functions";
import { formatIndoPhone } from "@/lib/phone";
import { TARGET_LABEL, type Target } from "@/lib/rotation";
import { cn } from "@/lib/utils";

export function FeedPanel({ data }: { data: DashboardData }) {
  const campaignName = new Map(data.campaigns.map((c) => [c.id, c.name]));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border p-4">
          <MousePointerClick className="h-4 w-4 text-primary" />
          <h3 className="font-bold">Klik terbaru</h3>
        </header>
        {data.clicks.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Belum ada klik.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.clicks.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-data font-semibold">{k.ref_code}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {(k.campaign_id && campaignName.get(k.campaign_id)) || "—"} · <TimeAgo date={k.created_at} />
                  </p>
                </div>
                <div className="text-right">
                  <RoutedBadge routed={k.routed_to} />
                  <p className="mt-0.5 font-data text-[11px] text-muted-foreground">{formatIndoPhone(k.phone)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border p-4">
          <MessageCircle className="h-4 w-4 text-info" />
          <h3 className="font-bold">Chat masuk terbaru</h3>
        </header>
        {data.chats.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Belum ada chat tercatat.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.chats.map((c) => (
              <li key={c.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{c.sender || "Tanpa nama"}</p>
                  <div className="flex items-center gap-1.5">
                    {c.is_duplicate && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">duplikat</span>
                    )}
                    {c.ref_code ? (
                      c.click_id ? (
                        <RoutedBadge routed={c.routed_to ?? ""} />
                      ) : (
                        <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">REF tidak dikenal</span>
                      )
                    ) : (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">tanpa REF</span>
                    )}
                  </div>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.message}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  <span className="font-data">{c.ref_code ?? "—"}</span> · {c.source} · <TimeAgo date={c.created_at} />
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function RoutedBadge({ routed }: { routed: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold",
        routed === "cs1" && "bg-primary text-primary-foreground",
        routed === "cs2" && "bg-info text-info-foreground",
        routed === "backup" && "bg-warning text-warning-foreground",
      )}
    >
      {TARGET_LABEL[routed as Target] ?? routed}
    </span>
  );
}
