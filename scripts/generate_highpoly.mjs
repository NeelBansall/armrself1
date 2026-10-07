import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'fs';
import path from 'path';

function hash(n) {
  return Math.sin(n) * 43758.5453123 % 1;
}

function noise(x, y, z) {
  const p = Math.floor(x) + Math.floor(y) * 57 + Math.floor(z) * 113;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const fz = z - Math.floor(z);
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);

  const n000 = hash(p);
  const n001 = hash(p + 113);
  const n010 = hash(p + 57);
  const n011 = hash(p + 170);
  const n100 = hash(p + 1);
  const n101 = hash(p + 114);
  const n110 = hash(p + 58);
  const n111 = hash(p + 171);

  const x00 = n000 * (1 - u) + n100 * u;
  const x01 = n001 * (1 - u) + n101 * u;
  const x10 = n010 * (1 - u) + n110 * u;
  const x11 = n011 * (1 - u) + n111 * u;

  const y0 = x00 * (1 - v) + x10 * v;
  const y1 = x01 * (1 - v) + x11 * v;

  return y0 * (1 - w) + y1 * w;
}

console.log('[Pipeline] Generating Procedural High-Poly 3D Asset (Target: ~500k-600k triangles)...');

// 1. Base Pedestal
const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.4, 160, 40);
// 2. Torus Base Ring
const ringBaseGeo = new THREE.TorusGeometry(1.2, 0.12, 64, 160);
ringBaseGeo.rotateX(Math.PI / 2);
ringBaseGeo.translate(0, 0.2, 0);

// 3. Central Fluted Column
const columnGeo = new THREE.CylinderGeometry(0.42, 0.5, 1.1, 128, 80);
columnGeo.translate(0, 0.85, 0);

// 4. Central Sculpted Relic Orb (High subdivision with 3D noise displacement)
const orbGeo = new THREE.SphereGeometry(0.85, 450, 450);
const pos = orbGeo.attributes.position;
const v = new THREE.Vector3();
for (let i = 0; i < pos.count; i++) {
  v.fromBufferAttribute(pos, i);
  const n = noise(v.x * 3.2, v.y * 3.2, v.z * 3.2) * 0.14;
  const fineN = noise(v.x * 14.0, v.y * 14.0, v.z * 14.0) * 0.04;
  v.multiplyScalar(1.0 + n + fineN);
  pos.setXYZ(i, v.x, v.y, v.z);
}
orbGeo.computeVertexNormals();
orbGeo.translate(0, 2.0, 0);

// 5. Gimbal Orbital Ring 1
const gimbal1Geo = new THREE.TorusGeometry(1.3, 0.08, 80, 280);
gimbal1Geo.rotateX(Math.PI / 3.5);
gimbal1Geo.rotateY(Math.PI / 5.5);
gimbal1Geo.translate(0, 2.0, 0);

// 6. Gimbal Orbital Ring 2
const gimbal2Geo = new THREE.TorusGeometry(1.5, 0.065, 80, 280);
gimbal2Geo.rotateX(-Math.PI / 3.0);
gimbal2Geo.rotateZ(Math.PI / 4.0);
gimbal2Geo.translate(0, 2.0, 0);

// 7. Top Crown Apex / Spire
const crownGeo = new THREE.ConeGeometry(0.35, 0.9, 80, 80);
crownGeo.translate(0, 3.35, 0);

const mergedGeo = BufferGeometryUtils.mergeGeometries([
  baseGeo.toNonIndexed(),
  ringBaseGeo.toNonIndexed(),
  columnGeo.toNonIndexed(),
  orbGeo.toNonIndexed(),
  gimbal1Geo.toNonIndexed(),
  gimbal2Geo.toNonIndexed(),
  crownGeo.toNonIndexed()
], false);

const indexedGeo = BufferGeometryUtils.mergeVertices(mergedGeo);
indexedGeo.computeVertexNormals();

const totalTriangles = indexedGeo.index.count / 3;
const totalVertices = indexedGeo.attributes.position.count;
console.log(`[High-Poly Model] Generated Geometry: ${totalTriangles.toLocaleString()} triangles, ${totalVertices.toLocaleString()} vertices.`);

// Build glTF Document via @gltf-transform/core
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('Scene');

const posAccessor = doc.createAccessor('positions')
  .setType('VEC3')
  .setArray(new Float32Array(indexedGeo.attributes.position.array))
  .setBuffer(buffer);

const normAccessor = doc.createAccessor('normals')
  .setType('VEC3')
  .setArray(new Float32Array(indexedGeo.attributes.normal.array))
  .setBuffer(buffer);

const uvAccessor = doc.createAccessor('texcoords')
  .setType('VEC2')
  .setArray(new Float32Array(indexedGeo.attributes.uv.array))
  .setBuffer(buffer);

const indexAccessor = doc.createAccessor('indices')
  .setType('SCALAR')
  .setArray(new Uint32Array(indexedGeo.index.array))
  .setBuffer(buffer);

// Create PBR Material
const mat = doc.createMaterial('M_CyberRelic_PBR')
  .setBaseColorFactor([0.88, 0.72, 0.25, 1.0])
  .setMetallicFactor(0.85)
  .setRoughnessFactor(0.28);

const prim = doc.createPrimitive()
  .setAttribute('POSITION', posAccessor)
  .setAttribute('NORMAL', normAccessor)
  .setAttribute('TEXCOORD_0', uvAccessor)
  .setIndices(indexAccessor)
  .setMaterial(mat);

const mesh = doc.createMesh('CyberRelic_HighPoly')
  .addPrimitive(prim);

const node = doc.createNode('CyberRelic_Node')
  .setMesh(mesh);

scene.addChild(node);

fs.mkdirSync('assets/source', { recursive: true });
const io = new NodeIO();
const outputPath = path.resolve('assets/source/highpoly.glb');
await io.write(outputPath, doc);

const stats = fs.statSync(outputPath);
console.log(`[High-Poly Export] Saved uncompressed baseline GLB: ${outputPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
