'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/analyzer/ErrorBoundary'

const AudioAnalyzer = dynamic(
  () => import('@/components/analyzer/AudioAnalyzer').then((m) => m.AudioAnalyzer),
  { ssr: false }
)

export const AudioAnalyzerClient = memo(function AudioAnalyzerClient() {
  return (
    <ErrorBoundary>
      <AudioAnalyzer />
    </ErrorBoundary>
  )
})
