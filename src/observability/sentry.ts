import * as Sentry from "@sentry/react";
import type { ErrorEvent, EventHint, Breadcrumb } from "@sentry/react";
import { getRuntimeConfig } from "../config/runtimeConfig";

// Keep only message, exception (type/value/stacktrace) and release-ish
// metadata. Everything that could carry a spot's `contents` or `label`
// (extra, contexts, request bodies, breadcrumbs) is dropped before send.
export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
  const scrubbed: ErrorEvent = {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
    message: event.message,
    exception: event.exception,
    type: event.type,
  };
  return scrubbed;
}

// Drop console and DOM breadcrumbs entirely: a keeper typing spot contents
// into an input must never leak into an error report.
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console" || breadcrumb.category === "ui.input") {
    return null;
  }
  if (breadcrumb.type === "dom") {
    return null;
  }
  return breadcrumb;
}

export function initSentry(): boolean {
  const { sentryDsn } = getRuntimeConfig();
  if (!sentryDsn) return false;

  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
  return true;
}
