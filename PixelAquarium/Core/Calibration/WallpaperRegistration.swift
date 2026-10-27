import CoreGraphics
import Foundation

/// Finds how iOS places the wallpaper file on screen (`screen = file * scale + translation`)
/// by matching a screenshot against the file. iOS zooms Home Screen wallpapers (iPhone19,7 /
/// iOS 27: 1.118x, shifted up ~100 px), so identity cannot be assumed.
enum WallpaperRegistration {
    struct Result {
        var transform: WallpaperTransform
        /// Normalised cross-correlation of luminance at the best fit (1 = perfect).
        var score: Double
    }

    /// Screen areas usable for matching: below the status bar, above the dock, outside `exclude`.
    static func samplePoints(screen: PixelSize, exclude: PixelRect?, step: Int) -> [(Int, Int)] {
        let ex = exclude.map { PixelRect(x: $0.x - 24, y: $0.y - 24, width: $0.width + 48, height: $0.height + 48) }
        var pts: [(Int, Int)] = []
        for y in stride(from: Int(Double(screen.height) * 0.06), to: Int(Double(screen.height) * 0.84), by: step) {
            for x in stride(from: step / 2, to: screen.width, by: step) {
                if let ex, x >= ex.x, x < ex.maxX, y >= ex.y, y < ex.maxY { continue }
                pts.append((x, y))
            }
        }
        return pts
    }

    static func register(screenshot: PixelBuffer, wallpaper: PixelBuffer, exclude: PixelRect?) -> Result {
        let shotLum = luminance(screenshot), wallLum = luminance(wallpaper)
        // Coarse steps of 8 px would alias against the 5-10 px dither patterns, so the coarse
        // search runs on blurred images (smooth score), the fine search on sharp ones.
        let shotBlur = boxBlur(shotLum, width: screenshot.width, height: screenshot.height, radius: 8)
        let wallBlur = boxBlur(wallLum, width: wallpaper.width, height: wallpaper.height, radius: 8)
        let W = Double(screenshot.width), H = Double(screenshot.height)
        let size = PixelSize(width: screenshot.width, height: screenshot.height)

        func search(points: [(Int, Int)], shot: [Float], wall wallLum: [Float], scales: [Double], dxs: [Double], dys: [Double],
                    base: (Double) -> (Double, Double)) -> (Double, Double, Double, Double) {
            let values = points.map { shot[$0.1 * screenshot.width + $0.0] }
            var best = (score: -2.0, s: 1.0, tx: 0.0, ty: 0.0)
            for s in scales {
                let (bx, by) = base(s)
                for dx in dxs {
                    for dy in dys {
                        let tx = bx + dx, ty = by + dy
                        let score = ncc(values: values, points: points, wall: wallLum, wallWidth: wallpaper.width,
                                        wallHeight: wallpaper.height, s: s, tx: tx, ty: ty)
                        if score > best.score { best = (score, s, tx, ty) }
                    }
                }
            }
            return best
        }

        // Coarse: zoom about the centre plus an offset.
        let coarse = search(points: samplePoints(screen: size, exclude: exclude, step: 24), shot: shotBlur, wall: wallBlur,
                            scales: Array(stride(from: 0.97, through: 1.30, by: 0.01)),
                            dxs: Array(stride(from: -96.0, through: 96, by: 8)),
                            dys: Array(stride(from: -256.0, through: 256, by: 8)),
                            base: { s in ((1 - s) * W / 2, (1 - s) * H / 2) })
        let fine = search(points: samplePoints(screen: size, exclude: exclude, step: 8), shot: shotLum, wall: wallLum,
                          scales: Array(stride(from: coarse.1 - 0.012, through: coarse.1 + 0.012, by: 0.001)),
                          dxs: Array(stride(from: -8.0, through: 8, by: 1)),
                          dys: Array(stride(from: -8.0, through: 8, by: 1)),
                          base: { s in (coarse.2 + (coarse.1 - s) * W / 2, coarse.3 + (coarse.1 - s) * H / 2) })
        return Result(transform: WallpaperTransform(scale: fine.1, translationX: fine.2, translationY: fine.3), score: fine.0)
    }

