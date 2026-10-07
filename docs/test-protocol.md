# Physical Device Testing Protocol

This document outlines the standard operating procedure for validating the WebXR marker-based AR experience on physical mobile hardware (iOS / Android) and populating the device benchmark matrix in `docs/report.md`.

---

## 1. Prerequisites & Setup

1. **Target Marker Setup:**
   - Open `web/assets/target.png` (or `assets/markers/target.png`) on a secondary laptop/tablet screen, or print it out on standard A4 paper with high contrast.
   - Place the marker on a flat, well-lit desk surface. Avoid direct specular glare or harsh shadows over the optical corner targets.
2. **Device Connection:**
   - Connect your mobile device to Wi-Fi or cellular network.
   - Open mobile browser (**Safari on iOS**, **Chrome on Android**).
   - Navigate to the deployed GitHub Pages URL:
     ```
     https://<username>.github.io/ar-demo-project/?debug=1
     ```
   - *(Optional local testing)*: If testing locally over Wi-Fi, run `npm run serve` on your computer, ensure both devices are on the same subnet, and navigate to `https://<local-ip>:8080/?debug=1`.

---

## 2. Execution Steps

1. **Permission Grant:**
   - Tap **"🚀 Launch AR Camera"** on the splash screen.
   - When prompted by the browser, tap **"Allow"** to grant camera stream access.
2. **Telemetry HUD Verification:**
   - Because `?debug=1` was supplied, the **Device Benchmark HUD** will appear in the top-right corner.
   - Confirm that the HUD displays:
     - Real-time rolling **FPS** (target: ~55–60 FPS on modern hardware).
     - **Frame Time** (target: ~16.6 ms).
     - **Triangles (GPU)**: `11,138`.
     - **Draw Calls**: `1`.
     - **Device Pixel Ratio (DPR)**: (e.g., `2.0` / `3.0`).
3. **Marker Alignment & Tracking Lock:**
   - Hold the phone approximately **25 cm to 50 cm (10–20 inches)** away from the marker.
   - Frame the marker within the center of the camera viewport.
   - Observe the top status indicator transition from `SEARCHING` (amber) to `TRACKING` (green).
   - Verify that the 3D Cyber Relic artifact renders stably above the marker plane.
4. **Interaction & Stress Testing:**
   - **Rotation Test:** Touch the screen and drag horizontally to rotate the 3D relic. Verify smooth response.
   - **Distance Test:** Move the camera back to 1 meter (3 feet) and evaluate tracking drop-off distance.
   - **Angle Test:** Tilt the camera at a 45° angle to test homography stability under perspective distortion.
   - **Occlusion Test:** Cover one of the marker corners with your finger and note whether tracking recovers immediately once uncovered.
5. **Exporting Benchmark Data:**
   - Click the **"Export Stats (JSON / CSV)"** button at the bottom of the debug HUD.
   - The browser will download a file named `webxr_benchmark_<timestamp>.json`.
   - Open the JSON file to copy your exact `avgFPS`, `minFPS`, and `avgFrameTimeMs` into Section 5.2 of `docs/report.md`!

---

## 3. Troubleshooting

- **Camera Permission Denied:** Reset browser site permissions in Settings > Safari/Chrome > Permissions > Camera > Allow.
- **Marker Not Detected:** Ensure sufficient ambient room lighting and avoid reflective screens. If displaying on a monitor, increase monitor brightness to 100%.
- **Thermal Throttling:** On older mobile devices, keep testing sessions under 5 minutes to record baseline non-throttled frame rates.
