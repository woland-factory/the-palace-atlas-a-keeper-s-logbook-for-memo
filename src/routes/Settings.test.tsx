import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";
import { EstateOverview } from "./EstateOverview";
import { Providers } from "../../test/renderWithProviders";
import { render } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { resetDbForTests } from "../persistence/db";
import { SCHEMA_VERSION, type Palace } from "../model/atlas";
import * as atlasStore from "../persistence/atlasStore";
import * as exportAtlas from "../features/portability/exportAtlas";
import { loadAtlas, saveAtlas } from "../persistence/atlasStore";
import { buildDemoAtlas } from "../features/sample/demoSeed";
import { getSampleAtlas } from "../features/sample/sample";
import { useAtlas } from "../state/AtlasContext";

beforeEach(async () => {
  await resetDbForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Settings while the atlas is still loading", () => {
  it("holds the layout steady and never exports the unloaded atlas", async () => {
    // Hold the initial load open so the screen stays in its loading state.
    vi.spyOn(atlasStore, "loadAtlasOrSeedDemo").mockReturnValue(
      new Promise(() => {}),
    );
    const download = vi.spyOn(exportAtlas, "downloadAtlas");
    const user = userEvent.setup();

    render(
      <Providers initialEntries={["/settings"]}>
        <Settings />
      </Providers>,
    );

    // The layout is held: the heading and the primary action are in place, and
    // the region is marked busy rather than blank.
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { name: "Settings and data" })).toBeInTheDocument();

    const exportBtn = screen.getByRole("button", { name: "Export atlas" });
    expect(exportBtn).toBeDisabled();

    // Pressing Export cannot fire against the empty initial atlas.
    await user.click(exportBtn);
    expect(download).not.toHaveBeenCalled();
  });
});

function fileInput(): HTMLInputElement {
  return screen.getByLabelText("Choose an atlas file to import") as HTMLInputElement;
}

describe("Settings import", () => {
  it("shows a friendly message on malformed JSON and does not crash", async () => {
    const user = userEvent.setup();
    render(
      <Providers initialEntries={["/settings"]}>
        <Settings />
      </Providers>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Import atlas" })).toBeEnabled(),
    );
    const bad = new File(["{ not json"], "atlas.json", { type: "application/json" });
    await user.upload(fileInput(), bad);
    await waitFor(() =>
      expect(
        screen.getByText(
          "That file is not a readable atlas. Pick an atlas you exported from this app.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("imports a valid atlas and reflects it on the overview", async () => {
    const user = userEvent.setup();
    render(
      <Providers initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<EstateOverview />} />
        </Routes>
      </Providers>,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Import atlas" })).toBeEnabled(),
    );

    const body = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-09-10T12:00:00.000Z",
      palaces: [
        {
          id: "imp-1",
          name: "Imported hall",
          createdAt: "2026-01-01T00:00:00.000Z",
          viewBox: { w: 1000, h: 1000 },
          spots: [],
          walks: [],
        },
      ],
    });
    const good = new File([body], "atlas.json", { type: "application/json" });
    await user.upload(fileInput(), good);
    await waitFor(() => expect(screen.getByText("Atlas imported.")).toBeInTheDocument());
  });
});

describe("Settings sample", () => {
  it("loads and removes the sample in one action each", async () => {
    const user = userEvent.setup();
    render(
      <Providers initialEntries={["/settings"]}>
        <Settings />
      </Providers>,
    );
    const sampleSection = screen
      .getByRole("heading", { name: "Sample atlas" })
      .closest("section") as HTMLElement;
    await waitFor(() =>
      expect(
        within(sampleSection).getByRole("button", { name: "Load the sample" }),
      ).toBeEnabled(),
    );

    await user.click(within(sampleSection).getByRole("button", { name: "Load the sample" }));
    await waitFor(() => expect(screen.getByText("Sample loaded.")).toBeInTheDocument());

    await user.click(within(sampleSection).getByRole("button", { name: "Remove sample" }));
    await waitFor(() => expect(screen.getByText("Sample removed.")).toBeInTheDocument());
  });

  it("removes only sample palaces; the keeper's own palace survives", async () => {
    // Staging shape: the seeded demo palace, the manual sample pair, and a
    // palace the keeper built themselves, all side by side.
    const demo = buildDemoAtlas(new Date("2026-09-15T10:00:00.000Z"));
    const sample = getSampleAtlas();
    const userPalace: Palace = {
      id: "user-own-hall",
      name: "My own hall",
      createdAt: "2026-03-01T00:00:00.000Z",
      viewBox: { w: 1000, h: 1000 },
      spots: [],
      walks: [],
    };
    await saveAtlas({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: null,
      palaces: [...demo.palaces, ...sample.palaces, userPalace],
    });

    function PalaceNames() {
      const { atlas } = useAtlas();
      return (
        <ul aria-label="Palace names">
          {atlas.palaces.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      );
    }

    const user = userEvent.setup();
    render(
      <Providers initialEntries={["/settings"]}>
        <Settings />
        <PalaceNames />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText("My own hall")).toBeInTheDocument());
    expect(screen.getByText("Childhood home (sample)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove sample" }));
    await waitFor(() => expect(screen.getByText("Sample removed.")).toBeInTheDocument());

    expect(screen.getByText("My own hall")).toBeInTheDocument();
    expect(screen.queryByText("Corner bakery (sample)")).not.toBeInTheDocument();
    expect(screen.queryByText("Childhood home (sample)")).not.toBeInTheDocument();
    expect(screen.queryByText("Old library (sample)")).not.toBeInTheDocument();

    // The persisted atlas keeps only the keeper's own palace.
    await waitFor(async () => {
      const saved = await loadAtlas();
      expect(saved.palaces.map((p) => p.id)).toEqual(["user-own-hall"]);
    });
  });
});
