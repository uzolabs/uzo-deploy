"""Uzo Deploy glass art, in the same light and glass as the Uzo Labs site. Run: blender --background --factory-startup --python art/render.py -- art/out [names...]"""
import bpy, bmesh, math, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "out")
PREVIEW = os.environ.get("UZO_PREVIEW") == "1"
ONLY = set(argv[1:])
os.makedirs(OUT, exist_ok=True)

# Uli palette, matching the site: edo ochre, ufie camwood, nzu chalk.
GOLD = (1.0, 0.56, 0.12)
CAMWOOD = (0.95, 0.24, 0.09)
CHALK = (1.0, 0.9, 0.74)


def srgb(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


# ---------- scene ----------
def reset(res_x, res_y, samples=72):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    cy.max_bounces = 16
    cy.transmission_bounces = 16
    cy.glossy_bounces = 8
    cy.transparent_max_bounces = 16
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.film_transparent_glass = True
    cy.film_transparent_roughness = 0.2
    sc.render.film_transparent = True
    sc.render.resolution_x = res_x
    sc.render.resolution_y = res_y
    sc.render.resolution_percentage = 40 if PREVIEW else 100
    if PREVIEW:
        cy.samples = 20
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "8"
    sc.view_settings.view_transform = "Standard"
    for look in ("Medium High Contrast", "None"):
        try:
            sc.view_settings.look = look
            break
        except Exception:
            pass
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes["Background"]
    bg.inputs[0].default_value = (*srgb((0.19, 0.15, 0.11)), 1)
    bg.inputs[1].default_value = 1.0
    rig()


def area(name, loc, rot, size, color, power, shape="RECTANGLE", size_y=None):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = shape
    d.size = size
    if size_y:
        d.size_y = size_y
    d.color = color
    d.energy = power
    o = bpy.data.objects.new(name, d)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    return o


def look_at(obj, target=(0, 0, 0)):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def strip(name, loc, size, color, strength):
    """A long emissive card: seen only in reflections, it draws the glass edges."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = (size[0], size[1], 1)
    look_at(o)
    o.rotation_euler.rotate_axis("X", math.pi)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n = m.node_tree.nodes
    n.clear()
    em = n.new("ShaderNodeEmission")
    em.inputs[0].default_value = (*color, 1)
    em.inputs[1].default_value = strength
    out = n.new("ShaderNodeOutputMaterial")
    m.node_tree.links.new(em.outputs[0], out.inputs[0])
    o.data.materials.append(m)
    o.visible_camera = False
    o.visible_shadow = False
    return o


def rig():
    for l in (
        area("key", (-3.5, -4, 5), (0, 0, 0), 4, (1, 0.97, 0.94), 900),
        area("gold", (-5, 3, 1.5), (0, 0, 0), 3, GOLD, 2200),
        area("camwood", (5, 2.5, 2.5), (0, 0, 0), 3, CAMWOOD, 2200),
        area("under", (0, -2, -4), (0, 0, 0), 5, CHALK, 300),
    ):
        look_at(l)
    strip("s1", (-6, -3, 3), (0.5, 9), CHALK, 6)
    strip("s2", (6, -4, 2), (0.35, 9), CAMWOOD, 8)
    strip("s3", (0, 6, 6), (10, 1.2), GOLD, 4)


# ---------- materials ----------
_mats = {}
GLOW_SCALE = 0.42


def glass(tint=(0.85, 1.0, 0.95), rough=0.03, film=320.0, name=None):
    key = name or f"g{tint}{rough}{film}"
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    tint = (min(1.0, tint[1]), 0.93 * tint[1], 0.82 * tint[2])  # cool tints in, warm chalk glass out
    p.inputs["Base Color"].default_value = (*srgb(tint), 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["IOR"].default_value = 1.47
    p.inputs["Transmission Weight"].default_value = 1.0
    if "Thin Film Thickness" in p.inputs:
        p.inputs["Thin Film Thickness"].default_value = film
        p.inputs["Thin Film IOR"].default_value = 1.38
    _mats[key] = m
    return m


def glow(strength=3.0, axis="X", stops=(GOLD, CAMWOOD), name=None):
    key = name or f"e{strength}{axis}{stops}"
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    n = nt.nodes
    n.clear()
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ")
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*stops[0], 1)
    ramp.color_ramp.elements[1].color = (*stops[-1], 1)
    em = n.new("ShaderNodeEmission")
    em.inputs[1].default_value = strength * GLOW_SCALE
    out = n.new("ShaderNodeOutputMaterial")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs[axis], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], em.inputs[0])
    nt.links.new(em.outputs[0], out.inputs[0])
    _mats[key] = m
    return m


def assign(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    return o


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


# ---------- shapes ----------
def rounded_box(size, loc=(0, 0, 0), bevel=0.12, mat=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    b = o.modifiers.new("bevel", "BEVEL")
    b.width = bevel
    b.segments = 10
    b.limit_method = "NONE"
    b.harden_normals = False
    smooth(o)
    o.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = False
    if mat:
        assign(o, mat)
    return o


def sphere(r, loc, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=64, ring_count=32)
    return assign(smooth(bpy.context.object), mat)


def torus(R, r, loc=(0, 0, 0), rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot,
                                     major_segments=128, minor_segments=40)
    o = smooth(bpy.context.object)
    if mat:
        assign(o, mat)
    return o


def cylinder(r, depth, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.06):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=96)
    o = bpy.context.object
    if bevel:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 8
        b.limit_method = "ANGLE"
        b.angle_limit = math.radians(60)
    smooth(o)
    o.modifiers.new("wn", "WEIGHTED_NORMAL")
    if mat:
        assign(o, mat)
    return o


def tube(points, radius, mat, radii=None, res=10, caps=True):
    cu = bpy.data.curves.new("tube", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.use_fill_caps = caps
    cu.resolution_u = 4
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for i, p in enumerate(points):
        sp.points[i].co = (*p, 1)
        if radii:
            sp.points[i].radius = radii[i]
    sp.use_smooth = True
    o = bpy.data.objects.new("tube", cu)
    bpy.context.collection.objects.link(o)
    cu.materials.append(mat)
    return o


def text(body, size, extrude, mat, loc=(0, 0, 0), rot=(math.pi / 2, 0, 0), bevel=0.02):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.data.body = body
    o.data.size = size
    o.data.extrude = extrude
    o.data.bevel_depth = bevel
    o.data.bevel_resolution = 6
    o.data.align_x = "CENTER"
    o.data.align_y = "CENTER"
    o.data.materials.append(mat)
    return o


def shape2d(points, extrude, bevel, mat, loc=(0, 0, 0), rot=(math.pi / 2, 0, 0), scale=1.0):
    """A flat outline, extruded and beveled into a glass slab."""
    cu = bpy.data.curves.new("shape", "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = 8
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for i, (x, y) in enumerate(points):
        sp.points[i].co = (x * scale, y * scale, 0, 1)
    sp.use_cyclic_u = True
    o = bpy.data.objects.new("shape", cu)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    cu.materials.append(mat)
    return o


def revolve(profile, segments=96, mat=None, loc=(0, 0, 0)):
    """Mesh of revolution from (radius, z) pairs, top to bottom."""
    me = bpy.data.meshes.new("rev")
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * k / segments), r * math.sin(2 * math.pi * k / segments), z))
                for k in range(segments)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(segments):
            k2 = (k + 1) % segments
            bm.faces.new((a[k], a[k2], b[k2], b[k]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("rev", me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    smooth(o)
    if mat:
        assign(o, mat)
    return o


# ---------- camera ----------
def frame(direction=(0.0, -1.0, 0.35), lens=60, pad=1.12, target=None):
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in sc.objects:
        if o.type in {"MESH", "CURVE", "FONT"} and o.visible_camera:
            ev = o.evaluated_get(deps)
            pts += [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    center = Vector(target) if target else (lo + hi) / 2
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_fit = "HORIZONTAL"
    cam = bpy.data.objects.new("cam", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    th = math.tan(cd.angle / 2)
    tv = th * ry / rx
    fwd = Vector(direction).normalized()
    right = fwd.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(fwd).normalized()
    dist = 0.0
    for p in pts:
        v = p - center
        x, y, z = abs(v.dot(right)), abs(v.dot(up)), v.dot(fwd)
        dist = max(dist, x * pad / th - z, y * pad / tv - z)
    cam.location = center - fwd * dist
    look_at(cam, center)


def render(name):
    path = os.path.join(OUT, f"{name}.png")
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RENDERED", path, flush=True)



# ---------- helpers for the deploy pieces ----------
def group(name="g"):
    """An empty to hang a piece on, so the whole piece can turn as one."""
    e = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(e)
    return e


def hang(parent, *objs):
    for o in objs:
        o.parent = parent
    return objs


def mark_points(scale=28.0, n=48):
    """The Uzo spiral mark from public/img/mark.svg, as 2D points, y up, centred near the origin."""
    to = lambda x, y: ((x - 32) / scale, -(y - 32) / scale)
    pts = [to(19, 31)]
    for i in range(n + 1):
        th = math.pi + math.pi * i / n
        pts.append(to(32 + 13 * math.cos(th), 38 - 13 * math.sin(th)))
    pts.append(to(45, 13))
    return pts, to(19, 16)


def mark(scale, plane, mat, radius=None, dot_mat=None):
    """Lays the mark on a plane. plane(x, y) -> 3D point."""
    pts, dot = mark_points(scale)
    r = radius or 4.5 / scale
    t = tube([plane(x, y) for x, y in pts], r, mat)
    d = sphere(r * 1.25, plane(*dot), dot_mat or mat)
    return t, d


def coin(loc, rot=(0, 0, 0), r=1.0, depth=0.22, mat=None):
    return cylinder(r, depth, loc, rot, mat or glass((0.82, 1.0, 0.94), 0.02), bevel=0.07)


# ---------- deploy pieces ----------
def hero():
    reset(1600, 1400, samples=96)
    g = group()
    slab = rounded_box((1.9, 0.2, 2.3), (0, 0, 0), 0.12, glass((0.82, 1.0, 0.95), 0.02))
    m = mark(17, lambda x, y: (x, -0.13, y + 0.05), glow(3.6, "Z"), radius=0.07)
    c1 = coin((1.55, -0.5, 0.95), (math.radians(70), 0, math.radians(25)), r=0.52, depth=0.13)
    c1r = torus(0.38, 0.022, (1.55, -0.5, 0.95), (math.radians(70), 0, math.radians(25)), glow(2.8, "X", (CAMWOOD, GOLD)))
    pic = rounded_box((0.8, 0.1, 0.8), (-1.5, -0.4, -0.85), 0.06, glass((0.8, 0.95, 1.0), 0.03), rot=(0.15, 0.25, 0.35))
    sun = sphere(0.12, (-1.55, -0.52, -0.72), glow(3.2, "Z", (GOLD, CAMWOOD)))
    s1 = sphere(0.24, (-1.35, -0.3, 1.25), glass((0.78, 0.96, 1.0), 0.02))
    s2 = sphere(0.09, (1.35, -0.2, -1.2), glow(2.6, "Z", (CAMWOOD, GOLD)))
    ring = torus(2.05, 0.018, (0, 0.4, 0), (math.radians(68), 0, math.radians(-14)), glow(2, "X", (CAMWOOD, GOLD)))
    hang(g, slab, *m, c1, c1r, pic, sun, s1, s2, ring)
    g.rotation_euler = (0, 0, math.radians(-16))
    frame((0.15, 1.0, -0.2), lens=70, pad=1.04)
    render("hero")


def token():
    reset(900, 900)
    g = group()
    parts = [
        coin((0.06, 0.04, -0.52)),
        coin((-0.04, -0.02, -0.26)),
        coin((0, 0, 0)),
    ]
    parts += mark(30, lambda x, y: (x, y, 0.14), glow(3.6, "Y"), radius=0.06)
    parts.append(coin((1.3, -0.3, 0.75), (math.radians(64), 0, math.radians(30)), r=0.46, depth=0.12,
                      mat=glass((0.8, 0.95, 1.0), 0.02)))
    parts.append(torus(1.06, 0.02, (0, 0, -0.26), mat=glow(2.4, "X", (CAMWOOD, GOLD))))
    hang(g, *parts)
    g.rotation_euler = (0, 0, math.radians(-12))
    frame((0.0, 1.0, -0.85), lens=60, pad=1.1)
    render("token")


def nft():
    reset(900, 900)
    g = group()
    back = rounded_box((1.45, 0.12, 1.45), (0.42, 0.45, 0.32), 0.07, glass((0.8, 0.95, 1.0), 0.03))
    front = rounded_box((1.5, 0.14, 1.5), (0, 0, 0), 0.08, glass((0.82, 1.0, 0.94), 0.02))
    hills = [(-0.55, -0.48), (-0.18, 0.08), (0.02, -0.12), (0.3, 0.22), (0.58, -0.48)]
    hill = shape2d(hills, 0.02, 0.0, glow(3.2, "Y"), loc=(0, -0.09, 0))
    sun = sphere(0.13, (-0.3, -0.1, 0.36), glow(3.4, "Z", (GOLD, CAMWOOD)))
    rim = torus(0.95, 0.016, (0, 0, -0.95), mat=glow(2.2, "X", (CAMWOOD, GOLD)))
    hang(g, back, front, hill, sun, rim)
    g.rotation_euler = (0, 0, math.radians(-20))
    frame((0.15, 1.0, -0.3), lens=60, pad=1.1)
    render("nft")


def tipjar():
    reset(900, 900)
    g = group()
    prof = [(0.5, 1.02), (0.58, 1.0), (0.58, 0.9), (0.5, 0.84), (0.56, 0.72), (0.82, 0.5), (0.9, 0.2),
            (0.9, -0.7), (0.84, -0.92), (0.6, -1.0), (0.0, -1.01)]
    jar = revolve(prof, mat=glass((0.82, 1.0, 0.95), 0.02))
    sol = jar.modifiers.new("sol", "SOLIDIFY")
    sol.thickness = 0.05
    parts = [jar]
    spots = [(-0.3, 0.2, -0.82, 0.3), (0.28, -0.1, -0.84, -0.4), (0.0, -0.3, -0.7, 0.8), (-0.1, 0.25, -0.6, -0.9),
             (0.35, 0.25, -0.62, 0.2)]
    for x, y, z, a in spots:
        parts.append(cylinder(0.24, 0.06, (x, y, z), (a, a * 0.6, a), glow(3.0, "Z", (GOLD, CAMWOOD)), bevel=0.02))
    top = coin((0.12, 0, 1.45), (math.radians(80), 0, math.radians(15)), r=0.34, depth=0.09)
    parts += [top, torus(0.25, 0.016, (0.12, 0, 1.45), (math.radians(80), 0, math.radians(15)), glow(3, "X"))]
    hang(g, *parts)
    frame((0.0, 1.0, -0.35), lens=60, pad=1.1)
    render("tipjar")


def manage():
    reset(900, 900)
    g = group()
    panel = rounded_box((1.9, 0.16, 1.4), (0, 0, 0), 0.09, glass((0.82, 0.98, 1.0), 0.03))
    parts = [panel]
    for i, at in enumerate((0.35, -0.25, 0.1)):
        z = 0.42 - i * 0.42
        parts.append(rounded_box((1.3, 0.04, 0.05), (0, -0.1, z), 0.02, glow(2.6, "X", (CAMWOOD, GOLD))))
        parts.append(sphere(0.13, (at, -0.16, z), glass((0.8, 0.95, 1.0), 0.02)))
        parts.append(sphere(0.05, (at, -0.2, z), glow(3.6, "Z", (GOLD, CAMWOOD))))
    hang(g, *parts)
    g.rotation_euler = (0, 0, math.radians(-18))
    frame((0.3, 1.0, -0.25), lens=60, pad=1.1)
    render("manage")


def stats():
    reset(900, 900)
    g = group()
    heights = (0.55, 0.95, 0.75, 1.35, 1.8)
    tops, parts = [], []
    for i, h in enumerate(heights):
        x = -1.1 + i * 0.55
        parts.append(rounded_box((0.4, 0.4, h), (x, 0, h / 2 - 1), 0.07,
                                 glass((0.8, 1.0, 0.93) if i % 2 == 0 else (0.8, 0.95, 1.0), 0.03)))
        tops.append(Vector((x, 0, h - 1 + 0.2)))
    path = []
    for a, b in zip(tops, tops[1:]):
        for s in range(10):
            path.append(tuple(a.lerp(b, s / 10)))
    path.append(tuple(tops[-1]))
    parts.append(tube(path, 0.022, glow(3.2, "X")))
    parts.append(sphere(0.12, tuple(tops[-1]), glow(3.6, "Z", (GOLD, CAMWOOD))))
    hang(g, *parts)
    g.rotation_euler = (0, 0, math.radians(-20))
    frame((0.2, 1.0, -0.4), lens=60, pad=1.06)
    render("stats")


PIECES = {f.__name__: f for f in (hero, token, nft, tipjar, manage, stats)}
for name, fn in PIECES.items():
    if ONLY and name not in ONLY:
        continue
    try:
        fn()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("FAILED", name, e, flush=True)
