import Foundation

/// Precomputed, deterministic animation data (`frames.json`), produced by
/// `Tools/generate_animation.py`. The in-app preview, the static widget and the clock-driver
/// fonts are all derived from this one sequence.
struct AnimationClip: Codable, Equatable {
    var sceneId: String
    var fps: Int
    var loopDuration: Int
    var frameCount: Int
    var canvasWidth: Int
    var canvasHeight: Int
    var posterFrame: Int
    var artPixelPoints: Int
    var driver: DriverInfo
    var elements: [Element]

    struct DriverInfo: Codable, Equatable {
        var fontCount: Int
        var glyphsPerFont: Int
        var framesFont: String
        var blinkFont: String
        var blinkInverseFont: String
        var codeFont: String
        var codeCells: Int
    }

    /// One animated sprite. Arrays are indexed by logical frame; coordinates are integer
    /// logical pixels in the fish canvas, origin top-left.
    struct Element: Codable, Equatable {
        var id: String
        var sprite: String
        var frameWidth: Int
        var frameHeight: Int
        var x: [Int]
        var y: [Int]
        var spriteFrame: [Int]
        /// Sprites face right; true mirrors the sprite for that frame.
        var flip: [Bool]
    }

    struct Placement: Equatable {
        var elementId: String
        var x: Int
        var y: Int
        var spriteFrame: Int
        var flipped: Bool
    }

    func placements(frame: Int) -> [Placement] {
        let f = ((frame % frameCount) + frameCount) % frameCount
        return elements.map { Placement(elementId: $0.id, x: $0.x[f], y: $0.y[f], spriteFrame: $0.spriteFrame[f], flipped: $0.flip[f]) }
    }

    var canvasAspect: Double { Double(canvasWidth) / Double(canvasHeight) }
}
