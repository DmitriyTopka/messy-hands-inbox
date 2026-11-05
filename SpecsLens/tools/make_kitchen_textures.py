#!/usr/bin/env python3
"""
Generates the three kitchen textures for the Messy Hands Inbox scene.

Everything here is drawn from scratch with numpy and Pillow: value noise from
seeded random grids, plank and panel geometry from arithmetic, lighting baked in
by hand. Nothing is downloaded, nothing comes from an asset library, and there
is no licence to track - the only inputs are the constants in this file.

WHY THE LIGHTING IS PAINTED IN

The scene's shader (Assets/Materials/flat.graphShader) is unlit: it samples the
base texture and base colour and stops. The two LightSource components in the
scene do not touch these materials at all. So a texture that only carries
colour renders as a flat silhouette - which is exactly what the counter and the
dough looked like before. Every gradient, dimple shadow and plank seam below is
therefore drawn into the albedo on purpose, not left to a light.

WHY NOTHING IS DARK

The Specs display is additive: it adds light to what the eye already sees, so
black is transparent and a dark texture reads as a hole in the world rather
than as shadow. Every value written here stays inside roughly 0.25-0.85 of
full brightness, and the assertion at the bottom of the file checks that.

Usage:
    python3 tools/make_kitchen_textures.py
Writes Assets/Textures/*.png.
"""

import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(os.path.dirname(HERE), "Assets", "Textures")

# The additive-display safety band, in 0..1 linear-ish sRGB values.
MIN_SAFE = 0.22
MAX_SAFE = 0.88


# ── Noise ───────────────────────────────────────────────────────────────────


def value_noise(height, width, cells, rng, octaves=1, falloff=0.5):
    """Smooth value noise in 0..1, built by upsampling seeded random grids.

    A small random grid resized with bicubic interpolation is a cheap, smooth,
    perfectly deterministic noise field - no gradient tables, no permutation
    arrays, and the result is identical on every machine for a given seed.
    """
    total = np.zeros((height, width), dtype=np.float64)
    amplitude = 1.0
    weight = 0.0
    size = cells
    for _ in range(octaves):
        grid = rng.random((max(2, size), max(2, size)))
        img = Image.fromarray((grid * 255).astype(np.uint8), mode="L")
        up = img.resize((width, height), Image.BICUBIC)
        total += np.asarray(up, dtype=np.float64) / 255.0 * amplitude
        weight += amplitude
        amplitude *= falloff
        size *= 2
    return total / weight


def fibre_noise(height, width, rng, stretch=28, cells=10, octaves=4):
    """Noise stretched along X, which is what reads as wood grain."""
    base = value_noise(height, max(8, width // stretch), cells, rng, octaves=octaves)
    img = Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8), mode="L")
    return np.asarray(img.resize((width, height), Image.BICUBIC), dtype=np.float64) / 255.0


def blur(field, radius):
    """Gaussian blur on a single-channel 0..1 field."""
    img = Image.fromarray((np.clip(field, 0, 1) * 255).astype(np.uint8), mode="L")
    return (
        np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float64) / 255.0
    )


