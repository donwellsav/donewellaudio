/**
 * Sentry Edge runtime initialization — runs in Edge functions/middleware.
 *
 * KillTheRing doesn't currently use Edge middleware, but this file
 * is required by @sentry/nextjs for completeness.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  release: process.env.NEXT_PUBLIC_APP_VERSION
    ? `killthering@${process.env.NEXT_PUBLIC_APP_VERSION}`
    : undefined,

  environment: process.env.NODE_ENV,
})
