/**
 * Sentry server-side initialization — runs in the Node.js runtime.
 *
 * Captures errors from:
 *  - API routes (app/api/*)
 *  - React Server Components
 *  - Server Actions
 *
 * DoneWell Audio is primarily client-side, so server errors are rare.
 * The ingest API route is the main server-side code path.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  release: process.env.NEXT_PUBLIC_APP_VERSION
    ? `donewellaudio@${process.env.NEXT_PUBLIC_APP_VERSION}`
    : undefined,

  environment: process.env.NODE_ENV,
})
