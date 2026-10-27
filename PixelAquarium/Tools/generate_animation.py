#!/usr/bin/env python3
"""Builds every derived animation asset from the scene manifest and sprite PNGs.

Outputs (all checked in, regenerate after editing manifest or sprites):
  Assets/Scenes/<scene>/frames.json        per-frame sprite placement (in-app preview + static widget)
  WidgetExtension/Fonts/AquaFrames<j>.ttf  colour frame fonts for the clock driver (OpenType-SVG)
  WidgetExtension/Fonts/AquaBlink.ttf      mask font: full glyph on even seconds, empty on odd
  WidgetExtension/Fonts/AquaBlinkInv.ttf   inverse mask font: full on odd seconds
  WidgetExtension/Fonts/AquaCode<j>.ttf    monochrome frame-index barcode fonts (measurement only)

Clock-driver layout (adapted from github.com/brycebostwick/WidgetAnimation):
  fontCount = 2 * fps fonts are layered; font j is revealed during the j-th 1/fps slot of every
  2-second window. Each font is a `Text(date, style: .timer)` whose two seconds digits are
  ligated into glyph k = (seconds % loop) // 2, so font j glyph k shows frame k * fontCount + j.
  Frames are transparent sprites, so layers cannot rely on covering each other: each layer is
  masked by blink(j) AND inverse-blink(j + 1), which is open for exactly one slot.

Usage: python3 Tools/generate_animation.py [--scene CozyRoom] [--preview out.gif]
"""
import argparse
import json
import math
import os
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import newTable
from fontTools.ttLib.tables.S_V_G_ import SVGDocument
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "WidgetExtension", "Fonts")

UNITS_PER_PIXEL = 10
DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
# Characters a timer string may contain. All are drawn empty with a tiny advance so only
# the trailing (ligated seconds) glyph is visible.
FILLER_CODEPOINTS = {0x20: "space", 0xA0: "space", 0x2007: "space", 0x2009: "space",
                     0x202F: "space", 0x3A: "colon", 0x2D: "space"}
FILLER_ADVANCE = 1
CODE_CELLS = 12  # [white][black][8 bits, MSB first][black][white]


# --------------------------------------------------------------------------- animation

def load_sprite(scene_dir, el):
    img = Image.open(os.path.join(scene_dir, el["sprite"])).convert("RGBA")
    fw, fh = el["frameWidth"], el["frameHeight"]
    if img.size != (fw * el["spriteFrames"], fh):
        raise SystemExit(f"{el['sprite']}: expected {fw * el['spriteFrames']}x{fh}, got {img.size}")
    right = [img.crop((i * fw, 0, (i + 1) * fw, fh)) for i in range(el["spriteFrames"])]
    left = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in right]
    return right, left


def element_track(el, frame_count, fps, canvas_w):
    """Deterministic, loopable placement; sprites face right, flip[f] mirrors them.

    motion "patrol": eased back-and-forth between xMin and xMax, turning around inside the
    canvas, so a fish never crosses (and gets clipped at) the widget's invisible edge.
    motion "crossing": swims across and wraps while off-screen (2 px margin hides the wrap).
    """
    fw = el["frameWidth"]
    xs, ys, sf, flips = [], [], [], []
    for f in range(frame_count):
        if el["motion"] == "patrol":
            a = 2 * math.pi * (el["cyclesPerLoop"] * f / frame_count + el["phase"])
            span = el["xMax"] - el["xMin"]
            x = el["xMin"] + round(span * (1 - math.cos(a)) / 2)
            flip = math.sin(a) < 0
        else:
            travel = canvas_w + fw + 2
            progress = (f * el["cyclesPerLoop"] / frame_count + el["phase"]) % 1.0
            dx = math.floor(progress * travel)
            flip = el["direction"] == "left"
            x = canvas_w + 1 - dx if flip else -fw - 1 + dx
        bob = math.sin(2 * math.pi * el["bobCyclesPerLoop"] * f / frame_count)
        xs.append(x)
        ys.append(el["baseY"] + round(el["bobAmplitude"] * bob))
        sf.append(math.floor(f / fps * el["tailFramesPerSecond"]) % el["spriteFrames"])
        flips.append(flip)
    return xs, ys, sf, flips


def composite(tracks, sprites, f, canvas_w, canvas_h):
    img = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    for (xs, ys, sf, flips), (right, left) in zip(tracks, sprites):
        sprite = (left if flips[f] else right)[sf[f]]
        layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        layer.paste(sprite, (xs[f], ys[f]), sprite)
        img = Image.alpha_composite(img, layer)
    return img


