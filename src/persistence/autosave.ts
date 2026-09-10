import type { Atlas } from "../model/atlas";
import { saveAtlas } from "./atlasStore";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export const DEBOUNCE_MS = 400;

type SaveFn = (atlas: Atlas) => Promise<void>;
type Listener = (status: SaveStatus) => void;

// Debounced writer with an observable SaveStatus. Every mutation calls
// schedule(); a wholesale replace (import, load sample) calls saveNow() so it
// is durable at once. Pending saves flush on visibilitychange/beforeunload so
// a quick edit-then-close never loses data.
export class Autosaver {
  private status: SaveStatus = "idle";
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: Atlas | null = null;
  private saveFn: SaveFn;

  constructor(saveFn: SaveFn = saveAtlas) {
    this.saveFn = saveFn;
  }

  getStatus(): SaveStatus {
    return this.status;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(next: SaveStatus): void {
    this.status = next;
    for (const listener of this.listeners) listener(next);
  }

  // Schedule a debounced save of the given atlas snapshot.
  schedule(atlas: Atlas): void {
    this.pending = atlas;
    this.setStatus("saving");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.flush();
    }, DEBOUNCE_MS);
  }

  // Persist any pending snapshot immediately.
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending === null) return;
    const atlas = this.pending;
    this.pending = null;
    await this.write(atlas);
  }

  // Persist immediately, bypassing the debounce (used by import/load-sample).
  async saveNow(atlas: Atlas): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = null;
    this.setStatus("saving");
    await this.write(atlas);
  }

  private async write(atlas: Atlas): Promise<void> {
    try {
      await this.saveFn(atlas);
      this.setStatus("saved");
    } catch {
      // Keep the snapshot so the user can retry.
      this.pending = atlas;
      this.setStatus("error");
    }
  }
}
