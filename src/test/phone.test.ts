import { describe, expect, it } from "vitest";

import { formatIndoPhone, normalizeIndoPhone } from "@/lib/phone";

describe("normalizeIndoPhone (auto-format +62)", () => {
  it("turns 08… into 628…", () => {
    expect(normalizeIndoPhone("0812-3456-7890")).toEqual({ ok: true, value: "6281234567890" });
  });
  it("accepts +62 with spaces", () => {
    expect(normalizeIndoPhone("+62 857 1111 2222")).toEqual({ ok: true, value: "6285711112222" });
  });
  it("prefixes 62 when typed after the +62 box (8…)", () => {
    expect(normalizeIndoPhone("8137777888")).toEqual({ ok: true, value: "628137777888" });
  });
  it("rejects non-Indonesian numbers", () => {
    expect(normalizeIndoPhone("12345").ok).toBe(false);
  });
  it("rejects numbers that are too short", () => {
    expect(normalizeIndoPhone("0812345").ok).toBe(false);
  });
  it("rejects letters", () => {
    expect(normalizeIndoPhone("0812abc4567").ok).toBe(false);
  });
});

describe("formatIndoPhone", () => {
  it("shows stored digits as +62 xxx-xxxx-xxxx", () => {
    expect(formatIndoPhone("6281234567890")).toBe("+62 812-3456-7890");
  });
});
