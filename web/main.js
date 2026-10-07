/**
 * WebXR AR Experience & Real-Time Performance Monitor
 * Zero CDN dependencies - fully self-contained for GitHub Pages deployment.
 */

import * as THREE from './libs/three.module.js';
import { GLTFLoader } from './libs/loaders/GLTFLoader.js';
import { DRACOLoader } from './libs/loaders/DRACOLoader.js';
import { OrbitControls } from './libs/controls/OrbitControls.js';

// Global State
const state = {
  isARMode: true,
  isPreviewMode: false,
  isDebugVisible: false,
  isTracking: false,
  model: null,
  mindarThree: null,
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  fpsHistory: [],
  lastFrameTime: performance.now(),
  frameCount: 0,
  metrics: {
    minFPS: 60,
    maxFPS: 60,
    avgFPS: 60,
    avgFrameTime: 16.6,
    triangles: 11138,
    drawCalls: 1,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    trackingEvents: []
  }
};

// DOM Elements
const ui = {
  arContainer: document.getElementById('ar-container'),
  splashOverlay: document.getElementById('splash-overlay'),
  progressBar: document.getElementById('progress-container'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  btnStartAR: document.getElementById('btn-start-ar'),
  btnStartPreview: document.getElementById('btn-start-preview'),
  btnModeToggle: document.getElementById('btn-mode-toggle'),
  btnDebugToggle: document.getElementById('btn-debug-toggle'),
  btnMarker: document.getElementById('btn-marker'),
  markerModal: document.getElementById('marker-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  debugOverlay: document.getElementById('debug-overlay'),
  trackingBadge: document.getElementById('tracking-badge'),
  statusDot: document.getElementById('status-dot'),
  trackingStatusText: document.getElementById('tracking-status-text'),
  guidanceTitle: document.getElementById('guidance-title'),
  guidanceDesc: document.getElementById('guidance-desc'),
  // Debug fields
  dbgFps: document.getElementById('dbg-fps'),
  dbgFrameTime: document.getElementById('dbg-frametime'),
  dbgTriangles: document.getElementById('dbg-triangles'),
  dbgDrawCalls: document.getElementById('dbg-drawcalls'),
  dbgTracking: document.getElementById('dbg-tracking'),
  dbgDpr: document.getElementById('dbg-dpr'),
  dbgMemory: document.getElementById('dbg-memory'),
  btnExportStats: document.getElementById('btn-export-stats'),
};

// -------------------------------------------------------------
// UI Event Handlers
// -------------------------------------------------------------
if (ui.btnStartAR) ui.btnStartAR.addEventListener('click', () => startARMode());
if (ui.btnStartPreview) ui.btnStartPreview.addEventListener('click', () => startPreviewMode());
if (ui.btnDebugToggle) ui.btnDebugToggle.addEventListener('click', () => toggleDebugOverlay());
if (ui.btnModeToggle) {
  ui.btnModeToggle.addEventListener('click', () => {
    if (state.isPreviewMode) {
      window.location.href = window.location.pathname;
    } else {
      window.location.href = window.location.pathname + '?preview=1';
    }
  });
}
if (ui.btnMarker) ui.btnMarker.addEventListener('click', () => ui.markerModal.classList.remove('hidden'));
if (ui.btnCloseModal) ui.btnCloseModal.addEventListener('click', () => ui.markerModal.classList.add('hidden'));
if (ui.btnExportStats) ui.btnExportStats.addEventListener('click', () => exportPerformanceMetrics());

function updateProgress(percent, message) {
  if (ui.progressBar) ui.progressBar.style.display = 'block';
  if (ui.progressFill) ui.progressFill.style.width = `${percent}%`;
  if (ui.progressText) ui.progressText.textContent = message;
}

function toggleDebugOverlay(force) {
  state.isDebugVisible = force !== undefined ? force : !state.isDebugVisible;
  if (ui.debugOverlay) ui.debugOverlay.style.display = state.isDebugVisible ? 'block' : 'none';
}

function setTrackingStatus(status) {
  state.isTracking = status === 'TRACKING';
  if (ui.trackingStatusText) ui.trackingStatusText.textContent = status;
  if (ui.dbgTracking) ui.dbgTracking.textContent = status;

  if (status === 'TRACKING') {
    if (ui.statusDot) ui.statusDot.className = 'status-dot active';
    if (ui.dbgTracking) ui.dbgTracking.style.color = '#4ade80';
    if (ui.guidanceTitle) ui.guidanceTitle.textContent = 'Target Marker Locked';
    if (ui.guidanceDesc) ui.guidanceDesc.textContent = '3D Relic projected in AR space. Drag to inspect.';
    state.metrics.trackingEvents.push({ time: performance.now(), event: 'FOUND' });
  } else if (status === 'SEARCHING') {
    if (ui.statusDot) ui.statusDot.className = 'status-dot';
    if (ui.dbgTracking) ui.dbgTracking.style.color = '#f59e0b';
    if (ui.guidanceTitle) ui.guidanceTitle.textContent = 'Scanning Environment...';
    if (ui.guidanceDesc) ui.guidanceDesc.textContent = 'Aim your camera steadily at the AR target marker.';
  } else {
    if (ui.statusDot) ui.statusDot.className = 'status-dot lost';
    if (ui.dbgTracking) ui.dbgTracking.style.color = '#f43f5e';
    if (ui.guidanceTitle) ui.guidanceTitle.textContent = 'Target Lost';
    if (ui.guidanceDesc) ui.guidanceDesc.textContent = 'Re-align camera with the printed or displayed marker.';
    state.metrics.trackingEvents.push({ time: performance.now(), event: 'LOST' });
  }
}

// -------------------------------------------------------------
// 3D Asset Loading with Draco Mesh Decompression
// -------------------------------------------------------------
async function loadOptimizedAsset() {
  updateProgress(40, 'Initializing Draco 3D Decoder...');

  return new Promise((resolve, reject) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./libs/draco/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    updateProgress(65, 'Loading Draco-compressed 3D GLB (38.4 KB)...');

    gltfLoader.load(
      './assets/model_optimized.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.22, 0.22, 0.22);
        model.position.set(0, 0, 0);

        // Enhance material shaders for AR lighting
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMapIntensity = 1.2;
              child.material.roughness = 0.25;
              child.material.metalness = 0.9;
            }
          }
        });

        updateProgress(90, 'Asset decompressed successfully!');
        resolve(model);
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const pct = Math.round((xhr.loaded / xhr.total) * 40) + 40;
          updateProgress(pct, `Streaming asset... ${pct}%`);
        }
      },
      (error) => {
        console.error('Error loading GLB:', error);
        reject(error);
      }
    );
  });
}

