import CoreGraphics
import Foundation

/// Static wallpaper generation. Phase 0 ships only the calibration wallpaper; the cozy-room
/// scene is drawn around the calibrated widget slot once the feasibility gates pass (PRD 2.3).
enum WallpaperRenderer {
    static let fiducialSide = 30

    /// Room wallpaper with the stand pasted (at art resolution) right under the widget, so the
    /// tank-widget stands on it. `widgetRect` is in screen pixels; nil uses a default spot.
    /// With `tank`, the tank is also painted under the widget in exact screen alignment, so the
    /// corners iOS rounds off show the tank's square base instead of the wall. The result is
    /// pre-compensated by `wallpaperColorMap` so the room shows its designed colours, matching
    /// the (also compensated) widget.
    static func roomWallpaper(room: PixelBuffer, stand: PixelBuffer?, screen: PixelSize, pxPerArtPixel k: Int,
                              widgetRect: PixelRect?, transform: WallpaperTransform,
                              underlays: [(art: PixelBuffer, rect: PixelRect)] = [], wallpaperColorMap: ColorMap = .identity) -> PixelBuffer {
        let ox = (room.width * k - screen.width) / 2, oy = (room.height * k - screen.height) / 2
        var centerX = Double(room.width) / 2, bottom = Double(room.height) * 0.72
        if let r = widgetRect {
            let w = transform.toWallpaper(r.cgRect)                 // screen px -> wallpaper px
            centerX = (Double(w.midX) + Double(ox)) / Double(k)     // wallpaper px -> art px
            bottom = (Double(w.maxY) + Double(oy)) / Double(k)
        }
        var art = room
        // 2 art px of overlap: the opaque widget hides the stand's top edge, so small
        // calibration errors never open a gap between tank and stand.
        if let stand { art.blit(stand, x: Int((centerX - Double(stand.width) / 2).rounded()), y: Int(bottom.rounded()) - 2) }
        var out = sceneWallpaper(art: art, screen: screen, pxPerArtPixel: k)
        for (tank, r) in underlays {
            let area = transform.toWallpaper(r.cgRect).insetBy(dx: -2, dy: -2)
            for wy in max(0, Int(area.minY))..<min(out.height, Int(area.maxY) + 1) {
                for wx in max(0, Int(area.minX))..<min(out.width, Int(area.maxX) + 1) {
                    let p = transform.toScreen(CGPoint(x: Double(wx) + 0.5, y: Double(wy) + 0.5))
                    let lx = p.x - Double(r.x), ly = p.y - Double(r.y)
                    guard lx >= 0, ly >= 0, lx < Double(r.width), ly < Double(r.height) else { continue }
                    let c = tank.pixel(Int(lx * Double(tank.width) / Double(r.width)), Int(ly * Double(tank.height) / Double(r.height)))
                    if c.a >= 128 { out.set(wx, wy, RGBA(r: c.r, g: c.g, b: c.b)) }
                }
            }
        }
        if wallpaperColorMap != .identity { out.applyColorMap(wallpaperColorMap.inverse) }
        return out
    }

    /// Scene wallpaper: the art upscaled by whole device pixels per art pixel (nearest
    /// neighbour) and centre-cropped to the screen. Same art + same screen = same bytes, so
    /// the stored copy used for widget crops always matches what was applied.
    static func sceneWallpaper(art: PixelBuffer, screen: PixelSize, pxPerArtPixel: Int) -> PixelBuffer {
        let k = max(1, pxPerArtPixel)
        let ox = (art.width * k - screen.width) / 2, oy = (art.height * k - screen.height) / 2
        var out = PixelBuffer(width: screen.width, height: screen.height, fill: RGBA(r: 0, g: 0, b: 0))
        for y in 0..<screen.height {
            let ay = (y + oy) / k
            guard ay >= 0, ay < art.height else { continue }
            for x in 0..<screen.width {
                let ax = (x + ox) / k
                guard ax >= 0, ax < art.width else { continue }
                let c = art.pixel(ax, ay)
                out.set(x, y, RGBA(r: c.r, g: c.g, b: c.b))
            }
        }
        return out
    }

    /// Known fiducial centres in wallpaper pixels: near the left/right edges (outside the
    /// icon grid and widget columns), at 25 % and 80 % of the height.
    static func fiducialCenters(size: PixelSize) -> [CGPoint] {
        let inset = 26.0
        let w = Double(size.width), h = Double(size.height)
        return [
            CGPoint(x: inset, y: (h * 0.25).rounded()),
            CGPoint(x: w - inset, y: (h * 0.25).rounded()),
            CGPoint(x: inset, y: (h * 0.80).rounded()),
            CGPoint(x: w - inset, y: (h * 0.80).rounded()),
        ]
    }

