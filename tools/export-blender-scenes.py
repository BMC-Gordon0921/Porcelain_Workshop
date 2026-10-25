"""Run with Blender --background --python tools/export-blender-scenes.py.

The editable sources are never saved: all baking and batching happens in memory.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public' / 'models' / 'maps'
OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = {}
for number, name in enumerate(['guyao', 'museum', 'imperial', 'taoxichuan'], 1):
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'src' / 'scenes' / f'{number:02}-{name}.blend'), load_ui=False)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    points = [o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]
    bounds = {'min': [min(p.x for p in points), min(p.z for p in points), -max(p.y for p in points)],
              'max': [max(p.x for p in points), max(p.z for p in points), -min(p.y for p in points)]}
    chimney = next((o for o in meshes if o.name.startswith('Tapered brick chimney')), None)
    anchor = None
    if chimney:
        top = max((chimney.matrix_world @ Vector(p)).z for p in chimney.bound_box)
        anchor = {'x': chimney.location.x, 'y': top + .18, 'z': -chimney.location.y}
    # Bake modifiers, then merge compatible static surfaces by material.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.convert(target='MESH')
    batches = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            continue
        key = tuple(slot.material.name if slot.material else '' for slot in obj.material_slots)
        batches.setdefault(key, []).append(obj)
    for objects in batches.values():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f'{name}.glb'), export_format='GLB',
                              use_selection=True, export_cameras=False, export_lights=False)
    manifest[name] = {'url': f'models/maps/{name}.glb', 'bounds': bounds, 'groundY': .09,
                      'chimney': anchor, 'batches': len(batches)}
    print('EXPORTED', name, manifest[name])
(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
