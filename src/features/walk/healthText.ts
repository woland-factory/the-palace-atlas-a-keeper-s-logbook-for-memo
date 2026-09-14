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
