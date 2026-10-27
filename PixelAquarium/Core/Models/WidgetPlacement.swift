import CoreGraphics
import Foundation

// Coordinate spaces are kept explicit (PRD FR-01):
//  - PixelRect / PixelSize: screenshot or image pixels (integers).
//  - NormalizedRect: fraction of a reference size (screen or widget).
//  - SwiftUI points only appear in views, converted with the display scale.

struct PixelSize: Codable, Equatable {
    var width: Int
    var height: Int
}

struct PixelRect: Codable, Equatable {
    var x: Int
    var y: Int
    var width: Int
    var height: Int

    var cgRect: CGRect { CGRect(x: x, y: y, width: width, height: height) }
    var maxX: Int { x + width }
    var maxY: Int { y + height }

    init(x: Int, y: Int, width: Int, height: Int) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }

    init(_ rect: CGRect) {
        x = Int(rect.minX.rounded())
        y = Int(rect.minY.rounded())
        width = Int(rect.width.rounded())
        height = Int(rect.height.rounded())
    }

    func offsetBy(dx: Int, dy: Int) -> PixelRect {
        PixelRect(x: x + dx, y: y + dy, width: width, height: height)
    }

    func normalized(in screen: PixelSize) -> NormalizedRect {
        NormalizedRect(
            x: Double(x) / Double(screen.width),
            y: Double(y) / Double(screen.height),
            width: Double(width) / Double(screen.width),
            height: Double(height) / Double(screen.height)
        )
    }
}

struct NormalizedRect: Codable, Equatable {
    var x: Double
    var y: Double
    var width: Double
    var height: Double

    func denormalized(in size: CGSize) -> CGRect {
        CGRect(x: x * size.width, y: y * size.height, width: width * size.width, height: height * size.height)
    }
}

struct PixelInsets: Codable, Equatable {
    var top: Int = 0
    var left: Int = 0
    var bottom: Int = 0
    var right: Int = 0
}

/// How the wallpaper PNG appears on screen: `screen = wallpaper * scale + translation`.
/// Identity means iOS shows the PNG pixel-for-pixel.
struct WallpaperTransform: Codable, Equatable {
    var scale: Double = 1
    var translationX: Double = 0
    var translationY: Double = 0

    static let identity = WallpaperTransform()

    func toScreen(_ p: CGPoint) -> CGPoint {
        CGPoint(x: p.x * scale + translationX, y: p.y * scale + translationY)
    }

    func toWallpaper(_ p: CGPoint) -> CGPoint {
        CGPoint(x: (p.x - translationX) / scale, y: (p.y - translationY) / scale)
    }

    func toWallpaper(_ r: CGRect) -> CGRect {
        let o = toWallpaper(r.origin)
        return CGRect(x: o.x, y: o.y, width: r.width / scale, height: r.height / scale)
    }

    /// Least-squares uniform scale + translation from matched point pairs.
    static func solve(wallpaper: [CGPoint], screen: [CGPoint]) -> WallpaperTransform? {
        guard wallpaper.count == screen.count, !wallpaper.isEmpty else { return nil }
        let n = Double(wallpaper.count)
        let pw = CGPoint(x: wallpaper.map(\.x).reduce(0, +) / n, y: wallpaper.map(\.y).reduce(0, +) / n)
        let ps = CGPoint(x: screen.map(\.x).reduce(0, +) / n, y: screen.map(\.y).reduce(0, +) / n)
        var num = 0.0, den = 0.0
        for (a, b) in zip(wallpaper, screen) {
            let da = CGPoint(x: a.x - pw.x, y: a.y - pw.y)
            let db = CGPoint(x: b.x - ps.x, y: b.y - ps.y)
            num += da.x * db.x + da.y * db.y
            den += da.x * da.x + da.y * da.y
        }
        let scale = den > 0 ? num / den : 1
        return WallpaperTransform(scale: scale, translationX: ps.x - scale * pw.x, translationY: ps.y - scale * pw.y)
    }
}

/// Per-channel `out = scale * in + offset` (0-255 sRGB). iOS changes colours on the Home
/// Screen: the wallpaper a little, widget content a lot (iOS 27 lightens it). Both changes are
/// measured from a screenshot and fit this model with ~1/255 error.
struct ColorMap: Codable, Equatable {
    var scale: [Double] = [1, 1, 1]
    var offset: [Double] = [0, 0, 0]

    static let identity = ColorMap()

    func apply(_ v: Double, channel c: Int) -> Double { v * scale[c] + offset[c] }

    var inverse: ColorMap {
        let s = scale.map { abs($0) < 0.05 ? 1 : $0 }
        return ColorMap(scale: s.map { 1 / $0 }, offset: zip(offset, s).map { -$0 / $1 })
    }

    /// `self` followed by `next`.
    func then(_ next: ColorMap) -> ColorMap {
        ColorMap(scale: (0..<3).map { scale[$0] * next.scale[$0] },
                 offset: (0..<3).map { offset[$0] * next.scale[$0] + next.offset[$0] })
    }

    /// Least-squares fit of `screen = scale * source + offset` per channel. Samples where the
    /// screen value hit 0 or 255 in a channel are skipped for that channel (clipped, no info).
    static func fit(source: [[Double]], screen: [[Double]]) -> ColorMap? {
        guard source.count >= 3, source.count == screen.count else { return nil }
        var m = ColorMap()
        for c in 0..<3 {
            let keep = screen.indices.filter { screen[$0][c] > 3 && screen[$0][c] < 250 }
            guard keep.count >= 3 else { return nil }
            let x = keep.map { source[$0][c] }, y = keep.map { screen[$0][c] }
            let n = Double(x.count), mx = x.reduce(0, +) / n, my = y.reduce(0, +) / n
            let sxx = x.reduce(0) { $0 + ($1 - mx) * ($1 - mx) }
            let sxy = zip(x, y).reduce(0) { $0 + ($1.0 - mx) * ($1.1 - my) }
            let a = sxx > 1 ? sxy / sxx : 1
            m.scale[c] = a
            m.offset[c] = my - a * mx
        }
        return m
    }
}
