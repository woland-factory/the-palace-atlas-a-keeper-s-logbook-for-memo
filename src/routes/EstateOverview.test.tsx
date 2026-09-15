import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EstateOverview } from "./EstateOverview";
import { renderWithProviders } from "../../test/renderWithProviders";
import { resetDbForTests } from "../persistence/db";
import { saveAtlas } from "../persistence/atlasStore";
import { assembleCompletedWalk } from "../features/walk/walkSession";
import { newAtlas, newPalace, newSpot, type Palace } from "../model/atlas";

const DAY = 24 * 60 * 60 * 1000;

function drawnPalace(name: string, spotCount = 2): Palace {
  const p = newPalace(name);
  p.spots = Array.from({ length: spotCount }, (_, i) => newSpot(i * 50, i * 50, i));
  return p;
}

function walkAll(palace: Palace, grade: "missed" | "shaky" | "sharp", daysAgo: number): Palace {
  const at = new Date(Date.now() - daysAgo * DAY);
  return assembleCompletedWalk(
    palace,
    palace.spots.map((s) => ({ spotId: s.id, grade })),
    at,
    at,
    `walk-${palace.name}-${daysAgo}`,
  );
}

beforeEach(async () => {
  await resetDbForTests();
});

describe("EstateOverview", () => {
  it("holds a skeleton while loading, then shows content (never a blank node)", async () => {
    const { container } = renderWithProviders(<EstateOverview />);
    // The main region is busy and a skeleton holds the layout immediately.
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".skeleton-card")).not.toBeNull();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Start your atlas" })).toBeInTheDocument(),
    );
    expect(main).toHaveAttribute("aria-busy", "false");
  });

  it("empty state names the screen with one primary action plus load sample", async () => {
    renderWithProviders(<EstateOverview />);
    await screen.findByRole("heading", { name: "Start your atlas" });
    expect(
      screen.getByText(
        "Draw the buildings you memorize in and keep them safe outside your head.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add your first palace" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load the sample" })).toBeInTheDocument();
  });

  it("adding a palace moves the screen from empty to populated, with no health band for zero spots", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<EstateOverview />);
    await user.click(await screen.findByRole("button", { name: "Add your first palace" }));

    // Card now present with a thumbnail slot; a palace with nothing drawn
    // reports no health band at all.
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument(),
    );
    expect(container.querySelector(".palace-card__health")).toBeNull();
    expect(container.querySelector(".palace-card__thumb")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("loading the sample fills the overview with real content", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EstateOverview />);
    await user.click(await screen.findByRole("button", { name: "Load the sample" }));
    await waitFor(() =>
      expect(screen.getByText("Childhood home (sample)")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Sample").length).toBeGreaterThan(0);
  });

  it("shows each walked palace's band and next-walk date, and glows the thumbnail", async () => {
    const strong = walkAll(drawnPalace("Strong palace"), "sharp", 0);
    await saveAtlas({ ...newAtlas(), palaces: [strong] });
    const { container } = renderWithProviders(<EstateOverview />);

    await screen.findByText("Strong palace");
    // Walked moments ago with Sharp grades: the band is Sharp and a next-walk
    // date is scheduled ahead.
    const chip = container.querySelector(".palace-card__health")!;
    expect(chip).not.toBeNull();
    expect(chip.getAttribute("data-health")).toBe("sharp");
    expect(chip.textContent).toContain("Sharp");
    expect(chip.textContent).toContain("Next walk");
    // The mini plan carries per-spot bands.
    expect(
      container.querySelectorAll('.palace-card__thumb [data-health="sharp"]').length,
    ).toBeGreaterThan(0);
  });

  it("orders the most-at-risk palace first and flags it with Walk next and a walk action", async () => {
    const strong = walkAll(drawnPalace("Strong palace"), "sharp", 0);
    const weak = walkAll(drawnPalace("Weak palace"), "missed", 30);
    await saveAtlas({ ...newAtlas(), palaces: [strong, weak] });
    renderWithProviders(<EstateOverview />);

    await screen.findByText("Weak palace");
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).getByText("Weak palace")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Walk next")).toBeInTheDocument();
    const walkLink = within(cards[0]).getByRole("link", { name: "Walk this palace" });
    expect(walkLink).toHaveAttribute("href", `/palace/${weak.id}/walk`);
    // Only the top at-risk card carries the flag.
    expect(screen.getAllByText("Walk next")).toHaveLength(1);
    // A month after missing everything, the walk is overdue.
    expect(within(cards[0]).getByText(/Walk due now/)).toBeInTheDocument();
  });

  it("shows no Walk next flag when no palace has been walked", async () => {
    await saveAtlas({ ...newAtlas(), palaces: [drawnPalace("Quiet palace")] });
    renderWithProviders(<EstateOverview />);
    await screen.findByText("Quiet palace");
    expect(screen.queryByText("Walk next")).toBeNull();
    expect(screen.queryByRole("link", { name: "Walk this palace" })).toBeNull();
    // Spots exist but no walk yet: the honest band with no fake date.
    expect(screen.getByText("Not walked yet")).toBeInTheDocument();
  });
});
