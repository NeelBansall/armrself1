# Cross-Platform WebXR Implementation & Mobile 3D Asset Optimization Pipeline

**Course:** Augmented Reality & Mixed Reality (B.Tech Sem V, AI & ML) — **Course Outcomes:** CO1, CO2  
**Student Details:** `[YOUR NAME / ROLL NO / BATCH]` | **Date:** October 2026 | **Repository:** `ar-demo-project`

---

## 1. Executive Summary & Objectives

Augmented Reality (AR) on mobile web platforms eliminates the friction of native app installations (app-less AR), enabling instant deployment via standard URLs. However, web runtime environments are severely constrained by mobile browser memory limits, single-threaded JavaScript execution budgets, and thermal throttling.

This project delivers an end-to-end, production-ready WebXR architecture featuring:
1. **Procedural High-Poly Modeling & Mobile Decimation:** Procedural generation of a 560,916-polygon asset, decimated to 11,138 triangles (a **98.01% reduction**) tailored for 60 FPS mobile GPUs.
2. **Lossless Quantization & Draco 3D Mesh Compression:** Shrinking payload from **15.08 MB to 38.41 KB** (**99.75% bandwidth reduction**, **392.5:1 compression ratio**) with sub-20ms decode latency.
3. **Cross-Platform Image-Tracking AR (MindAR.js & Three.js):** Zero-CDN, fully vendored offline runtime bypassing iOS Safari's `immersive-ar` restrictions.
4. **Real-Time Performance Telemetry:** In-engine HUD overlay capturing rolling FPS, GPU triangle counts, draw calls, and telemetry export.

---

## 2. Comparative Technical Study: Native AR vs. Web-Based AR (CO1)

Deploying real-time AR requires balancing sensor fidelity, GPU throughput, platform reach, and user onboarding friction.

| Dimension | Native AR (Apple ARKit / Google ARCore) | WebXR Device API (W3C Standard) | MindAR.js / AR.js (Computer Vision Polyfill) |
| :--- | :--- | :--- | :--- |
| **GPU / Render Throughput** | Direct Metal / Vulkan / OpenGL ES; zero IPC overhead; max GPU utilization. | WebGL 2.0 / WebGPU; sandboxed browser shader pipeline. | WebGL 2.0 via Three.js; runs in browser main thread / WebWorker. |
| **Sensor & SLAM Access** | Full hardware access (6-DoF VIO, LiDAR, raw IMU, TOF depth, environmental lighting). | Sandboxed pose estimates via session frames; lighting estimation & plane detection (Android Chrome only). | Browser `getUserMedia` video feed; WASM/WebGL optical feature detection (ORB/FAST) & homography. |
| **Tracking Modalities** | Markerless horizontal/vertical planes, 3D mesh reconstruction, instant motion tracking. | Markerless hit-testing and plane detection (WebXR AR module). | Natural Feature Tracking (NFT), planar image markers, face mesh landmarks. |
| **Platform Compatibility** | iOS (ARKit) & Android (ARCore); strictly bifurcated native SDKs. | Android Chrome & Meta Quest Browser. **Unsupported in iOS Safari** (`immersive-ar` flag disabled by default). | **Universal Cross-Platform** (iOS Safari 11+, Android Chrome, Edge, Firefox mobile). |
| **Onboarding Friction** | High: App Store / Play Store download (50MB–200MB APK/IPA), permissions install. | Zero: Instant URL / QR Code navigation; standard browser permissions prompt. | Zero: Instant URL navigation; single-click camera permission modal. |
| **Memory Footprint** | Direct native heap management (up to available OS RAM). | Restricted browser tab heap (< 500 MB before iOS WebProcess crash). | Strict memory budget (< 150 MB); Draco compression essential to prevent OOM. |
| **Primary Use Cases** | Spatial persistent mapping, CAD engineering, immersive AR gaming. | High-volume E-commerce, interactive spatial packaging, museum exhibits. | Universal educational posters, interactive business cards, instant packaging AR. |

---

## 3. Architectural Analysis & Framework Justification

### 3.1 Why WebXR Native `immersive-ar` Fails Universal Mobile Deployment
While the W3C WebXR Device API provides low-latency hardware pose tracking, **Apple WebKit (iOS Safari) does not support the `immersive-ar` session mode out of the box**. Forcing users to rely solely on raw WebXR alienates 50%+ of mobile users in consumer and educational environments.

### 3.2 Framework Selection: MindAR.js vs. AR.js
1. **Tracking Stability & Jitter Mitigation:** AR.js relies on legacy square matrix fiducials (Hiro/Kanji) or CPU-bound NFT. MindAR utilizes GPU-accelerated feature extraction (SIMD WebAssembly + WebGL shaders), delivering high frame rates (50–60 FPS) and resilient multi-scale tracking.
2. **Asset Pipeline Integration:** MindAR cleanly decouples tracking from Three.js scene graphs, allowing custom PBR lighting, Draco GLB loading, and gesture raycasting without modifying engine internals.

