import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initUmami } from "./umami";

beforeEach(() => {
  window.__ENV__ = {};
  document.head.innerHTML = "";
});
afterEach(() => {
  window.__ENV__ = {};
  document.head.innerHTML = "";
});

describe("initUmami", () => {
  it("does not inject a tag when config is missing", () => {
    expect(initUmami(document)).toBe(false);
    expect(document.querySelector("#umami-analytics")).toBeNull();
  });

  it("does not inject with only one of the two values", () => {
    window.__ENV__ = { UMAMI_URL: "https://umami.example.com/script.js" };
    expect(initUmami(document)).toBe(false);
    expect(document.querySelector("#umami-analytics")).toBeNull();
  });

  it("injects a script tag when both values are set", () => {
    window.__ENV__ = {
      UMAMI_URL: "https://umami.example.com/script.js",
      UMAMI_WEBSITE_ID: "abc-123",
    };
    expect(initUmami(document)).toBe(true);
    const tag = document.querySelector<HTMLScriptElement>("#umami-analytics");
    expect(tag).not.toBeNull();
    expect(tag?.src).toBe("https://umami.example.com/script.js");
    expect(tag?.getAttribute("data-website-id")).toBe("abc-123");
  });

  it("does not inject twice", () => {
    window.__ENV__ = {
      UMAMI_URL: "https://umami.example.com/script.js",
      UMAMI_WEBSITE_ID: "abc-123",
    };
    initUmami(document);
    initUmami(document);
    expect(document.querySelectorAll("#umami-analytics")).toHaveLength(1);
  });
});
