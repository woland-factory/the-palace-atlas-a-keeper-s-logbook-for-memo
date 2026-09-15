import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAtlas } from "../state/AtlasContext";
import { EmptyState } from "../components/EmptyState";
import { PalaceCard } from "../components/PalaceCard";
import { NewPalaceForm } from "../components/NewPalaceForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { getSampleAtlas } from "../features/sample/sample";
import { mostAtRisk, sortByRisk } from "../features/walk/palaceHealth";
import { useToast } from "../components/Toast";

function LoadingSkeleton() {
  return (
    <div className="skeleton-list" aria-hidden="true">
      <div className="skeleton-card" />
      <div className="skeleton-card" />
      <div className="skeleton-card" />
    </div>
  );
}

export function EstateOverview() {
  const {
    atlas,
    loading,
    createPalace,
    renamePalace,
    deletePalace,
    replaceAtlas,
  } = useAtlas();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const palaces = atlas.palaces;
  const hasPalaces = palaces.length > 0;

  // One clock read per view; the whole overview's health agrees with itself.
  const now = useMemo(() => new Date(), []);
  const ordered = useMemo(() => sortByRisk(palaces, now), [palaces, now]);
  const walkNextId = useMemo(
    () => mostAtRisk(palaces, now)?.id ?? null,
    [palaces, now],
  );

  const loadSample = () => {
    replaceAtlas(getSampleAtlas());
    showToast("Sample loaded.");
  };

  const confirmDelete = () => {
    if (pendingDelete) deletePalace(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <main className="container" aria-busy={loading}>
      <div className="page-head">
        <div>
          <h1>Your palaces</h1>
          {hasPalaces && (
            <p>Every building you memorize in, kept safe outside your head.</p>
          )}
        </div>
        <button className="btn btn--ghost" onClick={() => navigate("/settings")}>
          Export or import
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : hasPalaces ? (
        <>
          <NewPalaceForm onCreate={createPalace} />
          <ul className="palace-list">
            {ordered.map((palace) => (
              <PalaceCard
                key={palace.id}
                palace={palace}
                now={now}
                walkNext={palace.id === walkNextId}
                onRename={renamePalace}
                onDelete={setPendingDelete}
              />
            ))}
          </ul>
        </>
      ) : (
        <EmptyState onAddPalace={() => createPalace("New palace")} onLoadSample={loadSample} />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this palace? Its spots and history go with it."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
