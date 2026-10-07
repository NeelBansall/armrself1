"""
Procedural High-Poly 3D Asset Generator for Blender (Headless)
Generates an intricate AR-ready Trophy/Relic mesh with subdivision surface,
displacement noise, and procedural PBR materials.
Targets ~500k - 1M triangles before optimization.

Usage:
    blender --background --python scripts/blender_make_highpoly.py
"""

import bpy
import bmesh
import math
import os

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_highpoly_artifact():
    # Base Pedestal (Octagonal stepped base)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=1.0, depth=0.25, location=(0, 0, 0.125))
    base = bpy.context.active_object
    base.name = "Pedestal_Base"

    # Pedestal Top Ring
    bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.08, location=(0, 0, 0.25))
    torus_base = bpy.context.active_object

    # Central Core Stem
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.35, depth=0.8, location=(0, 0, 0.75))
    stem = bpy.context.active_object

    # Main Relic Orb / Core Trophy
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.75, location=(0, 0, 1.6))
    orb = bpy.context.active_object
    orb.name = "Relic_Orb"

    # Outer Orbital Ring 1
    bpy.ops.mesh.primitive_torus_add(major_radius=1.1, minor_radius=0.06, location=(0, 0, 1.6), rotation=(math.radians(35), math.radians(45), 0))
    ring1 = bpy.context.active_object

    # Outer Orbital Ring 2
    bpy.ops.mesh.primitive_torus_add(major_radius=1.25, minor_radius=0.05, location=(0, 0, 1.6), rotation=(math.radians(-40), math.radians(60), math.radians(30)))
    ring2 = bpy.context.active_object

    # Top Crown / Antenna
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.25, radius2=0.02, depth=0.6, location=(0, 0, 2.5))
    crown = bpy.context.active_object

    # Join objects into single mesh
    obs = [base, torus_base, stem, orb, ring1, ring2, crown]
    ctx = bpy.context.copy()
    ctx['active_object'] = orb
    ctx['selected_editable_objects'] = obs
    bpy.ops.object.select_all(action='DESELECT')
    for ob in obs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = orb
    bpy.ops.object.join()

    main_obj = bpy.context.active_object
    main_obj.name = "AR_Relic_HighPoly"

    # Add Subdivision Surface Modifier (Level 3-4 to reach ~500k-1M triangles)
    subsurf = main_obj.modifiers.new(name="Subdivision", type='SUBSURF')
    subsurf.render_levels = 3
    subsurf.levels = 3
    bpy.ops.object.modifier_apply(modifier=subsurf.name)

    # Add Procedural Displace modifier for sculpted surface detail
    tex = bpy.data.textures.new("DisplacementNoise", type='VORONOI')
    tex.noise_scale = 0.35
    tex.weight_1 = 0.8
    tex.weight_2 = 0.2

    displace = main_obj.modifiers.new(name="DisplaceDetail", type='DISPLACE')
    displace.texture = tex
    displace.strength = 0.04
    bpy.ops.object.modifier_apply(modifier=displace.name)

    # UV Unwrap
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Assign PBR Material
    mat = bpy.data.materials.new(name="M_Relic_PBR")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.85, 0.65, 0.2, 1.0) # Gold / Cyber Bronze
        bsdf.inputs['Metallic'].default_value = 0.9
        bsdf.inputs['Roughness'].default_value = 0.25

    main_obj.data.materials.append(mat)
    return main_obj

def main():
    os.makedirs("assets/source", exist_ok=True)
    clear_scene()
    obj = create_highpoly_artifact()

    # Save .blend file
    blend_path = os.path.abspath("assets/source/highpoly.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"[Blender] Saved high-poly .blend to {blend_path}")

    # Export uncompressed high-poly GLB
    glb_path = os.path.abspath("assets/source/highpoly.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_draco_mesh_compression_enable=False,
        export_materials='EXPORT',
        export_yup=True
    )
    print(f"[Blender] Exported high-poly GLB to {glb_path}")

if __name__ == "__main__":
    main()
