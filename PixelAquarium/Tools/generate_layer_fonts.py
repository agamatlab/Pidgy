#!/usr/bin/env python3
"""Turns any looping, transparent pxl animation strip into clock-driver fonts.

The strip is pxl's `out/anims/<name>.png`: frames side by side, each `--width` x `--height`,
`fps * loop` frames (240 for 8 fps, 30 s). Writes WidgetExtension/Fonts/<prefix><j>.ttf, the
same layout as the fish fonts (font j, glyph k = frame k * fontCount + j), so the widget's
ClockAnimationDriver can play it over the theme's static art.

Usage: python3 Tools/generate_layer_fonts.py strip.png --prefix HWWindow --width 195 --height 92
"""
import argparse
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_animation import FONT_DIR, UNITS_PER_PIXEL, build_font, runs, seconds_ligatures, svg_doc  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("strip")
    ap.add_argument("--prefix", required=True)
    ap.add_argument("--width", type=int, required=True)
    ap.add_argument("--height", type=int, required=True)
    ap.add_argument("--fps", type=int, default=8)
    ap.add_argument("--loop", type=int, default=30)
    args = ap.parse_args()

    strip = Image.open(args.strip).convert("RGBA")
    frame_count = args.fps * args.loop
    if strip.size != (args.width * frame_count, args.height):
        raise SystemExit(f"expected {args.width * frame_count}x{args.height} strip, got {strip.size}")
    frames = [strip.crop((i * args.width, 0, (i + 1) * args.width, args.height)) for i in range(frame_count)]

    font_count, glyphs_per_font = 2 * args.fps, args.loop // 2
    upm, advance = args.height * UNITS_PER_PIXEL, args.width * UNITS_PER_PIXEL
    ligs = seconds_ligatures(lambda s: f"f{(s % args.loop) // 2:02d}")
    os.makedirs(FONT_DIR, exist_ok=True)
    total = 0
    for j in range(font_count):
        names = {f"f{k:02d}": frames[k * font_count + j] for k in range(glyphs_per_font)}
        glyphs = {n: [(x, y, w, 1) for _, x, y, w in runs(img, by_color=False)] for n, img in names.items()}
        svgs = {n: (lambda gid, img=img: svg_doc(gid, img, advance, upm)) for n, img in names.items()}
        path = os.path.join(FONT_DIR, f"{args.prefix}{j}.ttf")
        build_font(path, f"{args.prefix}{j}", upm, advance, glyphs, ligs, svgs)
        total += os.path.getsize(path)
    print(f"{args.prefix}: {font_count} fonts, {total // 1024} KB")


if __name__ == "__main__":
    sys.exit(main())
