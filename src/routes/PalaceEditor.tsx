import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAtlas } from "../state/AtlasContext";
import { newSpot } from "../model/atlas";
import { SaveStatus } from "../components/SaveStatus";
import { SketchSurface, spotAccessibleName } from "../components/sketch/SketchSurface";
import { SpotInspector } from "../components/sketch/SpotInspector";
import { SpotList } from "../components/sketch/SpotList";
import { GuidedFirstRun } from "../components/sketch/GuidedFirstRun";
import { HealthLegend } from "../components/HealthLegend";
import { hasOnboarded, markOnboarded } from "../features/sketch/onboarding";
import {
  MAX_OUTLINE_POINTS,
  appendSpot,
  canAddSpot,
  clampContents,
  clampLabel,
  clampPointToBounds,
  insertSpotAt,
  moveSpot,
  outlinePointCount,
  removeSpotAt,
  type Point,
  type View,
} from "../features/sketch/geometry";

const SPOT_CAP_MESSAGE =
  "This palace is full at 200 spots. Start another for the rest.";

export function PalaceEditor() {
  const { id } = useParams<{ id: string }>();
  const { atlas, loading, saveStatus, retrySave, updatePalace } = useAtlas();
  const palace = atlas.palaces.find((p) => p.id === id);

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, w: 1000, h: 1000 });
  const [tool, setTool] = useState<"place" | "outline">("place");
  const [announce, setAnnounce] = useState("");
  const [guideOpen, setGuideOpen] = useState<boolean | null>(null);

  // One clock read per view: the whole plan's health is computed against this
  // moment, so pan/zoom and edits never drift the reading mid-session.
  const now = useMemo(() => new Date(), []);

  const spots = palace?.spots ?? [];
  const outlinePoints = outlinePointCount(palace?.outline);
  const firstSpotNamed = (spots[0]?.label ?? "").trim().length > 0;

  // Decide once, after load, whether the guide should appear.
  useEffect(() => {
    if (guideOpen === null && !loading && palace) {
      setGuideOpen(!hasOnboarded() && palace.spots.length === 0);
    }
  }, [guideOpen, loading, palace]);

  const dismissGuide = useCallback(() => {
    markOnboarded();
    setGuideOpen(false);
  }, []);

  // First success: the first spot is placed and named. Retire the guide.
  useEffect(() => {
    if (guideOpen && firstSpotNamed) dismissGuide();
  }, [guideOpen, firstSpotNamed, dismissGuide]);

  const placeSpotAt = useCallback(
    (p: Point) => {
      if (!palace) return;
      if (!canAddSpot(palace.spots.length)) {
        setAnnounce(SPOT_CAP_MESSAGE);
        return;
      }
      const order = palace.spots.length;
      const spot = newSpot(p.x, p.y, order);
      updatePalace(palace.id, (pal) => ({
        ...pal,
        spots: appendSpot(pal.spots, spot),
      }));
      setSelectedSpotId(spot.id);
      setAnnounce(`Placed spot ${order + 1}.`);
    },
    [palace, updatePalace],
  );

  const selectSpot = useCallback(
    (spotId: string) => {
      setSelectedSpotId(spotId);
      const s = palace?.spots.find((x) => x.id === spotId);
      if (s) setAnnounce(`${spotAccessibleName(s.order, s.label)}, selected.`);
    },
    [palace],
  );

  const addSpotAtCenter = useCallback(() => {
    const center = clampPointToBounds(
      { x: view.x + view.w / 2, y: view.y + view.h / 2 },
      palace?.viewBox ?? { w: 1000, h: 1000 },
    );
    placeSpotAt(center);
  }, [view, palace, placeSpotAt]);

  const changeLabel = useCallback(
    (spotId: string, value: string) => {
      if (!palace) return;
      const label = clampLabel(value);
      updatePalace(palace.id, (pal) => ({
        ...pal,
        spots: pal.spots.map((s) => (s.id === spotId ? { ...s, label } : s)),
      }));
    },
    [palace, updatePalace],
  );

  const changeContents = useCallback(
    (spotId: string, value: string) => {
      if (!palace) return;
      const contents = clampContents(value);
      updatePalace(palace.id, (pal) => ({
        ...pal,
        spots: pal.spots.map((s) => (s.id === spotId ? { ...s, contents } : s)),
      }));
    },
    [palace, updatePalace],
  );

  const nudgeSpot = useCallback(
    (spotId: string, dx: number, dy: number) => {
      if (!palace) return;
      const bounds = palace.viewBox;
      updatePalace(palace.id, (pal) => ({
        ...pal,
        spots: pal.spots.map((s) =>
          s.id === spotId
            ? { ...s, ...clampPointToBounds({ x: s.x + dx, y: s.y + dy }, bounds) }
            : s,
        ),
      }));
    },
    [palace, updatePalace],
  );

  const moveSpotBy = useCallback(
    (spotId: string, delta: number) => {
      if (!palace) return;
      const from = palace.spots.findIndex((s) => s.id === spotId);
      if (from < 0) return;
      updatePalace(palace.id, (pal) => ({
        ...pal,
        spots: moveSpot(pal.spots, from, from + delta),
      }));
    },
    [palace, updatePalace],
  );

  const addSpotAfter = useCallback(
    (spotId: string) => {
      if (!palace) return;
      if (!canAddSpot(palace.spots.length)) {
        setAnnounce(SPOT_CAP_MESSAGE);
        return;
      }
      const index = palace.spots.findIndex((s) => s.id === spotId);
      const anchor = palace.spots[index];
      const p = clampPointToBounds(
        { x: anchor.x + palace.viewBox.w * 0.05, y: anchor.y + palace.viewBox.h * 0.05 },
        palace.viewBox,
      );
      const spot = newSpot(p.x, p.y, index + 1);
      updatePalace(palace.id, (pal) => ({
        ...pal,
        spots: insertSpotAt(pal.spots, index + 1, spot),
      }));
      setSelectedSpotId(spot.id);
      setAnnounce(`Placed spot ${index + 2}.`);
    },
    [palace, updatePalace],
  );

  const removeSpot = useCallback(
    (spotId: string) => {
      if (!palace) return;
      const index = palace.spots.findIndex((s) => s.id === spotId);
      if (index < 0) return;
      updatePalace(palace.id, (pal) => ({
        ...pal,
        spots: removeSpotAt(pal.spots, index),
      }));
      setSelectedSpotId(null);
      setAnnounce(`Removed spot ${index + 1}.`);
    },
    [palace, updatePalace],
  );

  const drawStroke = useCallback(
    (points: Point[]) => {
      if (!palace) return;
      updatePalace(palace.id, (pal) => {
        const room = MAX_OUTLINE_POINTS - outlinePointCount(pal.outline);
        if (room <= 0) return pal;
        const capped = points.slice(0, room);
        return { ...pal, outline: [...(pal.outline ?? []), { points: capped }] };
      });
    },
    [palace, updatePalace],
  );

  const clearOutline = useCallback(() => {
    if (!palace) return;
    updatePalace(palace.id, (pal) => ({ ...pal, outline: [] }));
  }, [palace, updatePalace]);

  const selectedSpot = useMemo(
    () => spots.find((s) => s.id === selectedSpotId) ?? null,
    [spots, selectedSpotId],
  );

  if (loading) {
    return (
      <main className="container editor" aria-busy="true">
        <div className="skeleton-list" aria-hidden="true">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </main>
    );
  }

  if (!palace) {
    return (
      <main className="container">
        <div className="empty-state">
          <h2>This palace is not in your atlas.</h2>
          <div className="empty-state__actions">
            <Link className="btn btn--primary" to="/">
              Back to your palaces
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const full = !canAddSpot(spots.length);

  return (
    <main className="container editor">
      <div className="editor__head">
        <Link to="/" className="editor__back">
          All palaces
        </Link>
        <SaveStatus status={saveStatus} onRetry={retrySave} />
      </div>
      <div className="editor__title-row">
        <h1 className="editor__title">{palace.name}</h1>
        {spots.length > 0 ? (
          <Link
            className="btn btn--primary editor__walk"
            to={`/palace/${palace.id}/walk`}
          >
            Walk this palace
          </Link>
        ) : (
          <button
            className="btn btn--primary editor__walk"
            disabled
            aria-describedby="walk-hint"
          >
            Walk this palace
          </button>
        )}
      </div>
      {spots.length === 0 && (
        <p id="walk-hint" className="editor__notice">
          Add a spot to walk this palace.
        </p>
      )}

      <div className="editor__toolbar">
        <button
          className="btn btn--primary"
          onClick={addSpotAtCenter}
          disabled={full}
        >
          Add spot
        </button>
        <button
          className="btn btn--secondary"
          aria-pressed={tool === "outline"}
          onClick={() => setTool(tool === "outline" ? "place" : "outline")}
        >
          Draw room outline
        </button>
        {outlinePoints > 0 && (
          <button className="btn btn--ghost" onClick={clearOutline}>
            Clear outline
          </button>
        )}
      </div>
      {full && <p className="editor__notice">{SPOT_CAP_MESSAGE}</p>}

      <div className="editor__surface">
        <SketchSurface
          palace={palace}
          now={now}
          view={view}
          onViewChange={setView}
          onInitView={setView}
          selectedSpotId={selectedSpotId}
          onSelectSpot={selectSpot}
          onPlaceSpot={placeSpotAt}
          onNudgeSpot={nudgeSpot}
          tool={tool}
          onDrawStroke={drawStroke}
        />
        {spots.length === 0 && (
          <p className="editor__invite" aria-hidden="true">
            Tap the plan to place your first spot.
          </p>
        )}
      </div>

      {spots.length > 0 && <HealthLegend />}

      {guideOpen && (
        <GuidedFirstRun
          spotCount={spots.length}
          firstSpotNamed={firstSpotNamed}
          onSkip={dismissGuide}
        />
      )}

      {selectedSpot && (
        <SpotInspector
          spot={selectedSpot}
          total={spots.length}
          onChangeLabel={(v) => changeLabel(selectedSpot.id, v)}
          onChangeContents={(v) => changeContents(selectedSpot.id, v)}
          onMoveUp={() => moveSpotBy(selectedSpot.id, -1)}
          onMoveDown={() => moveSpotBy(selectedSpot.id, 1)}
          onAddAfter={() => addSpotAfter(selectedSpot.id)}
          onRemove={() => removeSpot(selectedSpot.id)}
        />
      )}

      <SpotList
        spots={spots}
        selectedSpotId={selectedSpotId}
        onSelect={selectSpot}
        now={now}
      />

      <div className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </div>
    </main>
  );
}
