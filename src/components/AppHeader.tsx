import { NavLink } from "react-router-dom";
import { useAtlas } from "../state/AtlasContext";
import { SaveStatus } from "./SaveStatus";

export function AppHeader() {
  const { saveStatus, retrySave } = useAtlas();
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <NavLink to="/" className="app-header__brand">
          <span aria-hidden="true">🗺️</span>
          The Palace Atlas
        </NavLink>
        <nav className="app-header__nav" aria-label="Main">
          <SaveStatus status={saveStatus} onRetry={retrySave} />
          <NavLink to="/" end className="app-header__link">
            Palaces
          </NavLink>
          <NavLink to="/settings" className="app-header__link">
            Settings
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
