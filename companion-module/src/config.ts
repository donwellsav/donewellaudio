import type { SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
  siteUrl: string
  pairingCode: string
  pollIntervalMs: number
  maxCutDb: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
  return [
    {
      type: 'textinput',
      id: 'pairingCode',
      label: 'Pairing Code',
      default: '',
      width: 6,
    },
    {
      type: 'textinput',
      id: 'siteUrl',
      label: 'Site URL',
      default: '',
      width: 6,
    },
    {
      type: 'number',
      id: 'pollIntervalMs',
      label: 'Poll Interval (ms)',
      default: 500,
      min: 200,
      max: 5000,
      step: 100,
      width: 6,
    },
    {
      type: 'number',
      id: 'maxCutDb',
      label: 'Max Cut Depth (dB)',
      default: -12,
      min: -24,
      max: -3,
      step: 1,
      width: 6,
    },
  ]
}
