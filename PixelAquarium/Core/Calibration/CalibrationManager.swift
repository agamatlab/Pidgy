import CoreGraphics
import Foundation

/// Result of checking a Home Screen screenshot of the finished widget (PRD 8.3).
struct AlignmentReport: Codable, Equatable {
    var createdAt = Date()
    /// Median colour step across the widget border (0-255): block averages just inside vs just
    /// outside each edge. This is the visible "box"; the wallpaper's own variation is in
    /// `naturalEdgeStep` for comparison.
    var edgeStep: Double
    var naturalEdgeStep: Double
    /// Median absolute error inside the widget against how the wallpaper looks on screen.
    var insideError: Double
    /// Shift (screen px) of the widget content that best matches the wallpaper around it.
    var bestShiftX: Int
    var bestShiftY: Int
    /// Widget colour change re-measured from this screenshot (nil if not measurable).
    var measuredWidgetColorMap: ColorMap?

    var looksSeamless: Bool { edgeStep <= naturalEdgeStep + 3 && bestShiftX == 0 && bestShiftY == 0 }

    var summary: String {
        String(format: "edge step %.1f (wallpaper itself %.1f), inside error %.1f, shift (%d, %d) px",
               edgeStep, naturalEdgeStep, insideError, bestShiftX, bestShiftY)
    }
}

enum CalibrationManager {
    struct Detection {
        var widgetRect: PixelRect?
        var fiducialsFound: Int
        var transform: WallpaperTransform?
    }

    /// Full detection on a screenshot taken with the calibration wallpaper and the widget in
    /// calibration (magenta) mode.
    /// `expectedWidgetSize` (pixels, from the widget's reported size) replaces the magenta box
    /// size when close: iOS softens ~3 px at widget edges, which shrinks the box.
    static func detect(screenshot: PixelBuffer, wallpaperSize: PixelSize, expectedWidgetSize: PixelSize? = nil) -> Detection {
        let rect = detectWidgetRect(in: screenshot).map { snap($0, to: expectedWidgetSize) }
        let expected = WallpaperRenderer.fiducialCenters(size: wallpaperSize)
        var wall: [CGPoint] = [], screen: [CGPoint] = []
        for (i, found) in detectFiducials(in: screenshot).enumerated() {
            if let found {
                wall.append(expected[i])
                screen.append(found)
            }
        }
        let transform = wall.count >= 2 ? WallpaperTransform.solve(wallpaper: wall, screen: screen) : nil
        return Detection(widgetRect: rect, fiducialsFound: wall.count, transform: transform)
    }

    /// Replaces the box size with the widget's reported size when close: iOS softens ~3 px at
    /// widget edges, which shrinks the detected box.
    static func snap(_ box: PixelRect, to size: PixelSize?) -> PixelRect {
        guard let size, abs(box.width - size.width) <= 16, abs(box.height - size.height) <= 16 else { return box }
        let cx = Double(box.x) + Double(box.width) / 2, cy = Double(box.y) + Double(box.height) / 2
        return PixelRect(x: Int((cx - Double(size.width) / 2).rounded()), y: Int((cy - Double(size.height) / 2).rounded()),
                         width: size.width, height: size.height)
    }

    /// Bounding box of pixels in a calibration border colour (magenta = Large widget, cyan =
    /// Medium widget): channels that are 255 in the colour must be high, 0 channels low.
    static func detectWidgetRect(in img: PixelBuffer, color: RGBA = .calibrationMagenta, minimumPixels: Int = 5000) -> PixelRect? {
        var minX = Int.max, minY = Int.max, maxX = -1, maxY = -1, count = 0
        let want = [color.r, color.g, color.b].map { $0 > 127 }
        for y in 0..<img.height {
            for x in 0..<img.width {
                let c = img.pixel(x, y)
                let v = [Int(c.r), Int(c.g), Int(c.b)]
                let highs = (0..<3).filter { want[$0] }.map { v[$0] }
                if (0..<3).allSatisfy({ want[$0] ? v[$0] > 180 : v[$0] < 80 }), (highs.max()! - highs.min()!) < 60 {
                    count += 1
                    minX = min(minX, x); maxX = max(maxX, x)
                    minY = min(minY, y); maxY = max(maxY, y)
                }
            }
        }
        guard count >= minimumPixels else { return nil }
        return PixelRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
    }

