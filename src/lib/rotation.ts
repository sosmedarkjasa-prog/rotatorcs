// Mirrors the database rotator rules (public.route_click / public.rotation_label) for display.

export type Target = "cs1" | "cs2" | "backup";

export function rotationLabel(cs1: boolean, cs2: boolean, backup: boolean): string {
  if (cs1 && cs2) return "CS 1 + CS 2 (50:50)";
  if (cs1) return "CS 1 (100%)";
  if (cs2) return "CS 2 (100%)";
  if (backup) return "Backup Owner (100%)";
  return "Tidak ada nomor aktif";
}

export function trafficSplit(cs1: boolean, cs2: boolean, backup: boolean): Record<Target, number> {
  if (cs1 && cs2) return { cs1: 50, cs2: 50, backup: 0 };
  if (cs1) return { cs1: 100, cs2: 0, backup: 0 };
  if (cs2) return { cs1: 0, cs2: 100, backup: 0 };
  if (backup) return { cs1: 0, cs2: 0, backup: 100 };
  return { cs1: 0, cs2: 0, backup: 0 };
}

/** Next target given the last CS slot served (round-robin when both are active). */
export function nextTarget(
  lastSlot: 1 | 2,
  cs1: boolean,
  cs2: boolean,
  backup: boolean,
): Target | null {
  if (cs1 && cs2) return lastSlot === 1 ? "cs2" : "cs1";
  if (cs1) return "cs1";
  if (cs2) return "cs2";
  return backup ? "backup" : null;
}

export const TARGET_LABEL: Record<Target, string> = {
  cs1: "CS 1",
  cs2: "CS 2",
  backup: "Backup",
};