def pick_poster(tracks, specs, frame_count, canvas_w):
    best, best_gap = 0, -1
    for f in range(frame_count):
        inside = all(0 <= xs[f] and xs[f] + s["frameWidth"] <= canvas_w
                     for (xs, *_), s in zip(tracks, specs))
        if inside:
            gap = abs(tracks[0][0][f] - tracks[1][0][f]) if len(tracks) > 1 else 0
            if gap > best_gap:
                best, best_gap = f, gap
    return best


# --------------------------------------------------------------------------- fonts

def runs(img, by_color):
    """Horizontal runs of opaque pixels: [(color_or_None, x, y, length)]."""
    w, h = img.size
    px = img.load()
    out = []
    for y in range(h):
        x = 0
        while x < w:
            r, g, b, a = px[x, y]
            if a < 128:
                x += 1
                continue
            key = (r, g, b) if by_color else None
            start = x
            while x < w and px[x, y][3] >= 128 and (not by_color or px[x, y][:3] == key):
                x += 1
            out.append((key, start, y, x - start))
    return out


def rect_glyph(rects, upm):
    """rects in pixel units, y down from top. Returns (glyph, lsb)."""
    pen = TTGlyphPen(None)
    min_x = None
    for x, y, w, h in rects:
        x0, x1 = x * UNITS_PER_PIXEL, (x + w) * UNITS_PER_PIXEL
        y1 = upm - y * UNITS_PER_PIXEL
        y0 = upm - (y + h) * UNITS_PER_PIXEL
        pen.moveTo((x0, y0))
        pen.lineTo((x0, y1))
        pen.lineTo((x1, y1))
        pen.lineTo((x1, y0))
        pen.closePath()
        min_x = x0 if min_x is None else min(min_x, x0)
    return pen.glyph(), (min_x or 0)


def svg_doc(gid, img, advance, upm):
    paths = {}
    for color, x, y, n in runs(img, by_color=True):
        u = UNITS_PER_PIXEL
        paths.setdefault(color, []).append(f"M{x * u} {y * u}h{n * u}v{u}h{-n * u}z")
    body = "".join(f'<path fill="#{r:02x}{g:02x}{b:02x}" d="{"".join(d)}"/>'
                   for (r, g, b), d in sorted(paths.items()))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{advance}" height="{upm}" '
            f'id="glyph{gid}"><g transform="translate(0 -{upm})">{body}</g></svg>')


def build_font(path, family, upm, advance, glyphs, ligatures, svgs=None):
    """glyphs: {name: (rects_in_pixels)}; ligatures: {(d1, d2): glyph_name}."""
    order = [".notdef", "space", "colon"] + DIGITS + list(glyphs)
    fb = FontBuilder(upm, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({**FILLER_CODEPOINTS, **{0x30 + i: d for i, d in enumerate(DIGITS)}})
    empty = TTGlyphPen(None).glyph()
    glyf, metrics = {}, {}
    for name in order[: 3 + len(DIGITS)]:
        glyf[name] = empty
        metrics[name] = (FILLER_ADVANCE, 0)
    metrics[".notdef"] = (FILLER_ADVANCE, 0)
    for name, rects in glyphs.items():
        glyf[name], lsb = rect_glyph(rects, upm)
        metrics[name] = (advance, lsb)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=upm, descent=0)
    fb.setupNameTable({"familyName": family, "styleName": "Regular",
                       "psName": f"{family}-Regular", "uniqueFontIdentifier": f"{family}-Regular"})
    fb.setupOS2(sTypoAscender=upm, sTypoDescender=0, sTypoLineGap=0,
                usWinAscent=upm, usWinDescent=0, achVendID="PXAQ")
    fb.setupPost()
    subs = " ".join(f"sub {DIGITS[a]} {DIGITS[b]} by {g};" for (a, b), g in sorted(ligatures.items()))
    fb.addOpenTypeFeatures(f"feature liga {{ {subs} }} liga;")
    if svgs:
        table = newTable("SVG ")
        table.docList = [SVGDocument(svgs[name](order.index(name)), order.index(name),
                                     order.index(name), False) for name in glyphs]
        fb.font["SVG "] = table
    fb.save(path)


