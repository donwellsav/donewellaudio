import type { ModuleConfig } from './config.js';
/** Advisory payload from the relay */
export interface DwaAdvisory {
    id: string;
    peq: {
        type: string;
        hz: number;
        q: number;
        gainDb: number;
    };
    geq: {
        bandHz: number;
        bandIndex: number;
        suggestedDb: number;
    };
    severity: string;
    confidence: number;
}
/** A PEQ slot actively in use on the mixer */
export interface ActiveSlot {
    band: number;
    advisoryId: string;
    freqHz: number;
    gainDb: number;
    q: number;
    severity: string;
    timestamp: number;
}
export declare class MixerOutput {
    private udpSocket;
    private tcpSocket;
    private config;
    private log;
    private profile;
    /** Active PEQ slots on the mixer — keyed by band number */
    activeSlots: Map<number, ActiveSlot>;
    /** Session action log for export */
    sessionLog: Array<{
        action: string;
        freqHz: number;
        gainDb: number;
        q: number;
        band: number;
        timestamp: number;
    }>;
    constructor(config: ModuleConfig, log: (level: string, msg: string) => void);
    updateConfig(config: ModuleConfig): void;
    disconnect(): void;
    /** Apply an advisory's PEQ to the mixer using smart slot management */
    applyAdvisory(advisory: DwaAdvisory): Promise<ActiveSlot | null>;
    /** Apply GEQ correction from advisory's GEQ recommendation */
    applyGEQ(advisory: DwaAdvisory): Promise<void>;
    /** Apply advisory using configured output mode (PEQ, GEQ, or both) */
    applyWithMode(advisory: DwaAdvisory): Promise<ActiveSlot | null>;
    /** Clear a slot by advisory ID (when feedback resolves) */
    clearByAdvisoryId(advisoryId: string): Promise<boolean>;
    /** Clear a specific PEQ band on the mixer */
    clearSlot(band: number): Promise<boolean>;
    /** Clear all active slots */
    clearAll(): Promise<void>;
    /** Get slot usage summary */
    getSlotSummary(): {
        used: number;
        total: number;
        slots: ActiveSlot[];
    };
    /**
     * Find a band number for this advisory.
     * 1. Check if this advisory already has a slot (update in place)
     * 2. Find an empty slot
     * 3. Replace the lowest-severity / oldest slot
     */
    private allocateSlot;
    private sendEqMessage;
    private sendOscMessages;
    private getUdpSocket;
    private sendTcpPayload;
    private getTcpSocket;
}
