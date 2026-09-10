export function EmptyState({
  onAddPalace,
  onLoadSample,
}: {
  onAddPalace: () => void;
  onLoadSample: () => void;
}) {
  return (
    <section className="empty-state">
      <h2>Start your atlas</h2>
      <p>Draw the buildings you memorize in and keep them safe outside your head.</p>
      <div className="empty-state__actions">
        <button className="btn btn--primary" onClick={onAddPalace}>
          Add your first palace
        </button>
        <button className="btn btn--ghost" onClick={onLoadSample}>
          Load the sample
        </button>
      </div>
    </section>
  );
}