    /// Centroid of green fiducial pixels in each of the four expected zones (nil if absent).
    static func detectFiducials(in img: PixelBuffer) -> [CGPoint?] {
        let w = img.width, h = img.height
        let xBands = [0..<max(1, w / 8), (w - w / 8)..<w]
        let yBands = [Int(Double(h) * 0.15)..<Int(Double(h) * 0.35), Int(Double(h) * 0.70)..<Int(Double(h) * 0.90)]
        var out: [CGPoint?] = []
        for yb in yBands {
            for xb in xBands {
                var sx = 0.0, sy = 0.0, n = 0.0
                for y in yb {
                    for x in xb {
                        let c = img.pixel(x, y)
                        let g = Double(c.g)
                        if g > 110, g > Double(c.r) * 1.6 + 20, g > Double(c.b) * 1.6 + 20 {
                            sx += Double(x) + 0.5; sy += Double(y) + 0.5; n += 1
                        }
                    }
                }
                out.append(n >= 100 ? CGPoint(x: sx / n, y: sy / n) : nil)
            }
        }
        return out
    }

    struct Calibration {
        var widgetRect: PixelRect
        var transform: WallpaperTransform
        var registrationScore: Double?
        var fiducialsFound: Int
        var wallpaperColorMap: ColorMap
        var widgetColorMap: ColorMap
        /// Outside-widget agreement after the fit (0-255); large = wrong wallpaper applied.
        var wallpaperResidual: Double
        /// The Medium widget, when one is on screen.
        var secondaryRect: PixelRect?
    }

    /// One screenshot does everything: widget in Calibration mode (magenta border + colour
    /// chart) over the generated wallpaper.
    static func calibrate(screenshot: PixelBuffer, wallpaper: PixelBuffer, widgetPointSize: CGSize?,
                          displayScale: Double, secondaryPointSize: CGSize? = nil) throws -> Calibration {
        let expected = widgetPointSize.map {
            PixelSize(width: Int(($0.width * displayScale).rounded()), height: Int(($0.height * displayScale).rounded()))
        }
        var d = detect(screenshot: screenshot, wallpaperSize: PixelSize(width: wallpaper.width, height: wallpaper.height),
                       expectedWidgetSize: expected)
        // Green fiducials only exist in the calibration grid; in the aquarium, green weeds
        // near the edges would be mistaken for them.
        let hasFiducials = WallpaperRenderer.fiducialCenters(size: PixelSize(width: wallpaper.width, height: wallpaper.height))
            .allSatisfy { wallpaper.pixel(Int($0.x), Int($0.y)) == .fiducialGreen }
        if !hasFiducials {
            d.transform = nil
            d.fiducialsFound = 0
        }
        guard let rect = d.widgetRect else {
            throw CalibrationError.message("The magenta calibration widget was not found. Set Calibration mode, wait until the widget shows the colour chart, then take the screenshot.")
        }
        let secondary = detectWidgetRect(in: screenshot, color: .calibrationCyan).map {
            snap($0, to: secondaryPointSize.map { PixelSize(width: Int(($0.width * displayScale).rounded()), height: Int(($0.height * displayScale).rounded())) })
        }
        let widgets = [rect] + (secondary.map { [$0] } ?? [])
        var transform = d.transform ?? .identity
        var score: Double?
        if d.transform == nil {
            let r = WallpaperRegistration.register(screenshot: screenshot, wallpaper: wallpaper, exclude: widgets)
            transform = r.transform
            score = r.score
        }
        let wallMap = WallpaperRegistration.fitWallpaperColors(screenshot: screenshot, wallpaper: wallpaper,
                                                               transform: transform, exclude: widgets) ?? .identity
        let pointSize = widgetPointSize ?? CGSize(width: Double(rect.width) / displayScale, height: Double(rect.height) / displayScale)
        let observed = CalibrationChart.readPatches(screenshot: screenshot, widgetRect: rect, widgetPointSize: pointSize)
        let widgetMap = CalibrationChart.fitWidgetMap(observed: observed) ?? .identity
        let residual = wallpaperResidual(screenshot: screenshot, wallpaper: wallpaper, transform: transform, map: wallMap, exclude: widgets)
        return Calibration(widgetRect: rect, transform: transform, registrationScore: score, fiducialsFound: d.fiducialsFound,
                           wallpaperColorMap: wallMap, widgetColorMap: widgetMap, wallpaperResidual: residual, secondaryRect: secondary)
    }

