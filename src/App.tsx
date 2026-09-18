import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { FirstRunWalkthrough } from "./components/onboarding/FirstRunWalkthrough";
import { EstateOverview } from "./routes/EstateOverview";
import { PalaceEditor } from "./routes/PalaceEditor";
import { WalkSession } from "./routes/WalkSession";
import { Settings } from "./routes/Settings";
import { NotFound } from "./routes/NotFound";

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppHeader />
        <FirstRunWalkthrough />
        <Routes>
          <Route path="/" element={<EstateOverview />} />
          <Route path="/palace/:id" element={<PalaceEditor />} />
          <Route path="/palace/:id/walk" element={<WalkSession />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
