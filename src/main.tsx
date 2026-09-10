import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AtlasProvider } from "./state/AtlasContext";
import { ToastProvider } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initSentry } from "./observability/sentry";
import { initUmami } from "./observability/umami";
import "./styles/tokens.css";
import "./styles/global.css";

initSentry();
initUmami();

const container = document.getElementById("root");
if (!container) throw new Error("Root container missing.");

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
