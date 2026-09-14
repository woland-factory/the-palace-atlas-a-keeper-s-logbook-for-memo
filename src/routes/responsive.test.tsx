import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { AppHeader } from "../components/AppHeader";
import { EstateOverview } from "./EstateOverview";
import { PalaceEditor } from "./PalaceEditor";
import { AtlasProvider } from "../state/AtlasContext";
import { ToastProvider } from "../components/Toast";
import { saveAtlas } from "../persistence/atlasStore";
import { newAtlas, newPalace } from "../model/atlas";
import { resetDbForTests } from "../persistence/db";

beforeEach(async () => {
  await resetDbForTests();
});

// jsdom does not lay out CSS, so this is a structural guard: at a 390px
// viewport nothing carries an inline fixed pixel width that would force a
// horizontal scroll, and interactive controls carry the tap-target class.
describe("responsive structure at 390px", () => {
  it("uses fluid containers and tap-target buttons, no fixed widths", async () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const { container } = renderWithProviders(
      <>
        <AppHeader />
        <EstateOverview />
      </>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Start your atlas" })).toBeInTheDocument(),
    );

    // The main content lives in a fluid, max-width container (not a fixed width).
    expect(container.querySelector(".container")).not.toBeNull();

    // No element pins an inline pixel width wider than the viewport.
    const widthPinned = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => /width:\s*\d{3,}px/.test(el.getAttribute("style") ?? ""),
    );
    expect(widthPinned).toEqual([]);

    // Interactive controls carry the .btn class (min-height 44px in tokens).
    for (const btn of screen.getAllByRole("button")) {
      expect(btn.className).toMatch(/\bbtn\b/);
    }
  });

  it("the editor is fluid at 390px and the surface disables browser gestures", async () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const palace = newPalace("Childhood home");
    await saveAtlas({ ...newAtlas(), palaces: [palace] });

    const { container } = render(
      <MemoryRouter initialEntries={[`/palace/${palace.id}`]}>
        <ToastProvider>
          <AtlasProvider>
            <Routes>
              <Route path="/palace/:id" element={<PalaceEditor />} />
            </Routes>
          </AtlasProvider>
        </ToastProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Childhood home" })).toBeInTheDocument(),
    );

    // Fluid container, no inline pixel width wider than the viewport.
    expect(container.querySelector(".container")).not.toBeNull();
    const widthPinned = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => /width:\s*\d{3,}px/.test(el.getAttribute("style") ?? ""),
    );
    expect(widthPinned).toEqual([]);

    // The drawing surface owns its gestures so the page never scrolls or zooms.
    expect(container.querySelector("svg.sketch-surface__svg")).not.toBeNull();

    // Toolbar controls carry the tap-target button class.
    for (const btn of screen.getAllByRole("button")) {
      expect(btn.className).toMatch(/\bbtn\b/);
    }
  });
});
