# Test report — Phase 0

**Overall status: Phase 0 not yet validated.** Every result below comes from the iOS Simulator or from automated tests. The PRD (§3, §12) requires the physical iPhone, so no gate is marked passed.

## Environment

| | |
|---|---|
| Date | 2026-10-27 |
| Xcode / SDK | Xcode 26.5 (17F42), iOS SDK 26.5 |
| Simulator | iPhone 17, iOS 26.5 (23F77), 1206×2622 px @3x |
| Large widget size reported by WidgetKit (simulator) | 349.67 × 365 pt |
| Physical device | **not tested.** The target iPhone (iPhone18,3) was not connected |

## Automated checks

| Check | Result |
|---|---|
| Unit tests (`PixelAquariumTests`, 19 tests) | **Pass** |
| Simulator build (Debug) | **Pass** |
| Unsigned device build (Release, `generic/platform=iOS`) | **Pass** (widget extension 1.0 MB) |
| Signed device build / install (T01) | **Not run.** Needs the phone connected and signing in Xcode |

The unit tests cover: frame-index formula, loop seam (fish wrap only while off-screen), opposite directions and different speeds, driver font/glyph layout covers all 240 frames once, loop-aligned anchor, **exactly one visible layer per 1/8 s slot (two only during the 30 ms hand-off) showing the predicted frame across two loops**, detection of the magenta widget and green fiducials on a synthetic screenshot, transform solve, profile persistence across store instances (T11 logic), exact wallpaper crop, color gain, alignment shift detection, and dimming detection.

## Simulator findings

### 1. The reference stacking scheme ghosts with transparent frames (fixed)
The first in-app recording showed several fish copies at once. The reference relies on opaque frames covering each other; with transparent sprites, up to 8 layers are visible together. **Fix:** per-layer window = `blink(j) ∧ inverseBlink(j+1)`. This is the transparency risk the PRD flags under Gate C.

### 2. Timer hand-off is not atomic
Two timers with the same start date sometimes update in different render passes. In the 60 s Home Screen recording, 51 of 3,644 video frames had **no** layer visible (gaps ≤ 20 ms, median 10 ms), and 81 had two. **Fix:** each fish layer stays open 30 ms past its slot. Two adjacent frames differ by ≤ 1 art pixel, so the overlap is invisible. After the fix: **0 fish dropouts in 3,644 frames, 0 ghosting frames.** The barcode keeps zero overlap so the analyzer can still count raw gaps.

### 3. Home Screen widget animation, simulator (Gate A analogue)
Widget added through SpringBoard (UI test), app **not running**, Home Screen recorded with `simctl io recordVideo`:

| Run | Span | Updates/s | Worst 1 s window | Steps | Longest hold | Loop seams |
|---|---|---|---|---|---|---|
| 60 s, container background | 59.9 s | **8.01** | 7 | 480 × (+1) | 0.15 s | 2 |
| 30 s, background as content | 29.9 s | **8.00** | 8 | 239 × (+1) | 0.16 s | 1 |

Every displayed change advanced exactly one logical frame, with no skips and no freezes. Seam count matches a 30 s loop.

### 4. Full-color SVG glyphs render (Gate C analogue)
Orange and blue fish with transparent surroundings render on the simulator Home Screen and in the widget gallery, not as magenta fallback silhouettes. WidgetKit reported rendering mode `fullColor`. Clear/Tinted not tested.

### 5. iOS 26 lays a sheen over `containerBackground` (Gate B risk)
Flat water (22, 92, 110) drawn as `containerBackground` read **(45, 108, 124)** at the top of the widget, fading to the true value by ~65 % of the height. That's about 10 % white. Content layers are unaffected (barcode black stays 0,0,0). On a matching-wallpaper widget this would show as a lighter band at the top edge. **Mitigation:** *Background as content layer* (default on) draws the same image as the first content layer; measured top-to-bottom it stays exactly (22, 92, 110). A thin glass rim along the widget edge is also visible in the simulator; the aquarium frame is meant to hide it. Both need checking on the device.

### 6. Not measurable in the simulator
Wallpaper display transform and dimming, alignment error, lock/unlock, reboot, Low Power Mode, battery/energy, and long-idle behavior.

## Physical-device results (to fill in)

| ID | Test | Result | Evidence |
|---|---|---|---|
| Gate A | Animated widget, 5 min, app closed | not run | |
| Gate B | Wallpaper alignment | not run | |
| Gate C | Full-color animation | not run | |
| T01–T12 | Acceptance (§8.1) | not run | |
| S1–S10 | Stability (§8.4) | not run | |

Use the in-app checklist and *Diagnostics › Export test report*, attach `analyze_recording.py` output and screenshots, and update the overall status per PRD §12.
