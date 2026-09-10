import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Autosaver, DEBOUNCE_MS } from "./autosave";
import { newAtlas, newPalace, type Atlas } from "../model/atlas";

function atlasWith(name: string): Atlas {
  return { ...newAtlas(), palaces: [newPalace(name)] };
}

describe("Autosaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces rapid schedules into a single save", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const saver = new Autosaver(saveFn);

    saver.schedule(atlasWith("a"));
    saver.schedule(atlasWith("b"));
    saver.schedule(atlasWith("c"));
    expect(saver.getStatus()).toBe("saving");
    expect(saveFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn.mock.calls[0][0].palaces[0].name).toBe("c");
    expect(saver.getStatus()).toBe("saved");
  });

  it("notifies subscribers of status transitions", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const saver = new Autosaver(saveFn);
    const seen: string[] = [];
    saver.subscribe((s) => seen.push(s));

    saver.schedule(atlasWith("a"));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(seen).toEqual(["saving", "saved"]);
  });

  it("flush persists a pending snapshot immediately", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const saver = new Autosaver(saveFn);
    saver.schedule(atlasWith("a"));
    await saver.flush();
    expect(saveFn).toHaveBeenCalledTimes(1);
    // A later flush with nothing pending is a no-op.
    await saver.flush();
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  it("saveNow bypasses the debounce", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const saver = new Autosaver(saveFn);
    await saver.saveNow(atlasWith("now"));
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saver.getStatus()).toBe("saved");
  });

  it("sets error status and keeps the snapshot on a rejected write", async () => {
    const saveFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValueOnce(undefined);
    const saver = new Autosaver(saveFn);

    saver.schedule(atlasWith("a"));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saver.getStatus()).toBe("error");

    // Retry via flush succeeds because the snapshot was retained.
    await saver.flush();
    expect(saveFn).toHaveBeenCalledTimes(2);
    expect(saver.getStatus()).toBe("saved");
  });
});
