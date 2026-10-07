import { execSync } from 'child_process';

console.log('====================================================');
console.log('  WebXR Mobile 3D Asset Pipeline & Marker Builder   ');
console.log('====================================================\n');

function runStep(title, cmd) {
  console.log(`\n▶ [STEP] ${title}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✔ [SUCCESS] ${title} completed.`);
  } catch (err) {
    console.error(`✖ [ERROR] Failed during: ${title}`);
    process.exit(1);
  }
}

runStep('1. Procedural High-Poly Generation', 'node scripts/generate_highpoly.mjs');
runStep('2. Mesh Decimation & Draco Compression', 'node scripts/optimize_assets.mjs');
runStep('3. Benchmark & Khronos Spec Validation', 'node scripts/measure_glb.mjs');
runStep('4. Target Marker Generation & Compilation', 'node scripts/compile_marker.mjs');

console.log('\n====================================================');
console.log('  ✔ Complete Asset Pipeline Succeeded 100%          ');
console.log('====================================================\n');
