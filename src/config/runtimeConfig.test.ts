import { afterEach, describe, expect, it } from "vitest";
import { getRuntimeConfig } from "./runtimeConfig";

afterEach(() => {
  window.__ENV__ = {};
});

describe("getRuntimeConfig", () => {
  it("treats missing env as all unset", () => {
    window.__ENV__ = {};
    const cfg = getRuntimeConfig();
    expect(cfg).toEqual({
      sentryDsn: "",
      umamiUrl: "",
      umamiWebsiteId: "",
      seedDemo: false,
    });
  });

  it("treats blank strings as unset and trims values", () => {
    window.__ENV__ = { SENTRY_DSN: "  ", UMAMI_URL: "  https://u.example/s.js  " };
    const cfg = getRuntimeConfig();
    expect(cfg.sentryDsn).toBe("");
    expect(cfg.umamiUrl).toBe("https://u.example/s.js");
  });

  it("reads seedDemo only when exactly '1'", () => {
    window.__ENV__ = { SEED_DEMO: "1" };
    expect(getRuntimeConfig().seedDemo).toBe(true);
    window.__ENV__ = { SEED_DEMO: "0" };
    expect(getRuntimeConfig().seedDemo).toBe(false);
  });
});
