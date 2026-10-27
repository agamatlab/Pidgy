import Foundation

/// Scene-level animation logic, independent of how frames reach the screen (PRD FR-07).
/// The widget uses `ClockAnimationDriver`; the app preview uses foreground timing.
struct AquariumAnimationEngine {
    let manifest: SceneManifest
    let clip: AnimationClip

    static func load(bundle: Bundle = .main) throws -> AquariumAnimationEngine {
        AquariumAnimationEngine(manifest: try SceneBundle.loadManifest(bundle: bundle),
                                clip: try SceneBundle.loadClip(bundle: bundle))
    }

    var schedule: ClockSchedule {
        ClockSchedule(fps: clip.fps, loopDuration: clip.loopDuration, fontCount: clip.driver.fontCount)
    }

    /// Ideal frame for a playhead: `floor(elapsed * fps) % frameCount`.
    func frameIndex(elapsed: TimeInterval) -> Int {
        let raw = Int((elapsed * Double(clip.fps)).rounded(.down))
        return ((raw % clip.frameCount) + clip.frameCount) % clip.frameCount
    }

    func placements(frame: Int) -> [AnimationClip.Placement] {
        clip.placements(frame: frame)
    }

    /// Consistency problems in the generated data (empty = OK).
    func validate() -> [String] {
        var issues: [String] = []
        if clip.frameCount != clip.fps * clip.loopDuration {
            issues.append("frameCount \(clip.frameCount) != fps * loopDuration")
        }
        if clip.driver.fontCount * clip.driver.glyphsPerFont != clip.frameCount {
            issues.append("driver fonts x glyphs != frameCount")
        }
        if clip.fps != manifest.targetFPS || clip.loopDuration != manifest.loopDuration {
            issues.append("frames.json is stale: rerun Tools/generate_animation.py")
        }
        for el in clip.elements where [el.x.count, el.y.count, el.spriteFrame.count].contains(where: { $0 != clip.frameCount }) {
            issues.append("element \(el.id) has wrong track length")
        }
        return issues
    }

    var diagnostics: [(String, String)] {
        [
            ("Scene", "\(manifest.sceneId) v\(manifest.sceneVersion)"),
            ("Animation engine", "AquariumAnimationEngine + ClockAnimationDriver (timer-ligature fonts)"),
            ("Configured FPS", "\(clip.fps)"),
            ("Loop duration", "\(clip.loopDuration) s"),
            ("Logical frames", "\(clip.frameCount)"),
            ("Driver fonts", "\(clip.driver.fontCount) x \(clip.driver.glyphsPerFont) glyphs"),
            ("Fish canvas", "\(clip.canvasWidth) x \(clip.canvasHeight) logical px"),
            ("Animated elements", clip.elements.map(\.id).joined(separator: ", ")),
        ]
    }
}

/// Timing of the clock-driven technique. Pure math, unit tested.
struct ClockSchedule: Equatable {
    var fps: Int
    var loopDuration: Int
    var fontCount: Int

    /// Each layer's window stays open this much longer than its slot. Timers sharing a start
    /// date do not always update in the same render pass; without overlap the hand-off can
    /// leave a refresh with no layer (fish flicker). A brief overlap of two frames that differ
    /// by at most one art pixel is not visible.
    var handoffOverlap: TimeInterval = 0.03

    var frameDuration: TimeInterval { 1 / Double(fps) }
    var frameCount: Int { fps * loopDuration }
    var glyphsPerFont: Int { loopDuration / 2 }

    /// Reference date for every timer in one render. Aligned to a multiple of the loop so all
    /// renders share a phase with the wall clock, and pushed 60 s into the past so every
    /// offset timer (up to +2 s) is still counting up.
    func anchor(for now: Date) -> Date {
        let loop = Double(loopDuration)
        return Date(timeIntervalSince1970: (now.timeIntervalSince1970 / loop).rounded(.down) * loop - 60)
    }

    /// Logical frame stored in font `fontIndex`, glyph `glyph` (generator layout).
    func frame(font fontIndex: Int, glyph: Int) -> Int { glyph * fontCount + fontIndex }

    /// Frame the layered timers are predicted to show at `date`, assuming count-up timers
    /// display whole elapsed seconds. Font j is visible during slot j of each 2 s window and its
    /// timer is offset by +1 s, so the visible frame trails the ideal clock by `fontCount` frames.
    func predictedFrame(at date: Date) -> Int {
        let t = date.timeIntervalSince1970.truncatingRemainder(dividingBy: Double(loopDuration))
        let ideal = Int((t * Double(fps)).rounded(.down))
        return ((ideal - fontCount) % frameCount + frameCount) % frameCount
    }

    // Model of what ClockAnimationDriver's timers display, used by tests to check the layout.

    /// Whole seconds a count-up timer started at `start` shows at `date`.
    static func timerSeconds(start: Date, at date: Date) -> Int {
        Int(date.timeIntervalSince(start).rounded(.down))
    }

    /// blink(j) AND inverse-blink(j + 1), as drawn by the driver.
    func isLayerVisible(_ j: Int, anchor: Date, at date: Date) -> Bool {
        let blink = Self.timerSeconds(start: anchor.addingTimeInterval(Double(j) * frameDuration), at: date)
        let inverse = Self.timerSeconds(start: anchor.addingTimeInterval(Double(j + 1) * frameDuration + handoffOverlap), at: date)
        return blink % 2 == 0 && abs(inverse % 2) == 1
    }

    /// Logical frame layer j's font draws at `date`.
    func layerFrame(_ j: Int, anchor: Date, at date: Date) -> Int {
        let seconds = Self.timerSeconds(start: anchor.addingTimeInterval(1 + Double(j) * frameDuration), at: date)
        return frame(font: j, glyph: (seconds % 60 % loopDuration) / 2)
    }
}
