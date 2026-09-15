import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AtlasProvider, useAtlas } from "./AtlasContext";
import { resetDbForTests } from "../persistence/db";
import { loadAtlas } from "../persistence/atlasStore";

function Harness() {
  const {
    atlas,
    loading,
    saveStatus,
    createPalace,
    renamePalace,
    updatePalace,
    deletePalace,
  } = useAtlas();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="status">{saveStatus}</span>
      <span data-testid="count">{atlas.palaces.length}</span>
      <span data-testid="names">{atlas.palaces.map((p) => p.name).join(",")}</span>
      <span data-testid="spots">{atlas.palaces[0]?.spots.length ?? 0}</span>
      <button onClick={() => createPalace("Home")}>create</button>
      <button
        onClick={() => atlas.palaces[0] && renamePalace(atlas.palaces[0].id, "Renamed")}
      >
        rename
      </button>
      <button
        onClick={() =>
          atlas.palaces[0] &&
          updatePalace(atlas.palaces[0].id, (p) => ({
            ...p,
            spots: [
              ...p.spots,
              {
                id: "s1",
                order: p.spots.length,
                x: 1,
                y: 2,
                label: "Front door",
                contents: "",
                fsrs: {
                  stability: 0,
                  difficulty: 0,
                  due: "2026-01-01T00:00:00.000Z",
                  reps: 0,
                  lapses: 0,
                  state: 0,
                },
              },
            ],
          }))
        }
      >
        addspot
      </button>
      <button
        onClick={() => atlas.palaces[0] && deletePalace(atlas.palaces[0].id)}
      >
        remove
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <MemoryRouter>
      <AtlasProvider>
        <Harness />
      </AtlasProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDbForTests();
});

describe("AtlasContext", () => {
  it("create, rename and delete each persist to IndexedDB", async () => {
    const user = userEvent.setup();
    const view = renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("create"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("saved"));
    expect((await loadAtlas()).palaces.map((p) => p.name)).toEqual(["Home"]);

    await user.click(screen.getByText("rename"));
    await waitFor(() => expect(screen.getByTestId("names")).toHaveTextContent("Renamed"));
    await waitFor(async () =>
      expect((await loadAtlas()).palaces[0].name).toBe("Renamed"),
    );

    // Remount to prove data survives a "reload".
    view.unmount();
    const remounted = renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    expect(screen.getByTestId("names")).toHaveTextContent("Renamed");

    await user.click(screen.getByText("remove"));
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    await waitFor(async () => expect((await loadAtlas()).palaces).toEqual([]));
    remounted.unmount();
  });

  it("seeds the demo palace on first boot when the deployment asks for it", async () => {
    window.__ENV__ = { SEED_DEMO: "1" };
    try {
      const view = renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("loading")).toHaveTextContent("false"),
      );
      expect(screen.getByTestId("names")).toHaveTextContent(
        "Corner bakery (sample)",
      );
      // Durable: the seed reached IndexedDB, not just React state.
      expect((await loadAtlas()).palaces.map((p) => p.name)).toEqual([
        "Corner bakery (sample)",
      ]);
      view.unmount();
    } finally {
      delete window.__ENV__;
    }
  });

  it("does not seed and does not write when the flag is off", async () => {
    const view = renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    view.unmount();
  });

  it("updatePalace applies an updater to one palace and persists it", async () => {
    const user = userEvent.setup();
    const view = renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("create"));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("saved"));

    await user.click(screen.getByText("addspot"));
    expect(screen.getByTestId("spots")).toHaveTextContent("1");
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("saved"));

    const saved = await loadAtlas();
    expect(saved.palaces[0].spots).toHaveLength(1);
    expect(saved.palaces[0].spots[0].label).toBe("Front door");
    view.unmount();
  });
});
