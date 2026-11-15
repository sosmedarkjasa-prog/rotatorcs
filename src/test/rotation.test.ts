import { describe, expect, it } from "vitest";

import { nextTarget, trafficSplit } from "@/lib/rotation";

describe("rotator rules", () => {
  it("splits 50:50 when both CS are active", () => {
    expect(trafficSplit(true, true, true)).toEqual({ cs1: 50, cs2: 50, backup: 0 });
  });
  it("alternates between CS 1 and CS 2", () => {
    expect(nextTarget(1, true, true, true)).toBe("cs2");
    expect(nextTarget(2, true, true, true)).toBe("cs1");
  });
  it("sends 100% to CS 2 when CS 1 is banned", () => {
    expect(trafficSplit(false, true, true)).toEqual({ cs1: 0, cs2: 100, backup: 0 });
    expect(nextTarget(2, false, true, true)).toBe("cs2");
  });
  it("sends 100% to CS 1 when CS 2 is banned", () => {
    expect(nextTarget(1, true, false, true)).toBe("cs1");
  });
  it("uses the backup owner only when both CS are banned", () => {
    expect(nextTarget(1, false, false, true)).toBe("backup");
    expect(trafficSplit(false, false, true)).toEqual({ cs1: 0, cs2: 0, backup: 100 });
  });
  it("has no target when everything is down", () => {
    expect(nextTarget(1, false, false, false)).toBeNull();
  });
});
