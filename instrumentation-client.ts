/**
 * Sentry client-side initialization — runs in the browser runtime.
 *
 * This captures:
 *  - Unhandled exceptions and promise rejections
 *  - React ErrorBoundary-reported errors
 *  - DSP worker crash reports (via Sentry.captureMessage)
 *  - Console errors (if enabled)
 *
 * Configuration:
 *  - Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 *  - Tracing: 10% of sessions in production, 100% in dev
 *  - Replay: 10% baseline, 100% on error sessions
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable SDK gracefully when no DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: sample 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session Replay: capture 10% of sessions, 100% when errors occur
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Tag all events with the app version for release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION
    ? `killthering@${process.env.NEXT_PUBLIC_APP_VERSION}`
    : undefined,

  environment: process.env.NODE_ENV,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Filter noisy errors that aren't actionable
  beforeSend(event) {
    // Ignore ResizeObserver errors (browser quirk, not a real bug)
    if (event.exception?.values?.some(
      (v) => v.value?.includes('ResizeObserver loop')
    )) {
      return null
    }
    return event
  },
})

// Required by @sentry/nextjs to instrument client-side navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
