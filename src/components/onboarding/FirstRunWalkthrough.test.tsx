import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { FirstRunWalkthrough } from "./FirstRunWalkthrough";
import { AtlasProvider, useAtlas } from "../../state/AtlasContext";
import { resetDbForTests } from "../../persistence/db";
import { saveAtlas } from "../../persistence/atlasStore";
import { newAtlas, newPalace, newSpot, type Atlas } from "../../model/atlas";
import { getSampleAtlas, isSamplePalace } from "../../features/sample/sample";
import {
  hasCompletedFirstRun,
  markFirstRunComplete,
} from "../../features/onboarding/firstRun";

// A tiny driver that advances the real atlas the way the live loop does, so we
// can prove the walkthrough ticks in order and retires at the heat map.
function Harness() {
  const { atlas, loading, createPalace, updatePalace } = useAtlas();
  const navigate = useNavigate();
  const guided = atlas.palaces.find((p) => !isSamplePalace(p.id));
  return (
    <div>
      <span data-testid="load">{loading ? "loading" : "ready"}</span>
      <button onClick={() => createPalace("Childhood home")}>seed-palace</button>
      <button
        onClick={() =>
          guided &&
          updatePalace(guided.id, (p) => ({
            ...p,
            spots: [{ ...newSpot(10, 10, 0), label: "Front door" }],
          }))
        }
      >
        name-spot
      </button>
      <button
        onClick={() =>
          guided &&
          updatePalace(guided.id, (p) => ({
            ...p,
            walks: [
              {
                id: "w1",
                palaceId: p.id,
                startedAt: "2026-01-01T00:00:00.000Z",
                completedAt: "2026-01-01T00:05:00.000Z",
                results: [],
              },
            ],
          }))
        }
      >
        add-walk
      </button>
      <button onClick={() => guided && navigate(`/palace/${guided.id}`)}>
        go-plan
      </button>
    </div>
  );
}

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AtlasProvider>
        <FirstRunWalkthrough />
        <Harness />
      </AtlasProvider>
    </MemoryRouter>,
  );
}

async function seed(atlas: Atlas) {
  await saveAtlas(atlas);
}

function guide() {
  return screen.queryByRole("complementary", { name: "Getting started" });
}

function rows() {
  const aside = screen.getByRole("complementary", { name: "Getting started" });
  return within(aside).getAllByRole("listitem");
}

beforeEach(async () => {
  await resetDbForTests();
  localStorage.clear();
});

describe("FirstRunWalkthrough", () => {
  it("shows four steps with step 1 active for a fresh keeper", async () => {
    renderApp();
    await waitFor(() => expect(guide()).not.toBeNull());
    const items = rows();
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveTextContent("✓");
  });

  it("ticks in order as the keeper acts and retires at the heat map", async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => expect(guide()).not.toBeNull());
    expect(rows()[0]).toHaveAttribute("aria-current", "step");

    await user.click(screen.getByRole("button", { name: "seed-palace" }));
    await waitFor(() => expect(rows()[0]).toHaveTextContent("✓"));
    expect(rows()[1]).toHaveAttribute("aria-current", "step");

    await user.click(screen.getByRole("button", { name: "name-spot" }));
    await waitFor(() => expect(rows()[1]).toHaveTextContent("✓"));
    expect(rows()[2]).toHaveAttribute("aria-current", "step");

    await user.click(screen.getByRole("button", { name: "add-walk" }));
    await waitFor(() => expect(rows()[2]).toHaveTextContent("✓"));
    // Step 4 is active on the overview but not yet done.
    expect(rows()[3]).toHaveAttribute("aria-current", "step");

    // Landing on the guided plan is the first success: the guide retires.
    await user.click(screen.getByRole("button", { name: "go-plan" }));
    await waitFor(() => expect(guide()).toBeNull());
    expect(hasCompletedFirstRun()).toBe(true);
  });

  it("is an aside, not a modal, and keeps controls clickable", async () => {
    renderApp();
    await waitFor(() => expect(guide()).not.toBeNull());
    const aside = screen.getByRole("complementary", { name: "Getting started" });
    expect(aside.tagName.toLowerCase()).toBe("aside");
    expect(aside).not.toHaveAttribute("aria-modal");
    expect(screen.queryByRole("dialog")).toBeNull();
    // Skip is present at step 1.
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("Skip retires it immediately and it stays gone on remount", async () => {
    const user = userEvent.setup();
    const view = renderApp();
    await waitFor(() => expect(guide()).not.toBeNull());
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(guide()).toBeNull();
    expect(hasCompletedFirstRun()).toBe(true);
    view.unmount();

    renderApp();
    await waitFor(() =>
      expect(screen.getByTestId("load")).toHaveTextContent("ready"),
    );
    expect(guide()).toBeNull();
  });

  it("never shows when the flag is already set", async () => {
    markFirstRunComplete();
    renderApp();
    await waitFor(() =>
      expect(screen.getByTestId("load")).toHaveTextContent("ready"),
    );
    expect(guide()).toBeNull();
  });

  it("retires and marks the flag when a non-sample palace exists at load", async () => {
    // A returning keeper: their own palace is already in the atlas at load.
    await seed({ ...newAtlas(), palaces: [newPalace("My own palace")] });

    renderApp();
    await waitFor(() =>
      expect(screen.getByTestId("load")).toHaveTextContent("ready"),
    );
    expect(guide()).toBeNull();
    expect(hasCompletedFirstRun()).toBe(true);
  });

  it("still shows for a sample-only atlas with the flag unset", async () => {
    await seed(getSampleAtlas());
    renderApp();
    await waitFor(() => expect(guide()).not.toBeNull());
    expect(rows()[0]).toHaveAttribute("aria-current", "step");
    // A sample palace does not tick step 1.
    expect(rows()[0]).not.toHaveTextContent("✓");
  });

  it("does not render on Settings, a non-loop route", async () => {
    renderApp("/settings");
    await waitFor(() =>
      expect(screen.getByTestId("load")).toHaveTextContent("ready"),
    );
    expect(guide()).toBeNull();
  });
});
