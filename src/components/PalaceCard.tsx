import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Palace } from "../model/atlas";
import { isSamplePalace } from "../features/sample/sample";
import { palaceHealth } from "../features/walk/palaceHealth";
import { HEALTH_TEXT, formatNextWalk } from "../features/walk/healthText";
import { PalaceThumbnail } from "./sketch/PalaceThumbnail";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PalaceCard({
  palace,
  now,
  walkNext = false,
  onRename,
  onDelete,
}: {
  palace: Palace;
  now: Date;
  walkNext?: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(palace.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSample = isSamplePalace(palace.id);
  const health = useMemo(() => palaceHealth(palace, now), [palace, now]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(palace.name);
    setEditing(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed && trimmed !== palace.name) onRename(palace.id, trimmed);
    setEditing(false);
  };

  const spotCount = palace.spots.length;
  const spotLabel = spotCount === 1 ? "1 spot" : `${spotCount} spots`;

  return (
    <li className="palace-card">
      <Link
        to={`/palace/${palace.id}`}
        className="palace-card__thumb"
        aria-hidden="true"
        tabIndex={-1}
      >
        <PalaceThumbnail palace={palace} now={now} />
      </Link>
      <div className="palace-card__body">
        {editing ? (
          <form onSubmit={submit} className="field">
            <label htmlFor={`rename-${palace.id}`} className="visually-hidden">
              Palace name
            </label>
            <input
              id={`rename-${palace.id}`}
              ref={inputRef}
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submit}
              maxLength={120}
            />
          </form>
        ) : (
          <h3 className="palace-card__name">
            <Link to={`/palace/${palace.id}`} className="palace-card__link">
              {palace.name}
            </Link>
            {isSample && <span className="tag">Sample</span>}
            {walkNext && <span className="tag tag--walk-next">Walk next</span>}
          </h3>
        )}
        <p className="palace-card__meta">
          {spotLabel}
          {palace.createdAt ? ` · Added ${formatDate(palace.createdAt)}` : ""}
        </p>
        {/* A palace with nothing drawn has no health to report; its card
            invites drawing through the spot count instead. */}
        {spotCount > 0 && (
          <p className="palace-card__health" data-health={health.overall}>
            <span className="palace-card__health-word">
              {HEALTH_TEXT[health.overall]}
            </span>
            {health.nextDue ? ` · ${formatNextWalk(health.nextDue, now)}` : ""}
          </p>
        )}
      </div>
      <div className="palace-card__actions">
        {walkNext && (
          <Link className="btn btn--primary" to={`/palace/${palace.id}/walk`}>
            Walk this palace
          </Link>
        )}
        {!editing && (
          <button className="btn btn--secondary" onClick={startEdit}>
            Rename
          </button>
        )}
        <button className="btn btn--danger" onClick={() => onDelete(palace.id)}>
          Delete
        </button>
      </div>
    </li>
  );
}
