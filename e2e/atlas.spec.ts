import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

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

  // Clear everything, then import the file back.
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
