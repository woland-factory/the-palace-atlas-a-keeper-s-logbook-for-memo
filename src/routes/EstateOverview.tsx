import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAtlas } from "../state/AtlasContext";
import { EmptyState } from "../components/EmptyState";
import { PalaceCard } from "../components/PalaceCard";
import { NewPalaceForm } from "../components/NewPalaceForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { getSampleAtlas } from "../features/sample/sample";
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
            {palaces.map((palace) => (
              <PalaceCard
                key={palace.id}
                palace={palace}
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