    /// Textured gradient with grid lines and four pure-green fiducials. Every region is
    /// visually distinct, so crop offsets and tint changes are easy to spot and to measure.
    /// Palette is chosen so no wallpaper pixel matches either detector: red stays below 180
    /// (never calibration magenta) and blue stays high relative to green (never fiducial green).
    static func calibrationWallpaper(size: PixelSize) -> PixelBuffer {
        let w = size.width, h = size.height
        var buf = PixelBuffer(width: w, height: h)
        buf.data.withUnsafeMutableBufferPointer { p in
            for y in 0..<h {
                let fy = Double(y) / Double(h)
                for x in 0..<w {
                    let fx = Double(x) / Double(w)
                    var r = 70 + 90 * fx
                    var g = 70 + 50 * fy
                    var b = 150 - 40 * fx + 30 * fy
                    let checker = ((x / 8) + (y / 8)) % 2 == 0 ? 14.0 : -14.0
                    var add = checker
                    if x % 300 < 4 || y % 300 < 4 {
                        add = 90
                    } else if x % 60 < 2 || y % 60 < 2 {
                        add = 45
                    }
                    r += add; g += add; b += add
                    let i = (y * w + x) * 4
                    p[i] = UInt8(max(0, min(255, r)))
                    p[i + 1] = UInt8(max(0, min(255, g)))
                    p[i + 2] = UInt8(max(0, min(255, b)))
                    p[i + 3] = 255
                }
            }
        }
        let half = fiducialSide / 2
        for c in fiducialCenters(size: size) {
            buf.fillRect(x: Int(c.x) - half - 4, y: Int(c.y) - half - 4, width: fiducialSide + 8, height: fiducialSide + 8,
                         RGBA(r: 10, g: 10, b: 20))
            buf.fillRect(x: Int(c.x) - half, y: Int(c.y) - half, width: fiducialSide, height: fiducialSide, .fiducialGreen)
        }
        return buf
    }
}

/// Produces the widget's own background: the wallpaper region under the widget (PRD FR-05).
enum WidgetBackgroundRenderer {
    /// Samples `wallpaper` under the calibrated widget rect (screen pixels), nearest-neighbour,
    /// then pre-compensates colours: content = widget⁻¹(wallpaperMap(file)), so after iOS
    /// alters the widget it shows what iOS shows for the wallpaper next to it.
    static func background(wallpaper: PixelBuffer, profile: CalibrationProfile, rect: PixelRect? = nil) -> PixelBuffer {
        let rect = rect ?? profile.widgetBoundsPixels
        let t = profile.wallpaperTransform
        let map = profile.wallpaperColorMap.then(profile.widgetColorMap.inverse)
        var out = PixelBuffer(width: rect.width, height: rect.height)
        for oy in 0..<rect.height {
            for ox in 0..<rect.width {
                let s = CGPoint(x: Double(rect.x + ox) + 0.5, y: Double(rect.y + oy) + 0.5)
                let p = t.toWallpaper(s)
                let wx = Int(p.x.rounded(.down)), wy = Int(p.y.rounded(.down))
                guard wx >= 0, wy >= 0, wx < wallpaper.width, wy < wallpaper.height else { continue }
                let c = wallpaper.pixel(wx, wy)
                out.set(ox, oy, RGBA(r: apply(c.r, map, 0), g: apply(c.g, map, 1), b: apply(c.b, map, 2)))
            }
        }
        return out
    }

    /// Tank style: the tank art scaled (nearest) to the widget's pixel size, with the measured
    /// iOS widget colour change pre-compensated so it shows the intended colours. Where the art
    /// is transparent (outside the lid's rounded corners) `wall` shows through: the calibrated
    /// wallpaper crop, so those pixels look like the wall around the widget.
    static func tank(art: PixelBuffer, size: PixelSize, widgetColorMap: ColorMap, wall: PixelBuffer? = nil) -> PixelBuffer {
        let map = widgetColorMap.inverse
        var out = wall.flatMap { $0.width == size.width && $0.height == size.height ? $0 : nil }
            ?? PixelBuffer(width: size.width, height: size.height, fill: RGBA(r: 77, g: 54, b: 64))
        for y in 0..<size.height {
            let ay = min(art.height - 1, y * art.height / size.height)
            for x in 0..<size.width {
                let c = art.pixel(min(art.width - 1, x * art.width / size.width), ay)
                guard c.a >= 128 else { continue }
                out.set(x, y, RGBA(r: apply(c.r, map, 0), g: apply(c.g, map, 1), b: apply(c.b, map, 2)))
            }
        }
        return out
    }

    private static func apply(_ v: UInt8, _ map: ColorMap, _ c: Int) -> UInt8 {
        UInt8(max(0, min(255, map.apply(Double(v), channel: c).rounded())))
    }
}
