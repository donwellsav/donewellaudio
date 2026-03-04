'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4 px-6">
        <div className="text-5xl">🎤</div>
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re Offline</h1>
        <p className="text-muted-foreground max-w-sm">
          Kill The Ring needs a connection for the first load. Once cached, the app
          launches instantly — even at the venue with no Wi-Fi.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
