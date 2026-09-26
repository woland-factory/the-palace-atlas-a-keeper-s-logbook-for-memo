import { describe, expect, it } from "vitest";
import { uuidv4 } from "./uuid";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv4", () => {
  it("returns a well-formed v4 uuid", () => {
    expect(uuidv4()).toMatch(V4);
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv4()));
    expect(ids.size).toBe(1000);
  });

  it("falls back to getRandomValues when randomUUID is absent (plain-HTTP staging)", () => {
    // Reproduce the insecure-context shape: randomUUID undefined, but
    // getRandomValues present. This is exactly what staging over plain HTTP
    // exposed, where calling randomUUID directly threw.
    const original = crypto.randomUUID;
    try {
      // @ts-expect-error simulate an insecure context where the property is gone
      crypto.randomUUID = undefined;
      const id = uuidv4();
      expect(id).toMatch(V4);
      expect(uuidv4()).not.toBe(id);
    } finally {
      crypto.randomUUID = original;
    }
  });
});