    private static func ncc(values: [Float], points: [(Int, Int)], wall: [Float], wallWidth: Int, wallHeight: Int,
                            s: Double, tx: Double, ty: Double) -> Double {
        var n = 0.0, sx = 0.0, sy = 0.0, sxx = 0.0, syy = 0.0, sxy = 0.0
        let inv = 1 / s
        for (i, p) in points.enumerated() {
            let wx = Int(((Double(p.0) + 0.5) - tx) * inv), wy = Int(((Double(p.1) + 0.5) - ty) * inv)
            guard wx >= 0, wy >= 0, wx < wallWidth, wy < wallHeight else { continue }
            let a = Double(values[i]), b = Double(wall[wy * wallWidth + wx])
            n += 1; sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b
        }
        guard n > Double(points.count) * 0.8 else { return -1 }
        let cov = sxy - sx * sy / n, va = sxx - sx * sx / n, vb = syy - sy * sy / n
        return va > 0 && vb > 0 ? cov / (va * vb).squareRoot() : -1
    }

    /// Separable box blur via running sums.
    private static func boxBlur(_ src: [Float], width: Int, height: Int, radius r: Int) -> [Float] {
        var tmp = [Float](repeating: 0, count: src.count), out = tmp
        let n = Float(2 * r + 1)
        for y in 0..<height {
            var acc: Float = 0
            for x in -r...r { acc += src[y * width + min(max(x, 0), width - 1)] }
            for x in 0..<width {
                tmp[y * width + x] = acc / n
                acc += src[y * width + min(x + r + 1, width - 1)] - src[y * width + max(x - r, 0)]
            }
        }
        for x in 0..<width {
            var acc: Float = 0
            for y in -r...r { acc += tmp[min(max(y, 0), height - 1) * width + x] }
            for y in 0..<height {
                out[y * width + x] = acc / n
                acc += tmp[min(y + r + 1, height - 1) * width + x] - tmp[max(y - r, 0) * width + x]
            }
        }
        return out
    }

    private static func luminance(_ img: PixelBuffer) -> [Float] {
        var out = [Float](repeating: 0, count: img.width * img.height)
        img.data.withUnsafeBufferPointer { p in
            for i in 0..<(img.width * img.height) {
                out[i] = 0.299 * Float(p[i * 4]) + 0.587 * Float(p[i * 4 + 1]) + 0.114 * Float(p[i * 4 + 2])
            }
        }
        return out
    }

    /// How the screen shows wallpaper colours, from 24 px block averages around the widget
    /// (block averages are insensitive to sub-pixel misregistration of the dither patterns).
    /// Blocks that disagree strongly (icons, labels) are dropped and the fit repeated.
    static func fitWallpaperColors(screenshot: PixelBuffer, wallpaper: PixelBuffer, transform: WallpaperTransform,
                                   exclude: PixelRect?) -> ColorMap? {
        let b = 24
        var src: [[Double]] = [], dst: [[Double]] = []
        let size = PixelSize(width: screenshot.width, height: screenshot.height)
        for (x0, y0) in samplePoints(screen: size, exclude: exclude, step: b) {
            var s = [0.0, 0.0, 0.0], w = [0.0, 0.0, 0.0], n = 0.0
            for y in stride(from: y0 - b / 2, to: y0 + b / 2, by: 3) {
                for x in stride(from: x0 - b / 2, to: x0 + b / 2, by: 3) {
                    guard x >= 0, y >= 0, x < screenshot.width, y < screenshot.height else { continue }
                    let p = transform.toWallpaper(CGPoint(x: Double(x) + 0.5, y: Double(y) + 0.5))
                    let wx = Int(p.x), wy = Int(p.y)
                    guard wx >= 0, wy >= 0, wx < wallpaper.width, wy < wallpaper.height else { continue }
                    let c = screenshot.pixel(x, y), f = wallpaper.pixel(wx, wy)
                    s[0] += Double(c.r); s[1] += Double(c.g); s[2] += Double(c.b)
                    w[0] += Double(f.r); w[1] += Double(f.g); w[2] += Double(f.b)
                    n += 1
                }
            }
            guard n > 20 else { continue }
            src.append(w.map { $0 / n }); dst.append(s.map { $0 / n })
        }
        guard var map = ColorMap.fit(source: src, screen: dst) else { return nil }
        let residuals = zip(src, dst).map { f, s in (0..<3).map { abs(map.apply(f[$0], channel: $0) - s[$0]) }.max()! }
        let limit = max(4, 3 * CalibrationManager.median(residuals))
        let keep = residuals.indices.filter { residuals[$0] <= limit }
        if keep.count >= 10, let refit = ColorMap.fit(source: keep.map { src[$0] }, screen: keep.map { dst[$0] }) {
            map = refit
        }
        return map
    }
}
