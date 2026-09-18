import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAtlas } from "../../state/AtlasContext";
import { isSamplePalace } from "../../features/sample/sample";
import {
  hasCompletedFirstRun,
  markFirstRunComplete,
} from "../../features/onboarding/firstRun";
import { deriveWalkthroughState } from "../../features/onboarding/steps";
import { GuidedChecklist } from "./GuidedChecklist";

// The walkthrough rides only the core-loop routes: the estate overview, a
// palace editor, and its walk. Settings and NotFound are left alone so the
// guide never competes with an unrelated screen.
function isLoopRoute(pathname: string): boolean {
  return pathname === "/" || /^\/palace\/[^/]+(\/walk)?$/.test(pathname);
}

// Mounted once in the app shell, inside the router and the atlas provider. It
// leads a brand-new keeper across the whole core loop and retires for good the
// instant they reach their own heat map or press Skip.
export function FirstRunWalkthrough() {
  const { atlas, loading } = useAtlas();
  const location = useLocation();

  // null until the first load resolves; then a fixed boolean for the session.
  const [active, setActive] = useState<boolean | null>(null);

  // Decide once, after the atlas finishes loading.
  useEffect(() => {
    if (active !== null || loading) return;
    if (hasCompletedFirstRun()) {
      setActive(false);
      return;
    }
    // A sample-only atlas (SEED_DEMO on staging) is not the keeper's own data,
    // so exclude samples: a first-time visitor still gets walked to make theirs.
    const hasOwnPalace = atlas.palaces.some((p) => !isSamplePalace(p.id));
    if (hasOwnPalace) {
      markFirstRunComplete();
      setActive(false);
    } else {
      setActive(true);
    }
  }, [active, loading, atlas]);

  const state = deriveWalkthroughState(atlas, location.pathname);

  // First success: retire the walkthrough the instant every step is done.
  useEffect(() => {
    if (active === true && state.complete) {
      markFirstRunComplete();
      setActive(false);
    }
  }, [active, state.complete]);

  if (active !== true || state.complete) return null;
  if (!isLoopRoute(location.pathname)) return null;

  const onSkip = () => {
    markFirstRunComplete();
    setActive(false);
  };

  return (
    <div className="guide-dock">
      <GuidedChecklist
        steps={state.steps}
        activeIndex={state.activeIndex}
        onSkip={onSkip}
      />
    </div>
  );
}