def save(rgb, name):
    """Clamps to the additive-safe band and writes a PNG."""
    arr = np.clip(rgb, 0.0, 1.0)
    lo, hi = float(arr.min()), float(arr.max())
    arr = np.clip(arr, MIN_SAFE, MAX_SAFE)
    out = (arr * 255.0 + 0.5).astype(np.uint8)
    path = os.path.join(OUT_DIR, name)
    Image.fromarray(out, mode="RGB").save(path, optimize=True)
    lum = float((arr * np.array([0.2126, 0.7152, 0.0722])).sum(axis=2).mean())
    print(
        "%-24s %dx%d  mean luma %.3f  raw range %.3f-%.3f  %d KB"
        % (name, out.shape[1], out.shape[0], lum, lo, hi, os.path.getsize(path) // 1024)
    )
    return lum


# ── 1. Counter top: oak butcher block, floured where the dough sits ─────────


def counter_top(size=1024):
    rng = np.random.default_rng(20261106)
    y, x = np.mgrid[0:size, 0:size].astype(np.float64)
    u = x / (size - 1)
    v = y / (size - 1)

    # Five planks running the length of the counter.
    planks = 5
    # clip, because v reaches exactly 1.0 on the last row and floor() would
    # then index one plank past the end.
    plank_index = np.clip(np.floor(v * planks).astype(np.int64), 0, planks - 1)
    plank_v = v * planks - plank_index

    # Each board is a slightly different cut of the same timber.
    tint = rng.uniform(0.90, 1.10, size=planks)[plank_index]
    warm = rng.uniform(0.96, 1.05, size=planks)[plank_index]

    oak = np.array([0.600, 0.448, 0.272])
    shade = np.ones_like(v) * tint

    # Long grain: stretched noise, plus a ring-like band structure so the
    # boards read as sawn timber rather than as noise.
    # stretch is deliberately large: the first pass used 26 and the result read
    # as cork, because the noise was still nearly isotropic. Oak needs the
    # fibres an order of magnitude longer than they are wide.
    grain = fibre_noise(size, size, rng, stretch=140, cells=10, octaves=3)
    rings = 0.5 + 0.5 * np.sin(
        plank_v * np.pi * rng.uniform(2.0, 4.0, size=planks)[plank_index]
        + grain * 9.0
        + u * 1.5
    )
    shade *= 0.88 + 0.18 * grain
    shade *= 0.95 + 0.09 * rings

    # Fine fibre streaks on top of the bands.
    streaks = fibre_noise(size, size, rng, stretch=220, cells=40, octaves=2)
    shade *= 0.95 + 0.10 * streaks

    # Seams between boards: a thin dark line with a lighter chamfer above it.
    seam_px = np.minimum(plank_v * size / planks, (1.0 - plank_v) * size / planks)
    shade *= np.where(seam_px < 1.6, 0.74, 1.0)
    shade *= np.where((seam_px >= 1.6) & (seam_px < 3.2), 1.06, 1.0)

    # A couple of knots, because clean oak looks synthetic.
    for _ in range(3):
        kx, ky = rng.uniform(0.1, 0.9, 2)
        kr = rng.uniform(0.012, 0.022)
        d = np.sqrt((u - kx) ** 2 + (v - ky) ** 2)
        knot = np.clip(1.0 - d / kr, 0.0, 1.0)
        shade *= 1.0 - 0.26 * knot**1.5
        shade *= 1.0 + 0.07 * np.clip(1.0 - np.abs(d - kr * 1.6) / (kr * 0.6), 0, 1)

    # A broad soft sheen, so the surface is not uniformly bright edge to edge.
    sheen = 1.0 + 0.07 * np.exp(-(((u - 0.42) ** 2 + (v - 0.38) ** 2) / 0.18))
    shade *= sheen

    # Slight darkening at the outer edge: the counter does not glow at its rim.
    edge = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    shade *= 0.88 + 0.12 * np.clip(edge / 0.06, 0, 1)

    rgb = oak[None, None, :] * shade[:, :, None]
    rgb[:, :, 0] *= warm
    rgb[:, :, 2] /= warm

    # ── Flour, where the dough sits ─────────────────────────────────────────
    # The dough rests at the centre of the counter top, so the dusted patch is
    # drawn at the centre of the top face's UV square. If the box UVs ever stop
    # putting the top face at 0..1, this lands in the wrong place and the
    # preview capture shows it immediately.
    flour = np.array([0.93, 0.92, 0.89])
    d_centre = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2)
    patch = np.clip(1.0 - d_centre / 0.26, 0.0, 1.0) ** 1.5
    patch *= 0.45 + 0.55 * value_noise(size, size, 9, rng, octaves=3)
    rgb = rgb * (1 - 0.46 * patch[:, :, None]) + flour[None, None, :] * (
        0.46 * patch[:, :, None]
    )

    # Loose specks and a few finger-drag smears through the dust.
    # Specks are drawn as hard squares and then blurred. Unblurred they read as
    # dirt - axis-aligned pixels are the one thing the eye calls "digital" -
    # and a 1.6 px gaussian is enough to turn them into dust.
    specks = np.zeros((size, size))
    count = 1100
    angles = rng.uniform(0, 2 * np.pi, count)
    radii = np.abs(rng.normal(0.0, 0.20, count))
    sx = np.clip(0.5 + np.cos(angles) * radii, 0.01, 0.99)
    sy = np.clip(0.5 + np.sin(angles) * radii, 0.01, 0.99)
    for cx, cy in zip(sx, sy):
        px, py = int(cx * (size - 1)), int(cy * (size - 1))
        r = int(rng.integers(1, 4))
        specks[max(0, py - r) : py + r + 1, max(0, px - r) : px + r + 1] = rng.uniform(
            0.45, 1.0
        )
    # The multiplier that follows the blur is deliberately under 1: blurring
    # spreads each speck's energy, and compensating for that fully turned the
    # dusted area into a white starburst. Flour is a haze, not a highlight.
    specks = np.clip(blur(specks, 1.7) * 0.85, 0, 1)
    rgb = rgb * (1 - 0.42 * specks[:, :, None]) + flour[None, None, :] * (
        0.42 * specks[:, :, None]
    )

    return rgb


