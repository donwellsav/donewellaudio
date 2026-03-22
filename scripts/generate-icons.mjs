/**
 * DoneWell Audio — PWA Icon Generator
 * Generates all icon sizes from a single SVG master design.
 *
 * Design: Spectrum peak with crosshair reticle
 * - Dark background (#111214)
 * - Blue spectrum bars (#4B92FF)
 * - White crosshair targeting the peak
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Find sharp in pnpm node_modules
let sharp;
try {
  sharp = require('sharp');
} catch {
  // pnpm hoists differently — find it manually
  const sharpPath = join(__dirname, '..', 'node_modules', '.pnpm', 'sharp@0.34.5', 'node_modules', 'sharp');
  sharp = require(sharpPath);
}

// ── Design constants ──
const BG = '#111214';
const BLUE = '#4B92FF';
const BLUE_RGB = '75,146,255';

// Spectrum bar heights — sharp center peak, lower on sides (21 bars, 0-1)
const BARS = [
  0.08, 0.12, 0.15, 0.20, 0.18, 0.25, 0.30, 0.38, 0.50, 0.65,
  1.00,  // center peak
  0.62, 0.48, 0.35, 0.28, 0.22, 0.18, 0.14, 0.11, 0.09, 0.06
];

function generateSVG(size, { maskable = false, light = false } = {}) {
  const bg = light ? '#f0f0f0' : BG;
  const barRGB = light ? '26,42,74' : BLUE_RGB;
  const reticleColor = light ? 'rgba(26,42,74,0.55)' : 'rgba(255,255,255,0.55)';
  const reticleStroke = light ? 'rgba(26,42,74,0.55)' : 'rgba(255,255,255,0.55)';
  const glowRGB = light ? '26,42,74' : BLUE_RGB;

  // Content area — maskable has extra padding (safe zone = inner 80%)
  const pad = maskable ? size * 0.10 : size * 0.08;
  const area = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;

  // Glow position
  const peakTopY = cy - area * 0.32;
  const glowR = area * 0.28;
  const glowCy = peakTopY + glowR * 0.3;

  // Bar geometry
  const barCount = BARS.length;
  const totalBarWidth = area * 0.82;
  const barGap = totalBarWidth * 0.03;
  const barW = (totalBarWidth - barGap * (barCount - 1)) / barCount;
  const maxBarH = area * 0.55;
  const barBaseY = cy + area * 0.18;
  const barStartX = cx - totalBarWidth / 2;

  // Crosshair geometry
  const peakIdx = 10;
  const peakX = barStartX + peakIdx * (barW + barGap) + barW / 2;
  const peakH = BARS[peakIdx] * maxBarH;
  const peakY = barBaseY - peakH;
  const reticleY = peakY + peakH * 0.15;
  const reticleR = area * 0.13;
  const lineExt = area * 0.04;
  const sw = Math.max(1.5, size / 200); // stroke width
  const r = Math.min(barW / 2, 3 * (size / 512)); // bar corner radius
  const dotR = Math.max(1.5, size / 180);

  // Build bar SVG elements
  let barsSvg = '';
  for (let i = 0; i < barCount; i++) {
    const h = BARS[i] * maxBarH;
    const x = barStartX + i * (barW + barGap);
    const y = barBaseY - h;
    const opacity = (0.5 + BARS[i] * 0.5).toFixed(2);

    barsSvg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="${r.toFixed(1)}" fill="rgba(${barRGB},${opacity})"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${bg}"/>

  <!-- Glow behind peak -->
  <defs>
    <radialGradient id="glow" cx="${cx}" cy="${glowCy.toFixed(1)}" r="${glowR.toFixed(1)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="rgba(${glowRGB},0.25)"/>
      <stop offset="1" stop-color="rgba(${glowRGB},0)"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#glow)"/>

  <!-- Spectrum bars -->
  ${barsSvg}

  <!-- Baseline -->
  <line x1="${(barStartX - area * 0.04).toFixed(1)}" y1="${barBaseY.toFixed(1)}" x2="${(barStartX + totalBarWidth + area * 0.04).toFixed(1)}" y2="${barBaseY.toFixed(1)}" stroke="rgba(${barRGB},0.25)" stroke-width="${Math.max(1, size / 256).toFixed(1)}"/>

  <!-- Crosshair reticle -->
  <circle cx="${peakX.toFixed(1)}" cy="${reticleY.toFixed(1)}" r="${reticleR.toFixed(1)}" fill="none" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>

  <!-- Crosshair lines -->
  <line x1="${peakX.toFixed(1)}" y1="${(reticleY - reticleR - lineExt).toFixed(1)}" x2="${peakX.toFixed(1)}" y2="${(reticleY - reticleR * 0.35).toFixed(1)}" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>
  <line x1="${peakX.toFixed(1)}" y1="${(reticleY + reticleR * 0.35).toFixed(1)}" x2="${peakX.toFixed(1)}" y2="${(reticleY + reticleR + lineExt).toFixed(1)}" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>
  <line x1="${(peakX - reticleR - lineExt).toFixed(1)}" y1="${reticleY.toFixed(1)}" x2="${(peakX - reticleR * 0.35).toFixed(1)}" y2="${reticleY.toFixed(1)}" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>
  <line x1="${(peakX + reticleR * 0.35).toFixed(1)}" y1="${reticleY.toFixed(1)}" x2="${(peakX + reticleR + lineExt).toFixed(1)}" y2="${reticleY.toFixed(1)}" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>

  <!-- Center dot -->
  <circle cx="${peakX.toFixed(1)}" cy="${reticleY.toFixed(1)}" r="${dotR.toFixed(1)}" fill="${reticleColor}"/>
</svg>`;
}

// ── Generate all icon sizes ──
const icons = [
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'icon-192.png', size: 192 },
  { name: 'apple-icon.png', size: 180 },
  { name: 'icon-dark-32x32.png', size: 32 },
  { name: 'icon-light-32x32.png', size: 32, light: true },
];

async function main() {
  console.log('Generating DoneWell Audio PWA icons...\n');

  // Save the SVG favicon (dark/light with media query)
  const svgFavicon = generateFaviconSVG();
  writeFileSync(join(publicDir, 'icon.svg'), svgFavicon);
  console.log('✓ icon.svg (vector favicon with light/dark)');

  for (const icon of icons) {
    const svg = generateSVG(icon.size, { maskable: icon.maskable, light: icon.light });
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(icon.size, icon.size)
      .png()
      .toBuffer();

    writeFileSync(join(publicDir, icon.name), pngBuffer);
    console.log(`✓ ${icon.name} (${icon.size}×${icon.size}${icon.maskable ? ' maskable' : ''}${icon.light ? ' light' : ''})`);
  }

  console.log('\nDone! All icons saved to public/');
}

function generateFaviconSVG() {
  // Generate at 180px for the SVG viewBox
  const size = 180;
  const darkSvgInner = generateSVGContent(size, { light: false });
  const lightSvgInner = generateSVGContent(size, { light: true });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <style>
    .dark-scheme { display: block; }
    .light-scheme { display: none; }
    @media (prefers-color-scheme: light) {
      .dark-scheme { display: none; }
      .light-scheme { display: block; }
    }
  </style>
  <g class="dark-scheme">${darkSvgInner}</g>
  <g class="light-scheme">${lightSvgInner}</g>
</svg>`;
}

function generateSVGContent(size, { light = false } = {}) {
  // Same logic as generateSVG but returns just the inner elements (no outer svg tag)
  const bg = light ? '#f0f0f0' : BG;
  const barRGB = light ? '26,42,74' : BLUE_RGB;
  const reticleStroke = light ? 'rgba(26,42,74,0.55)' : 'rgba(255,255,255,0.55)';
  const reticleColor = reticleStroke;
  const glowRGB = light ? '26,42,74' : BLUE_RGB;
  const glowId = light ? 'glow-light' : 'glow-dark';

  const pad = size * 0.08;
  const area = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;

  const peakTopY = cy - area * 0.32;
  const glowR = area * 0.28;
  const glowCy = peakTopY + glowR * 0.3;

  const barCount = BARS.length;
  const totalBarWidth = area * 0.82;
  const barGap = totalBarWidth * 0.03;
  const barW = (totalBarWidth - barGap * (barCount - 1)) / barCount;
  const maxBarH = area * 0.55;
  const barBaseY = cy + area * 0.18;
  const barStartX = cx - totalBarWidth / 2;

  const peakIdx = 10;
  const peakX = barStartX + peakIdx * (barW + barGap) + barW / 2;
  const peakH = BARS[peakIdx] * maxBarH;
  const peakY = barBaseY - peakH;
  const reticleY = peakY + peakH * 0.15;
  const reticleR = area * 0.13;
  const lineExt = area * 0.04;
  const sw = Math.max(1.5, size / 200);
  const r = Math.min(barW / 2, 3 * (size / 512));
  const dotR = Math.max(1.5, size / 180);

  let barsSvg = '';
  for (let i = 0; i < barCount; i++) {
    const h = BARS[i] * maxBarH;
    const x = barStartX + i * (barW + barGap);
    const y = barBaseY - h;
    const opacity = (0.5 + BARS[i] * 0.5).toFixed(2);
    barsSvg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="${r.toFixed(1)}" fill="rgba(${barRGB},${opacity})"/>`;
  }

  return `
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <defs><radialGradient id="${glowId}" cx="${cx}" cy="${glowCy.toFixed(1)}" r="${glowR.toFixed(1)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="rgba(${glowRGB},0.25)"/>
      <stop offset="1" stop-color="rgba(${glowRGB},0)"/>
    </radialGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#${glowId})"/>
    ${barsSvg}
    <line x1="${(barStartX - area * 0.04).toFixed(1)}" y1="${barBaseY.toFixed(1)}" x2="${(barStartX + totalBarWidth + area * 0.04).toFixed(1)}" y2="${barBaseY.toFixed(1)}" stroke="rgba(${barRGB},0.25)" stroke-width="${Math.max(1, size / 256).toFixed(1)}"/>
    <circle cx="${peakX.toFixed(1)}" cy="${reticleY.toFixed(1)}" r="${reticleR.toFixed(1)}" fill="none" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>
    <line x1="${peakX.toFixed(1)}" y1="${(reticleY - reticleR - lineExt).toFixed(1)}" x2="${peakX.toFixed(1)}" y2="${(reticleY - reticleR * 0.35).toFixed(1)}" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>
    <line x1="${peakX.toFixed(1)}" y1="${(reticleY + reticleR * 0.35).toFixed(1)}" x2="${peakX.toFixed(1)}" y2="${(reticleY + reticleR + lineExt).toFixed(1)}" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>
    <line x1="${(peakX - reticleR - lineExt).toFixed(1)}" y1="${reticleY.toFixed(1)}" x2="${(peakX - reticleR * 0.35).toFixed(1)}" y2="${reticleY.toFixed(1)}" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>
    <line x1="${(peakX + reticleR * 0.35).toFixed(1)}" y1="${reticleY.toFixed(1)}" x2="${(peakX + reticleR + lineExt).toFixed(1)}" y2="${reticleY.toFixed(1)}" stroke="${reticleStroke}" stroke-width="${sw.toFixed(1)}"/>
    <circle cx="${peakX.toFixed(1)}" cy="${reticleY.toFixed(1)}" r="${dotR.toFixed(1)}" fill="${reticleColor}"/>`;
}

main().catch(console.error);
