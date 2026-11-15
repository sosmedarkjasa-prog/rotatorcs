import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCcw, RotateCcw, Siren, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { TimeAgo } from "@/components/TimeAgo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDoorbell } from "@/hooks/use-doorbell";
import { csAction, csChangeNumber, csGet, type CsPortalState } from "@/lib/cs.functions";
import { formatIndoPhone, normalizeIndoPhone, previewIndoPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const csQuery = (token: string) =>
  queryOptions({
    queryKey: ["cs", token],
    queryFn: () => csGet({ data: { token } }),
    refetchInterval: 30_000,
  });

export const Route = createFileRoute("/cs/$token")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(csQuery(params.token)),
  head: () => ({
    meta: [
      { title: "Portal Darurat CS — Rotator WA" },
      { name: "description", content: "Portal darurat CS: lapor nomor banned, pakai nomor lama, atau ganti nomor WhatsApp." },
      { property: "og:title", content: "Portal Darurat CS — Rotator WA" },
      { property: "og:description", content: "Lapor nomor banned dan aktifkan kembali nomor WhatsApp CS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: () => <InvalidLink message="Portal tidak bisa dimuat. Coba muat ulang halaman." />,
  component: CsPortal,
});

function InvalidLink({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
        <h1 className="mt-4 text-xl font-bold">Link portal tidak valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}

function CsPortal() {
  const { token } = Route.useParams();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(csQuery(token));
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["cs", token] });
  }, [queryClient, token]);
  useDoorbell(refresh);

  if (!data.ok) {
    return <InvalidLink message="Minta link terbaru ke admin." />;
  }
  return <Portal token={token} agent={data.agent} />;
}

function Portal({ token, agent }: { token: string; agent: CsPortalState }) {
  const queryClient = useQueryClient();
  const runAction = useServerFn(csAction);
  const runChange = useServerFn(csChangeNumber);
  const [busy, setBusy] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const banned = agent.status === "banned";
  const otherLabel = agent.slot === 1 ? "CS 2" : "CS 1";

  function apply(res: { ok: true; agent: CsPortalState } | { ok: false; error: string }, okMsg: string) {
    if (res.ok) {
      queryClient.setQueryData(["cs", token], res);
      toast.success(okMsg);
      return true;
    }
    toast.error(res.error);
    return false;
  }

  async function act(action: "report" | "undo" | "reuse") {
    setBusy(action);
    try {
      const res = await runAction({ data: { token, action } });
      const msg =
        action === "report"
          ? `Laporan terkirim. Trafik dialihkan dari ${agent.name}.`
          : action === "undo"
            ? "Laporan dibatalkan. Nomor aktif kembali."
            : "Nomor lama aktif kembali. Rotasi kembali normal.";
      if (action === "report" && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([200, 100, 200]);
      }
      apply(res, msg);
    } catch {
      toast.error("Gagal terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function changeNumber(e: React.FormEvent) {
    e.preventDefault();
    const check = normalizeIndoPhone(newPhone);
    if (!check.ok) {
      setPhoneError(check.error);
      return;
    }
    setPhoneError(null);
    setBusy("change");
    try {
      const res = await runChange({ data: { token, phone: check.value } });
      if (apply(res, `Nomor baru ${formatIndoPhone(check.value)} aktif. Rotasi kembali normal.`)) {
        setNewPhone("");
      } else if (!res.ok) {
        setPhoneError(res.error);
      }
    } catch {
      toast.error("Gagal terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  const preview = previewIndoPhone(newPhone);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Portal Darurat</p>
          <h1 className="text-2xl font-extrabold">{agent.name}</h1>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
            banned ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground",
          )}
        >
          {banned ? "Banned / Nonaktif" : "Aktif"}
        </span>
      </header>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Nomor WhatsApp kamu</p>
            <p className="font-data text-lg font-semibold">{formatIndoPhone(agent.phone)}</p>
          </div>
        </div>
        {agent.previous_phone && (
          <p className="mt-2 text-xs text-muted-foreground">
            Nomor sebelumnya: <span className="font-data">{formatIndoPhone(agent.previous_phone)}</span>
          </p>
        )}
        <div className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs">
          Rotasi saat ini: <span className="font-semibold text-primary">{agent.rotation}</span>
        </div>
      </section>

      {!banned ? (
        <section className="mt-8 flex flex-1 flex-col items-center">
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Nomor kena banned atau tidak bisa dipakai? Tekan tombol di bawah. Chat baru langsung dialihkan ke {otherLabel}.
          </p>
          <button
            type="button"
            onClick={() => act("report")}
            disabled={!!busy || !agent.phone}
            className="animate-alarm flex aspect-square w-64 max-w-full flex-col items-center justify-center rounded-full border-8 border-destructive/40 bg-destructive text-destructive-foreground shadow-2xl transition active:scale-95 disabled:opacity-60"
          >
            <Siren className="h-14 w-14" />
            <span className="mt-3 text-2xl font-extrabold tracking-wide">LAPOR BANNED</span>
            <span className="mt-1 text-xs opacity-80">{busy === "report" ? "Mengirim…" : "Alarm darurat"}</span>
          </button>
          {!agent.phone && (
            <p className="mt-4 text-center text-xs text-warning">Nomor kamu belum diisi admin.</p>
          )}
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          <div className="animate-alarm rounded-2xl border border-destructive bg-destructive/15 p-4">
            <div className="flex items-start gap-3">
              <Siren className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-bold">Nomor kamu sedang nonaktif</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chat baru dialihkan ({agent.rotation}).{" "}
                  {agent.banned_at && <TimeAgo date={agent.banned_at} prefix="Dilaporkan " />}
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="h-12 w-full"
            onClick={() => act("undo")}
            disabled={!!busy}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {busy === "undo" ? "Membatalkan…" : "Batalkan Laporan (salah pencet)"}
          </Button>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Banding berhasil?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktifkan lagi nomor {formatIndoPhone(agent.phone)}.
            </p>
            <Button className="mt-3 h-12 w-full" onClick={() => act("reuse")} disabled={!!busy || !agent.phone}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {busy === "reuse" ? "Mengaktifkan…" : "Pakai Nomor Lama Lagi"}
            </Button>
          </div>

          <form onSubmit={changeNumber} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Pakai nomor baru</p>
            <Label htmlFor="new-phone" className="mt-3 block text-xs text-muted-foreground">
              Nomor WhatsApp baru
            </Label>
            <div className="mt-1.5 flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
              <span className="flex items-center bg-secondary px-3 font-data text-sm">+62</span>
              <Input
                id="new-phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="812 3456 7890"
                value={newPhone}
                onChange={(e) => {
                  setNewPhone(e.target.value);
                  setPhoneError(null);
                }}
                className="h-12 rounded-none border-0 font-data text-base focus-visible:ring-0"
              />
            </div>
            <p className="mt-1.5 min-h-4 text-xs">
              {phoneError ? (
                <span className="text-destructive">{phoneError}</span>
              ) : preview ? (
                <span className="text-muted-foreground">
                  Akan disimpan sebagai <span className="font-data text-foreground">{preview}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Boleh ketik 08…, 8…, atau +62…</span>
              )}
            </p>
            <Button type="submit" className="mt-3 h-12 w-full" disabled={!!busy || !newPhone.trim()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {busy === "change" ? "Menyimpan…" : "Ganti Nomor"}
            </Button>
          </form>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Terakhir diperbarui <TimeAgo date={agent.updated_at} />
      </p>
    </main>
  );
}