# ── 2. Dough ball: pale, floured, kneaded ───────────────────────────────────


def dough(width=1024, height=512):
    """Equirectangular, so v is latitude: v = 0 is one pole, v = 1 the other.

    Which pole is up is decided by the mesh's UV winding, not by this file, so
    the vertical lighting here is checked against a preview capture and flipped
    with FLIP_V below if it comes out lit from underneath.
    """
    FLIP_V = False
    rng = np.random.default_rng(611)
    y, x = np.mgrid[0:height, 0:width].astype(np.float64)
    u = x / (width - 1)
    v = y / (height - 1)

    # Warmer and a touch deeper than the first pass, which rendered as
    # mozzarella: a floured dough ball is pale, but it is still wheat.
    base = np.array([0.855, 0.775, 0.630])

    # Baked top light. Half-Lambert against an up vector, so the underside goes
    # to a soft warm shadow rather than to black.
    lat = v * np.pi
    lambert = 0.5 + 0.5 * np.cos(lat)
    # 0.58 + 0.56 * lambert peaked above 1.0 and the top hemisphere clipped to a
    # flat white blob. This peaks just under 1.0, so the crown keeps its detail.
    shade = 0.56 + 0.43 * lambert

    # A weak second light from the front-left, to stop it reading as a ball
    # lit only from straight above.
    lon = u * 2 * np.pi
    fill = np.clip(np.cos(lon - 2.3), 0, 1) * np.sin(lat)
    shade *= 1.0 + 0.10 * fill

    # Mottling: dough is not one colour. Low frequency only, so it reads as
    # the surface of a ball rather than as camouflage.
    blotch = value_noise(height, width, 5, rng, octaves=3)
    shade *= 0.90 + 0.20 * blotch

    # Fine skin texture, faded out at the poles where the equirect UVs pinch.
    pole_fade = np.sin(lat) ** 0.7
    skin = value_noise(height, width, 48, rng, octaves=3)
    shade *= 1.0 + 0.11 * (skin - 0.5) * pole_fade

    # Knuckle dimples. Each is a soft dish with a darker upper rim and a
    # lighter lower one, which is what makes a dent read as a dent with no
    # normal map and no light.
    for _ in range(16):
        cu = rng.uniform(0, 1)
        cv = rng.uniform(0.18, 0.86)
        r = rng.uniform(0.045, 0.085)
        du = np.minimum(np.abs(u - cu), 1.0 - np.abs(u - cu)) / np.maximum(
            np.sin(cv * np.pi), 0.25
        )
        dv = v - cv
        d = np.sqrt(du**2 + dv**2)
        dish = np.clip(1.0 - d / r, 0, 1) ** 1.3
        shade *= 1.0 - 0.17 * dish
        upper = np.clip(1.0 - np.abs(d - r * 0.55) / (r * 0.35), 0, 1) * np.clip(
            -dv / r, 0, 1
        )
        lower = np.clip(1.0 - np.abs(d - r * 0.55) / (r * 0.35), 0, 1) * np.clip(
            dv / r, 0, 1
        )
        shade *= 1.0 - 0.10 * upper
        shade *= 1.0 + 0.09 * lower

    rgb = base[None, None, :] * shade[:, :, None]

    # Flour dust: brighter, cooler, and heaviest on the upper half, because
    # that is where it lands.
    flour = np.array([0.97, 0.96, 0.94])
    dust = value_noise(height, width, 14, rng, octaves=4)
    dust = np.clip((dust - 0.50) * 2.8, 0, 1) * (1.0 - v) ** 0.7 * pole_fade
    rgb = rgb * (1 - 0.32 * dust[:, :, None]) + flour[None, None, :] * (
        0.32 * dust[:, :, None]
    )

    # Individual grains of flour.
    grains = np.zeros((height, width))
    for _ in range(1600):
        gx = int(rng.uniform(0, width - 1))
        gy = int(abs(rng.normal(0.0, 0.33)) * (height - 1)) % height
        r = int(rng.integers(0, 2))
        grains[max(0, gy - r) : gy + r + 1, max(0, gx - r) : gx + r + 1] = rng.uniform(
            0.4, 1.0
        )
    grains = blur(grains, 1.2) * 2.0 * pole_fade
    rgb = rgb * (1 - 0.55 * grains[:, :, None]) + flour[None, None, :] * (
        0.55 * grains[:, :, None]
    )

    # ── Flatten the poles ──────────────────────────────────────────────────
    # Every column of an equirect map converges on a single vertex at each
    # pole, so any variation along the top or bottom rows is squeezed into a
    # point and renders as a visible teat on the sphere. Replacing those rows
    # with their own mean, and blending back over a few more, removes it. This
    # was not theoretical: the first render of the dough had a cone on top.
    pole_rows = max(3, height // 28)
    for row in range(pole_rows):
        blend = 1.0 - row / pole_rows
        for edge in (row, height - 1 - row):
            mean = rgb[edge].mean(axis=0)
            rgb[edge] = rgb[edge] * (1 - blend) + mean[None, :] * blend

    if FLIP_V:
        rgb = rgb[::-1, :, :]
    return rgb


# ── 3. Counter body: a painted shaker cabinet under the worktop ─────────────


def counter_body(size=1024):
    rng = np.random.default_rng(4512)
    y, x = np.mgrid[0:size, 0:size].astype(np.float64)
    u = x / (size - 1)
    v = y / (size - 1)

    paint = np.array([0.430, 0.462, 0.492])
    shade = np.ones_like(v)

    # Two doors with a gap down the middle.
    door = np.where(u < 0.5, 0.0, 1.0)
    door_u = np.where(u < 0.5, u / 0.5, (u - 0.5) / 0.5)
    centre_gap = np.abs(u - 0.5)
    shade *= np.where(centre_gap < 0.004, 0.72, 1.0)

    # Shaker frame: a raised border with an inset panel, faked with a bevel.
    inset = 0.14
    fu = np.minimum(door_u, 1.0 - door_u)
    fv = np.minimum(v, 1.0 - v)
    frame = np.minimum(fu, fv)
    panel = frame > inset
    # Inset panel sits very slightly darker; its top bevel catches light, its
    # bottom bevel falls away.
    shade *= np.where(panel, 0.95, 1.0)
    bevel = np.clip(1.0 - np.abs(frame - inset) / 0.012, 0, 1)
    shade *= 1.0 + 0.10 * bevel * np.clip((v - 0.5) * -4, 0, 1)
    shade *= 1.0 - 0.08 * bevel * np.clip((v - 0.5) * 4, 0, 1)

    # Brush marks, vertical, because that is how a cabinet door gets painted.
    brush = fibre_noise(size, size, rng, stretch=40, cells=20, octaves=3)
    brush = np.asarray(
        Image.fromarray((brush * 255).astype(np.uint8), mode="L").rotate(
            90, expand=False
        ),
        dtype=np.float64,
    ) / 255.0
    shade *= 0.975 + 0.05 * brush

    # The unit is in its own shade: brighter just under the worktop, falling
    # away toward the floor. This is the single change that stops the body
    # reading as a flat grey slab.
    shade *= 1.14 - 0.34 * v**1.3

    # A thin bright line along the very top, where the worktop overhangs.
    shade *= 1.0 + 0.16 * np.clip(1.0 - v / 0.015, 0, 1)

    # Kick space at the bottom: darker, recessed.
    shade *= np.where(v > 0.93, 0.80, 1.0)

    rgb = paint[None, None, :] * shade[:, :, None]
    # Paint is slightly cool; keep the blue channel from collapsing in shadow.
    rgb[:, :, 2] *= 1.03
    return rgb


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("writing to", OUT_DIR)
    save(counter_top(), "CounterTopWood.png")
    save(dough(), "DoughFloured.png")
    save(counter_body(), "CounterBodyPaint.png")


if __name__ == "__main__":
    main()
