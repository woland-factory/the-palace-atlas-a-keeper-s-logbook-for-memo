import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PalaceCard } from "./PalaceCard";
import { buildDemoAtlas } from "../features/sample/demoSeed";
import { palaceHealth } from "../features/walk/palaceHealth";
import { HEALTH_TEXT, formatNextWalk } from "../features/walk/healthText";
import { newPalace, newSpot, type Palace } from "../model/atlas";

const NOW = new Date("2026-09-15T10:00:00.000Z");

function renderCard(palace: Palace, walkNext = false) {
  return render(
    <MemoryRouter>
      <ul>
        <PalaceCard
          palace={palace}
          now={NOW}
          walkNext={walkNext}
          onRename={() => {}}
          onDelete={() => {}}
        />
      </ul>
    </MemoryRouter>,
  );
}

describe("PalaceCard health", () => {
  it("shows the overall band word and next-walk text from palaceHealth", () => {
    const palace = buildDemoAtlas(NOW).palaces[0];
    const health = palaceHealth(palace, NOW);
    const { container, getByText } = renderCard(palace);

    const chip = container.querySelector(".palace-card__health")!;
    expect(chip.getAttribute("data-health")).toBe(health.overall);
    expect(chip.textContent).toContain(HEALTH_TEXT[health.overall]);
    expect(chip.textContent).toContain(formatNextWalk(health.nextDue, NOW));
    // The demo palace is honestly labeled.
    expect(getByText("Sample")).toBeInTheDocument();
  });

  it("shows the unwalked words with no date for spots that were never walked", () => {
    const palace = newPalace("Quiet");
    palace.spots = [newSpot(100, 100, 0)];
    const { container } = renderCard(palace);
    const chip = container.querySelector(".palace-card__health")!;
    expect(chip.getAttribute("data-health")).toBe("unwalked");
    expect(chip.textContent).toBe("Not walked yet");
  });

  it("shows no health line for a palace with nothing drawn", () => {
    const { container } = renderCard(newPalace("Empty"));
    expect(container.querySelector(".palace-card__health")).toBeNull();
  });

  it("carries the Walk next flag and primary walk action when it leads", () => {
    const palace = buildDemoAtlas(NOW).palaces[0];
    const { getByText, getByRole } = renderCard(palace, true);
    expect(getByText("Walk next")).toBeInTheDocument();
    expect(getByRole("link", { name: "Walk this palace" })).toHaveAttribute(
      "href",
      `/palace/${palace.id}/walk`,
    );
  });
});
