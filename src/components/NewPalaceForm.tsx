import { useRef, useState, type FormEvent } from "react";

export function NewPalaceForm({
  onCreate,
}: {
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    onCreate(trimmed);
    setName("");
    inputRef.current?.focus();
  };

  return (
    <form className="new-palace" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="new-palace-name">Palace name</label>
        <input
          id="new-palace-name"
          ref={inputRef}
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Childhood home"
          autoComplete="off"
          maxLength={120}
        />
      </div>
      <button className="btn btn--primary" type="submit" disabled={!name.trim()}>
        Add a palace
      </button>
    </form>
  );
}
