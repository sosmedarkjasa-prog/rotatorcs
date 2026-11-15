// Indonesian WhatsApp number helpers. Stored format: digits only, starting with "62" (e.g. 6281234567890).

export type PhoneResult = { ok: true; value: string } | { ok: false; error: string };

export function normalizeIndoPhone(input: string): PhoneResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Nomor WhatsApp wajib diisi" };
  const cleaned = raw.replace(/[\s\-.()]/g, "");
  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return { ok: false, error: "Nomor hanya boleh berisi angka" };
  }
  let digits = cleaned.replace(/^\+/, "");
  if (digits.startsWith("62")) {
    // already international
  } else if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (digits.startsWith("8")) {
    digits = "62" + digits;
  } else {
    return { ok: false, error: "Gunakan nomor Indonesia (awali 08, 8, 62, atau +62)" };
  }
  if (!digits.startsWith("628")) {
    return { ok: false, error: "Nomor WhatsApp Indonesia harus diawali +62 8…" };
  }
  const local = digits.slice(2);
  if (local.length < 9) return { ok: false, error: "Nomor terlalu pendek" };
  if (local.length > 13) return { ok: false, error: "Nomor terlalu panjang" };
  return { ok: true, value: digits };
}

/** "6281234567890" -> "+62 812-3456-7890" */
export function formatIndoPhone(digits: string | null | undefined): string {
  if (!digits) return "—";
  if (!digits.startsWith("62")) return digits;
  const local = digits.slice(2);
  const parts = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean);
  return "+62 " + parts.join("-");
}

/** Live preview while typing; returns "" when the input cannot be formatted yet. */
export function previewIndoPhone(input: string): string {
  const cleaned = (input ?? "").replace(/[^0-9+]/g, "").replace(/^\+/, "");
  if (!cleaned) return "";
  let digits = cleaned;
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  if (!digits.startsWith("62")) return "";
  return formatIndoPhone(digits);
}
