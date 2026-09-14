import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PalaceEditor } from "./PalaceEditor";
import { EstateOverview } from "./EstateOverview";
import { AtlasProvider } from "../state/AtlasContext";
import { ToastProvider } from "../components/Toast";
import { Autosaver } from "../persistence/autosave";
import { resetDbForTests } from "../persistence/db";
import { saveAtlas, loadAtlas } from "../persistence/atlasStore";
import { newAtlas, newPalace, newSpot, type Atlas, type Palace } from "../model/atlas";

function firePointer(
  el: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  x: number,
  y: number,
) {
  const ev = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(ev, "pointerId", { value: 1 });
  fireEvent(el, ev);
}

// Select a spot through the ordered list (the accessible walk-order path),
// scoped so it never collides with the same-named canvas marker.
function clickListSpot(name: RegExp | string) {
  const nav = screen.getByRole("navigation", { name: "Spots in walking order" });
  return within(nav).getByRole("button", { name });
}

function mockRect(el: Element) {
  (el as SVGSVGElement).getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;
}

function makePalace(mut?: (p: Palace) => void): Palace {
  const p = newPalace("Childhood home");
  mut?.(p);
  return p;
}

async function seed(palace: Palace): Promise<Atlas> {
  const atlas: Atlas = { ...newAtlas(), palaces: [palace] };
  await saveAtlas(atlas);
  return atlas;
}

function renderEditor(palaceId: string, autosaver?: Autosaver) {
  return render(
    <MemoryRouter initialEntries={[`/palace/${palaceId}`]}>
      <ToastProvider>
        <AtlasProvider autosaver={autosaver}>
          <Routes>
            <Route path="/palace/:id" element={<PalaceEditor />} />
            <Route path="/" element={<EstateOverview />} />
          </Routes>
        </AtlasProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDbForTests();
  localStorage.clear();
});

