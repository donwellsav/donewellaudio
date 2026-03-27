import * as dgram from 'node:dgram'
import * as net from 'node:net'
import type { ModuleConfig } from './config.js'
import { getMixerProfile } from './mixerProfiles.js'
import type { MixerProfile, EqMessage } from './mixerProfiles.js'

/** Advisory payload from the relay */
export interface DwaAdvisory {
  id: string
  peq: { type: string; hz: number; q: number; gainDb: number }
  geq: { bandHz: number; bandIndex: number; suggestedDb: number }
  severity: string
  confidence: number
}

/** A PEQ slot actively in use on the mixer */
export interface ActiveSlot {
  band: number
  advisoryId: string
  freqHz: number
  gainDb: number
  q: number
  severity: string
  timestamp: number
}

/**
 * Encode an OSC message (minimal implementation — no external deps).
 * OSC spec: address (string) + type tag (string) + arguments.
 */
function oscString(str: string): Buffer {
  const buf = Buffer.from(str + '\0')
  const pad = 4 - (buf.length % 4)
  return pad < 4 ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf
}

function oscFloat(val: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeFloatBE(val, 0)
  return buf
}

function oscMessage(address: string, args: Array<{ type: 'f'; value: number }>): Buffer {
  const addrBuf = oscString(address)
  const typeTags = ',' + args.map((a) => a.type).join('')
  const tagBuf = oscString(typeTags)
  const argBufs = args.map((a) => oscFloat(a.value))
  return Buffer.concat([addrBuf, tagBuf, ...argBufs])
}

/** Severity priority for slot replacement (higher = harder to replace) */
const SEVERITY_PRIORITY: Record<string, number> = {
  RUNAWAY: 5,
  GROWING: 4,
  WHISTLE: 3,
  RESONANCE: 2,
  POSSIBLE_RING: 1,
  INSTRUMENT: 0,
}

export class MixerOutput {
  private udpSocket: dgram.Socket | null = null
  private tcpSocket: net.Socket | null = null
  private config: ModuleConfig
  private log: (level: string, msg: string) => void
  private profile: MixerProfile

  /** Active PEQ slots on the mixer — keyed by band number */
  activeSlots: Map<number, ActiveSlot> = new Map()

  /** Session action log for export */
  sessionLog: Array<{ action: string; freqHz: number; gainDb: number; q: number; band: number; timestamp: number }> = []

  constructor(config: ModuleConfig, log: (level: string, msg: string) => void) {
    this.config = config
    this.log = log
    this.profile = getMixerProfile(config.mixerModel)
  }

  updateConfig(config: ModuleConfig): void {
    this.config = config
    this.profile = getMixerProfile(config.mixerModel)
    this.disconnect()
  }

  disconnect(): void {
    if (this.udpSocket) {
      this.udpSocket.close()
      this.udpSocket = null
    }
    if (this.tcpSocket) {
      this.tcpSocket.destroy()
      this.tcpSocket = null
    }
  }

  /** Apply an advisory's PEQ to the mixer using smart slot management */
  async applyAdvisory(advisory: DwaAdvisory): Promise<ActiveSlot | null> {
    if (this.config.mixerModel === 'none' as string) return null
    if (!this.config.mixerHost) return null

    const gainClamped = Math.max(advisory.peq.gainDb, this.config.maxCutDb)

    // Find a slot for this advisory
    const band = this.allocateSlot(advisory)
    if (band === null) {
      this.log('warn', `No PEQ slot available for ${Math.round(advisory.peq.hz)}Hz — all ${this.config.peqBandCount} slots in use`)
      return null
    }

    // Build and send EQ message using the mixer profile
    const msg = this.profile.buildEqMessage({
      prefix: this.config.oscPrefix || this.profile.defaultOscPrefix,
      band,
      freqHz: advisory.peq.hz,
      gainDb: gainClamped,
      q: advisory.peq.q,
    })

    await this.sendEqMessage(msg)

    // Track the slot
    const slot: ActiveSlot = {
      band,
      advisoryId: advisory.id,
      freqHz: advisory.peq.hz,
      gainDb: gainClamped,
      q: advisory.peq.q,
      severity: advisory.severity,
      timestamp: Date.now(),
    }
    this.activeSlots.set(band, slot)

    // Log for session export
    this.sessionLog.push({
      action: 'apply',
      freqHz: advisory.peq.hz,
      gainDb: gainClamped,
      q: advisory.peq.q,
      band,
      timestamp: Date.now(),
    })

    this.log('info', `Slot ${band}: ${Math.round(advisory.peq.hz)}Hz ${gainClamped}dB Q=${advisory.peq.q} (${advisory.severity})`)
    return slot
  }

