import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { newAtlas, newPalace, type Atlas, type Palace } from "../model/atlas";
import { loadAtlas } from "../persistence/atlasStore";
import { Autosaver, type SaveStatus } from "../persistence/autosave";

export interface AtlasContextValue {
  atlas: Atlas;
  loading: boolean;
  saveStatus: SaveStatus;
  createPalace: (name: string) => void;
  renamePalace: (id: string, name: string) => void;
  updatePalace: (id: string, update: (palace: Palace) => Palace) => void;
  deletePalace: (id: string) => void;
  replaceAtlas: (atlas: Atlas) => void;
  retrySave: () => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);

export function AtlasProvider({
  children,
  autosaver,
}: {
  children: ReactNode;
  autosaver?: Autosaver;
}) {
  const saverRef = useRef<Autosaver>(autosaver ?? new Autosaver());
  const [atlas, setAtlas] = useState<Atlas>(() => newAtlas());
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    saverRef.current.getStatus(),
  );

  // Mirror save status into React state for the indicator.
  useEffect(() => {
    return saverRef.current.subscribe(setSaveStatus);
  }, []);

  // Initial load. Do not write on read.
  useEffect(() => {
    let cancelled = false;
    loadAtlas()
      .then((loaded) => {
        if (!cancelled) setAtlas(loaded);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Flush pending saves when the tab is hidden or closing.
  useEffect(() => {
    const saver = saverRef.current;
    const onHidden = () => {
      if (document.visibilityState === "hidden") void saver.flush();
    };
    const onBeforeUnload = () => {
      void saver.flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  const createPalace = useCallback(
    (name: string) => {
      setAtlas((current) => {
        const next: Atlas = {
          ...current,
          palaces: [...current.palaces, newPalace(name)],
        };
        saverRef.current.schedule(next);
        return next;
      });
    },
    [],
  );

  const renamePalace = useCallback((id: string, name: string) => {
    setAtlas((current) => {
      const next: Atlas = {
        ...current,
        palaces: current.palaces.map((p) =>
          p.id === id ? { ...p, name } : p,
        ),
      };
      saverRef.current.schedule(next);
      return next;
    });
  }, []);

  // The single path for every sketch edit. It maps over the palaces, applies
  // the updater to the one that matches, and schedules a debounced save, so all
  // spot and outline edits reuse the same autosave and its status indicator.
  const updatePalace = useCallback(
    (id: string, update: (palace: Palace) => Palace) => {
      setAtlas((current) => {
        const next: Atlas = {
          ...current,
          palaces: current.palaces.map((p) => (p.id === id ? update(p) : p)),
        };
        saverRef.current.schedule(next);
        return next;
      });
    },
    [],
  );

  const deletePalace = useCallback((id: string) => {
    setAtlas((current) => {
      const next: Atlas = {
        ...current,
        palaces: current.palaces.filter((p) => p.id !== id),
      };
      saverRef.current.schedule(next);
      return next;
    });
  }, []);

  const replaceAtlas = useCallback((incoming: Atlas) => {
    const next: Atlas = { ...incoming, exportedAt: null };
    setAtlas(next);
    void saverRef.current.saveNow(next);
  }, []);

  const retrySave = useCallback(() => {
    void saverRef.current.flush();
  }, []);

  const value = useMemo<AtlasContextValue>(
    () => ({
      atlas,
      loading,
      saveStatus,
      createPalace,
      renamePalace,
      updatePalace,
      deletePalace,
      replaceAtlas,
      retrySave,
    }),
    [
      atlas,
      loading,
      saveStatus,
      createPalace,
      renamePalace,
      updatePalace,
      deletePalace,
      replaceAtlas,
      retrySave,
    ],
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas(): AtlasContextValue {
  const ctx = useContext(AtlasContext);
  if (!ctx) {
    throw new Error("useAtlas must be used within an AtlasProvider.");
  }
  return ctx;
}
