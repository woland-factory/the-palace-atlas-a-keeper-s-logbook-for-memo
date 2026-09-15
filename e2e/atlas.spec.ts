import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Create a palace on the overview and open its sketch editor.
async function openNewPalace(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Add your first palace" }).click();
  await page.getByRole("link", { name: "New palace" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New palace" })).toBeVisible();
}

function surface(page: Page) {
  return page.locator("svg.sketch-surface__svg");
}

function markers(page: Page) {
  return page.locator("svg.sketch-surface__svg [data-spot-id]");
}

// Each Playwright test gets a fresh browser context, so IndexedDB starts
// empty every time. Reloads within a test keep the same context, which is
// how we prove persistence.

test("first run shows the designed empty state, usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Start your atlas" })).toBeVisible();
  await expect(
    page.getByText(
      "Draw the buildings you memorize in and keep them safe outside your head.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add your first palace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load the sample" })).toBeVisible();

  // No horizontal scroll at a narrow viewport.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("a created palace survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add your first palace" }).click();

  const card = page.getByRole("heading", { level: 3, name: "New palace" });
  await expect(card).toBeVisible();

  // Wait for the save to settle, then reload.
  await expect(page.getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 3, name: "New palace" })).toBeVisible();
});

test("loading the sample fills the overview", async ({ page }) => {
  await page.goto("/settings");
  await page
    .getByRole("heading", { name: "Sample atlas" })
    .locator("xpath=ancestor::section")
    .getByRole("button", { name: "Load the sample" })
    .click();
  await expect(page.getByText("Sample loaded.")).toBeVisible();

  await page.getByRole("link", { name: "Palaces" }).click();
  await expect(page.getByText("Childhood home (sample)")).toBeVisible();
});

test("export then import restores the same atlas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add your first palace" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "New palace" })).toBeVisible();

  // Rename so the imported name is distinctive.
  await page.getByRole("button", { name: "Rename" }).click();
  const renameBox = page
    .getByRole("listitem")
    .getByRole("textbox", { name: "Palace name" });
  await renameBox.fill("Grandmother's flat");
  await renameBox.press("Enter");
  await expect(
    page.getByRole("heading", { level: 3, name: "Grandmother's flat" }),
  ).toBeVisible();

  // Export the atlas to a file.
  await page.getByRole("link", { name: "Settings" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export atlas" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(readFileSync(path, "utf8")).toContain("Grandmother's flat");

  // Remove sample touches only sample palaces; the import below replaces
  // the whole atlas with the exported file.
  await page
    .getByRole("heading", { name: "Sample atlas" })
    .locator("xpath=ancestor::section")
    .getByRole("button", { name: "Remove sample" })
    .click();
  await expect(page.getByText("Sample removed.")).toBeVisible();

  await page.getByLabel("Choose an atlas file to import").setInputFiles(path);
  await expect(page.getByText("Atlas imported.")).toBeVisible();

  await page.getByRole("link", { name: "Palaces" }).click();
  await expect(
    page.getByRole("heading", { level: 3, name: "Grandmother's flat" }),
  ).toBeVisible();
});

test("sketch a palace: place spots, name one, and it survives a reload", async ({
  page,
}) => {
  await openNewPalace(page);

  // Place two spots by tapping the plan.
  await surface(page).click({ position: { x: 80, y: 90 } });
  await expect(page.getByRole("heading", { level: 2, name: "Spot 1" })).toBeVisible();
  await surface(page).click({ position: { x: 220, y: 210 } });
  await expect(markers(page)).toHaveCount(2);
  // A single path connects the spots in order.
  await expect(page.locator("path.sketch-path")).toHaveCount(1);

  // Name the first spot and write its contents.
  await page
    .getByRole("navigation", { name: "Spots in walking order" })
    .getByRole("button", { name: "Spot 1" })
    .click();
  await page.getByLabel("Spot name").fill("Front door");
  await page.getByLabel("What lives here").fill("A red kite leans on the frame.");
  await expect(page.getByRole("main").getByText("Saved")).toBeVisible();

  // Reload: the geometry and text are still there.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "New palace" })).toBeVisible();
  await expect(markers(page)).toHaveCount(2);
  await expect(
    page.locator("svg.sketch-surface__svg [data-spot-id]").first(),
  ).toHaveAttribute("aria-label", "Spot 1, Front door, Not walked yet");
});

