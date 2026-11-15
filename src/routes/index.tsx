import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock, Radio, ShieldAlert, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin, adminStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { authed } = await adminStatus();
    if (authed) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Masuk Admin — Rotator WA" },
      { name: "description", content: "Masuk ke ruang kendali rotator WhatsApp: failover CS, kampanye, dan statistik chat." },
      { property: "og:title", content: "Masuk Admin — Rotator WA" },
      { property: "og:description", content: "Ruang kendali rotator WhatsApp dengan failover otomatis dan tracking chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const login = useServerFn(adminLogin);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login({ data: { password } });
      if (res.ok) {
        await router.navigate({ to: "/admin" });
      } else {
        setError("Password salah. Coba lagi.");
      }
    } catch {
      setError("Gagal masuk. Coba lagi sebentar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
        <section>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success animate-live" /> Rotator WA · Ruang Kendali
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.05] md:text-5xl">
            Satu link promo.
            <br />
            <span className="text-primary">Nol chat yang hilang.</span>
          </h1>
          <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <Shuffle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Klik dibagi rata 50:50 ke CS 1 dan CS 2, otomatis pindah 100% saat satu nomor banned.
            </li>
            <li className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              CS lapor banned dari HP lewat portal darurat, ganti nomor, dan langsung aktif lagi.
            </li>
            <li className="flex gap-3">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              Kode REF unik di setiap chat, dicatat otomatis lewat MacroDroid.
            </li>
          </ul>
        </section>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Masuk Dashboard Admin</h2>
          <p className="mt-1 text-sm text-muted-foreground">Masukkan password admin untuk melanjutkan.</p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="password">Password admin</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="mt-6 w-full" disabled={loading || !password}>
            {loading ? "Memeriksa…" : "Masuk"}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Karyawan CS tidak perlu password — gunakan link portal darurat masing-masing.
          </p>
        </form>
      </div>
    </main>
  );
}
