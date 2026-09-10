import type { SaveStatus as Status } from "../persistence/autosave";

const LABELS: Record<Status, string> = {
  idle: "",
  saving: "Saving",
  saved: "Saved",
  error: "Your last change did not save. Try again.",
};

export function SaveStatus({
  status,
  onRetry,
}: {
  status: Status;
  onRetry: () => void;
}) {
  if (status === "idle") return null;
  const label = LABELS[status];
  return (
    <div className="save-status" data-status={status} role="status" aria-live="polite">
      <span className="save-status__dot" aria-hidden="true" />
      <span>{label}</span>
      {status === "error" && (
        <button className="btn btn--ghost" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