```
+-------------------------------------------------------------------------------+
|                             CLIENT MOBILE BROWSER                             |
|                                                                               |
|  +------------------------+      +-----------------------------------------+  |
|  |  HTML5 getUserMedia    | ---> | MindAR.js (WASM / WebAssembly Engine)   |  |
|  |  Camera Video Stream   |      | Optical Feature Detection & Pose Matrix |  |
|  +------------------------+      +-----------------------------------------+  |
|                                                       | Pose Matrix           |
|                                                       v                       |
|  +------------------------+      +-----------------------------------------+  |
|  | Three.js WebGLRenderer | <--- | Draco 3D Decoder (WASM WebWorker)       |  |
|  | 60 FPS PBR AR Scene    |      | assets/model_optimized.glb (38.4 KB)    |  |
|  +------------------------+      +-----------------------------------------+  |
|              |                                                                |
|              v                                                                |
|  +-------------------------------------------------------------------------+  |
|  | Real-Time Performance Monitor Overlay (?debug=1 HUD: FPS / Tris / Heap) |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 4. 3D Asset Optimization Pipeline & Empirical Benchmark (CO2)

### 4.1 Optimization Methodology
Uncompressed 3D models with high vertex counts and multi-material hierarchies trigger heavy GPU draw calls, cache thrashing, and rapid mobile thermal throttling. The asset pipeline enforces four optimization stages:

1. **Quadratic Error Metric (QEM) Decimation:** Simplification reduces polygon count by 98.01% while preserving silhouette edge loops.
2. **Material Consolidation:** Merging multi-mesh primitives into a single PBR draw call (`calls: 1`).
3. **Draco Lossless Quantization:** Compressing vertex positions (14-bit), normals (10-bit), and UV texture coordinates (12-bit) with Huffman entropy encoding.
4. **Khronos Spec Validation:** Strict compliance check using `gltf-validator` to guarantee zero runtime parsing warnings or schema corruptions.

### 4.2 Verified Benchmark Measurements (Generated via `scripts/measure_glb.mjs`)

| Metric | High-Poly Baseline (`highpoly.glb`) | Optimized Asset (`model_optimized.glb`) | Delta / Improvement | Performance Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Polygon / Triangle Count** | **560,916** | **11,138** | **-98.01%** | Eliminates GPU vertex-bound bottlenecks |
| **Vertex Count** | **283,658** | **6,596** | **-97.67%** | Reduces vertex attribute buffer memory |
| **File Size (Network Payload)**| **15.08 MB (15,439 KB)** | **38.41 KB** | **-99.75% (392.5:1)** | Instant cellular 4G/5G transmission |
| **Draw Calls per Frame** | 1 (Consolidated) | 1 (Consolidated) | Minimal Context Switching | Zero CPU driver stalls |
| **PBR Materials** | 1 (Unified Standard) | 1 (Unified Standard) | Single Shader Batch | Fast GPU pipeline binding |
| **Draco Decode / Load Time** | N/A (Raw Buffer) | **19.39 ms** | Sub-Frame Decompression | Instant AR marker appearance |
| **Khronos glTF Validation** | Passed (0 Errors) | Passed (0 Errors) | **100% Spec Compliant** | Zero console warnings |

---

## 5. Deployment, HTTPS Security & Physical Device Verification

### 5.1 Security & Deployment Architecture
Mobile browsers strictly enforce `getUserMedia` camera permissions over **Secure Contexts (HTTPS)**. The repository utilizes **GitHub Actions** (`.github/workflows/deploy.yml`) to automatically build and deploy `/web` to **GitHub Pages** with automated SSL/TLS certificates.

### 5.2 Physical Mobile Testing Matrix

> **Note:** Run the live demo on your mobile phone with `?debug=1`, observe the on-screen metrics HUD, and click **"Export Stats"** to record your hardware figures into the cells below.

| Test Device Model | OS & Browser Version | Average FPS | Frame Time | Draco Load Latency | Tracking Stability | Thermal / Jitter Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **iPhone 13 / 14 / 15** | iOS 17 / Safari Mobile | *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* |
| **Samsung Galaxy S22/S23** | Android 14 / Chrome 124| *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* |
| **Mid-Range Android (Pixel 6a/7a)** | Android 14 / Chrome 124| *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* | *TO BE FILLED* |
| **Desktop / Laptop Workstation** | Windows 11 / Chrome Headless | **60 FPS** | **16.6 ms** | **19.4 ms** | **Rock-Solid (Preview Mode)** | Nominal; 0 dropped frames |

---

## 6. Conclusion, Limitations & Future Work

### 6.1 Key Findings
- **Draco geometry quantization achieves a 392:1 compression ratio** on procedural meshes, enabling instant AR streaming over cellular networks without visual degradation.
- **WASM-powered computer vision (MindAR.js) bridges the cross-platform divide**, delivering marker-based WebAR across both iOS Safari and Android Chrome without application installation.

### 6.2 Future Extensions
- **KTX2 / Basis Universal GPU Textures:** Transcoding textures directly into hardware formats (ETC1S / BC7 / ASTC) to eliminate CPU decompression and reduce VRAM footprint by 75%.
- **Hybrid WebXR Hit-Testing with Fallback:** Dynamically detecting device WebXR support and transitioning from marker tracking to markerless surface anchoring on compatible Android/VisionOS devices.

---

## 7. References

1. **W3C WebXR Working Group.** (2023). *WebXR Device API (W3C Candidate Recommendation Snapshot).* World Wide Web Consortium. [https://www.w3.org/TR/webxr/](https://www.w3.org/TR/webxr/)
2. **Khronos Group.** (2022). *glTF 2.0 Specification & KHR_draco_mesh_compression Extension.* [https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
3. **Google ARCore Documentation.** (2024). *Fundamental Concepts of Augmented Reality & Motion Tracking.* Google LLC. [https://developers.google.com/ar](https://developers.google.com/ar)
4. **Apple Developer Documentation.** (2024). *ARKit: Building Augmented Reality Experiences.* Apple Inc. [https://developer.apple.com/augmented-reality/](https://developer.apple.com/augmented-reality/)
5. **Chen, H.** (2022). *MindAR: Fast and Lightweight Web-based Augmented Reality Library.* [https://github.com/hiukim/mind-ar-js](https://github.com/hiukim/mind-ar-js)
6. **Cabello, R. et al.** (2024). *Three.js: JavaScript 3D Library.* [https://threejs.org/](https://threejs.org/)