def seconds_ligatures(glyph_for_seconds):
    return {(s // 10, s % 10): glyph_for_seconds(s) for s in range(60)}


def code_rects(frame):
    bits = [1, 0] + [(frame >> (7 - i)) & 1 for i in range(8)] + [0, 1]
    return [(i, 0, 1, 1) for i, bit in enumerate(bits) if bit]


# --------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scene", default="CozyRoom")
    ap.add_argument("--preview", help="optional GIF path for a visual check")
    args = ap.parse_args()

    scene_dir = os.path.join(ROOT, "Assets", "Scenes", args.scene)
    with open(os.path.join(scene_dir, "manifest.json")) as fh:
        manifest = json.load(fh)
    fps, loop = manifest["targetFPS"], manifest["loopDuration"]
    if loop % 2 or 60 % loop:
        raise SystemExit("loopDuration must be even and divide 60 (timer seconds wrap at 60)")
    frame_count = fps * loop
    font_count = 2 * fps
    glyphs_per_font = loop // 2
    cw, ch = manifest["fishCanvas"]["width"], manifest["fishCanvas"]["height"]
    specs = manifest["animatedElements"]

    sprites = [load_sprite(scene_dir, el) for el in specs]
    tracks = [element_track(el, frame_count, fps, cw) for el in specs]
    frames = [composite(tracks, sprites, f, cw, ch) for f in range(frame_count)]
    poster = pick_poster(tracks, specs, frame_count, cw)

    frames_json = {
        "generatedBy": "Tools/generate_animation.py",
        "sceneId": manifest["sceneId"],
        "fps": fps,
        "loopDuration": loop,
        "frameCount": frame_count,
        "canvasWidth": cw,
        "canvasHeight": ch,
        "posterFrame": poster,
        "artPixelPoints": manifest["artPixelPoints"],
        "driver": {"fontCount": font_count, "glyphsPerFont": glyphs_per_font,
                   "framesFont": manifest["fontSets"]["frames"],
                   "blinkFont": manifest["fontSets"]["blink"],
                   "blinkInverseFont": manifest["fontSets"]["blinkInverse"],
                   "codeFont": manifest["fontSets"]["code"],
                   "codeCells": CODE_CELLS},
        "elements": [{"id": el["id"], "sprite": el["sprite"], "frameWidth": el["frameWidth"],
                      "frameHeight": el["frameHeight"],
                      "x": xs, "y": ys, "spriteFrame": sf, "flip": fl}
                     for el, (xs, ys, sf, fl) in zip(specs, tracks)],
    }
    with open(os.path.join(scene_dir, "frames.json"), "w") as fh:
        json.dump(frames_json, fh, separators=(",", ":"))

    os.makedirs(FONT_DIR, exist_ok=True)
    upm = ch * UNITS_PER_PIXEL
    advance = cw * UNITS_PER_PIXEL
    frames_family = manifest["fontSets"]["frames"]
    code_family = manifest["fontSets"]["code"]
    for j in range(font_count):
        names = {f"f{k:02d}": frames[k * font_count + j] for k in range(glyphs_per_font)}
        glyphs = {n: [(x, y, w, 1) for _, x, y, w in runs(img, by_color=False)]
                  for n, img in names.items()}
        svgs = {n: (lambda gid, img=img: svg_doc(gid, img, advance, upm)) for n, img in names.items()}
        ligs = seconds_ligatures(lambda s: f"f{(s % loop) // 2:02d}")
        build_font(os.path.join(FONT_DIR, f"{frames_family}{j}.ttf"), f"{frames_family}{j}",
                   upm, advance, glyphs, ligs, svgs)

        code_glyphs = {f"f{k:02d}": [(x * 10, y * 10, w * 10, h * 10)
                                     for x, y, w, h in code_rects(k * font_count + j)]
                       for k in range(glyphs_per_font)}
        build_font(os.path.join(FONT_DIR, f"{code_family}{j}.ttf"), f"{code_family}{j}",
                   10 * UNITS_PER_PIXEL, CODE_CELLS * 10 * UNITS_PER_PIXEL, code_glyphs, ligs)

    blink_upm = 10 * UNITS_PER_PIXEL
    build_font(os.path.join(FONT_DIR, f"{manifest['fontSets']['blink']}.ttf"),
               manifest["fontSets"]["blink"], blink_upm, blink_upm,
               {"full": [(0, 0, 10, 10)], "empty": []},
               seconds_ligatures(lambda s: "full" if s % 2 == 0 else "empty"))

    inverse = manifest["fontSets"]["blinkInverse"]
    build_font(os.path.join(FONT_DIR, f"{inverse}.ttf"), inverse, blink_upm, blink_upm,
               {"full": [(0, 0, 10, 10)], "empty": []},
               seconds_ligatures(lambda s: "full" if s % 2 == 1 else "empty"))

    if args.preview:
        scaled = [f.resize((cw * 4, ch * 4), Image.NEAREST) for f in frames]
        bg = [Image.alpha_composite(Image.new("RGBA", s.size, (22, 92, 110, 255)), s) for s in scaled]
        bg[0].save(args.preview, save_all=True, append_images=bg[1:], duration=1000 // fps, loop=0)

    print(f"{frame_count} frames, {font_count} frame fonts x {glyphs_per_font} glyphs, poster={poster}")


if __name__ == "__main__":
    sys.exit(main())
