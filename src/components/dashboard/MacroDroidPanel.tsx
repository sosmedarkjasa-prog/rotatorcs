import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, KeyRound, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { regenerateWebhookSecret, simulateChat, type DashboardData } from "@/lib/admin.functions";
import { TARGET_LABEL, type Target } from "@/lib/rotation";

import { CopyButton } from "./CopyButton";
import { useRunAction } from "./use-run-action";

export function MacroDroidPanel({ data, origin }: { data: DashboardData; origin: string }) {
  const { run, pending } = useRunAction();
  const simulate = useServerFn(simulateChat);
  const regen = useServerFn(regenerateWebhookSecret);
  const [show, setShow] = useState(false);
  const latestRef = data.clicks[0]?.ref_code;
  const [sender, setSender] = useState("Budi (simulasi)");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const webhookUrl = origin ? `${origin}/api/public/macrodroid` : "/api/public/macrodroid";
  const secret = data.settings.webhook_secret;
  const body = `{"secret":"${show ? secret : "••••••••"}","sender":"[not_title]","message":"[notification]"}`;
  const bodyCopy = `{"secret":"${secret}","sender":"[not_title]","message":"[notification]"}`;
  const defaultMsg = `Halo kak mau promo ini ya [${latestRef ?? "REF-XXXXX"}]`;

  async function onSimulate(e: React.FormEvent) {
    e.preventDefault();
    const res = await run("sim", () => simulate({ data: { message: message || defaultMsg, sender } }));
    if (res && res.ok) {
      const r = res;
      setResult(
        !r.ref_code
          ? "Chat dicatat tanpa kode REF (tidak dihitung ke kampanye)."
          : !r.matched
            ? `Kode ${r.ref_code} tidak ditemukan di data klik.`
            : r.duplicate
              ? `Kode ${r.ref_code} sudah pernah tercatat — ditandai duplikat.`
              : `Cocok! ${r.ref_code} → ${TARGET_LABEL[r.routed_to as Target] ?? r.routed_to}. Chat masuk bertambah.`,
      );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h3 className="text-lg font-bold">Endpoint webhook MacroDroid</h3>
          <p className="text-xs text-muted-foreground">
            Pasang di HP CS agar setiap chat WhatsApp berisi kode REF tercatat otomatis.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">URL (metode POST)</Label>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="font-data text-xs" />
            <CopyButton value={webhookUrl} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Kunci rahasia</Label>
          <div className="flex gap-2">
            <Input readOnly value={show ? secret : "•".repeat(24)} className="font-data text-xs" />
            <Button type="button" size="sm" variant="secondary" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan" : "Tampilkan"}>
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <CopyButton value={secret} />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            disabled={!!pending}
            onClick={() => {
              if (window.confirm("Buat kunci baru? MacroDroid yang memakai kunci lama harus diperbarui.")) {
                void run("secret", () => regen(), "Kunci rahasia baru dibuat");
              }
            }}
          >
            <KeyRound className="h-3 w-3" /> Buat kunci baru
          </button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Body (JSON)</Label>
          <pre className="overflow-x-auto rounded-lg bg-secondary p-3 font-data text-[11px]">{body}</pre>
          <CopyButton value={bodyCopy} label="Salin body" />
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
          <li>Buka MacroDroid → Tambah Makro.</li>
          <li>
            Trigger: <b className="text-foreground">Notifikasi Diterima</b> → pilih aplikasi WhatsApp / WA Business, teks
            berisi <span className="font-data text-foreground">REF-</span>.
          </li>
          <li>
            Aksi: <b className="text-foreground">HTTP Request</b> → POST ke URL di atas, Content-Type{" "}
            <span className="font-data text-foreground">application/json</span>, isi body di atas.
          </li>
          <li>Simpan makro, lalu kirim pesan uji dari HP lain yang berisi kode REF.</li>
        </ol>
      </section>

      <form onSubmit={onSimulate} className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h3 className="text-lg font-bold">Simulator chat masuk</h3>
          <p className="text-xs text-muted-foreground">
            Uji pencatatan tanpa HP: kirim pesan seolah-olah dari MacroDroid.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sim-sender" className="text-xs">Nama pengirim</Label>
          <Input id="sim-sender" value={sender} maxLength={100} onChange={(e) => setSender(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sim-msg" className="text-xs">Isi pesan</Label>
          <Textarea id="sim-msg" rows={3} maxLength={2000} placeholder={defaultMsg} value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">
            Kosongkan untuk memakai kode REF dari klik terakhir{latestRef ? ` (${latestRef})` : ""}.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={pending === "sim"}>
          <Send className="mr-1 h-4 w-4" /> {pending === "sim" ? "Mengirim…" : "Kirim simulasi"}
        </Button>
        {result && <p className="rounded-lg bg-secondary p-3 text-sm">{result}</p>}
      </form>
    </div>
  );
}
