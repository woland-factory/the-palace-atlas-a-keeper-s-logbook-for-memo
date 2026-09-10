import { afterEach, describe, expect, it, vi } from "vitest";
import type { ErrorEvent } from "@sentry/react";
import { initSentry, scrubBreadcrumb, scrubEvent } from "./sentry";

afterEach(() => {
  window.__ENV__ = {};
  vi.restoreAllMocks();
});

describe("initSentry", () => {
  it("is a no-op with no DSN", () => {
    window.__ENV__ = {};
    expect(initSentry()).toBe(false);
  });

  it("initializes when a DSN is set", () => {
    window.__ENV__ = { SENTRY_DSN: "https://examplePublicKey@o0.ingest.example.com/0" };
    expect(initSentry()).toBe(true);
  });
});

describe("scrubEvent", () => {
  it("drops any body beyond message, exception and release metadata", () => {
    const event = {
      event_id: "1",
      message: "boom",
      exception: { values: [{ type: "Error", value: "boom" }] },
      // Fields that could carry a spot's contents/label:
      extra: { contents: "The number 7", label: "Front door" },
      contexts: { state: { atlas: { palaces: [{ contents: "secret" }] } } },
      request: { data: { contents: "secret" } },
      breadcrumbs: [{ message: "typed: secret contents" }],
    } as unknown as ErrorEvent;

    const scrubbed = scrubEvent(event);
    const serialized = JSON.stringify(scrubbed);
    expect(serialized).not.toContain("The number 7");
    expect(serialized).not.toContain("Front door");
    expect(serialized).not.toContain("secret");
    expect(scrubbed.message).toBe("boom");
    expect(scrubbed.exception).toBeDefined();
    expect("extra" in scrubbed).toBe(false);
    expect("contexts" in scrubbed).toBe(false);
    expect("request" in scrubbed).toBe(false);
    expect("breadcrumbs" in scrubbed).toBe(false);
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console, input and DOM breadcrumbs", () => {
    expect(scrubBreadcrumb({ category: "console", message: "x" })).toBeNull();
    expect(scrubBreadcrumb({ category: "ui.input" })).toBeNull();
    expect(scrubBreadcrumb({ type: "dom" })).toBeNull();
  });

  it("keeps navigation breadcrumbs", () => {
    const bc = { category: "navigation", data: { to: "/settings" } };
    expect(scrubBreadcrumb(bc)).toBe(bc);
  });
});
