#!/usr/bin/env python3
"""Measures what the widget actually displayed, from a screen recording (PRD 8.2).

Turn on "Frame-index barcode" in the app, record the Home Screen (Control Centre › Screen
Recording), AirDrop the video to the Mac, then:

    python3 Tools/analyze_recording.py recording.mov [--rect x,y,w,h] [--csv out.csv]

The barcode is 12 cells: [white][black][8-bit frame index, MSB first][black][white],
drawn by the same clock schedule as the fish, so each decoded value is the logical frame
on screen. It has no hand-off overlap, so a blank strip means no layer was visible for that
video frame (the fish layer hides such gaps with a short overlap). The strip is located
automatically unless --rect (video pixels) is given.
"""
import argparse
import csv
import statistics
import sys

import cv2
import numpy as np

CELLS = 12
FRAME_COUNT = 240


def decode_row(row, x0, x1):
    cell = (x1 - x0) / CELLS
    bits = []
    for i in range(CELLS):
        a, b = int(x0 + (i + 0.3) * cell), int(x0 + (i + 0.7) * cell)
        bits.append(1 if row[a:max(a + 1, b)].mean() > 128 else 0)
    if bits[:2] != [1, 0] or bits[-2:] != [0, 1]:
        return None
    return int("".join(map(str, bits[2:10])), 2)


BLANK = -1  # strip entirely dark: no layer visible (timer hand-off gap)


def decode_region(gray, region):
    y0, y1, x0, x1 = region
    if gray[y0:y1, x0:x1].max() < 100:
        return BLANK
    values = [decode_row(gray[y].astype(np.int16), x0, x1) for y in range(y0, y1)]
    values = [v for v in values if v is not None]
    return statistics.mode(values) if values else None


def locate(gray):
    """Returns (y0, y1, x0, x1) of the strip, or None."""
    h, w = gray.shape
    hits = []
    for y in range(0, h // 2, 2):
        row = gray[y].astype(np.int16)
        white = row > 200
        xs = np.flatnonzero(white)
        if len(xs) < 2:
            continue
        # Candidate segments: white runs separated by black gaps, bounded by mid-tones.
        mid = (row >= 40) & (row <= 200)
        start = None
        for x in range(w):
            if mid[x] or x == w - 1:
                if start is not None and x - start >= 60:
                    seg = np.flatnonzero(white[start:x])
                    if len(seg):
                        x0, x1 = start + seg[0], start + seg[-1] + 1
                        if x1 - x0 >= 48 and decode_row(row, x0, x1) is not None:
                            hits.append((y, x0, x1))
                start = None
            elif start is None:
                start = x
    if not hits:
        return None
    # Keep the tallest run of adjacent rows with matching extents (the strip itself).
    clusters, cur = [], [hits[0]]
    for h in hits[1:]:
        p = cur[-1]
        if h[0] - p[0] <= 4 and abs(h[1] - p[1]) <= 3 and abs(h[2] - p[2]) <= 3:
            cur.append(h)
        else:
            clusters.append(cur)
            cur = [h]
    clusters.append(cur)
    clusters = [c for c in clusters if len(c) >= 3]
    if not clusters:
        return None
    # A partial match (some outer bits read as guards) is always narrower than the real strip.
    best = max(clusters, key=lambda c: (statistics.median(x1 - x0 for _, x0, x1 in c), len(c)))
    ys = [y for y, _, _ in best]
    pad = max(1, (ys[-1] - ys[0]) // 5)
    return (ys[0] + pad, ys[-1] + 1 - pad, int(statistics.median(x0 for _, x0, _ in best)),
            int(statistics.median(x1 for _, _, x1 in best)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--rect", help="x,y,w,h of the barcode in video pixels")
    ap.add_argument("--csv", help="write per-video-frame decode results")
    args = ap.parse_args()

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        raise SystemExit(f"cannot open {args.video}")
    region = None
    if args.rect:
        x, y, w, h = map(int, args.rect.split(","))
        region = (y, y + h, x, x + w)

    samples, total, candidates, pending = [], 0, [], []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        total += 1
        t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if region is None:
            # Locate on the widest strip seen in the first frames; skip frames until then.
            found = locate(gray)
            if found:
                candidates.append(found)
            if len(candidates) < 5:
                pending.append((t, gray))
                continue
            region = max(candidates, key=lambda r: (r[3] - r[2], r[1] - r[0]))
            print(f"barcode located at x={region[2]}..{region[3]} y={region[0]}..{region[1]}")
            for pt, pg in pending:
                samples.append((pt, decode_region(pg, region)))
            pending = []
        samples.append((t, decode_region(gray, region)))
    blanks = sum(1 for _, v in samples if v == BLANK)
    undecoded = sum(1 for _, v in samples if v is None or v >= FRAME_COUNT) + len(pending)

    decoded = [(t, v) for t, v in samples if v is not None and 0 <= v < FRAME_COUNT]
    # A video frame caught while both hand-off layers were visible shows prev | next.
    overlaps = 0
    cleaned = []
    for i, (t, v) in enumerate(decoded):
        prev = cleaned[-1][1] if cleaned else None
        nxt = next((w for _, w in decoded[i + 1:] if w != v), None)
        if prev is not None and nxt is not None and v not in (prev, nxt) and v == prev | nxt:
            overlaps += 1
            continue
        cleaned.append((t, v))
    decoded = cleaned
    if len(decoded) < 2:
        raise SystemExit(f"barcode not decoded ({undecoded} undecodable video frames)")

    changes = [decoded[0]]
    for t, v in decoded[1:]:
        if v != changes[-1][1]:
            changes.append((t, v))
    duration = decoded[-1][0] - decoded[0][0]
    steps = [(b[1] - a[1]) % FRAME_COUNT for a, b in zip(changes, changes[1:])]
    holds = [b[0] - a[0] for a, b in zip(changes, changes[1:])]
    longest_freeze = max(holds + [decoded[-1][0] - changes[-1][0]])
    rate = (len(changes) - 1) / duration if duration > 0 else 0
    advanced = sum(steps)
    seams = sum(1 for a, b in zip(changes, changes[1:]) if b[1] < a[1])

    # Worst one-second window, for "sustained" rate.
    worst = min((sum(1 for t, _ in changes if s <= t < s + 1) for s in np.arange(decoded[0][0], max(decoded[0][0], decoded[-1][0] - 1), 0.25)),
                default=len(changes))

    print(f"video frames: {total}, decoded: {len(decoded)}, undecodable: {undecoded}, "
          f"hand-off gaps (blank strip): {blanks}, hand-off overlaps (OR of two codes): {overlaps}")
    print(f"observed span: {duration:.2f} s")
    print(f"displayed updates: {len(changes) - 1} -> {rate:.2f} updates/s (worst 1 s window: {worst})")
    print(f"logical frames advanced: {advanced} -> {advanced / duration if duration else 0:.2f} logical fps")
    print(f"step sizes: {dict(sorted({s: steps.count(s) for s in set(steps)}.items()))}  (1 = no skipped frame)")
    print(f"longest freeze: {longest_freeze:.2f} s; loop seams crossed: {seams}")
    verdict = "PASS" if rate >= 4 and worst >= 4 and longest_freeze <= 2 else "FAIL"
    print(f"PRD 8.2 minimum (>= 4 updates/s sustained, no freeze > 2 s): {verdict}")

    if args.csv:
        with open(args.csv, "w", newline="") as fh:
            wr = csv.writer(fh)
            wr.writerow(["time_s", "frame"])
            wr.writerows(samples)


if __name__ == "__main__":
    sys.exit(main())
