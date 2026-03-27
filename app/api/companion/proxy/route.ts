import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy for Companion HTTP requests.
 *
 * The DoneWell PWA runs in a browser which enforces CORS. Companion's HTTP
 * server doesn't return CORS headers, so browser fetch() fails. This API
 * route proxies the request server-side where CORS doesn't apply.
 *
 * Usage:
 *   POST /api/companion/proxy
 *   Body: { url: "http://192.168.0.108:8000/instance/DoneWell/status", method: "GET" }
 *   Body: { url: "http://..../advisory", method: "POST", body: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const { url, method, body } = (await request.json()) as {
      url: string
      method?: string
      body?: unknown
    }

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    const fetchOptions: RequestInit = {
      method: method ?? 'GET',
      signal: AbortSignal.timeout(3000),
    }

    if (body && method === 'POST') {
      fetchOptions.headers = { 'Content-Type': 'application/json' }
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)
    const text = await response.text()

    // Try to parse as JSON, fall back to text
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
