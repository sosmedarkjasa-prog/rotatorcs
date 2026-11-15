import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, FlaskConical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createCampaign,
  deleteCampaign,
  simulateClick,
  updateCampaign,
  type DashboardData,
} from "@/lib/admin.functions";
import { formatIndoPhone } from "@/lib/phone";
import { TARGET_LABEL, type Target } from "@/lib/rotation";

import { CopyButton } from "./CopyButton";
import { useRunAction } from "./use-run-action";

const DEFAULT_TEMPLATE = "Halo kak mau promo ini ya [{ref}]";

function toSlug(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function CampaignsPanel({ data, origin }: { data: DashboardData; origin: string }) {
  const { run, pending } = useRunAction();
  const create = useServerFn(createCampaign);
  const update = useServerFn(updateCampaign);
  const remove = useServerFn(deleteCampaign);
  const testClick = useServerFn(simulateClick);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [lastTest, setLastTest] = useState<{ campaign: string; text: string; phone: string; routed: string } | null>(null);

  const statsById = useMemo(() => {
    const map = new Map<string, { clicks: number; chats: number }>();
    for (const s of data.campaignStats) map.set(s.campaign_id, { clicks: Number(s.clicks), chats: Number(s.chats) });
    return map;
  }, [data.campaignStats]);

  const effectiveSlug = slugTouched ? toSlug(slug) : toSlug(name);
  const previewMsg = (template.includes("{ref}") ? template : `${template} [{ref}]`).replace("{ref}", "REF-7K3QX");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(
      "create",
      () => create({ data: { name: name.trim(), slug: effectiveSlug, message_template: template.trim() } }),
      (r) => `Kampanye dibuat: /go/${(r as { slug?: string }).slug ?? effectiveSlug}`,
    );
    if (res?.ok) {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setTemplate(DEFAULT_TEMPLATE);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <form onSubmit={onCreate} className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h3 className="text-lg font-bold">Generator link kampanye</h3>
          <p className="text-xs text-muted-foreground">
            Setiap klik mendapat kode REF unik yang disisipkan ke pesan WhatsApp.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Nama kampanye</Label>
          <Input id="c-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Promo Flash Sale 11.11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-slug">Alamat link</Label>
          <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
            <span className="flex items-center bg-secondary px-2.5 font-data text-xs text-muted-foreground">/go/</span>
            <Input
              id="c-slug"
              value={slugTouched ? slug : effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="flash-sale"
              className="rounded-none border-0 font-data focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-template">Template pesan</Label>
          <Textarea id="c-template" rows={3} maxLength={500} value={template} onChange={(e) => setTemplate(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">
            Tulis <code className="font-data text-foreground">{"{ref}"}</code> di tempat kode referensi. Jika tidak ada,
            kode ditambahkan di akhir pesan.
          </p>
        </div>
        <div className="rounded-lg bg-secondary p-3 text-xs">
          <p className="mb-1 text-muted-foreground">Contoh pesan pembeli:</p>
          <p className="font-data">{previewMsg}</p>
        </div>
        <Button type="submit" className="w-full" disabled={pending === "create" || !name.trim() || effectiveSlug.length < 2}>
          <Plus className="mr-1 h-4 w-4" /> {pending === "create" ? "Membuat…" : "Buat link kampanye"}
        </Button>
      </form>

      <div className="space-y-3">
        {lastTest && (
          <div className="rounded-xl border border-info/50 bg-info/10 p-3 text-sm">
            <p className="font-semibold">
              Tes klik "{lastTest.campaign}" → {TARGET_LABEL[lastTest.routed as Target] ?? lastTest.routed}{" "}
              <span className="font-data">{formatIndoPhone(lastTest.phone)}</span>
            </p>
            <p className="mt-1 font-data text-xs text-muted-foreground">{lastTest.text}</p>
          </div>
        )}
        {data.campaigns.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Belum ada kampanye. Buat link pertama di sebelah kiri.
          </div>
        )}
        {data.campaigns.map((c) => {
          const st = statsById.get(c.id) ?? { clicks: 0, chats: 0 };
          const cr = st.clicks ? ((st.chats / st.clicks) * 100).toFixed(1) : "0.0";
          const link = origin ? `${origin}/go/${c.slug}` : `/go/${c.slug}`;
          return (
            <article key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold">{c.name}</h4>
                  <p className="truncate font-data text-xs text-primary">{link}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {c.is_active ? "Aktif" : "Nonaktif"}
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) =>
                      run("toggle", () => update({ data: { id: c.id, is_active: v } }), v ? "Kampanye diaktifkan" : "Kampanye dinonaktifkan")
                    }
                  />
                </label>
              </div>
              <p className="mt-2 font-data text-xs text-muted-foreground">{c.message_template}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Klik" value={st.clicks} />
                <Stat label="Chat masuk" value={st.chats} />
                <Stat label="Conversion" value={`${cr}%`} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={link} label="Salin link" />
                <Button size="sm" variant="secondary" asChild>
                  <a href={link} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Buka
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!!pending || !c.is_active}
                  onClick={async () => {
                    const res = await run("test", () => testClick({ data: { slug: c.slug } }));
                    if (res && res.ok) {
                      setLastTest({ campaign: c.name, text: res.message, phone: res.phone, routed: res.routed_to });
                      toast.success(`Klik tercatat → ${TARGET_LABEL[res.routed_to as Target] ?? res.routed_to}`);
                    }
                  }}
                >
                  <FlaskConical className="mr-1 h-3.5 w-3.5" /> Tes klik
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={!!pending}
                  onClick={() => {
                    if (window.confirm(`Hapus kampanye "${c.name}" beserta data kliknya?`)) {
                      void run("delete", () => remove({ data: { id: c.id } }), "Kampanye dihapus");
                    }
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-secondary px-2 py-2">
      <p className="font-data text-base font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
