import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

// A tiny host that opens the dialog from a real trigger button, so the test can
// assert focus is handed back to the trigger when the dialog closes.
function Host({ onConfirm }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Delete palace</button>
      {open && (
        <ConfirmDialog
          title="Delete this palace?"
          confirmLabel="Delete"
          cancelLabel="Keep it"
          onConfirm={() => {
            onConfirm?.();
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe("ConfirmDialog focus management", () => {
  it("moves focus to the confirm control when it opens", async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole("button", { name: "Delete palace" }));
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
  });

  it("keeps Tab inside the dialog while it is open", async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole("button", { name: "Delete palace" }));
    const dialog = screen.getByRole("dialog");

    // Forward from the last control wraps to the first; back from the first
    // wraps to the last. Focus never lands on the trigger behind the modal.
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("returns focus to the trigger when it closes", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Delete palace" });
    await user.click(trigger);

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("closes and returns focus after confirming", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Host onConfirm={onConfirm} />);
    const trigger = screen.getByRole("button", { name: "Delete palace" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });
});