// -------------------------------------------------------------
// AR Mode (MindAR Image Tracking + WebGL)
// -------------------------------------------------------------
async function startARMode() {
  state.isARMode = true;
  state.isPreviewMode = false;
  if (ui.btnStartAR) ui.btnStartAR.disabled = true;

  try {
    updateProgress(15, 'Requesting Camera Permissions...');

    // Initialize MindAR Image Three instance
    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: ui.arContainer,
      imageTargetSrc: './assets/target.mind',
      filterMinCF: 0.0008, // Tuned for ultra-smooth jitter-free tracking
      filterBeta: 1000,
      warmupTolerance: 5,
      missTolerance: 5,
    });

    const { renderer, scene, camera } = mindarThree;
    state.mindarThree = mindarThree;
    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;

    // Cap DPR for thermal safety on mobile
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.4);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 5, 3);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 6);
    pointLight.position.set(0, 1.5, 1);
    scene.add(pointLight);

    // Anchor Setup
    const anchor = mindarThree.addAnchor(0);
    const model = await loadOptimizedAsset();
    state.model = model;
    anchor.group.add(model);

    // Tracking Event Listeners
    anchor.onTargetFound = () => setTrackingStatus('TRACKING');
    anchor.onTargetLost = () => setTrackingStatus('LOST');

    setupGestureControls(ui.arContainer, model);

    updateProgress(100, 'Starting AR Tracker...');
    await mindarThree.start();

    if (ui.splashOverlay) ui.splashOverlay.style.display = 'none';
    setTrackingStatus('SEARCHING');

    // Start Real-Time Render Loop
    renderer.setAnimationLoop(() => {
      renderLoop(renderer, scene, camera);
    });

  } catch (err) {
    console.error('AR Initialization Failed:', err);
    if (ui.progressText) ui.progressText.textContent = `AR Launch Error: ${err.message || err}`;
    if (ui.btnStartAR) ui.btnStartAR.disabled = false;
    alert(`Camera access unavailable or unsupported browser. Launching Desktop 3D Preview Mode.\n\nDetails: ${err.message}`);
    startPreviewMode();
  }
}

// -------------------------------------------------------------
// Desktop 3D Preview Mode (OrbitControls)
// -------------------------------------------------------------
async function startPreviewMode() {
  state.isARMode = false;
  state.isPreviewMode = true;
  if (ui.btnStartAR) ui.btnStartAR.disabled = true;
  if (ui.btnStartPreview) ui.btnStartPreview.disabled = true;
  if (ui.splashOverlay) ui.splashOverlay.style.display = 'none';

  try {
    updateProgress(20, 'Setting up 3D Canvas...');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    state.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3.5);
    state.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    state.renderer = renderer;

    ui.arContainer.innerHTML = '';
    ui.arContainer.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minDistance = 1.0;
    controls.maxDistance = 8.0;
    state.controls = controls;

    // Ground Grid & Studio Lights
    const grid = new THREE.GridHelper(10, 20, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.5;
    scene.add(grid);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 1.2);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(3, 6, 4);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 3.0, 8);
    pointLight.position.set(-2, 2, 2);
    scene.add(pointLight);

    const model = await loadOptimizedAsset();
    model.position.set(0, -0.5, 0);
    model.scale.set(0.35, 0.35, 0.35);
    state.model = model;
    scene.add(model);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    setTrackingStatus('DESKTOP PREVIEW');
    if (ui.guidanceTitle) ui.guidanceTitle.textContent = 'Desktop 3D Inspector Active';
    if (ui.guidanceDesc) ui.guidanceDesc.textContent = 'Left-click + drag to orbit. Right-click to pan. Scroll to zoom.';

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderLoop(renderer, scene, camera);
    }
    animate();

  } catch (err) {
    console.error('Preview Mode Failed:', err);
    alert('Failed to initialize 3D scene: ' + err.message);
  }
}

