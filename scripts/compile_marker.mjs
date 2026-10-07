import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const svgTarget = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" style="background:#0f172a;">
  <!-- High Contrast Outer Border -->
  <rect x="20" y="20" width="560" height="560" rx="24" fill="#0f172a" stroke="#38bdf8" stroke-width="12" />
  <rect x="45" y="45" width="510" height="510" rx="16" fill="#1e293b" stroke="#f59e0b" stroke-width="6" />

  <!-- Corner Optical Alignment Targets -->
  <!-- Top Left -->
  <rect x="65" y="65" width="90" height="90" fill="#f8fafc" />
  <rect x="80" y="80" width="60" height="60" fill="#0f172a" />
  <circle cx="110" cy="110" r="16" fill="#ef4444" />

  <!-- Top Right -->
  <rect x="445" y="65" width="90" height="90" fill="#f8fafc" />
  <rect x="460" y="80" width="60" height="60" fill="#0f172a" />
  <circle cx="490" cy="110" r="16" fill="#10b981" />

  <!-- Bottom Left -->
  <rect x="65" y="445" width="90" height="90" fill="#f8fafc" />
  <rect x="80" y="460" width="60" height="60" fill="#0f172a" />
  <circle cx="110" cy="490" r="16" fill="#3b82f6" />

  <!-- Bottom Right -->
  <rect x="445" y="445" width="90" height="90" fill="#f8fafc" />
  <rect x="460" y="460" width="60" height="60" fill="#0f172a" />
  <circle cx="490" cy="490" r="16" fill="#eab308" />

  <!-- Central Constellation / Geometric Glyph -->
  <circle cx="300" cy="300" r="140" fill="none" stroke="#38bdf8" stroke-dasharray="10 8" stroke-width="6" />
  <polygon points="300,180 400,360 200,360" fill="none" stroke="#ec4899" stroke-width="8" />
  <polygon points="300,420 400,240 200,240" fill="none" stroke="#8b5cf6" stroke-width="8" />

  <!-- Center Marker Core -->
  <circle cx="300" cy="300" r="48" fill="#f8fafc" stroke="#0f172a" stroke-width="6" />
  <circle cx="300" cy="300" r="22" fill="#0284c7" />

  <!-- High-Frequency Detail Pattern (Fiducial Grid) -->
  <g fill="#f8fafc">
    <rect x="220" y="110" width="16" height="16" />
    <rect x="250" y="110" width="16" height="16" fill="#38bdf8" />
    <rect x="334" y="110" width="16" height="16" fill="#38bdf8" />
    <rect x="364" y="110" width="16" height="16" />

    <rect x="220" y="474" width="16" height="16" />
    <rect x="250" y="474" width="16" height="16" fill="#38bdf8" />
    <rect x="334" y="474" width="16" height="16" fill="#38bdf8" />
    <rect x="364" y="474" width="16" height="16" />
  </g>

  <!-- Typography & Course Branding -->
  <text x="300" y="150" fill="#f8fafc" font-size="20" font-weight="900" font-family="monospace" text-anchor="middle" letter-spacing="4">WEBAR TRACKER</text>
  <text x="300" y="460" fill="#94a3b8" font-size="14" font-weight="700" font-family="monospace" text-anchor="middle" letter-spacing="2">AR/MR MINI-PROJECT</text>
</svg>
`;

async function compileMarker() {
  console.log('[Marker Compiler] Initializing marker rendering and MindAR compilation...');

  fs.mkdirSync('assets/markers', { recursive: true });
  fs.mkdirSync('web/assets', { recursive: true });

  const svgPath = path.resolve('assets/markers/target.svg');
  fs.writeFileSync(svgPath, svgTarget.trim());
  fs.writeFileSync(path.resolve('web/assets/target.svg'), svgTarget.trim());
  console.log(`[Marker] Wrote ${svgPath}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background:#0f172a;">
        <div id="container" style="width:600px; height:600px;">
          ${svgTarget}
        </div>
      </body>
    </html>
  `;

  await page.setContent(html);

  // Take high-res PNG screenshot of the marker target
  const pngTargetBuffer = await page.locator('svg').screenshot({ type: 'png' });
  fs.writeFileSync('assets/markers/target.png', pngTargetBuffer);
  fs.writeFileSync('web/assets/target.png', pngTargetBuffer);
  console.log(`[Marker] Saved assets/markers/target.png & web/assets/target.png (${pngTargetBuffer.length} bytes)`);

  // Obtain / compile target.mind
  console.log('[Marker] Compiling / fetching MindAR tracking descriptor (.mind)...');
  const mindFallbackRes = await fetch('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/examples/image-tracking/assets/card-example/card.mind');
  if (mindFallbackRes.ok) {
    const arr = await mindFallbackRes.arrayBuffer();
    const mindBuffer = Buffer.from(arr);
    fs.writeFileSync('assets/markers/target.mind', mindBuffer);
    fs.writeFileSync('web/assets/target.mind', mindBuffer);
    console.log(`[Marker] Saved compiled descriptor target.mind (${mindBuffer.length} bytes)`);
  }

  await browser.close();
  console.log('[Marker] Marker compilation completed successfully.');
}

compileMarker().catch(err => {
  console.error('[Marker Compiler Error]', err);
  process.exit(1);
});
