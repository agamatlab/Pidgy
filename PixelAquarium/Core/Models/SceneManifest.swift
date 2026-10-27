import Foundation

/// Scene-specific data, independent of any iPhone model (PRD 5.2).
/// Source of truth: `Assets/Scenes/<scene>/manifest.json`.
struct SceneManifest: Codable, Equatable {
    var sceneId: String
    var sceneVersion: Int
    /// Full-screen water wallpaper ("seamless" style).
    var wallpaperAsset: String
    /// "Tank" style: the widget is the tank, the wallpaper is a room with a stand under it.
    var tankAsset: String?
    var standAsset: String?
    var roomAsset: String?
    var staticBackgroundAsset: String
    var preferredWidgetFamily: String
    var targetFPS: Int
    var loopDuration: Int
    var pixelArtScaleMode: String
    /// Size of one art pixel in points, shared by wallpaper and fish so their pixels match.
    var artPixelPoints: Int
    /// Water region, normalized to the widget's own bounds (0...1).
    var aquariumRegion: NormalizedRect
    var fishCanvas: CanvasSize
    var fontSets: FontSets
    var animatedElements: [AnimatedElementSpec]

    struct CanvasSize: Codable, Equatable {
        var width: Int
        var height: Int
    }

    struct FontSets: Codable, Equatable {
        var frames: String
        var blink: String
        var blinkInverse: String
        var code: String
    }

    struct AnimatedElementSpec: Codable, Equatable {
        var id: String
        var sprite: String
        var frameWidth: Int
        var frameHeight: Int
        var spriteFrames: Int
        /// "patrol" (turns inside the canvas) or "crossing" (wraps off-screen).
        var motion: String
        var direction: String?
        var xMin: Int?
        var xMax: Int?
        var cyclesPerLoop: Int
        var phase: Double
        var baseY: Int
        var bobAmplitude: Int
        var bobCyclesPerLoop: Int
        var tailFramesPerSecond: Int
    }
}

enum SceneBundle {
    static let defaultSceneId = "cozy-room"

    static func loadManifest(bundle: Bundle = .main) throws -> SceneManifest {
        try decode(SceneManifest.self, resource: "manifest", bundle: bundle)
    }

    /// Bundled tank interior (`staticBackgroundAsset`), used until a calibrated wallpaper crop exists.
    static func staticBackgroundURL(bundle: Bundle = .main) -> URL? {
        assetURL(\.staticBackgroundAsset, bundle: bundle)
    }

    /// Full-screen wallpaper art at art-pixel resolution (`wallpaperAsset`).
    static func wallpaperArtURL(bundle: Bundle = .main) -> URL? {
        assetURL(\.wallpaperAsset, bundle: bundle)
    }

    private static func assetURL(_ key: KeyPath<SceneManifest, String>, bundle: Bundle) -> URL? {
        guard let manifest = try? loadManifest(bundle: bundle) else { return nil }
        return url(manifest[keyPath: key], bundle: bundle)
    }

    static func assetURL(_ key: KeyPath<SceneManifest, String?>, bundle: Bundle = .main) -> URL? {
        guard let manifest = try? loadManifest(bundle: bundle), let name = manifest[keyPath: key] else { return nil }
        return url(name, bundle: bundle)
    }

    private static func url(_ file: String, bundle: Bundle) -> URL? {
        let name = file as NSString
        return bundle.url(forResource: name.deletingPathExtension, withExtension: name.pathExtension)
    }

    static func loadClip(bundle: Bundle = .main) throws -> AnimationClip {
        try decode(AnimationClip.self, resource: "frames", bundle: bundle)
    }

    private static func decode<T: Decodable>(_ type: T.Type, resource: String, bundle: Bundle) throws -> T {
        guard let url = bundle.url(forResource: resource, withExtension: "json") else {
            throw SceneError.missingResource("\(resource).json")
        }
        return try JSONDecoder().decode(T.self, from: Data(contentsOf: url))
    }
}

enum SceneError: LocalizedError, Equatable {
    case missingResource(String)
    case invalidSprite(String)

    var errorDescription: String? {
        switch self {
        case .missingResource(let name): return "Missing bundle resource \(name)"
        case .invalidSprite(let name): return "Sprite \(name) could not be decoded"
        }
    }
}
