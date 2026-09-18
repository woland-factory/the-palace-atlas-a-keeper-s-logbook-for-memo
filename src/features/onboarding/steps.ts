import type { Atlas } from "../../model/atlas";
import { isSamplePalace } from "../sample/sample";

// Four steps, in loop order. Each is one short imperative sentence anchored to a
// real control on the screen it names. Copy is final and swept.
export const WALKTHROUGH_STEPS = [
  "Add your first palace.",
  "Place a spot and name what lives there.",
  "Walk it and grade each spot.",
  "See where memory is fading.",
] as const;

export interface WalkthroughState {
  steps: { text: string; done: boolean }[]; // length 4, in order
  activeIndex: number; // first not-done step, or steps.length when all done
  complete: boolean; // every step done (first success reached)
}

// Derives which steps are done from the atlas and the current path. Pure: no
// query, no network, no clock. The "guided palace" is the keeper's first
// non-sample palace; a brand-new keeper has exactly one during the walkthrough.
export function deriveWalkthroughState(
  atlas: Atlas,
  pathname: string,
): WalkthroughState {
  const guided = atlas.palaces.find((p) => !isSamplePalace(p.id)) ?? null;

  const step1 = guided !== null;
  const step2 =
    guided !== null &&
    guided.spots.some((s) => (s.label ?? "").trim().length > 0);
  const step3 = guided !== null && guided.walks.length >= 1;
  const onGuidedPlanOrWalk =
    guided !== null &&
    (pathname === `/palace/${guided.id}` ||
      pathname === `/palace/${guided.id}/walk`);
  const step4 = step3 && onGuidedPlanOrWalk;

  const done = [step1, step2, step3, step4];
  const steps = WALKTHROUGH_STEPS.map((text, i) => ({ text, done: done[i] }));
  const firstNotDone = done.findIndex((d) => !d);

  return {
    steps,
    activeIndex: firstNotDone === -1 ? steps.length : firstNotDone,
    complete: done.every(Boolean),
  };
}