  /** Apply GEQ correction from advisory's GEQ recommendation */
  async applyGEQ(advisory: DwaAdvisory): Promise<void> {
    if (!this.config.mixerHost) return
    if (!this.profile.buildGeqMessage) {
      this.log('warn', `${this.profile.label} does not support GEQ output`)
      return
    }

    const gainClamped = Math.max(advisory.geq.suggestedDb, this.config.maxCutDb)
    const msg = this.profile.buildGeqMessage({
      prefix: this.config.oscPrefix || this.profile.defaultOscPrefix,
      bandIndex: advisory.geq.bandIndex,
      gainDb: gainClamped,
    })

    await this.sendEqMessage(msg)

    this.sessionLog.push({
      action: 'geq',
      freqHz: advisory.geq.bandHz,
      gainDb: gainClamped,
      q: 0,
      band: advisory.geq.bandIndex,
      timestamp: Date.now(),
    })

    this.log('info', `GEQ band ${advisory.geq.bandIndex} (${advisory.geq.bandHz}Hz) → ${gainClamped}dB`)
  }

  /** Apply advisory using configured output mode (PEQ, GEQ, or both) */
  async applyWithMode(advisory: DwaAdvisory): Promise<ActiveSlot | null> {
    const mode = this.config.outputMode || 'peq'
    let slot: ActiveSlot | null = null

    if (mode === 'peq' || mode === 'both') {
      slot = await this.applyAdvisory(advisory)
    }
    if (mode === 'geq' || mode === 'both') {
      await this.applyGEQ(advisory)
    }

    return slot
  }

  /** Clear a slot by advisory ID (when feedback resolves) */
  async clearByAdvisoryId(advisoryId: string): Promise<boolean> {
    for (const [band, slot] of this.activeSlots) {
      if (slot.advisoryId === advisoryId) {
        return this.clearSlot(band)
      }
    }
    return false
  }

  /** Clear a specific PEQ band on the mixer */
  async clearSlot(band: number): Promise<boolean> {
    const msg = this.profile.buildClearMessage({
      prefix: this.config.oscPrefix || this.profile.defaultOscPrefix,
      band,
    })

    try {
      await this.sendEqMessage(msg)
      const slot = this.activeSlots.get(band)
      this.activeSlots.delete(band)

      if (slot) {
        this.sessionLog.push({
          action: 'clear',
          freqHz: slot.freqHz,
          gainDb: 0,
          q: 0,
          band,
          timestamp: Date.now(),
        })
        this.log('info', `Cleared slot ${band} (was ${Math.round(slot.freqHz)}Hz)`)
      }
      return true
    } catch {
      return false
    }
  }

  /** Clear all active slots */
  async clearAll(): Promise<void> {
    for (const band of [...this.activeSlots.keys()]) {
      await this.clearSlot(band)
    }
  }

  /** Get slot usage summary */
  getSlotSummary(): { used: number; total: number; slots: ActiveSlot[] } {
    return {
      used: this.activeSlots.size,
      total: this.config.peqBandCount,
      slots: [...this.activeSlots.values()],
    }
  }

