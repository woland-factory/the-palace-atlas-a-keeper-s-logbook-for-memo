import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { WalkSession } from "./WalkSession";
import { PalaceEditor } from "./PalaceEditor";
import { AtlasProvider } from "../state/AtlasContext";
import { ToastProvider } from "../components/Toast";
import { Autosaver } from "../persistence/autosave";
import { resetDbForTests } from "../persistence/db";
import { saveAtlas, loadAtlas } from "../persistence/atlasStore";
import { newAtlas, newPalace, newSpot, type Atlas, type Palace } from "../model/atlas";

function makePalace(spotCount: number): Palace {
  const p = newPalace("Childhood home");
  p.spots = Array.from({ length: spotCount }, (_, i) => ({
    ...newSpot((i + 1) * 100, (i + 1) * 100, i),
    label: `Spot ${i + 1}`,
    contents: `Contents ${i + 1}`,
  }));
  return p;
}

async function seed(palace: Palace): Promise<Atlas> {
  const atlas: Atlas = { ...newAtlas(), palaces: [palace] };
  await saveAtlas(atlas);
  return atlas;
}

function renderWalk(palaceId: string, autosaver?: Autosaver) {
  return render(
    <MemoryRouter initialEntries={[`/palace/${palaceId}/walk`]}>
      <ToastProvider>
        <AtlasProvider autosaver={autosaver}>
          <Routes>
            <Route path="/palace/:id" element={<PalaceEditor />} />
            <Route path="/palace/:id/walk" element={<WalkSession />} />
          </Routes>
        </AtlasProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function reveal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Reveal" }));
}

beforeEach(async () => {
  await resetDbForTests();
  localStorage.clear();
});

describe("WalkSession", () => {
  it("shows the not-found state for an unknown palace", async () => {
    await seed(makePalace(1));
    renderWalk("no-such-id");
    expect(
      await screen.findByRole("heading", { name: "This palace is not in your atlas." }),
    ).toBeInTheDocument();
  });

  it("shows a designed empty state when the palace has no spots", async () => {
    const palace = makePalace(0);
    await seed(palace);
    renderWalk(palace.id);
    expect(
      await screen.findByRole("heading", { name: "Add your first spot, then walk." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a spot" })).toHaveAttribute(
      "href",
      `/palace/${palace.id}`,
    );
  });

  it("steps through spots in order, highlighting the current spot on the plan", async () => {
    const user = userEvent.setup();
    const palace = makePalace(3);
    await seed(palace);
    const { container } = renderWalk(palace.id);

    expect(await screen.findByText("Spot 1 of 3")).toBeInTheDocument();
    let active = container.querySelector('[data-active="true"]');
    expect(active).toHaveAttribute("data-spot-id", palace.spots[0].id);

    await reveal(user);
    await user.click(screen.getByRole("button", { name: "Sharp" }));

    expect(await screen.findByText("Spot 2 of 3")).toBeInTheDocument();
    active = container.querySelector('[data-active="true"]');
    expect(active).toHaveAttribute("data-spot-id", palace.spots[1].id);
  });

  it("completing the last spot appends exactly one walk and advances every fsrs", async () => {
    const user = userEvent.setup();
    const palace = makePalace(2);
    await seed(palace);
    renderWalk(palace.id);

    await screen.findByText("Spot 1 of 2");
    await reveal(user);
    await user.click(screen.getByRole("button", { name: "Sharp" }));
    await screen.findByText("Spot 2 of 2");
    await reveal(user);
    await user.click(screen.getByRole("button", { name: "Missed" }));

    expect(await screen.findByRole("heading", { name: "Walk done." })).toBeInTheDocument();
    expect(screen.getByText("Sharp 1 · Shaky 0 · Missed 1")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    const saved = await loadAtlas();
    expect(saved.palaces[0].walks).toHaveLength(1);
    const walk = saved.palaces[0].walks[0];
    expect(walk.palaceId).toBe(palace.id);
    expect(walk.results).toEqual([
      { spotId: palace.spots[0].id, grade: "sharp" },
      { spotId: palace.spots[1].id, grade: "missed" },
    ]);
    saved.palaces[0].spots.forEach((s) => {
      expect(s.fsrs.reps).toBe(1);
      expect(s.fsrs.lastReview).toBeTruthy();
    });
  });

  it("grading advances without waiting for the write to resolve", async () => {
    const user = userEvent.setup();
    // A saver whose write never resolves: the walk must still reach the summary.
    const saver = new Autosaver(() => new Promise<void>(() => {}));
    const palace = makePalace(1);
    await seed(palace);
    renderWalk(palace.id, saver);

    await screen.findByText("Spot 1 of 1");
    await reveal(user);
    await user.click(screen.getByRole("button", { name: "Sharp" }));

    expect(await screen.findByRole("heading", { name: "Walk done." })).toBeInTheDocument();
  });

  it("leaving after grading, once confirmed, writes nothing", async () => {
    const user = userEvent.setup();
    const palace = makePalace(3);
    await seed(palace);
    renderWalk(palace.id);

    await screen.findByText("Spot 1 of 3");
    await reveal(user);
    await user.click(screen.getByRole("button", { name: "Shaky" }));
    await screen.findByText("Spot 2 of 3");

    await user.click(screen.getByRole("button", { name: "Leave walk" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Leave walk" }));

    // Back on the editor.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Childhood home" }),
    ).toBeInTheDocument();

    const saved = await loadAtlas();
    expect(saved.palaces[0].walks).toHaveLength(0);
    saved.palaces[0].spots.forEach((s) => expect(s.fsrs.reps).toBe(0));
  });

  it("announces progress in an aria-live status region", async () => {
    const palace = makePalace(2);
    await seed(palace);
    renderWalk(palace.id);

    const progress = await screen.findByText("Spot 1 of 2");
    expect(progress).toHaveAttribute("aria-live", "polite");
    expect(progress).toHaveAttribute("role", "status");
  });
});
