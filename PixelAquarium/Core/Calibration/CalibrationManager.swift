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

    /// Bounding box of a calibration border (magenta = Large, cyan = Medium, yellow = Small).
    /// A pixel matches when the colour's 255-channels are high and its 0-channels low. The
    /// border is the largest connected ring of matching pixels: chart patches that happen to
    /// look like a border colour are small solid blocks, and stray pixels (brass, eyes) are tiny,
    /// so a candidate must be at least `minSide` px each way and mostly empty inside.
    static func detectWidgetRect(in img: PixelBuffer, color: RGBA = .calibrationMagenta, minSide: Int = 300) -> PixelRect? {
        let step = 3, gw = img.width / step, gh = img.height / step
        let want = [color.r, color.g, color.b].map { $0 > 127 }
        var mask = [Bool](repeating: false, count: gw * gh)
        for gy in 0..<gh {
            for gx in 0..<gw {
                let c = img.pixel(gx * step + 1, gy * step + 1)
                let v = [Int(c.r), Int(c.g), Int(c.b)]
                let highs = (0..<3).filter { want[$0] }.map { v[$0] }
                mask[gy * gw + gx] = (0..<3).allSatisfy({ want[$0] ? v[$0] > 180 : v[$0] < 80 }) && (highs.max()! - highs.min()!) < 60
            }
        }
        var seen = [Bool](repeating: false, count: gw * gh)
        var best: (box: PixelRect, count: Int)?
        for start in 0..<(gw * gh) where mask[start] && !seen[start] {
            var stack = [start], count = 0, x0 = gw, y0 = gh, x1 = -1, y1 = -1
            seen[start] = true
            while let i = stack.popLast() {
                count += 1
                let x = i % gw, y = i / gw
                x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
                for (nx, ny) in [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)] where nx >= 0 && ny >= 0 && nx < gw && ny < gh {
                    let j = ny * gw + nx
                    if mask[j] && !seen[j] { seen[j] = true; stack.append(j) }
                }
            }
            let w = x1 - x0 + 1, h = y1 - y0 + 1
            guard w * step >= minSide, h * step >= minSide, Double(count) < 0.7 * Double(w * h) else { continue }
            if count > best?.count ?? 0 {
                best = (PixelRect(x: x0 * step, y: y0 * step, width: w * step, height: h * step), count)
            }
        }
        return best.map { refineEdges($0.box, in: img, want: want) }
    }

    /// True when a pixel is in a calibration border colour.
    static func isBorder(_ c: RGBA, _ color: RGBA) -> Bool {
        let want = [color.r, color.g, color.b].map { $0 > 127 }, v = [Int(c.r), Int(c.g), Int(c.b)]
        let highs = (0..<3).filter { want[$0] }.map { v[$0] }
        return (0..<3).allSatisfy { want[$0] ? v[$0] > 180 : v[$0] < 80 } && (highs.max()! - highs.min()!) < 60
    }

    /// The shape iOS cuts the widget's corners to, measured on its top-left corner: for each row
    /// from the top, how many px in from the left edge the widget starts (rows until it reaches
    /// the edge). iOS uses a continuous ("squircle") corner, so it is measured, not assumed.
    static func cornerInsets(in img: PixelBuffer, rect: PixelRect, color: RGBA, maxRadius: Int = 160) -> [Int] {
        var out: [Int] = []
        for dy in 0..<min(maxRadius, rect.height / 2) {
            let y = rect.y + dy
            guard y >= 0, y < img.height else { break }
            var inset = maxRadius
            for dx in 0..<min(maxRadius, rect.width / 2) where rect.x + dx >= 0 && rect.x + dx < img.width {
                if isBorder(img.pixel(rect.x + dx, y), color) { inset = dx; break }
            }
            if inset == maxRadius { if out.isEmpty { continue } else { break } }
            out.append(inset)
            if inset <= 0 { break }
        }
        // the first rows may miss the top edge by a pixel: start the curve at its widest
        if let first = out.first, first < (out.max() ?? first) { out[0] = out.max()! }
        return out
    }

    /// Exact pixel edges around a coarse box: outermost rows/columns (within 6 px of it) that
    /// are mostly border-coloured.
    private static func refineEdges(_ box: PixelRect, in img: PixelBuffer, want: [Bool]) -> PixelRect {
        func matches(_ x: Int, _ y: Int) -> Bool {
            guard x >= 0, y >= 0, x < img.width, y < img.height else { return false }
            let c = img.pixel(x, y), v = [Int(c.r), Int(c.g), Int(c.b)]
            return (0..<3).allSatisfy { want[$0] ? v[$0] > 180 : v[$0] < 80 }
        }
        func rowHit(_ y: Int) -> Bool { stride(from: box.x + box.width / 4, to: box.maxX - box.width / 4, by: 4).filter { matches($0, y) }.count > box.width / 16 }
        func colHit(_ x: Int) -> Bool { stride(from: box.y + box.height / 4, to: box.maxY - box.height / 4, by: 4).filter { matches(x, $0) }.count > box.height / 16 }
        let top = ((box.y - 6)...(box.y + 6)).first(where: rowHit) ?? box.y
        let bottom = ((box.maxY - 7)...(box.maxY + 5)).reversed().first(where: rowHit) ?? box.maxY - 1
        let left = ((box.x - 6)...(box.x + 6)).first(where: colHit) ?? box.x
        let right = ((box.maxX - 7)...(box.maxX + 5)).reversed().first(where: colHit) ?? box.maxX - 1
        return PixelRect(x: left, y: top, width: right - left + 1, height: bottom - top + 1)
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
        /// Every widget found, by role. `widgetRect` is the first of Large, Medium, Small.
        var rects: [WidgetRole: PixelRect]
        /// iOS's corner curve for each widget (see `cornerInsets`).
        var corners: [WidgetRole: [Int]] = [:]
    }

    /// One screenshot does everything: every widget in Calibration mode (coloured border + colour
    /// chart) over the generated wallpaper. `pointSizes` are the widgets' reported sizes.
    static func calibrate(screenshot: PixelBuffer, wallpaper: PixelBuffer, pointSizes: [WidgetRole: CGSize],
                          displayScale: Double) throws -> Calibration {
        func pixels(_ s: CGSize) -> PixelSize { PixelSize(width: Int((s.width * displayScale).rounded()), height: Int((s.height * displayScale).rounded())) }
        var rects: [WidgetRole: PixelRect] = [:]
        for role in WidgetRole.allCases {
            guard let box = detectWidgetRect(in: screenshot, color: role.calibrationColor) else { continue }
            // A box that doesn't match the widget's own reported size is not that widget.
            if let size = pointSizes[role].map(pixels), abs(box.width - size.width) > 16 || abs(box.height - size.height) > 16 { continue }
            rects[role] = snap(box, to: pointSizes[role].map(pixels))
        }
        guard let chartRole = WidgetRole.allCases.first(where: { rects[$0] != nil }), let rect = rects[chartRole] else {
            throw CalibrationError.message("No calibration widget was found. Tap \"Show calibration chart\", wait until the widgets show the colour chart with a coloured border, then take the screenshot.")
        }
        let widgets = WidgetRole.allCases.compactMap { rects[$0] }

        // Green fiducials only exist in the calibration grid; in the aquarium, green weeds
        // near the edges would be mistaken for them.
        let wallSize = PixelSize(width: wallpaper.width, height: wallpaper.height)
        let hasFiducials = WallpaperRenderer.fiducialCenters(size: wallSize).allSatisfy { wallpaper.pixel(Int($0.x), Int($0.y)) == .fiducialGreen }
        let d = hasFiducials ? detect(screenshot: screenshot, wallpaperSize: wallSize) : Detection(widgetRect: nil, fiducialsFound: 0, transform: nil)
        var transform = d.transform ?? .identity
        var score: Double?
        if d.transform == nil {
            let r = WallpaperRegistration.register(screenshot: screenshot, wallpaper: wallpaper, exclude: widgets)
            transform = r.transform
            score = r.score
        }
        let wallMap = WallpaperRegistration.fitWallpaperColors(screenshot: screenshot, wallpaper: wallpaper,
                                                               transform: transform, exclude: widgets) ?? .identity
        let pointSize = pointSizes[chartRole] ?? CGSize(width: Double(rect.width) / displayScale, height: Double(rect.height) / displayScale)
        let observed = CalibrationChart.readPatches(screenshot: screenshot, widgetRect: rect, widgetPointSize: pointSize)
        let widgetMap = CalibrationChart.fitWidgetMap(observed: observed) ?? .identity
        let residual = wallpaperResidual(screenshot: screenshot, wallpaper: wallpaper, transform: transform, map: wallMap, exclude: widgets)
        var corners: [WidgetRole: [Int]] = [:]
        for (role, r) in rects { corners[role] = cornerInsets(in: screenshot, rect: r, color: role.calibrationColor) }
        return Calibration(widgetRect: rect, transform: transform, registrationScore: score, fiducialsFound: d.fiducialsFound,
                           wallpaperColorMap: wallMap, widgetColorMap: widgetMap, wallpaperResidual: residual, rects: rects, corners: corners)
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
