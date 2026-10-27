# Pixel Aquarium — Phase 0 prototype

A static pixel-art wallpaper plus one large Home Screen widget that animates two fish, built to find out whether the two together can pass for one animated scene. The current build covers **Phase 0 (technical validation)** of the PRD: the widget, the clock-driven animation, calibration, wallpaper export, background matching, preview, diagnostics and measurement tools. The cozy-room artwork (Phase 2) is deliberately not built yet. The PRD gates it on the on-device feasibility results.

Status: see [TEST_REPORT.md](TEST_REPORT.md). Simulator results are in. **Physical-device gates A/B/C are not yet run.**

## How the animation works

Widgets cannot run timers or redraw at 8 FPS. Instead, the system keeps `Text(date, style: .timer)` views ticking on the Home Screen, and custom fonts turn those ticks into frames. This is adapted from [brycebostwick/WidgetAnimation](https://github.com/brycebostwick/WidgetAnimation):

- 16 frame fonts (`AquaFrames0…15`). Each one ligates the timer's two seconds digits into one of 15 glyphs. Glyphs are **OpenType-SVG**, so they carry full color and transparency.
- Font *j*'s timer is offset by 1 + *j*/8 s, so font *j*, glyph *k* holds logical frame 16·*k* + *j*.
- The reference stacks **opaque** frames, so each new layer covers the old one. The fish frames are **transparent**, so that approach makes up to 8 frames visible at once. Here each layer is instead masked by `blink(j)` ∧ `inverseBlink(j+1)`, which leaves it visible for exactly its own 1/8 s slot, plus a 30 ms hand-off overlap.
- The timeline has one entry, `policy: .never`. There are no reload loops and no background process.

All of this lives in `Core/Animation/ClockAnimationDriver.swift`. `ClockSchedule` (in `AquariumAnimationEngine.swift`) holds the matching math and a timer model that the unit tests check.

## Layout

```
App/                 SwiftUI app: setup wizard, calibration, preview, diagnostics, test log
Core/                Shared by app and widget extension
  Models/            SceneManifest, AnimationClip (frames.json), CalibrationProfile, pixel/normalized rects
  Animation/         AquariumAnimationEngine + ClockSchedule, ClockAnimationDriver (experimental)
  Rendering/         PixelBuffer, PixelArtRenderer, WallpaperRenderer, WidgetBackgroundRenderer, AquariumCanvasView
  Calibration/       Screenshot detection (magenta widget, green fiducials), alignment analysis
  Storage/           App Group JSON/PNG store
WidgetExtension/     systemLarge widget, timeline provider, generated fonts
Assets/Scenes/CozyRoom/  manifest.json, sprite PNGs, generated frames.json
Tools/               generate_animation.py, analyze_recording.py
Tests/               Unit tests (calibration, animation schedule, rendering)
UITests/             Simulator helper that adds the widget through SpringBoard
config/              Info.plists and entitlements (generated plists come from project.yml)
```

## Build

Requirements: Xcode 26.5 or later, XcodeGen, and Python 3 with `fonttools` and `pillow` (plus `opencv-python` for recording analysis).

```sh
xcodegen generate                       # after editing project.yml or adding fonts
# fish sprites are drawn with pxl in ../art/fish.px.js:
node ../.claude/skills/pxl-pixel-art/bin/pxl.js build ../art/fish.px.js --only fish_a,fish_b
cp ../art/out/anims/fish_a.png ../art/out/anims/fish_b.png Assets/Scenes/CozyRoom/
python3 Tools/generate_animation.py     # after editing manifest.json or sprites
xcodebuild -scheme PixelAquarium -destination 'platform=iOS Simulator,name=iPhone 17' test
```

### Signing and App Group (one-time, for the physical iPhone)

1. Open `PixelAquarium.xcodeproj`. In *Signing & Capabilities* for **both** `PixelAquarium` and `AquariumWidgetExtension`, pick your team. `project.yml` sets `DEVELOPMENT_TEAM = 3NFUYR892M` (the team on this Mac's Apple Distribution certificate); change it there if it's wrong.
2. Both targets use the App Group `group.com.aghamatlab.pixelaquarium`. With automatic signing, Xcode registers it on first device build. If you change bundle IDs, change the group in `config/*.entitlements` and in `SharedConfigurationStore.appGroupIdentifier`.
3. Connect the iPhone, enable Developer Mode, choose it as the run destination, and run the `PixelAquarium` scheme. If the phone is on a newer iOS than Xcode supports (e.g. iOS 27 with Xcode 26.5), update Xcode first.
4. Diagnostics › Widget › *App Group* must say "shared container". Otherwise the widget can't see settings.

Permissions: **Photos add-only** (saving the wallpaper). Screenshot import uses the system photo picker and needs no permission. No network access is used.

## On-device procedure (Phase 0 gates)

The app never places widgets or changes the wallpaper. You do those steps by hand.

**Gate A + C: animation and color**
1. Home Screen › Edit › Add Widget › *Pixel Aquarium* (Large). Keep the icon style on **Default**.
2. In the app, set the mode to *Animated aquarium (experimental)* and turn on *Frame-index barcode*.
3. Force-quit the app. Start a screen recording from Control Center and record the Home Screen for 5+ minutes.
4. On the Mac: `python3 Tools/analyze_recording.py recording.mov`. Pass needs ≥ 4 updates/s sustained and no freeze over 2 s. Check the colors visually: magenta silhouettes would mean SVG glyphs aren't supported.

**Gate B: wallpaper alignment**
1. Calibration › *Generate calibration wallpaper* › *Save to Photos*. Apply it as the Home Screen wallpaper with no zoom, blur, depth or dimming (Setup step 4).
2. Set the widget to *Calibration* mode (magenta). Take a screenshot, then *Import screenshot*. The widget rectangle and the 4 green fiducials are detected; nudge them if needed, then *Save calibration*.
3. *Generate background + set Static mode*. Take another screenshot, then *Import alignment screenshot*. The report shows inside/outside error, color bias and the best-fit shift. *Apply shift* / *Apply colour gain* regenerate the background.
4. Try *Background as content layer* on and off and compare (see the iOS 26 sheen finding in the test report).

Record every observation in *Feasibility gates & tests*, then *Diagnostics › Export test report* and paste the result into `TEST_REPORT.md`.

## Simulator helper

The `HomeScreenWidget` scheme runs a UI test that switches the app to animated mode and adds the widget through SpringBoard:

```sh
xcodebuild -scheme HomeScreenWidget -destination 'id=<simulator-udid>' test
xcrun simctl io <udid> recordVideo --codec h264 home.mp4   # Ctrl-C to stop
python3 Tools/analyze_recording.py home.mp4
```

Simulator results are useful for debugging but don't count as evidence for the PRD.

## Known limitations

- The technique is undocumented behavior of WidgetKit timers and could stop working in any iOS release. It is isolated in one file.
- Timer digits are forced to ASCII with `en_US_POSIX`, and fonts use `fixedSize` so Dynamic Type can't rescale frames. The Bold Text accessibility setting hasn't been tested.
- Clear and Tinted icon styles will desaturate or tint the widget. Only the Default (full-color) style is in scope.
- Calibration assumes the wallpaper is shown without parallax/perspective zoom. The fiducial fit measures uniform scale and translation only.
- Art so far: two pxl-drawn fish (`../art/fish.px.js`) and the calibration pattern.