  // ── Slot Allocation ─────────────────────────────────────────

  /**
   * Find a band number for this advisory.
   * 1. Check if this advisory already has a slot (update in place)
   * 2. Find an empty slot
   * 3. Replace the lowest-severity / oldest slot
   */
  private allocateSlot(advisory: DwaAdvisory): number | null {
    const start = this.config.peqBandStart || 1
    const count = this.config.peqBandCount || this.profile.peqBands
    const end = start + count - 1

    // Already has a slot? Update in place.
    for (const [band, slot] of this.activeSlots) {
      if (slot.advisoryId === advisory.id) return band
    }

    // Check for nearby frequency (within 1/3 octave) — reuse that slot
    for (const [band, slot] of this.activeSlots) {
      const ratio = Math.max(slot.freqHz, advisory.peq.hz) / Math.min(slot.freqHz, advisory.peq.hz)
      if (ratio <= 1.26) return band // 2^(1/3) ≈ 1.26
    }

    // Find empty slot
    for (let b = start; b <= end; b++) {
      if (!this.activeSlots.has(b)) return b
    }

    // All full — replace lowest-severity, then oldest
    let weakest: { band: number; priority: number; timestamp: number } | null = null
    for (const [band, slot] of this.activeSlots) {
      if (band < start || band > end) continue
      const priority = SEVERITY_PRIORITY[slot.severity] ?? 0
      if (!weakest || priority < weakest.priority || (priority === weakest.priority && slot.timestamp < weakest.timestamp)) {
        weakest = { band, priority, timestamp: slot.timestamp }
      }
    }

    if (weakest) {
      const incomingPriority = SEVERITY_PRIORITY[advisory.severity] ?? 0
      // Only replace if incoming is more severe
      if (incomingPriority > weakest.priority) {
        return weakest.band
      }
    }

    return null
  }

  // ── Message Sending ─────────────────────────────────────────

  private async sendEqMessage(msg: EqMessage): Promise<void> {
    if (msg.protocol === 'osc' && msg.oscMessages) {
      await this.sendOscMessages(msg.oscMessages)
    } else if (msg.protocol === 'tcp' && msg.tcpPayload) {
      await this.sendTcpPayload(msg.tcpPayload)
    }
  }

  private async sendOscMessages(messages: readonly { address: string; args: readonly { type: 'f'; value: number }[] }[]): Promise<void> {
    if (!this.config.mixerHost) return
    const socket = this.getUdpSocket()
    const port = this.config.mixerPort || this.profile.defaultPort

    for (const msg of messages) {
      const buf = oscMessage(msg.address, [...msg.args])
      await new Promise<void>((resolve, reject) => {
        socket.send(buf, port, this.config.mixerHost, (err) => {
          if (err) {
            this.log('error', `OSC send error: ${err.message}`)
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }
  }

  private getUdpSocket(): dgram.Socket {
    if (!this.udpSocket) {
      this.udpSocket = dgram.createSocket('udp4')
    }
    return this.udpSocket
  }

  private async sendTcpPayload(payload: string): Promise<void> {
    if (!this.config.mixerHost) return
    try {
      const socket = await this.getTcpSocket()
      socket.write(payload)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'TCP error'
      this.log('error', `TCP send error: ${msg}`)
      throw err
    }
  }

  private getTcpSocket(): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      if (this.tcpSocket && !this.tcpSocket.destroyed) {
        resolve(this.tcpSocket)
        return
      }

      const port = this.config.mixerPort || this.profile.defaultPort
      const socket = net.createConnection(
        { host: this.config.mixerHost, port, timeout: 3000 },
        () => {
          this.tcpSocket = socket
          resolve(socket)
        },
      )

      socket.on('error', (err) => {
        this.log('error', `TCP connection error: ${err.message}`)
        reject(err)
      })

      socket.on('close', () => {
        this.tcpSocket = null
      })
    })
  }
}
