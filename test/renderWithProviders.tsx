import { type ReactElement, type ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AtlasProvider } from "../src/state/AtlasContext";
import { ToastProvider } from "../src/components/Toast";
import { Autosaver } from "../src/persistence/autosave";

export function Providers({
  children,
  initialEntries = ["/"],
  autosaver,
}: {
  children: ReactNode;
  initialEntries?: string[];
  autosaver?: Autosaver;
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AtlasProvider autosaver={autosaver}>{children}</AtlasProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: { initialEntries?: string[]; autosaver?: Autosaver } = {},
) {
  return render(
    <Providers
      initialEntries={options.initialEntries}
      autosaver={options.autosaver}
    >
      {ui}
    </Providers>,
  );
}
