/**
 * Generate professional Companion Integration design document (.docx)
 * with embedded architecture diagrams, workflow charts, and tables.
 */

import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'docs', 'plans')

// Brand colors
const BLUE = '#2080D0'
const DARK = '#1a1a2e'
const LIGHT_BLUE = '#e8f2fc'
const GRAY = '#6b7280'
const WHITE = '#ffffff'
const RED = '#ef4444'
const GREEN = '#22c55e'
const AMBER = '#f59e0b'

// ── Architecture Diagram ─────────────────────────────────────────────────
function drawArchDiagram() {
  const w = 1200, h = 700
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')

  // Background
  ctx.fillStyle = WHITE
  ctx.fillRect(0, 0, w, h)

  // Title
  ctx.fillStyle = DARK
  ctx.font = 'bold 22px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('System Architecture', w / 2, 40)

  // Helper: draw box with label
  function box(x, y, bw, bh, label, sublabel, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, bw, bh, 8)
    ctx.fill()
    ctx.strokeStyle = '#00000020'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = WHITE
    ctx.font = 'bold 15px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(label, x + bw / 2, y + bh / 2 - 5)
    if (sublabel) {
      ctx.font = '12px Arial'
      ctx.fillStyle = '#ffffffcc'
      ctx.fillText(sublabel, x + bw / 2, y + bh / 2 + 14)
    }
  }

  // Helper: arrow
  function arrow(x1, y1, x2, y2, label) {
    ctx.strokeStyle = GRAY
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    // Arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1)
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4))
    ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4))
    ctx.closePath()
    ctx.fillStyle = GRAY
    ctx.fill()
    if (label) {
      ctx.fillStyle = GRAY
      ctx.font = '11px Arial'
      ctx.textAlign = 'center'
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      ctx.fillText(label, mx, my - 8)
    }
  }

  // Boxes
  const bw = 220, bh = 65

  // Row 1: Browser
  box(490, 70, bw, bh, 'Browser (PWA)', 'Mic + DSP Worker + Advisories', BLUE)

  // Row 2: Next.js Server
  box(490, 210, bw, bh, 'Next.js Server', 'localhost:3000 + WS :3001', '#1e40af')

  // Row 3: Companion Module + Companion
  box(200, 360, bw, bh, 'Companion Module', 'companion-module-dwa', '#6d28d9')
  box(700, 360, bw, bh, 'Companion Core', 'Bitfocus Companion', '#4c1d95')

  // Row 4: Wing
  box(200, 510, bw, bh, 'Behringer Wing', 'OSC over UDP :2223', '#b91c1c')
  box(700, 510, bw, bh, 'Stream Deck', 'Elgato Control Surface', '#374151')

  // Arrows
  arrow(600, 135, 600, 210, 'POST /state (500ms)')
  arrow(490, 243, 420, 360, 'WebSocket (advisories)')
  arrow(420, 243, 490, 243, '') // just extending the WS line
  arrow(310, 425, 310, 510, 'OSC (PEQ commands)')
  arrow(420, 393, 700, 393, 'Actions / Feedbacks / Variables')
  arrow(810, 425, 810, 510, 'Button events')

  // Labels on side
  ctx.fillStyle = '#9ca3af'
  ctx.font = '11px Arial'
  ctx.textAlign = 'left'
  ctx.fillText('LAN / Local Network', 50, 680)

  return c.toBuffer('image/png')
}