describe("PalaceEditor", () => {
  it("shows the designed not-found state with a working back link", async () => {
    await seed(makePalace());
    renderEditor("no-such-id");
    expect(
      await screen.findByRole("heading", { name: "This palace is not in your atlas." }),
    ).toBeInTheDocument();
    const back = screen.getByRole("link", { name: "Back to your palaces" });
    expect(back).toHaveAttribute("href", "/");
  });

  it("tapping the surface places a numbered spot and opens its inspector", async () => {
    const palace = makePalace();
    await seed(palace);
    const { container } = renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });

    const svg = container.querySelector("svg.sketch-surface__svg")!;
    mockRect(svg);
    firePointer(svg, "pointerdown", 300, 400);
    firePointer(svg, "pointerup", 300, 400);

    // Inspector opens on the freshly placed, selected spot.
    expect(await screen.findByRole("heading", { name: "Spot 1" })).toBeInTheDocument();
    // The spot shows in the ordered list too.
    expect(clickListSpot(/Spot 1/)).toBeInTheDocument();

    // A second spot draws the connecting path.
    firePointer(svg, "pointerdown", 600, 500);
    firePointer(svg, "pointerup", 600, 500);
    await waitFor(() =>
      expect(container.querySelector("path.sketch-path")).not.toBeNull(),
    );
  });

  it("editing name and contents autosaves and survives a reload", async () => {
    const user = userEvent.setup();
    const palace = makePalace((p) => {
      p.spots = [newSpot(400, 400, 0)];
    });
    await seed(palace);
    const view = renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });

    // Select the spot from the list, then edit the inspector.
    await user.click(clickListSpot(/Spot 1/));
    await user.type(screen.getByLabelText("Spot name"), "Front door");
    await user.type(screen.getByLabelText("What lives here"), "A red kite.");

    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    const saved = await loadAtlas();
    expect(saved.palaces[0].spots[0].label).toBe("Front door");
    expect(saved.palaces[0].spots[0].contents).toBe("A red kite.");
    view.unmount();

    // Reload: values are still there.
    renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });
    await user.click(clickListSpot(/Front door/));
    expect((screen.getByLabelText("Spot name") as HTMLInputElement).value).toBe(
      "Front door",
    );
  });

  it("reorders and deletes spots, renumbering and persisting", async () => {
    const user = userEvent.setup();
    const palace = makePalace((p) => {
      p.spots = [
        { ...newSpot(100, 100, 0), label: "Door" },
        { ...newSpot(200, 200, 1), label: "Table" },
        { ...newSpot(300, 300, 2), label: "Window" },
      ];
    });
    await seed(palace);
    renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });

    await user.click(screen.getByRole("button", { name: /Spot 1, Door/ }));
    await user.click(screen.getByRole("button", { name: "Move down" }));

    // Door is now spot 2 on the canvas.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Spot 2, Door" })).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    let saved = await loadAtlas();
    expect(saved.palaces[0].spots.map((s) => s.label)).toEqual([
      "Table",
      "Door",
      "Window",
    ]);
    saved.palaces[0].spots.forEach((s, i) => expect(s.order).toBe(i));

    // Remove the now-second spot (Door).
    await user.click(screen.getByRole("button", { name: "Spot 2, Door" }));
    await user.click(screen.getByRole("button", { name: "Remove spot" }));
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    saved = await loadAtlas();
    expect(saved.palaces[0].spots.map((s) => s.label)).toEqual(["Table", "Window"]);
    saved.palaces[0].spots.forEach((s, i) => expect(s.order).toBe(i));
  });

  it("the keyboard Add spot button places a spot and announces it", async () => {
    const user = userEvent.setup();
    const palace = makePalace();
    await seed(palace);
    renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });

    await user.click(screen.getByRole("button", { name: "Add spot" }));
    expect(await screen.findByRole("heading", { name: "Spot 1" })).toBeInTheDocument();
    expect(screen.getByText("Placed spot 1.")).toBeInTheDocument();
  });

  it("draws a room outline and clears it", async () => {
    const user = userEvent.setup();
    const palace = makePalace();
    await seed(palace);
    const { container } = renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });

    await user.click(screen.getByRole("button", { name: "Draw room outline" }));
    const svg = container.querySelector("svg.sketch-surface__svg")!;
    mockRect(svg);
    firePointer(svg, "pointerdown", 100, 100);
    firePointer(svg, "pointermove", 300, 100);
    firePointer(svg, "pointermove", 500, 200);
    firePointer(svg, "pointerup", 500, 200);

    await waitFor(() =>
      expect(container.querySelector("path.sketch-outline")).not.toBeNull(),
    );

    await user.click(screen.getByRole("button", { name: "Clear outline" }));
    await waitFor(() =>
      expect(container.querySelector("path.sketch-outline")).toBeNull(),
    );
  });

  it("shows the save-failure copy and Retry re-persists", async () => {
    const user = userEvent.setup();
    let calls = 0;
    const saver = new Autosaver(() => {
      calls += 1;
      return calls <= 1 ? Promise.reject(new Error("nope")) : Promise.resolve();
    });
    const palace = makePalace((p) => {
      p.spots = [newSpot(400, 400, 0)];
    });
    await seed(palace);
    renderEditor(palace.id, saver);
    await screen.findByRole("heading", { name: "Childhood home" });

    await user.click(clickListSpot(/Spot 1/));
    await user.type(screen.getByLabelText("Spot name"), "Door");

    await waitFor(() =>
      expect(
        screen.getByText("Your last change did not save. Try again."),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
  });

  it("guides a brand-new keeper, skips on demand, and never returns", async () => {
    const user = userEvent.setup();
    const palace = makePalace();
    await seed(palace);
    const view = renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });

    expect(screen.getByText("Tap the plan to place a spot.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.queryByText("Tap the plan to place a spot.")).toBeNull();
    view.unmount();

    // Reload: the guide does not come back.
    renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });
    expect(screen.queryByText("Tap the plan to place a spot.")).toBeNull();
  });

  it("disables placement at the spot cap with the approved message", async () => {
    const palace = makePalace((p) => {
      p.spots = Array.from({ length: 200 }, (_, i) => newSpot(i, i, i));
    });
    await seed(palace);
    renderEditor(palace.id);
    await screen.findByRole("heading", { name: "Childhood home" });

    expect(screen.getByRole("button", { name: "Add spot" })).toBeDisabled();
    expect(
      screen.getByText("This palace is full at 200 spots. Start another for the rest."),
    ).toBeInTheDocument();
  });

  it("holds a skeleton while the atlas is loading", () => {
    const { container } = renderEditor("anything");
    const main = container.querySelector("main");
    expect(main).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".skeleton-card")).not.toBeNull();
  });
});