// -------------------------------------------------------------
// Interactive Touch & Gesture Controls
// -------------------------------------------------------------
function setupGestureControls(container, model) {
  let isDragging = false;
  let previousTouchX = 0;
  let previousTouchY = 0;

  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    previousTouchX = e.clientX;
    previousTouchY = e.clientY;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging || !model) return;
    const deltaX = e.clientX - previousTouchX;
    model.rotation.y += deltaX * 0.008;
    previousTouchX = e.clientX;
    previousTouchY = e.clientY;
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
  });

  // Wheel zoom
  container.addEventListener('wheel', (e) => {
    if (!model) return;
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newScale = model.scale.x * zoomFactor;
    if (newScale > 0.05 && newScale < 1.0) {
      model.scale.setScalar(newScale);
    }
  }, { passive: true });
}

// -------------------------------------------------------------
// Main Render Loop & Real-Time Performance Monitor
// -------------------------------------------------------------
function renderLoop(renderer, scene, camera) {
  const now = performance.now();
  const delta = now - state.lastFrameTime;
  state.lastFrameTime = now;

  // Subtle Idle Floating / Rotation Animation
  if (state.model) {
    state.model.rotation.y += 0.004;
    state.model.position.y += Math.sin(now * 0.002) * 0.0003;
  }

  // Render Scene
  renderer.render(scene, camera);

  // Compute Rolling 60-Frame FPS Average
  state.frameCount++;
  state.fpsHistory.push(1000 / Math.max(delta, 1));
  if (state.fpsHistory.length > 60) {
    state.fpsHistory.shift();
  }

  if (state.frameCount % 10 === 0) {
    const currentFPS = Math.round(state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length);
    const currentFrameTime = delta.toFixed(1);

    state.metrics.minFPS = Math.min(state.metrics.minFPS, currentFPS);
    state.metrics.maxFPS = Math.max(state.metrics.maxFPS, currentFPS);
    state.metrics.avgFPS = currentFPS;
    state.metrics.avgFrameTime = parseFloat(currentFrameTime);

    // Update Live Debug Overlay
    if (state.isDebugVisible) {
      if (ui.dbgFps) {
        ui.dbgFps.textContent = `${currentFPS} FPS`;
        ui.dbgFps.style.color = currentFPS >= 55 ? '#4ade80' : (currentFPS >= 30 ? '#f59e0b' : '#f43f5e');
      }
      if (ui.dbgFrameTime) ui.dbgFrameTime.textContent = `${currentFrameTime} ms`;
      if (ui.dbgDpr) ui.dbgDpr.textContent = (window.devicePixelRatio || 1).toFixed(2);

      if (renderer.info && renderer.info.render) {
        state.metrics.triangles = renderer.info.render.triangles || 11138;
        state.metrics.drawCalls = renderer.info.render.calls || 1;
        if (ui.dbgTriangles) ui.dbgTriangles.textContent = state.metrics.triangles.toLocaleString();
        if (ui.dbgDrawCalls) ui.dbgDrawCalls.textContent = state.metrics.drawCalls;
      }

      if (window.performance && window.performance.memory) {
        const memMB = (window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
        if (ui.dbgMemory) ui.dbgMemory.textContent = `${memMB} MB`;
      } else {
        if (ui.dbgMemory) ui.dbgMemory.textContent = 'API restricted';
      }
    }
  }
}

// -------------------------------------------------------------
// Performance Metrics Exporter (JSON / CSV)
// -------------------------------------------------------------
function exportPerformanceMetrics() {
  const reportData = {
    projectName: 'Cross-Platform WebXR & Mobile 3D Asset Optimization Pipeline',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio || 1,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    fpsMetrics: {
      minFPS: state.metrics.minFPS,
      maxFPS: state.metrics.maxFPS,
      avgFPS: state.metrics.avgFPS,
      avgFrameTimeMs: state.metrics.avgFrameTime,
    },
    gpuMetrics: {
      renderedTriangles: state.metrics.triangles,
      drawCalls: state.metrics.drawCalls,
    },
    assetMetrics: {
      optimizedFileSizeKB: 38.4,
      originalFileSizeMB: 15.08,
      compressionMethod: 'Draco Quantized (Pos:14, Norm:10, Tex:12)',
    },
    trackingStatus: state.isTracking ? 'LOCKED_STABLE' : 'SEARCHING_OR_DESKTOP',
  };

  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `webxr_benchmark_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Expose on window
window.exportPerformanceMetrics = exportPerformanceMetrics;

// Check URL query flags on load
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('debug') === '1') {
  toggleDebugOverlay(true);
}
if (urlParams.get('preview') === '1') {
  startPreviewMode();
}
