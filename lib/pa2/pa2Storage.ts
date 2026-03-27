import { typedStorage } from '@/lib/storage/dwaStorage'
import { DEFAULT_PA2_SETTINGS } from '@/types/pa2'
import type { PA2Settings } from '@/types/pa2'

export const pa2Storage = typedStorage<PA2Settings>(
  'dwa-pa2',
  DEFAULT_PA2_SETTINGS,
)
