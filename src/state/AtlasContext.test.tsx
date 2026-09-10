import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AtlasProvider, useAtlas } from "./AtlasContext";
import { resetDbForTests } from "../persistence/db";
import { loadAtlas } from "../persistence/atlasStore";

function Harness() {
  const { atlas, loading, saveStatus, createPalace, renamePalace, deletePalace } =
    useAtlas();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="status">{saveStatus}</span>
      <span data-testid="count">{atlas.palaces.length}</span>
      <span data-testid="names">{atlas.palaces.map((p) => p.name).join(",")}</span>
      <button onClick={() => createPalace("Home")}>create</button>
      <button
        onClick={() => atlas.palaces[0] && renamePalace(atlas.palaces[0].id, "Renamed")}
      >
        rename
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
});
