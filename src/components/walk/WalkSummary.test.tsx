import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WalkSummary } from "./WalkSummary";
import { WalkPlan } from "./WalkPlan";
import { buildDemoAtlas } from "../../features/sample/demoSeed";
import { spotHealth } from "../../features/walk/scheduler";
import type { WalkResult } from "../../features/walk/walkSession";

const NOW = new Date("2026-09-15T10:00:00.000Z");

// The demo palace carries real walk history spanning the bands, so it doubles
// as a fixture for the summary's glowing plan.
const PALACE = buildDemoAtlas(NOW).palaces[0];
const RESULTS: WalkResult[] = PALACE.spots.map((s) => ({
  spotId: s.id,
  grade: "sharp",
}));

describe("WalkSummary", () => {
  it("renders the plan colored by the just-updated health, with a legend", () => {
    const { container, getByLabelText } = render(
      <MemoryRouter>
        <WalkSummary palace={PALACE} results={RESULTS} now={NOW} />
      </MemoryRouter>,
    );

    const plan = container.querySelector("svg.walk-plan")!;
    expect(plan.getAttribute("class")).toContain("walk-plan--health");
    for (const spot of PALACE.spots) {
      const g = plan.querySelector(`[data-spot-id="${spot.id}"]`)!;
      expect(g.getAttribute("data-health")).toBe(spotHealth(spot.fsrs, NOW).label);
    }
    expect(getByLabelText("Health key")).toBeInTheDocument();
    // The per-spot text list still carries its band.
    expect(
      container.querySelectorAll(".walk-summary__spot-health[data-health]").length,
    ).toBe(PALACE.spots.length);
  });
});

describe("WalkPlan during a walk", () => {
  it("stays uncolored without showHealth, so the walk never biases recall", () => {
    const { container } = render(
      <WalkPlan palace={PALACE} activeSpotId={PALACE.spots[0].id} />,
    );
    const plan = container.querySelector("svg.walk-plan")!;
    expect(plan.getAttribute("class")).not.toContain("walk-plan--health");
    expect(plan.querySelectorAll("[data-health]")).toHaveLength(0);
    expect(plan.querySelectorAll(".health-ring")).toHaveLength(0);
    // The active-spot focus is unchanged.
    expect(plan.querySelector("[data-active='true']")).not.toBeNull();
  });
});
