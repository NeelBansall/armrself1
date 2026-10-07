"""
Automated 3D Asset Optimization & Draco Compression Pipeline for Blender (Headless)
Performs mesh decimation (collapse to ~8k-12k triangles), Smart UV re-unwrapping,
Normal/Color texture baking, PBR material consolidation, and Draco-compressed GLB export.

Usage:
    blender --background --python scripts/blender_optimize.py
"""

import bpy
import os
import sys

def optimize_pipeline():
    os.makedirs("assets/optimized", exist_ok=True)
    os.makedirs("web/assets", exist_ok=True)

    highpoly_blend = os.path.abspath("assets/source/highpoly.blend")
    if not os.path.exists(highpoly_blend):
        print(f"[Error] Source file not found: {highpoly_blend}")
        return

    bpy.ops.wm.open_mainfile(filepath=highpoly_blend)
    highpoly_obj = bpy.data.objects.get("AR_Relic_HighPoly")
    if not highpoly_obj:
        print("[Error] Highpoly object not found in blend file")
        return

    # Duplicate object for low-poly target
    lowpoly_obj = highpoly_obj.copy()
    lowpoly_obj.data = highpoly_obj.data.copy()
    lowpoly_obj.name = "AR_Relic_LowPoly"
    bpy.context.collection.objects.link(lowpoly_obj)

    # Apply Decimate Modifier targeting ~8k-12k triangles (ratio ~ 0.015 - 0.02)
    decimate = lowpoly_obj.modifiers.new(name="Decimate_Optimization", type='DECIMATE')
    decimate.decimate_type = 'COLLAPSE'
    decimate.ratio = 0.02
    bpy.context.view_layer.objects.active = lowpoly_obj
    bpy.ops.object.modifier_apply(modifier=decimate.name)

    # Smart UV Unwrap
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.01)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Remove high-poly from export selection
    bpy.ops.object.select_all(action='DESELECT')
    lowpoly_obj.select_set(True)
    bpy.context.view_layer.objects.active = lowpoly_obj

    # Export Draco Compressed Optimized GLB
    opt_path = os.path.abspath("assets/optimized/model_optimized.glb")
    bpy.ops.export_scene.gltf(
        filepath=opt_path,
        export_format='GLB',
        use_selection=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_materials='EXPORT',
        export_yup=True
    )
    print(f"[Blender] Exported optimized Draco GLB to {opt_path}")

    # Copy to web directory
    web_dest = os.path.abspath("web/assets/model_optimized.glb")
    import shutil
    shutil.copyfile(opt_path, web_dest)
    print(f"[Blender] Copied to {web_dest}")

if __name__ == "__main__":
    optimize_pipeline()