// ── Two-Press Workflow Diagram ───────────────────────────────────────────
function drawWorkflow() {
  const w = 1000, h = 400
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')

  ctx.fillStyle = WHITE
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = DARK
  ctx.font = 'bold 22px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Two-Press EQ Cut Workflow', w / 2, 35)

  function stepBox(x, y, bw, bh, num, label, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, bw, bh, 10)
    ctx.fill()
    // Number circle
    ctx.fillStyle = WHITE
    ctx.beginPath()
    ctx.arc(x + 25, y + bh / 2, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(num, x + 25, y + bh / 2 + 6)
    // Text
    ctx.fillStyle = WHITE
    ctx.font = '13px Arial'
    ctx.textAlign = 'left'
    const lines = label.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(line, x + 50, y + bh / 2 - ((lines.length - 1) * 8) + i * 18)
    })
  }

  function arrowH(x1, y, x2) {
    ctx.strokeStyle = GRAY
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x2, y)
    ctx.lineTo(x2 - 8, y - 5)
    ctx.lineTo(x2 - 8, y + 5)
    ctx.closePath()
    ctx.fillStyle = GRAY
    ctx.fill()
  }

  const y1 = 80, y2 = 200, y3 = 300
  const bw = 260, bh = 70

  // Step 1
  stepBox(30, y1, bw, bh, '1', 'Feedback detected\nButton turns RED', RED)
  arrowH(290, y1 + bh / 2, 350)

  // Step 2
  stepBox(350, y1, bw, bh, '2', 'Engineer presses\nCUT button', AMBER)
  arrowH(610, y1 + bh / 2, 670)

  // Step 3
  stepBox(670, y1, bw, bh, '3', 'Channel grid appears\non Stream Deck', BLUE)

  // Arrow down
  ctx.strokeStyle = GRAY
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(800, y1 + bh)
  ctx.lineTo(800, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(800, y2)
  ctx.lineTo(795, y2 - 8)
  ctx.lineTo(805, y2 - 8)
  ctx.closePath()
  ctx.fillStyle = GRAY
  ctx.fill()

  // Step 4
  stepBox(670, y2, bw, bh, '4', 'Engineer taps\ntarget channel', '#6d28d9')
  arrowH(670, y2 + bh / 2, 610)

  // Step 5 (reverse direction)
  ctx.save()
  stepBox(350, y2, bw, bh, '5', 'OSC sent to Wing\nEQ band applied', GREEN)

  // Arrow down to result
  ctx.strokeStyle = GRAY
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(480, y2 + bh)
  ctx.lineTo(480, y3)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(480, y3)
  ctx.lineTo(475, y3 - 8)
  ctx.lineTo(485, y3 - 8)
  ctx.closePath()
  ctx.fillStyle = GRAY
  ctx.fill()

  // Result
  stepBox(350, y3, bw, bh, '6', 'Advisory dismissed\nStream Deck resets', '#374151')
  ctx.restore()

  return c.toBuffer('image/png')
}