    private static func wallpaperResidual(screenshot: PixelBuffer, wallpaper: PixelBuffer, transform: WallpaperTransform,
                                          map: ColorMap, exclude: [PixelRect]) -> Double {
        let pts = WallpaperRegistration.samplePoints(screen: PixelSize(width: screenshot.width, height: screenshot.height),
                                                     exclude: exclude, step: 12)
        var errs: [Double] = []
        for (x, y) in pts {
            let p = transform.toWallpaper(CGPoint(x: Double(x) + 0.5, y: Double(y) + 0.5))
            guard Int(p.x) >= 0, Int(p.y) >= 0, Int(p.x) < wallpaper.width, Int(p.y) < wallpaper.height else { continue }
            let f = wallpaper.pixel(Int(p.x), Int(p.y)), s = screenshot.pixel(x, y)
            let e = [Double(f.r), Double(f.g), Double(f.b)].enumerated().map { map.apply($0.element, channel: $0.offset) }
            errs.append((abs(e[0] - Double(s.r)) + abs(e[1] - Double(s.g)) + abs(e[2] - Double(s.b))) / 3)
        }
        return median(errs)
    }

    /// Checks a screenshot of the finished widget (any mode except Calibration). `content` is the
    /// background image the widget is showing, so the widget colour change can be re-measured.
    static func analyzeAlignment(screenshot: PixelBuffer, wallpaper: PixelBuffer, content: PixelBuffer?,
                                 profile: CalibrationProfile) -> AlignmentReport {
        let rect = profile.widgetBoundsPixels
        let t = profile.wallpaperTransform
        let map = profile.wallpaperColorMap
        let corner = Int(Double(min(rect.width, rect.height)) * 0.12)

        /// How the wallpaper looks on screen at a screen pixel.
        func onScreen(_ x: Int, _ y: Int) -> [Double]? {
            let p = t.toWallpaper(CGPoint(x: Double(x) + 0.5, y: Double(y) + 0.5))
            let wx = Int(p.x.rounded(.down)), wy = Int(p.y.rounded(.down))
            guard wx >= 0, wy >= 0, wx < wallpaper.width, wy < wallpaper.height else { return nil }
            let c = wallpaper.pixel(wx, wy)
            return [map.apply(Double(c.r), channel: 0), map.apply(Double(c.g), channel: 1), map.apply(Double(c.b), channel: 2)]
        }
        func inScreen(_ x: Int, _ y: Int) -> Bool { x >= 0 && y >= 0 && x < screenshot.width && y < screenshot.height }
        func shot(_ x: Int, _ y: Int) -> [Double] {
            let c = screenshot.pixel(x, y)
            return [Double(c.r), Double(c.g), Double(c.b)]
        }
        func blockMean(_ x0: Int, _ y0: Int, _ w: Int, _ h: Int, _ f: (Int, Int) -> [Double]?) -> [Double]? {
            var s = [0.0, 0.0, 0.0], n = 0.0
            for y in stride(from: y0, to: y0 + h, by: 2) {
                for x in stride(from: x0, to: x0 + w, by: 2) where inScreen(x, y) {
                    guard let v = f(x, y) else { continue }
                    for c in 0..<3 { s[c] += v[c] }
                    n += 1
                }
            }
            return n > 0 ? s.map { $0 / n } : nil
        }
        func step(_ a: [Double], _ b: [Double]) -> Double { (0..<3).map { abs(a[$0] - b[$0]) }.max()! }

        // Edge step: 24 px blocks 4..28 px inside vs outside, along all four edges, no corners.
        var edge: [Double] = [], natural: [Double] = []
        let b = 24, gap = 4
        for along in stride(from: corner, to: rect.width - corner - b, by: b) {
            for (ix, iy, ox, oy) in [(rect.x + along, rect.y + gap, rect.x + along, rect.y - gap - b),
                                     (rect.x + along, rect.maxY - gap - b, rect.x + along, rect.maxY + gap)] {
                if let i = blockMean(ix, iy, b, b, { shot($0, $1) }), let o = blockMean(ox, oy, b, b, { shot($0, $1) }) { edge.append(step(i, o)) }
                if let i = blockMean(ix, iy, b, b, onScreen), let o = blockMean(ox, oy, b, b, onScreen) { natural.append(step(i, o)) }
            }
        }
        for along in stride(from: corner, to: rect.height - corner - b, by: b) {
            for (ix, iy, ox, oy) in [(rect.x + gap, rect.y + along, rect.x - gap - b, rect.y + along),
                                     (rect.maxX - gap - b, rect.y + along, rect.maxX + gap, rect.y + along)] {
                if let i = blockMean(ix, iy, b, b, { shot($0, $1) }), let o = blockMean(ox, oy, b, b, { shot($0, $1) }) { edge.append(step(i, o)) }
                if let i = blockMean(ix, iy, b, b, onScreen), let o = blockMean(ox, oy, b, b, onScreen) { natural.append(step(i, o)) }
            }
        }

        // Inside error and best shift of the content against the wallpaper's on-screen look.
        func insideError(dx: Int, dy: Int, stride s: Int) -> Double {
            var errs: [Double] = []
            for y in Swift.stride(from: rect.y + 16, to: rect.maxY - 16, by: s) {
                for x in Swift.stride(from: rect.x + 16, to: rect.maxX - 16, by: s) where inScreen(x, y) {
                    let lx = x - rect.x, ly = y - rect.y
                    if (lx < corner || lx >= rect.width - corner) && (ly < corner || ly >= rect.height - corner) { continue }
                    guard let e = onScreen(x - dx, y - dy) else { continue }
                    let v = shot(x, y)
                    errs.append((abs(v[0] - e[0]) + abs(v[1] - e[1]) + abs(v[2] - e[2])) / 3)
                }
            }
            return mean(errs)
        }
        var best = (dx: 0, dy: 0, err: insideError(dx: 0, dy: 0, stride: 6))
        for dy in stride(from: -12, through: 12, by: 2) {
            for dx in stride(from: -12, through: 12, by: 2) where dx != 0 || dy != 0 {
                let e = insideError(dx: dx, dy: dy, stride: 6)
                if e < best.err - 0.05 { best = (dx, dy, e) }
            }
        }
        let coarse = best
        for dy in (coarse.dy - 1)...(coarse.dy + 1) {
            for dx in (coarse.dx - 1)...(coarse.dx + 1) where dx != coarse.dx || dy != coarse.dy {
                let e = insideError(dx: dx, dy: dy, stride: 6)
                if e < best.err - 0.05 { best = (dx, dy, e) }
            }
        }

        // Re-measure the widget colour change: displayed content vs screen, block averages.
        var measured: ColorMap?
        if let content, content.width == rect.width, content.height == rect.height {
            var src: [[Double]] = [], dst: [[Double]] = []
            for y in stride(from: corner, to: rect.height - corner, by: 30) {
                for x in stride(from: corner, to: rect.width - corner, by: 30) {
                    guard let s = blockMean(rect.x + x, rect.y + y, 24, 24, { shot($0, $1) }) else { continue }
                    var c = [0.0, 0.0, 0.0], n = 0.0
                    for yy in stride(from: y, to: y + 24, by: 2) {
                        for xx in stride(from: x, to: x + 24, by: 2) {
                            let p = content.pixel(xx, yy)
                            c[0] += Double(p.r); c[1] += Double(p.g); c[2] += Double(p.b); n += 1
                        }
                    }
                    src.append(c.map { $0 / n }); dst.append(s)
                }
            }
            measured = ColorMap.fit(source: src, screen: dst)
        }

        return AlignmentReport(edgeStep: median(edge), naturalEdgeStep: median(natural),
                               insideError: insideError(dx: 0, dy: 0, stride: 6),
                               bestShiftX: best.dx, bestShiftY: best.dy, measuredWidgetColorMap: measured)
    }

    static func median(_ v: [Double]) -> Double {
        guard !v.isEmpty else { return .nan }
        let s = v.sorted()
        return s.count % 2 == 1 ? s[s.count / 2] : (s[s.count / 2 - 1] + s[s.count / 2]) / 2
    }

    static func mean(_ v: [Double]) -> Double {
        v.isEmpty ? .infinity : v.reduce(0, +) / Double(v.count)
    }
}

enum CalibrationError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self { case .message(let m): return m }
    }
}
