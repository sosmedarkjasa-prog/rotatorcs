import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { Activity, LogOut, MessageCircle, MousePointerClick, Percent, Shuffle } from "lucide-react";

import { AgentCard } from "@/components/dashboard/AgentCard";
import { AuditLog, eventMeta } from "@/components/dashboard/AuditLog";
import { BackupCard } from "@/components/dashboard/BackupCard";
import { CampaignsPanel } from "@/components/dashboard/CampaignsPanel";
import { FeedPanel } from "@/components/dashboard/FeedPanel";
import { MacroDroidPanel } from "@/components/dashboard/MacroDroidPanel";
import { TimeAgo } from "@/components/TimeAgo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoorbell } from "@/hooks/use-doorbell";
import { useOrigin } from "@/hooks/use-origin";
import { adminLogout, adminStatus, getDashboard, type DashboardData } from "@/lib/admin.functions";
import { nextTarget, rotationLabel, TARGET_LABEL, trafficSplit } from "@/lib/rotation";
import { cn } from "@/lib/utils";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboard(),
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { authed } = await adminStatus();
    if (!authed) throw redirect({ to: "/" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({
    meta: [
      { title: "Dashboard Admin — Rotator WA" },
      { name: "description", content: "Kendali rotator WhatsApp: status CS, failover, kampanye, chat masuk, dan riwayat audit." },
      { property: "og:title", content: "Dashboard Admin — Rotator WA" },
      { property: "og:description", content: "Kendali rotator WhatsApp: status CS, failover, kampanye, dan riwayat audit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboard,
});

function isUp(a: { status: string; phone: string } | undefined) {
  return !!a && a.status === "active" && a.phone !== "";
}

function AdminDashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useServerFn(adminLogout);
  const origin = useOrigin();

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);
  const live = useDoorbell(refresh);

  const cs1 = data.agents.find((a) => a.slot === 1);
  const cs2 = data.agents.find((a) => a.slot === 2);
  const up1 = isUp(cs1);
  const up2 = isUp(cs2);
  const upB = data.settings.backup_phone !== "";
  const split = trafficSplit(up1, up2, upB);
  const next = nextTarget(data.settings.last_slot === 1 ? 1 : 2, up1, up2, upB);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shuffle className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-tight">Rotator WA</h1>
              <p className="text-[11px] text-muted-foreground">Ruang kendali admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
              <span className={cn("h-2 w-2 rounded-full", live ? "bg-success animate-live" : "bg-muted-foreground")} />
              {live ? "Realtime aktif" : "Menyambung…"}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await logout();
                queryClient.clear();
                await navigate({ to: "/" });
              }}
            >
              <LogOut className="mr-1 h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <StatsRow data={data} />

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold">Rotator otomatis</h2>
              <p className="text-sm text-muted-foreground">
                Mode sekarang: <span className="font-semibold text-primary">{rotationLabel(up1, up2, upB)}</span>
                {next && (
                  <>
                    {" "}· klik berikutnya ke <span className="font-semibold text-foreground">{TARGET_LABEL[next]}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <SplitBar split={split} />
          {!up1 && !up2 && (
            <div className={cn("rounded-xl border p-3 text-sm", upB ? "border-warning bg-warning/10" : "animate-alarm border-destructive bg-destructive/15")}>
              {upB
                ? "Kedua CS nonaktif — semua klik dialihkan ke nomor cadangan darurat."
                : "Kedua CS nonaktif dan nomor cadangan kosong — pengunjung tidak bisa chat! Isi nomor cadangan sekarang."}
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_minmax(0,320px)]">
            {cs1 && <AgentCard key={cs1.id} agent={cs1} clicks={data.stats.clicks_cs1} share={split.cs1} origin={origin} />}
            {cs2 && <AgentCard key={cs2.id} agent={cs2} clicks={data.stats.clicks_cs2} share={split.cs2} origin={origin} />}
            <BackupCard settings={data.settings} clicks={data.stats.clicks_backup} engaged={!up1 && !up2 && upB} />
            <LiveLog logs={data.logs.slice(0, 8)} />
          </div>
        </section>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="campaigns">Kampanye</TabsTrigger>
            <TabsTrigger value="audit">Riwayat audit</TabsTrigger>
            <TabsTrigger value="feed">Klik & chat</TabsTrigger>
            <TabsTrigger value="macrodroid">MacroDroid & simulator</TabsTrigger>
          </TabsList>
          <TabsContent value="campaigns">
            <CampaignsPanel data={data} origin={origin} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditLog logs={data.logs} />
          </TabsContent>
          <TabsContent value="feed">
            <FeedPanel data={data} />
          </TabsContent>
          <TabsContent value="macrodroid">
            <MacroDroidPanel data={data} origin={origin} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatsRow({ data }: { data: DashboardData }) {
  const { stats } = data;
  const cr = stats.total_clicks ? (stats.matched_chats / stats.total_clicks) * 100 : 0;
  const items = [
    { label: "Total klik", value: stats.total_clicks, sub: `${stats.clicks_today} hari ini`, icon: MousePointerClick, tone: "text-primary" },
    { label: "Chat masuk", value: stats.total_chats, sub: `${stats.chats_today} hari ini · ${stats.unmatched_chats} tanpa REF cocok`, icon: MessageCircle, tone: "text-info" },
    { label: "Conversion rate", value: `${cr.toFixed(1)}%`, sub: `${stats.matched_chats} klik jadi chat`, icon: Percent, tone: "text-warning" },
    { label: "Pembagian klik", value: `${stats.clicks_cs1} / ${stats.clicks_cs2}`, sub: `CS 1 / CS 2 · ${stats.clicks_backup} ke cadangan`, icon: Shuffle, tone: "text-primary" },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{it.label}</p>
            <it.icon className={cn("h-4 w-4", it.tone)} />
          </div>
          <p className="mt-2 font-data text-3xl font-semibold">{it.value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{it.sub}</p>
        </div>
      ))}
    </section>
  );
}

function SplitBar({ split }: { split: { cs1: number; cs2: number; backup: number } }) {
  const total = split.cs1 + split.cs2 + split.backup;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {total === 0 ? (
        <div className="bg-destructive/20 py-3 text-center text-sm font-semibold text-destructive">Tidak ada nomor aktif</div>
      ) : (
        <div className="flex h-12 text-xs font-bold">
          {split.cs1 > 0 && (
            <div className="flex items-center justify-center bg-primary text-primary-foreground transition-all duration-700" style={{ width: `${split.cs1}%` }}>
              CS 1 · {split.cs1}%
            </div>
          )}
          {split.cs2 > 0 && (
            <div className="flex items-center justify-center bg-info text-info-foreground transition-all duration-700" style={{ width: `${split.cs2}%` }}>
              CS 2 · {split.cs2}%
            </div>
          )}
          {split.backup > 0 && (
            <div className="flex items-center justify-center bg-warning text-warning-foreground transition-all duration-700" style={{ width: `${split.backup}%` }}>
              Cadangan · {split.backup}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LiveLog({ logs }: { logs: DashboardData["logs"] }) {
  return (
    <aside className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-bold">Log aktivitas</h3>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
      ) : (
        <ol className="space-y-3">
          {logs.map((l) => {
            const meta = eventMeta(l.event_type);
            return (
              <li key={l.id} className="border-l-2 border-border pl-3">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", meta.className)}>{meta.label}</span>
                <p className="mt-1 text-xs">{l.description}</p>
                <p className="text-[11px] text-muted-foreground">
                  → {l.rotation_after} · <TimeAgo date={l.created_at} />
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