test("reorder and delete are reflected after a reload", async ({ page }) => {
  await openNewPalace(page);

  await surface(page).click({ position: { x: 90, y: 90 } });
  await surface(page).click({ position: { x: 240, y: 220 } });
  await expect(markers(page)).toHaveCount(2);

  // The second spot is selected; name it and move it to first.
  await page.getByLabel("Spot name").fill("Beacon");
  await page.getByRole("button", { name: "Move up" }).click();
  await expect(page.getByRole("button", { name: "Spot 1, Beacon" })).toBeVisible();

  await expect(page.getByRole("main").getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Spot 1, Beacon" })).toBeVisible();

  // Delete it and confirm the deletion persists.
  await page.getByRole("button", { name: "Spot 1, Beacon" }).click();
  await page.getByRole("button", { name: "Remove spot" }).click();
  await expect(markers(page)).toHaveCount(1);
  await expect(page.getByRole("main").getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(markers(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Spot 1, Beacon" })).toHaveCount(0);
});

test("the overview shows a mini plan for a drawn palace", async ({ page }) => {
  await page.goto("/settings");
  await page
    .getByRole("heading", { name: "Sample atlas" })
    .locator("xpath=ancestor::section")
    .getByRole("button", { name: "Load the sample" })
    .click();
  await expect(page.getByText("Sample loaded.")).toBeVisible();

  await page.getByRole("link", { name: "Palaces" }).click();
  // The drawn sample palace shows spot markers in its card thumbnail.
  await expect(
    page.locator(".palace-card__thumb circle.thumb__spot").first(),
  ).toBeVisible();
});

test("editor at 390px has no page scroll and the wheel changes the viewBox", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await openNewPalace(page);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const before = await surface(page).getAttribute("viewBox");
  await surface(page).hover();
  await page.mouse.wheel(0, -200);
  await expect(async () => {
    const after = await surface(page).getAttribute("viewBox");
    expect(after).not.toBe(before);
  }).toPass();
});

test("keyboard: activate Add spot places a spot and announces it", async ({ page }) => {
  await openNewPalace(page);

  const add = page.getByRole("button", { name: "Add spot" });
  await add.focus();
  await expect(add).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { level: 2, name: "Spot 1" })).toBeVisible();
  await expect(page.locator(".visually-hidden[role='status']")).toContainText(
    "Placed spot 1.",
  );
});

test("walk a palace: reveal, grade to the summary, and see health reflected", async ({
  page,
}) => {
  await openNewPalace(page);

  // Place two spots and file contents at the first.
  await surface(page).click({ position: { x: 80, y: 90 } });
  await expect(page.getByRole("heading", { level: 2, name: "Spot 1" })).toBeVisible();
  await page.getByLabel("What lives here").fill("A red kite leans on the frame.");
  await surface(page).click({ position: { x: 220, y: 210 } });
  await expect(markers(page)).toHaveCount(2);

  // Before any walk, the list reads the honest unwalked state and the plan
  // wears neutral markers.
  await expect(page.getByText("Not walked yet").first()).toBeVisible();
  await expect(markers(page).first()).toHaveAttribute("data-health", "unwalked");

  // Start the walk and step through both spots.
  await page.getByRole("link", { name: "Walk this palace" }).click();
  await expect(page.getByText("Spot 1 of 2")).toBeVisible();

  await page.getByRole("button", { name: "Reveal" }).click();
  await expect(page.getByText("A red kite leans on the frame.")).toBeVisible();
  await page.getByRole("button", { name: "Sharp" }).click();

  await expect(page.getByText("Spot 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Reveal" }).click();
  await page.getByRole("button", { name: "Shaky" }).click();

  // The summary tallies the walk and shows the just-updated plan glowing:
  // every spot is colored by its fresh band, with the legend as the key.
  await expect(page.getByRole("heading", { name: "Walk done." })).toBeVisible();
  await expect(page.getByText("Sharp 1 · Shaky 1 · Missed 0")).toBeVisible();
  const summaryPlan = page.locator("svg.walk-plan--health");
  await expect(summaryPlan).toBeVisible();
  await expect(summaryPlan.locator("[data-spot-id][data-health]")).toHaveCount(2);
  await expect(
    summaryPlan.locator('[data-health="unwalked"]'),
  ).toHaveCount(0);
  await expect(page.getByLabel("Health key")).toBeVisible();

  // Back on the plan, the palace view reflects the fresh grades: the drawn
  // plan itself is colored, no spot stays neutral, and the legend reads it.
  await page.getByRole("link", { name: "Back to the plan" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New palace" })).toBeVisible();
  await expect(
    page.locator('svg.sketch-surface__svg [data-spot-id][data-health]'),
  ).toHaveCount(2);
  await expect(
    page.locator('svg.sketch-surface__svg [data-health="unwalked"]'),
  ).toHaveCount(0);
  await expect(page.getByLabel("Health key")).toBeVisible();
  const spotNav = page.getByRole("navigation", { name: "Spots in walking order" });
  // Right after a walk both spots read a due date, and none stays unwalked.
  await expect(spotNav.getByText(/· due/).first()).toBeVisible();
  await expect(spotNav.getByText(/· due/)).toHaveCount(2);
  await expect(spotNav.getByText("Not walked yet")).toHaveCount(0);

  // The estate overview now reads the palace's health, schedules its next
  // walk, and leads the keeper to it.
  await page.getByRole("link", { name: "Palaces", exact: true }).click();
  await expect(page.getByText("Walk next")).toBeVisible();
  await expect(page.getByRole("link", { name: "Walk this palace" })).toBeVisible();
  await expect(page.getByText(/Next walk |Walk due now/)).toBeVisible();
});

test("guided first run shows once, Skip dismisses, and it never returns", async ({
  page,
}) => {
  await openNewPalace(page);

  await expect(page.getByText("Tap the plan to place a spot.")).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("Tap the plan to place a spot.")).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "New palace" })).toBeVisible();
  await expect(page.getByText("Tap the plan to place a spot.")).toHaveCount(0);
});
