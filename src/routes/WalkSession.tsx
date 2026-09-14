import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAtlas } from "../state/AtlasContext";
import { SaveStatus } from "../components/SaveStatus";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { WalkPlan } from "../components/walk/WalkPlan";
import { WalkStep } from "../components/walk/WalkStep";
import { WalkSummary } from "../components/walk/WalkSummary";
import {
  assembleCompletedWalk,
  type WalkResult,
} from "../features/walk/walkSession";
import type { Grade } from "../features/walk/scheduler";

// The recall walk. It steps through one palace's spots in stored order, holding
// the whole in-progress walk in component state. Nothing is written until the
// last grade, when a single atomic mutation advances every spot's fsrs and
// appends one Walk record. Leaving before then cleanly discards the walk, so the
// atlas is never left with a corrupt half-walk.
export function WalkSession() {
  const { id } = useParams<{ id: string }>();
  const { atlas, loading, saveStatus, retrySave, updatePalace } = useAtlas();
  const palace = atlas.palaces.find((p) => p.id === id);
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<WalkResult[]>([]);
  const [done, setDone] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const startedAtRef = useRef<Date | null>(null);
  const completedAtRef = useRef<Date | null>(null);

  const spotCount = palace?.spots.length ?? 0;

  // Stamp the start once, when the first real step is on screen.
  useEffect(() => {
    if (palace && spotCount > 0 && !done && startedAtRef.current === null) {
      startedAtRef.current = new Date();
    }
  }, [palace, spotCount, done]);

  const leaveToPalace = useCallback(() => {
    navigate(`/palace/${id}`);
  }, [navigate, id]);

  const handleLeave = useCallback(() => {
    if (results.length > 0 && !done) {
      setConfirmLeave(true);
    } else {
      leaveToPalace();
    }
  }, [results.length, done, leaveToPalace]);

  const onReveal = useCallback(() => setRevealed(true), []);

  const onGrade = useCallback(
    (grade: Grade) => {
      if (!palace) return;
      const spot = palace.spots[index];
      if (!spot) return;
      const nextResults = [...results, { spotId: spot.id, grade }];
      setResults(nextResults);

      const isLast = index >= palace.spots.length - 1;
      if (isLast) {
        const startedAt = startedAtRef.current ?? new Date();
        const completedAt = new Date();
        completedAtRef.current = completedAt;
        // One atomic mutation: every graded spot's state plus the walk record,
        // scheduled through the debounced autosaver. No await, so the visible
        // advance to the summary is instant.
        updatePalace(palace.id, (p) =>
          assembleCompletedWalk(p, nextResults, startedAt, completedAt),
        );
        setDone(true);
      } else {
        setIndex(index + 1);
        setRevealed(false);
      }
    },
    [palace, index, results, updatePalace],
  );

  if (loading) {
    return (
      <main className="container walk" aria-busy="true">
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

  if (spotCount === 0) {
    return (
      <main className="container">
        <div className="empty-state">
          <h2>Add your first spot, then walk.</h2>
          <p>A walk steps through the spots you placed, one at a time.</p>
          <div className="empty-state__actions">
            <Link className="btn btn--primary" to={`/palace/${palace.id}`}>
              Add a spot
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="container walk">
        <div className="walk__head">
          <Link to={`/palace/${palace.id}`} className="editor__back">
            All spots
          </Link>
          <SaveStatus status={saveStatus} onRetry={retrySave} />
        </div>
        <WalkSummary
          palace={palace}
          results={results}
          now={completedAtRef.current ?? new Date()}
        />
      </main>
    );
  }

  const currentSpot = palace.spots[index];

  return (
    <main className="container walk">
      <div className="walk__head">
        <button className="btn btn--ghost walk__leave" onClick={handleLeave}>
          Leave walk
        </button>
        <SaveStatus status={saveStatus} onRetry={retrySave} />
      </div>

      <p className="walk__progress" role="status" aria-live="polite">
        Spot {index + 1} of {spotCount}
      </p>

      <div className="walk__plan">
        <WalkPlan palace={palace} activeSpotId={currentSpot.id} />
      </div>

      <div className="walk__band">
        <WalkStep
          key={currentSpot.id}
          spot={currentSpot}
          revealed={revealed}
          onReveal={onReveal}
          onGrade={onGrade}
        />
      </div>

      {confirmLeave && (
        <ConfirmDialog
          title="Leave this walk? Your grades are saved only when you finish."
          confirmLabel="Leave walk"
          cancelLabel="Keep walking"
          tone="danger"
          onConfirm={leaveToPalace}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
    </main>
  );
}
