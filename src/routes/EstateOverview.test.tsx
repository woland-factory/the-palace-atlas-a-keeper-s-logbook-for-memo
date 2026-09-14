import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EstateOverview } from "./EstateOverview";
import { renderWithProviders } from "../../test/renderWithProviders";
import { resetDbForTests } from "../persistence/db";

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

  it("adding a palace moves the screen from empty to populated with placeholders", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<EstateOverview />);
    await user.click(await screen.findByRole("button", { name: "Add your first palace" }));

    // Card now present with thumbnail slot + health placeholder.
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument(),
    );
    expect(screen.getByText("Not walked yet")).toBeInTheDocument();
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
});
