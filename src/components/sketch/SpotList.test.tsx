import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SpotList } from "./SpotList";
import { newSpot, type Spot } from "../../model/atlas";
import { gradeSpot } from "../../features/walk/scheduler";

const NOW = new Date("2026-09-14T00:00:00.000Z");

function labelled(label: string): Spot {
  return { ...newSpot(0, 0, 0), label };
}

describe("SpotList health readout", () => {
  it("reads 'Not walked yet' for every spot before any walk", () => {
    render(
      <SpotList
        spots={[labelled("Front door"), labelled("Table")]}
        selectedSpotId={null}
        onSelect={() => {}}
        now={NOW}
      />,
    );
    expect(screen.getAllByText("Not walked yet")).toHaveLength(2);
  });

  it("reads the new health band and a due date after a walk", () => {
    const walked: Spot = {
      ...labelled("Front door"),
      fsrs: gradeSpot(newSpot(0, 0, 0).fsrs, "sharp", NOW),
    };
    render(
      <SpotList
        spots={[walked]}
        selectedSpotId={null}
        onSelect={() => {}}
        now={NOW}
      />,
    );
    const nav = screen.getByRole("navigation");
    const health = within(nav).getByText(/^Sharp/);
    expect(health.textContent).toMatch(/^Sharp · due /);
    expect(screen.queryByText("Not walked yet")).toBeNull();
  });
});
