import { getRuntimeConfig } from "../config/runtimeConfig";

const SCRIPT_ID = "umami-analytics";

// Inject the Umami script tag only when BOTH the endpoint and the website id
// are set. Page views only; no custom event ever carries user text.
export function initUmami(doc: Document = document): boolean {
  const { umamiUrl, umamiWebsiteId } = getRuntimeConfig();
  if (!umamiUrl || !umamiWebsiteId) return false;
  if (doc.getElementById(SCRIPT_ID)) return true;

  const script = doc.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.defer = true;
  script.src = umamiUrl;
  script.setAttribute("data-website-id", umamiWebsiteId);
  doc.head.appendChild(script);
  return true;
}
