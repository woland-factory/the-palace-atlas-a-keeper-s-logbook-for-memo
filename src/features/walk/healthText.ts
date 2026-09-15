// Display strings for a spot's health. The bands and their numeric thresholds
// live in scheduler.ts; this maps each band to the words the keeper reads. Color
// on the plan arrives in EPIC 4 and reuses the same bands.
import type { HealthLabel } from "./scheduler";

export const HEALTH_TEXT: Record<HealthLabel, string> = {
  unwalked: "Not walked yet",
  sharp: "Sharp",
  holding: "Holding",
  fading: "Fading",
  atRisk: "At risk",
};

// A short, localized due readout like `due Oct 2`.
export function formatDue(iso: string): string {
  const date = new Date(iso);
  return `due ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

// The palace card's schedule line, from palaceHealth's nextDue.
export function formatNextWalk(nextDue: string | null, now: Date): string {
  if (!nextDue) return HEALTH_TEXT.unwalked;
  const due = new Date(nextDue);
  if (due.getTime() <= now.getTime()) return "Walk due now";
  return `Next walk ${due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}
