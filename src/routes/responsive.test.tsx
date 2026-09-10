import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { AppHeader } from "../components/AppHeader";
import { EstateOverview } from "./EstateOverview";
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
});