// ── Timeline / Gantt Chart ───────────────────────────────────────────────
function drawTimeline() {
  const w = 1000, h = 280
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')

  ctx.fillStyle = WHITE
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = DARK
  ctx.font = 'bold 22px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Implementation Timeline', w / 2, 35)

  const phases = [
    { label: 'Phase 1: WebSocket API', days: 3, color: BLUE },
    { label: 'Phase 2: Companion Module', days: 10, color: '#6d28d9' },
    { label: 'Phase 3: Real-World Testing', days: 7, color: GREEN },
  ]

  const leftMargin = 220, topMargin = 70, barH = 45, gap = 15
  const maxDays = 20
  const dayWidth = (w - leftMargin - 60) / maxDays

  // Day markers
  ctx.fillStyle = GRAY
  ctx.font = '11px Arial'
  ctx.textAlign = 'center'
  for (let d = 0; d <= maxDays; d += 5) {
    const x = leftMargin + d * dayWidth
    ctx.fillText(`Day ${d}`, x, topMargin - 10)
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, topMargin)
    ctx.lineTo(x, topMargin + phases.length * (barH + gap))
    ctx.stroke()
  }

  let startDay = 0
  phases.forEach((phase, i) => {
    const y = topMargin + i * (barH + gap)

    // Label
    ctx.fillStyle = DARK
    ctx.font = '13px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(phase.label, leftMargin - 15, y + barH / 2 + 5)

    // Bar
    const x = leftMargin + startDay * dayWidth
    const bw = phase.days * dayWidth
    ctx.fillStyle = phase.color
    ctx.beginPath()
    ctx.roundRect(x, y, bw, barH, 6)
    ctx.fill()

    // Duration label
    ctx.fillStyle = WHITE
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${phase.days} days`, x + bw / 2, y + barH / 2 + 5)

    startDay += phase.days
  })

  return c.toBuffer('image/png')
}

// ── Stream Deck Layout Mockup ────────────────────────────────────────────
function drawStreamDeck() {
  const w = 800, h = 350
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = WHITE
  ctx.font = 'bold 18px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Stream Deck Layout', w / 2, 30)

  function sdButton(x, y, bw, bh, label1, label2, bgColor) {
    // Button body
    ctx.fillStyle = '#2a2a2a'
    ctx.beginPath()
    ctx.roundRect(x - 2, y - 2, bw + 4, bh + 4, 8)
    ctx.fill()
    ctx.fillStyle = bgColor
    ctx.beginPath()
    ctx.roundRect(x, y, bw, bh, 6)
    ctx.fill()
    // Text
    ctx.fillStyle = WHITE
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(label1, x + bw / 2, y + bh / 2 - 4)
    if (label2) {
      ctx.font = '11px Arial'
      ctx.fillStyle = '#ffffffcc'
      ctx.fillText(label2, x + bw / 2, y + bh / 2 + 14)
    }
  }

  const startX = 80, startY = 60, btnW = 140, btnH = 100, gap = 20

  // Row 1
  sdButton(startX, startY, btnW, btnH, 'START', 'Analysis', GREEN)
  sdButton(startX + (btnW + gap), startY, btnW, btnH, 'MODE', 'Speech', BLUE)
  sdButton(startX + 2 * (btnW + gap), startY, btnW, btnH, 'CLEAR', 'All', '#4b5563')
  sdButton(startX + 3 * (btnW + gap), startY, btnW, btnH, 'UNDO', 'Last Cut', AMBER)

  // Row 2
  sdButton(startX, startY + btnH + gap, btnW, btnH, '2.5 kHz', '-6dB Q=8', RED)
  sdButton(startX + (btnW + gap), startY + btnH + gap, btnW, btnH, '800 Hz', '-4dB Q=6', '#dc2626')
  sdButton(startX + 2 * (btnW + gap), startY + btnH + gap, btnW, btnH, '---', 'No advisory', '#374151')
  sdButton(startX + 3 * (btnW + gap), startY + btnH + gap, btnW, btnH, '---', 'No advisory', '#374151')

  // Label
  ctx.fillStyle = '#9ca3af'
  ctx.font = '12px Arial'
  ctx.textAlign = 'left'
  ctx.fillText('Row 1: Control buttons', startX, startY + 2 * (btnH + gap) + 20)
  ctx.fillText('Row 2: Advisory cut buttons (red = active, gray = empty)', startX, startY + 2 * (btnH + gap) + 40)

  return c.toBuffer('image/png')
}

// ── Generate all diagrams ────────────────────────────────────────────────
const archPng = drawArchDiagram()
const workflowPng = drawWorkflow()
const timelinePng = drawTimeline()
const streamDeckPng = drawStreamDeck()

writeFileSync(join(outDir, 'companion-arch.png'), archPng)
writeFileSync(join(outDir, 'companion-workflow.png'), workflowPng)
writeFileSync(join(outDir, 'companion-timeline.png'), timelinePng)
writeFileSync(join(outDir, 'companion-streamdeck.png'), streamDeckPng)

console.log('Diagrams generated.')

// ── Now build the DOCX ──────────────────────────────────────────────────
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, LevelFormat,
  PageBreak, TableOfContents } = await import('docx')

const logoPng = readFileSync(join(__dirname, '..', 'public', 'images', 'dwa-logo-black.png'))

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' }
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder }
const headerShading = { fill: '2080D0', type: ShadingType.CLEAR }
const altRowShading = { fill: 'F0F7FF', type: ShadingType.CLEAR }

function headerCell(text, width) {
  return new TableCell({
    borders: cellBorders, width: { size: width, type: WidthType.DXA },
    shading: headerShading, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })]
  })
}

function cell(text, width, shade) {
  return new TableCell({
    borders: cellBorders, width: { size: width, type: WidthType.DXA },
    shading: shade ? altRowShading : undefined,
    children: [new Paragraph({ spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, font: 'Arial', size: 20 })] })]
  })
}

function img(buffer, w, h) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
    children: [new ImageRun({ type: 'png', data: buffer, transformation: { width: w, height: h },
      altText: { title: 'Diagram', description: 'Architecture diagram', name: 'diagram' } })] })
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal',
        run: { size: 52, bold: true, color: '2080D0', font: 'Arial' },
        paragraph: { spacing: { before: 0, after: 120 }, alignment: AlignmentType.LEFT } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: '1a1a2e', font: 'Arial' },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: '2080D0', font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, color: '374151', font: 'Arial' },
        paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'scope-list', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'not-scope', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'phase1', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'phase2', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'phase3', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
        pageNumbers: { start: 1 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({ type: 'png', data: logoPng, transformation: { width: 80, height: 52 },
            altText: { title: 'Logo', description: 'DW Audio logo', name: 'logo' } }),
        ]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 100 },
        children: [
          new TextRun({ text: 'DW Audio \u2014 Companion Integration Design \u2014 Page ', color: '9ca3af', size: 16, font: 'Arial' }),
          new TextRun({ children: [PageNumber.CURRENT], color: '9ca3af', size: 16, font: 'Arial' }),
          new TextRun({ text: ' of ', color: '9ca3af', size: 16, font: 'Arial' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: '9ca3af', size: 16, font: 'Arial' }),
        ]
      })] })
    },
    children: [
      // ── Cover ──
      new Paragraph({ spacing: { before: 2400 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new ImageRun({ type: 'png', data: logoPng, transformation: { width: 200, height: 131 },
          altText: { title: 'Logo', description: 'DW Audio logo', name: 'cover-logo' } })
      ] }),
      new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Companion Integration', bold: true, size: 56, color: '2080D0', font: 'Arial' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Design Specification', size: 36, color: '6b7280', font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Bridging real-time feedback detection with live mixer EQ control', size: 22, color: '9ca3af', font: 'Arial', italics: true })] }),
      new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'March 2026 \u2014 MVP Design', size: 20, color: '9ca3af', font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Target: Behringer Wing (Compact + Rack) via OSC/UDP', size: 20, color: '9ca3af', font: 'Arial' })] }),

      // ── TOC ──
      new Paragraph({ children: [new PageBreak()] }),
      new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),

      // ── Section 1: Problem & Solution ──
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Problem Statement')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'At a live gig, feedback detection and EQ correction are separate workflows. The engineer looks at the laptop to identify the feedback frequency, then walks to the mixer or switches apps to apply the EQ cut. This context switch costs 5-15 seconds per feedback event \u2014 an eternity during a live performance.' })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Solution')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Connect the feedback detection app to Bitfocus Companion so detections appear as actionable buttons on a Stream Deck. The engineer sees the problem and pushes the EQ cut from the same control surface, without touching the laptop or switching apps.' })] }),

      // ── Scope ──
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('In Scope (MVP)')] }),
      ...[
        'WebSocket API for Companion to connect to',
        'Companion module with feedback status + manual EQ push',
        'Direct OSC to Behringer Wing for PEQ band control',
        'Local network only (laptop at the venue)',
        'Manual confirm mode only (no auto-engage)',
      ].map(t => new Paragraph({ numbering: { reference: 'scope-list', level: 0 }, children: [new TextRun(t)] })),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Not in Scope')] }),
      ...[
        'Auto-engage mode (future)',
        'Cloud WebSocket relay',
        'Licensing or tiered pricing',
        'dbx DriveRack support',
        'Reading current Wing EQ state',
      ].map(t => new Paragraph({ numbering: { reference: 'not-scope', level: 0 }, children: [new TextRun(t)] })),

      // ── Section 2: Architecture ──
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('System Architecture')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'The system has four components communicating over the local venue network. The browser app detects feedback, the server relays state via WebSocket, the Companion module translates advisories into Stream Deck buttons, and OSC commands are sent directly to the Wing mixer for EQ control.' })] }),
      img(archPng, 550, 320),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Why Direct OSC?')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'The existing Wing Companion module does not expose PEQ band parameter actions (frequency, gain, Q). It only supports EQ on/off and model selection. Rather than depending on upstream changes, the DWA module sends OSC commands directly to the Wing. The Wing only supports one active OSC subscription, so the DWA module does NOT subscribe \u2014 it only sends commands (fire-and-forget), avoiding conflicts with the Wing module.' })] }),

      // ── Section 3: OSC Commands ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Wing OSC Protocol')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'EQ band parameters are set via OSC messages over UDP. The paths below are confirmed from the official Wing Remote Protocols documentation.' })] }),

      new Table({
        columnWidths: [2800, 3500, 1200, 1860],
        rows: [
          new TableRow({ tableHeader: true, children: [
            headerCell('Parameter', 2800), headerCell('OSC Path', 3500),
            headerCell('Type', 1200), headerCell('Range', 1860),
          ] }),
          ...([
            ['EQ Enable', '/ch/{n}/eq/on', 'int', '0 | 1'],
            ['Band Gain', '/ch/{n}/eq/{b}g', 'float', '-15 to +15 dB'],
            ['Band Frequency', '/ch/{n}/eq/{b}f', 'float', '20 to 20000 Hz'],
            ['Band Q', '/ch/{n}/eq/{b}q', 'float', '0.44 to 10'],
            ['EQ Model', '/ch/{n}/eq/mdl', 'string', 'STD, SOUL, etc.'],
            ['Low Shelf Gain', '/ch/{n}/eq/lg', 'float', '-15 to +15 dB'],
            ['High Shelf Gain', '/ch/{n}/eq/hg', 'float', '-15 to +15 dB'],
          ].map((row, i) => new TableRow({ children: [
            cell(row[0], 2800, i % 2 === 1), cell(row[1], 3500, i % 2 === 1),
            cell(row[2], 1200, i % 2 === 1), cell(row[3], 1860, i % 2 === 1),
          ] }))),
        ]
      }),

      new Paragraph({ spacing: { before: 120, after: 120 }, children: [
        new TextRun({ text: 'Node paths: ', bold: true }),
        new TextRun('/ch/{n} (channels 1-40), /bus/{n} (buses 1-16), /main/{n} (mains 1-4), /mtx/{n} (matrices 1-8). All 1-based indexing. Bands 1-4 are parametric; low shelf (l) and high shelf (h) also available.'),
      ] }),

      // ── Section 4: Two-Press Workflow ──
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Two-Press EQ Cut Workflow')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Pressing a CUT button does not immediately send OSC. Instead, it enters targeting mode to prevent accidentally cutting the wrong channel.' })] }),
      img(workflowPng, 500, 200),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('Press 1: Select the Cut')] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun('Engineer presses a CUT button showing the detected frequency and recommended cut. The Stream Deck page switches to a channel grid showing available targets.')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('Press 2: Select the Target')] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun('Engineer taps the channel, bus, or main where the cut should be applied. Four OSC messages are sent (EQ on, frequency, gain, Q), the advisory is dismissed, and the Stream Deck returns to the main page.')] }),

      // ── Section 5: Safety ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Safety Guardrails')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun('These limits prevent the system from damaging a live mix. All values are configurable but ship with safe defaults.')] }),

      new Table({
        columnWidths: [2400, 1600, 5360],
        rows: [
          new TableRow({ tableHeader: true, children: [
            headerCell('Guardrail', 2400), headerCell('Default', 1600), headerCell('Rationale', 5360),
          ] }),
          ...([
            ['Max Cut Depth', '-12 dB', 'Deeper cuts audibly damage the mix quality'],
            ['Max Active Notches', '4 per ch', 'Wing channel EQ has 4 parametric bands'],
            ['Min Advisory Age', '3 seconds', 'Prevents cutting transient false positives'],
            ['Confidence Floor', '60%', 'Below 60%, button shows info but will not send OSC'],
            ['Rate Limit', '1 cut / 2s', 'Prevents rapid-fire cascading cuts'],
            ['Undo Stack', '16 deep', 'Can restore the last 16 EQ cuts'],
            ['Band Range', 'Bands 3-4', 'Protects engineer\'s manual EQ in bands 1-2'],
          ].map((row, i) => new TableRow({ children: [
            cell(row[0], 2400, i % 2 === 1), cell(row[1], 1600, i % 2 === 1), cell(row[2], 5360, i % 2 === 1),
          ] }))),
        ]
      }),

      // ── Section 6: Stream Deck Layout ──
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Stream Deck Layout')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun('Suggested 8-button layout for an Elgato Stream Deck. Top row: control buttons. Bottom row: advisory cut buttons that update dynamically with detected feedback frequencies.')] }),
      img(streamDeckPng, 480, 210),

      // ── Section 7: Timeline ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Implementation Timeline')] }),
      img(timelinePng, 500, 140),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Phase 1: WebSocket API (2-3 days)')] }),
      ...[
        'POST state endpoint + WebSocket relay on port 3001',
        'Browser sync hook (useCompanionSync)',
        'Settings UI: enable toggle, auth token, connection indicator',
        'Protocol tests',
      ].map(t => new Paragraph({ numbering: { reference: 'phase1', level: 0 }, children: [new TextRun(t)] })),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Phase 2: Companion Module (1-2 weeks)')] }),
      ...[
        'Scaffold with Companion module SDK (TypeScript, yarn)',
        'WebSocket client connection to app server',
        'Actions: start/stop, apply cut, undo, clear, set mode',
        'Feedbacks: running, feedback detected, critical, connected',
        'Variables: frequency, note, cut depth, Q, severity for each advisory',
        'OSC sender for Wing PEQ band commands',
        'Test with Companion + Stream Deck hardware',
      ].map(t => new Paragraph({ numbering: { reference: 'phase2', level: 0 }, children: [new TextRun(t)] })),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Phase 3: Real-World Testing (1 week)')] }),
      ...[
        'Test at a live gig with the Behringer Wing',
        'Verify OSC PEQ paths against actual mixer behavior',
        'Tune safety guardrails based on real feedback scenarios',
        'Adjust timing, confidence thresholds, and band allocation',
      ].map(t => new Paragraph({ numbering: { reference: 'phase3', level: 0 }, children: [new TextRun(t)] })),

      // ── Section 8: Companion Module Spec ──
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Companion Module Specification')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Actions')] }),
      new Table({
        columnWidths: [2200, 3000, 4160],
        rows: [
          new TableRow({ tableHeader: true, children: [
            headerCell('Action ID', 2200), headerCell('Name', 3000), headerCell('Description', 4160),
          ] }),
          ...([
            ['start_analysis', 'Start Analysis', 'Begin feedback detection in the app'],
            ['stop_analysis', 'Stop Analysis', 'Stop feedback detection'],
            ['apply_cut', 'Apply EQ Cut', 'Enter targeting mode, then send PEQ to Wing'],
            ['undo_last', 'Undo Last Cut', 'Restore previous EQ band to 0 dB'],
            ['clear_all', 'Clear Advisories', 'Dismiss all active advisories'],
            ['set_mode', 'Set Detection Mode', 'Switch between speech, worship, music, etc.'],
          ].map((row, i) => new TableRow({ children: [
            cell(row[0], 2200, i % 2 === 1), cell(row[1], 3000, i % 2 === 1), cell(row[2], 4160, i % 2 === 1),
          ] }))),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Feedbacks')] }),
      new Table({
        columnWidths: [2800, 3000, 1800, 1760],
        rows: [
          new TableRow({ tableHeader: true, children: [
            headerCell('Feedback ID', 2800), headerCell('Name', 3000),
            headerCell('Type', 1800), headerCell('Color', 1760),
          ] }),
          ...([
            ['status_running', 'Analysis Running', 'boolean', 'Green'],
            ['feedback_detected', 'Feedback Detected', 'boolean', 'Red'],
            ['critical_feedback', 'Critical Feedback', 'boolean', 'Flash Red'],
            ['connected', 'Connected to App', 'boolean', 'Blue'],
          ].map((row, i) => new TableRow({ children: [
            cell(row[0], 2800, i % 2 === 1), cell(row[1], 3000, i % 2 === 1),
            cell(row[2], 1800, i % 2 === 1), cell(row[3], 1760, i % 2 === 1),
          ] }))),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Variables')] }),
      new Table({
        columnWidths: [3200, 3200, 2960],
        rows: [
          new TableRow({ tableHeader: true, children: [
            headerCell('Variable ID', 3200), headerCell('Name', 3200), headerCell('Example', 2960),
          ] }),
          ...([
            ['$(dwa:status)', 'Analysis Status', 'running'],
            ['$(dwa:mode)', 'Detection Mode', 'speech'],
            ['$(dwa:advisory_count)', 'Active Advisory Count', '3'],
            ['$(dwa:a1_freq)', 'Advisory 1 Frequency', '2.5 kHz'],
            ['$(dwa:a1_note)', 'Advisory 1 Note', 'D#7'],
            ['$(dwa:a1_cut)', 'Advisory 1 Cut', '-6 dB'],
            ['$(dwa:a1_q)', 'Advisory 1 Q', '8'],
            ['$(dwa:a1_severity)', 'Advisory 1 Severity', 'high'],
          ].map((row, i) => new TableRow({ children: [
            cell(row[0], 3200, i % 2 === 1), cell(row[1], 3200, i % 2 === 1), cell(row[2], 2960, i % 2 === 1),
          ] }))),
        ]
      }),
    ]
  }]
})

const buffer = await Packer.toBuffer(doc)
const outputPath = join(outDir, 'companion-integration-spec.docx')
writeFileSync(outputPath, buffer)
console.log(`Document saved to ${outputPath}`)
