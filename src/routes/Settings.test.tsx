import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";
import { EstateOverview } from "./EstateOverview";
import { Providers } from "../../test/renderWithProviders";
import { render } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { resetDbForTests } from "../persistence/db";
import { SCHEMA_VERSION } from "../model/atlas";

beforeEach(async () => {
  await resetDbForTests();
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

    await user.click(within(sampleSection).getByRole("button", { name: "Load the sample" }));
    await waitFor(() => expect(screen.getByText("Sample loaded.")).toBeInTheDocument());

    await user.click(within(sampleSection).getByRole("button", { name: "Remove sample" }));
    await waitFor(() => expect(screen.getByText("Sample removed.")).toBeInTheDocument());
  });
});
