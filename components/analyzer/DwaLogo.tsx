'use client'

import { memo } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

interface DwaLogoProps {
  className?: string
  /** Normalized audio level 0-1. When provided, logo gets a subtle CSS glow/pulse effect. */
  audioLevel?: number
}

/**
 * DoneWell Audio brand logo — PNG-based, theme-aware.
 * Switches between white (dark mode) and black (light mode) variants.
 * When audioLevel is provided, applies a subtle blue glow effect that
 * scales with audio intensity.
 *
 * Uses a wrapper div with `position: relative` so next/image `fill` mode
 * respects the className-driven dimensions (e.g., size-16, w-20 h-20).
 */
export const DwaLogo = memo(function DwaLogo({ className, audioLevel }: DwaLogoProps) {
  const { resolvedTheme } = useTheme()
  const src =
    resolvedTheme === 'dark'
      ? '/images/dwa-logo-white.png'
      : '/images/dwa-logo-black.png'

  // Subtle glow effect when audio is active
  const glowOpacity =
    audioLevel != null ? Math.min(1, audioLevel * 0.6 + 0.2) : 0
  const glowStyle: React.CSSProperties | undefined =
    audioLevel != null
      ? {
          filter: `drop-shadow(0 0 ${4 + audioLevel * 8}px rgba(75, 146, 255, ${glowOpacity}))`,
          transition: 'filter 100ms ease-out',
        }
      : undefined

  return (
    <div className={`relative ${className ?? ''}`} style={glowStyle}>
      <Image
        src={src}
        alt="DoneWell Audio"
        fill
        className="object-contain"
        priority
      />
    </div>
  )
})
