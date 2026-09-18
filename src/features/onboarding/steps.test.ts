import { describe, expect, it } from "vitest";
import { deriveWalkthroughState, WALKTHROUGH_STEPS } from "./steps";
import { newAtlas, newPalace, newSpot, type Atlas, type Palace } from "../../model/atlas";
import { getSampleAtlas } from "../sample/sample";

function atlasOf(...palaces: Palace[]): Atlas {
  return { ...newAtlas(), palaces };
}

function ownPalace(mut?: (p: Palace) => void): Palace {
  const p = newPalace("Childhood home");
  mut?.(p);
  return p;
}

describe("deriveWalkthroughState", () => {
  it("empty atlas: step 1 not done, active index 0, nothing complete", () => {
    const state = deriveWalkthroughState(newAtlas(), "/");
    expect(state.steps).toHaveLength(4);
    expect(state.steps.map((s) => s.done)).toEqual([false, false, false, false]);
    expect(state.activeIndex).toBe(0);
    expect(state.complete).toBe(false);
  });

  it("a non-sample palace ticks step 1 and makes step 2 active", () => {
    const state = deriveWalkthroughState(atlasOf(ownPalace()), "/");
    expect(state.steps[0].done).toBe(true);
    expect(state.steps[1].done).toBe(false);
    expect(state.activeIndex).toBe(1);
  });

  it("a sample palace alone does not satisfy step 1", () => {
    const state = deriveWalkthroughState(getSampleAtlas(), "/");
    expect(state.steps[0].done).toBe(false);
    expect(state.activeIndex).toBe(0);
  });

  it("step 2 needs a spot with a non-empty trimmed label", () => {
    const blank = ownPalace((p) => {
      p.spots = [newSpot(10, 10, 0)];
    });
    expect(deriveWalkthroughState(atlasOf(blank), "/").steps[1].done).toBe(false);

    const whitespace = ownPalace((p) => {
      p.spots = [{ ...newSpot(10, 10, 0), label: "   " }];
    });
    expect(deriveWalkthroughState(atlasOf(whitespace), "/").steps[1].done).toBe(
      false,
    );

    const named = ownPalace((p) => {
      p.spots = [{ ...newSpot(10, 10, 0), label: "Front door" }];
    });
    expect(deriveWalkthroughState(atlasOf(named), "/").steps[1].done).toBe(true);
  });

  it("step 3 needs at least one walk", () => {
    const named = ownPalace((p) => {
      p.spots = [{ ...newSpot(10, 10, 0), label: "Front door" }];
    });
    expect(deriveWalkthroughState(atlasOf(named), "/").steps[2].done).toBe(false);

    const walked = ownPalace((p) => {
      p.spots = [{ ...newSpot(10, 10, 0), label: "Front door" }];
      p.walks = [
        {
          id: "w1",
          palaceId: p.id,
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: "2026-01-01T00:05:00.000Z",
          results: [{ spotId: p.spots[0].id, grade: "sharp" }],
        },
      ];
    });
    expect(deriveWalkthroughState(atlasOf(walked), "/").steps[2].done).toBe(true);
  });

  it("step 4 ticks only when walked AND on the guided palace's plan or walk", () => {
    const walked = ownPalace((p) => {
      p.spots = [{ ...newSpot(10, 10, 0), label: "Front door" }];
      p.walks = [
        {
          id: "w1",
          palaceId: p.id,
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: "2026-01-01T00:05:00.000Z",
          results: [{ spotId: p.spots[0].id, grade: "sharp" }],
        },
      ];
    });
    const atlas = atlasOf(walked);

    // On the overview: step 3 done, step 4 not yet.
    expect(deriveWalkthroughState(atlas, "/").steps[3].done).toBe(false);
    // On the guided palace plan: step 4 ticks and the run is complete.
    const onPlan = deriveWalkthroughState(atlas, `/palace/${walked.id}`);
    expect(onPlan.steps[3].done).toBe(true);
    expect(onPlan.complete).toBe(true);
    expect(onPlan.activeIndex).toBe(4);
    // On the guided palace walk summary: step 4 also ticks.
    expect(
      deriveWalkthroughState(atlas, `/palace/${walked.id}/walk`).steps[3].done,
    ).toBe(true);
    // On another palace's route: step 4 stays false.
    expect(
      deriveWalkthroughState(atlas, `/palace/some-other/walk`).steps[3].done,
    ).toBe(false);
  });

  it("step 4 stays false without a walk even while on the plan", () => {
    const named = ownPalace((p) => {
      p.spots = [{ ...newSpot(10, 10, 0), label: "Front door" }];
    });
    const state = deriveWalkthroughState(atlasOf(named), `/palace/${named.id}`);
    expect(state.steps[3].done).toBe(false);
    expect(state.complete).toBe(false);
  });

  it("uses the first non-sample palace as the guided one on a mixed atlas", () => {
    const sample = getSampleAtlas().palaces[0];
    const own = ownPalace((p) => {
      p.spots = [{ ...newSpot(10, 10, 0), label: "Front door" }];
      p.walks = [
        {
          id: "w1",
          palaceId: p.id,
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: "2026-01-01T00:05:00.000Z",
          results: [{ spotId: p.spots[0].id, grade: "sharp" }],
        },
      ];
    });
    const atlas = atlasOf(sample, own);
    // Step 4 ticks on the OWN palace route, not the sample's.
    expect(deriveWalkthroughState(atlas, `/palace/${own.id}`).complete).toBe(true);
    expect(deriveWalkthroughState(atlas, `/palace/${sample.id}`).steps[3].done).toBe(
      false,
    );
  });
});

describe("walkthrough copy sweep", () => {
  const strings = [...WALKTHROUGH_STEPS, "Skip"];
  const banned = [
    "seamless",
    "effortless",
    "unlock",
    "elevate",
    "empower",
    "leverage",
    "robust",
    "dive in",
  ];
  const negative = [
    "you don't have",
    "no palace yet",
    "nothing here",
    "unable to",
    "something went wrong",
  ];

  it("has no em-dash or en-dash", () => {
    for (const s of strings) {
      expect(s.includes("—")).toBe(false);
      expect(s.includes("–")).toBe(false);
    }
  });

  it("has none of the banned LLM vocabulary and no negative phrasing", () => {
    for (const s of strings) {
      const lower = s.toLowerCase();
      for (const word of banned) expect(lower).not.toContain(word);
      for (const phrase of negative) expect(lower).not.toContain(phrase);
    }
  });

  it("is four short imperative steps", () => {
    expect(WALKTHROUGH_STEPS).toHaveLength(4);
    for (const s of WALKTHROUGH_STEPS) {
      // One sentence: a single terminal period, no clause-stacking semicolons.
      expect(s.split(".").filter(Boolean)).toHaveLength(1);
      expect(s).not.toContain(";");
    }
  });
});
