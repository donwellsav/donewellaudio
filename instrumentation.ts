/**
 * Next.js instrumentation hook — loads Sentry server-side SDK at startup.
 *
 * This file is auto-detected by Next.js 13+ and called once during
 * server initialization.
 */

import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
