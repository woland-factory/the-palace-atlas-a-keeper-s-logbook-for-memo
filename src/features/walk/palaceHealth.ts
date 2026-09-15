// Palace-level health, derived on demand from per-spot FSRS state. Everything
// here is pure and takes an explicit `now`, reuses spotHealth, and never
// fabricates a number for an unwalked spot: a palace with no walked spot has
// no due date and no score, only the honest "unwalked" band.
import type { Palace } from "../../model/atlas";
import { bandFor, spotHealth, type HealthLabel } from "./scheduler";

export interface PalaceHealth {
  overall: HealthLabel; // worst walked spot's band; "unwalked" if none walked
  worstRetrievability: number | null; // min among walked spots; null if none
  nextDue: string | null; // earliest due ISO among walked spots; null if none
  spotCount: number;
  walkedCount: number; // spots with retrievability !== null
  atRiskCount: number; // spots whose band is "atRisk"
}

export function palaceHealth(palace: Palace, now: Date): PalaceHealth {
  let worst: number | null = null;
  let nextDue: string | null = null;
  let walkedCount = 0;
  let atRiskCount = 0;
  for (const spot of palace.spots) {
    const health = spotHealth(spot.fsrs, now);
    if (health.label === "atRisk") atRiskCount += 1;
    if (health.retrievability === null) continue;
    walkedCount += 1;
    if (worst === null || health.retrievability < worst) {
      worst = health.retrievability;
    }
    // Dues are UTC ISO strings, so string order is date order.
    if (health.due && (nextDue === null || health.due < nextDue)) {
      nextDue = health.due;
    }
  }
  return {
    overall: walkedCount > 0 ? bandFor(worst) : "unwalked",
    worstRetrievability: worst,
    nextDue,
    spotCount: palace.spots.length,
    walkedCount,
    atRiskCount,
  };
}

// Palaces sorted most-at-risk first. Walked palaces order by ascending
// worstRetrievability (lower = worse), tiebreak by earliest nextDue, then
// name. Palaces with no walked spot sort after all walked ones, by name.
// Stable for full ties.
export function sortByRisk(palaces: Palace[], now: Date): Palace[] {
  const ranked = palaces.map((palace, index) => ({
    palace,
    index,
    health: palaceHealth(palace, now),
  }));
  ranked.sort((a, b) => {
    const aWalked = a.health.walkedCount > 0;
    const bWalked = b.health.walkedCount > 0;
    if (aWalked !== bWalked) return aWalked ? -1 : 1;
    if (aWalked && bWalked) {
      const byWorst =
        (a.health.worstRetrievability as number) -
        (b.health.worstRetrievability as number);
      if (byWorst !== 0) return byWorst;
      const aDue = a.health.nextDue ?? "";
      const bDue = b.health.nextDue ?? "";
      if (aDue !== bDue) return aDue < bDue ? -1 : 1;
    }
    const byName = a.palace.name.localeCompare(b.palace.name);
    if (byName !== 0) return byName;
    return a.index - b.index;
  });
  return ranked.map((r) => r.palace);
}

// The single most-at-risk palace, or null when no palace has been walked.
export function mostAtRisk(palaces: Palace[], now: Date): Palace | null {
  const first = sortByRisk(palaces, now).find(
    (p) => palaceHealth(p, now).walkedCount > 0,
  );
  return first ?? null;
}
