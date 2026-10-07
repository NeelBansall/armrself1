import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, draco, prune, dedup, reorder, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import draco3d from 'draco3d';
import fs from 'fs';
import path from 'path';

console.log('[Optimization Pipeline] Initializing mesh decimation and Draco compression...');

async function runOptimization() {
  await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);

  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

  const inputPath = path.resolve('assets/source/highpoly.glb');
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Source file not found at ${inputPath}`);
  }

  const doc = await io.read(inputPath);
  console.log('[Pipeline] Read source high-poly GLB successfully.');

  // Weld duplicate / co-located vertices to ensure clean decimation topology
  await doc.transform(weld({ tolerance: 0.0001 }));

  // Simplify mesh using MeshoptSimplifier:
  // Target: ~9,000 - 12,000 triangles for high-performance 60 FPS mobile WebXR rendering
  const targetRatio = 0.02; // ~2% of 560k = ~11k triangles
  console.log(`[Pipeline] Decimating mesh with target ratio: ${targetRatio}...`);
  await doc.transform(
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: targetRatio,
      error: 0.005,
    })
  );

  // Prune unused nodes/buffers, deduplicate accessors, reorder for GPU vertex cache
  await doc.transform(
    dedup(),
    reorder({ encoder: MeshoptEncoder }),
    prune()
  );

  // Apply Draco mesh compression (Quantization tuned for AR mobile precision)
  console.log('[Pipeline] Applying Draco compression with quantization...');
  await doc.transform(
    draco({
      compressionLevel: 7,
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12,
      quantizeColor: 8,
      quantizeGeneric: 12,
    })
  );

  fs.mkdirSync('assets/optimized', { recursive: true });
  fs.mkdirSync('web/assets', { recursive: true });

  const outputPath = path.resolve('assets/optimized/model_optimized.glb');
  await io.write(outputPath, doc);

  const optStats = fs.statSync(outputPath);
  const srcStats = fs.statSync(inputPath);
  const reduction = ((1 - optStats.size / srcStats.size) * 100).toFixed(1);

  console.log(`[Pipeline] Successfully created optimized Draco GLB: ${outputPath}`);
  console.log(`[Pipeline] Size before: ${(srcStats.size / (1024 * 1024)).toFixed(2)} MB -> Size after: ${(optStats.size / 1024).toFixed(1)} KB (-${reduction}%)`);

  // Copy to web deployment directory
  const webPath = path.resolve('web/assets/model_optimized.glb');
  fs.copyFileSync(outputPath, webPath);
  console.log(`[Pipeline] Copied optimized asset to ${webPath}`);
}

runOptimization().catch(err => {
  console.error('[Pipeline Error]', err);
  process.exit(1);
});
