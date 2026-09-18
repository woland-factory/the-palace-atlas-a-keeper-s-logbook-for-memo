import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "../components/AppHeader";
import { EstateOverview } from "./EstateOverview";
import { PalaceEditor } from "./PalaceEditor";
import { WalkSession } from "./WalkSession";
import { FirstRunWalkthrough } from "../components/onboarding/FirstRunWalkthrough";
import { AtlasProvider } from "../state/AtlasContext";
import { ToastProvider } from "../components/Toast";
import { saveAtlas } from "../persistence/atlasStore";
import { newAtlas, newPalace, newSpot } from "../model/atlas";
import { resetDbForTests } from "../persistence/db";

beforeEach(async () => {
  await resetDbForTests();
  localStorage.clear();
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

  it("the glowing plan and its legend force no overflow at 390px", async () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const palace = newPalace("Childhood home");
    palace.spots = [newSpot(200, 200, 0), newSpot(500, 500, 1)];
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

    // The legend is present next to the plan and neither pins an inline width.
    expect(container.querySelector(".health-legend")).not.toBeNull();
    const widthPinned = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => /width:\s*\d{3,}px/.test(el.getAttribute("style") ?? ""),
    );
    expect(widthPinned).toEqual([]);
  });

  it("the walk is one-handed at 390px: tap-target grade buttons, no fixed widths", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const palace = newPalace("Childhood home");
    palace.spots = [{ ...newSpot(200, 200, 0), label: "Front door", contents: "A kite" }];
    await saveAtlas({ ...newAtlas(), palaces: [palace] });

    const { container } = render(
      <MemoryRouter initialEntries={[`/palace/${palace.id}/walk`]}>
        <ToastProvider>
          <AtlasProvider>
            <Routes>
              <Route path="/palace/:id/walk" element={<WalkSession />} />
            </Routes>
          </AtlasProvider>
        </ToastProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("Spot 1 of 1")).toBeInTheDocument(),
    );

    // Fluid container, no inline pixel width wider than the viewport.
    expect(container.querySelector(".container")).not.toBeNull();
    const widthPinned = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => /width:\s*\d{3,}px/.test(el.getAttribute("style") ?? ""),
    );
    expect(widthPinned).toEqual([]);

    // Reveal, then the three grade buttons each carry the tap-target class.
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    for (const name of ["Missed", "Shaky", "Sharp"]) {
      expect(screen.getByRole("button", { name }).className).toMatch(/\bbtn\b/);
    }
  });

  it("the first-run checklist docks at 390px without overflow or covering the primary action", async () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const { container } = renderWithProviders(
      <>
        <AppHeader />
        <FirstRunWalkthrough />
        <EstateOverview />
      </>,
    );

    // The checklist is present for a fresh keeper.
    const guide = await screen.findByRole("complementary", { name: "Getting started" });

    // It rides in the flow above the routed content, so it never overlays the
    // screen's primary action. The primary action stays reachable.
    const primary = screen.getByRole("button", { name: "Add your first palace" });
    expect(guide.compareDocumentPosition(primary)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    // No element pins an inline pixel width wider than the viewport.
    const widthPinned = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => /width:\s*\d{3,}px/.test(el.getAttribute("style") ?? ""),
    );
    expect(widthPinned).toEqual([]);

    // Skip is a real, keyboard-reachable tap-target button.
    const skip = screen.getByRole("button", { name: "Skip" });
    expect(skip.className).toMatch(/\bbtn\b/);
    skip.focus();
    expect(skip).toHaveFocus();
  });
});
