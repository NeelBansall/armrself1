# Real-Time 3D Asset Optimization Benchmark Table

| Metric | Before Optimization (`highpoly.glb`) | After Optimization (`model_optimized.glb`) | Improvement / Reduction | Target Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Triangle Count** | 5,60,916 | 11,138 | **-98.01%** | Mid-range mobile GPU limit (< 50k tris) |
| **Vertex Count** | 2,83,658 | 6,596 | **-97.67%** | Drastically cuts vertex shader overhead |
| **File Size (Disk/Network)** | 15.077 MB (15438.74 KB) | 0.038 MB (38.41 KB) | **-99.75% (402.0:1)** | Fast mobile cellular transmission (< 2 MB) |
| **Draw Calls** | 1 | 1 | 1 (Consolidated) | Prevents CPU-GPU context switching bottlenecks |
| **PBR Materials** | 1 | 1 | 1 (Unified) | Single-shader batch rendering |
| **Mesh Compression** | Uncompressed (Raw Buffer) | Draco (Pos: 14-bit, Norm: 10-bit) | Draco Quantized | High geometric fidelity at tiny payload |
| **Decode / Load Time** | 65.95 ms | 18.79 ms | Fast parse & GPU transfer | Sub-50ms instant AR marker spawn |
| **glTF Spec Validation** | Passed (0 Errors, 0 Warnings) | Passed (0 Errors, 0 Warnings) | 100% Spec Compliant | Validated with official Khronos gltf-validator |

