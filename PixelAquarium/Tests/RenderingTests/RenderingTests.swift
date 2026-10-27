import XCTest
@testable import PixelAquarium

final class RenderingTests: XCTestCase {
    private let screen = PixelSize(width: 600, height: 1200)

    private func profile(rect: PixelRect) -> CalibrationProfile {
        let device = DeviceInfo(modelIdentifier: "test", modelName: "test", osVersion: "test", screenPixelSize: screen,
                                screenPointSize: PixelSize(width: 200, height: 400), displayScale: 3, appearance: "light")
        return CalibrationProfile(device: device, widgetBounds: rect, appearance: "light")
    }

    func testFrameCompositeHasTransparentBackgroundAndOpaqueFish() throws {
        let engine = try AquariumAnimationEngine.load()
        let frame = try PixelArtRenderer(clip: engine.clip).frame(engine.clip.posterFrame)
        XCTAssertEqual(frame.width, engine.clip.canvasWidth)
        XCTAssertEqual(frame.height, engine.clip.canvasHeight)
        var opaque = 0, transparent = 0
        for y in 0..<frame.height {
            for x in 0..<frame.width {
                let a = frame.pixel(x, y).a
                if a == 255 { opaque += 1 } else if a == 0 { transparent += 1 } else { XCTFail("partial alpha at \(x),\(y)") }
            }
        }
        XCTAssertGreaterThan(opaque, 100)
        XCTAssertGreaterThan(transparent, opaque * 10)
    }

    func testCanvasLayoutUsesWholeDevicePixelsPerArtPixel() {
        let rect = FishCanvasLayout.rect(widgetSize: CGSize(width: 364, height: 382),
                                         region: NormalizedRect(x: 0.06, y: 0.14, width: 0.88, height: 0.72),
                                         canvasWidth: 96, canvasHeight: 60, displayScale: 3)
        let pxPerArtPixel = rect.width * 3 / 96
        XCTAssertEqual(pxPerArtPixel, pxPerArtPixel.rounded(), accuracy: 1e-9)
        XCTAssertEqual(rect.height * 3 / 60, pxPerArtPixel, accuracy: 1e-9)
        XCTAssertEqual((rect.minX * 3), (rect.minX * 3).rounded(), accuracy: 1e-9)
        XCTAssertLessThanOrEqual(rect.width, 364 * 0.88 + 0.001)
    }

    func testWidgetBackgroundIsExactWallpaperCrop() {
        let wallpaper = WallpaperRenderer.calibrationWallpaper(size: screen)
        let rect = PixelRect(x: 33, y: 701, width: 120, height: 90)
        let bg = WidgetBackgroundRenderer.background(wallpaper: wallpaper, profile: profile(rect: rect))
        XCTAssertEqual(bg.width, 120)
        XCTAssertEqual(bg.height, 90)
        XCTAssertEqual(bg.data, wallpaper.cropped(rect).data)
    }

    func testBackgroundPrecompensatesWidgetColours() {
        let wallpaper = PixelBuffer(width: 10, height: 10, fill: RGBA(r: 100, g: 100, b: 100))
        var p = profile(rect: PixelRect(x: 0, y: 0, width: 10, height: 10))
        p.wallpaperColorMap = ColorMap(scale: [1.2, 1, 1], offset: [10, 0, 0])   // screen shows wallpaper R as 130
        p.widgetColorMap = ColorMap(scale: [2.5, 1, 1.5], offset: [30, 20, 40])  // iOS lightens widget content
        let px = WidgetBackgroundRenderer.background(wallpaper: wallpaper, profile: p).pixel(5, 5)
        // Content c must satisfy widgetMap(c) == wallpaperMap(file): R (130-30)/2.5=40, G 80, B 40.
        XCTAssertEqual(px, RGBA(r: 40, g: 80, b: 40))
    }

    /// iOS-like Home Screen: wallpaper zoomed and recoloured, widget content recoloured differently.
    static func homeScreen(wallpaper: PixelBuffer, transform t: WallpaperTransform, wallpaperMap g: ColorMap,
                           widget rect: PixelRect, content: (Int, Int) -> RGBA, widgetMap m: ColorMap) -> PixelBuffer {
        var out = PixelBuffer(width: wallpaper.width, height: wallpaper.height)
        func map(_ c: RGBA, _ f: ColorMap) -> RGBA {
            func ch(_ v: UInt8, _ i: Int) -> UInt8 { UInt8(max(0, min(255, f.apply(Double(v), channel: i).rounded()))) }
            return RGBA(r: ch(c.r, 0), g: ch(c.g, 1), b: ch(c.b, 2))
        }
        for y in 0..<out.height {
            for x in 0..<out.width {
                if x >= rect.x, x < rect.maxX, y >= rect.y, y < rect.maxY {
                    out.set(x, y, map(content(x - rect.x, y - rect.y), m))
                } else {
                    let p = t.toWallpaper(CGPoint(x: Double(x) + 0.5, y: Double(y) + 0.5))
                    let wx = min(max(Int(p.x), 0), wallpaper.width - 1), wy = min(max(Int(p.y), 0), wallpaper.height - 1)
                    out.set(x, y, map(wallpaper.pixel(wx, wy), g))
                }
            }
        }
        return out
    }

    /// Full pipeline: calibration screenshot → profile → background → screenshot of the result
    /// has no visible edge.
    func testCalibrateThenBackgroundIsSeamless() throws {
        // The real aquarium art (non-repeating, no fiducials: exercises registration).
        let art = try XCTUnwrap(SceneBundle.wallpaperArtURL().flatMap(PixelBuffer.load(url:)))
        let wallpaper = WallpaperRenderer.sceneWallpaper(art: art, screen: screen, pxPerArtPixel: 5)
        let truth = WallpaperTransform(scale: 1.1, translationX: -32, translationY: -70)
        let wallMap = ColorMap(scale: [1.2, 0.98, 0.97], offset: [12, 0, 0])
        let widgetMap = ColorMap(scale: [2.0, 1.2, 1.4], offset: [30, 20, 35])
        let rect = PixelRect(x: 60, y: 600, width: 480, height: 480)
        let pointSize = CGSize(width: 160, height: 160)

        let chart: (Int, Int) -> RGBA = { x, y in
            let pt = CGPoint(x: Double(x) / 3, y: Double(y) / 3)
            for i in CalibrationChart.colors.indices where CalibrationChart.patchRect(i, widgetSize: pointSize).contains(pt) {
                return CalibrationChart.colors[i]
            }
            return .calibrationMagenta
        }
        let calShot = Self.homeScreen(wallpaper: wallpaper, transform: truth, wallpaperMap: wallMap,
                                      widget: rect, content: chart, widgetMap: widgetMap)
        let cal = try CalibrationManager.calibrate(screenshot: calShot, wallpaper: wallpaper, widgetPointSize: pointSize, displayScale: 3)
        XCTAssertEqual(cal.widgetRect, rect)
        XCTAssertEqual(cal.transform.scale, 1.1, accuracy: 0.002)
        XCTAssertEqual(cal.transform.translationX, -32, accuracy: 2)
        XCTAssertEqual(cal.transform.translationY, -70, accuracy: 2)
        for c in 0..<3 {
            XCTAssertEqual(cal.widgetColorMap.scale[c], widgetMap.scale[c], accuracy: 0.03)
            XCTAssertEqual(cal.wallpaperColorMap.scale[c], wallMap.scale[c], accuracy: 0.05)
        }
        XCTAssertLessThan(cal.wallpaperResidual, 8)

        var p = profile(rect: cal.widgetRect)
        p.wallpaperTransform = cal.transform
        p.wallpaperColorMap = cal.wallpaperColorMap
        p.widgetColorMap = cal.widgetColorMap
        let bg = WidgetBackgroundRenderer.background(wallpaper: wallpaper, profile: p)
        let finalShot = Self.homeScreen(wallpaper: wallpaper, transform: truth, wallpaperMap: wallMap,
                                        widget: rect, content: { bg.pixel($0, $1) }, widgetMap: widgetMap)
        let report = CalibrationManager.analyzeAlignment(screenshot: finalShot, wallpaper: wallpaper, content: bg, profile: p)
        XCTAssertLessThanOrEqual(report.edgeStep, report.naturalEdgeStep + 3, report.summary)
        XCTAssertEqual(report.bestShiftX, 0, report.summary)
        XCTAssertEqual(report.bestShiftY, 0, report.summary)

        // Without colour compensation the edge is visible: the check must say so.
        var naive = p
        naive.widgetColorMap = .identity
        naive.wallpaperColorMap = .identity
        let naiveBg = WidgetBackgroundRenderer.background(wallpaper: wallpaper, profile: naive)
        let naiveShot = Self.homeScreen(wallpaper: wallpaper, transform: truth, wallpaperMap: wallMap,
                                        widget: rect, content: { naiveBg.pixel($0, $1) }, widgetMap: widgetMap)
        let bad = CalibrationManager.analyzeAlignment(screenshot: naiveShot, wallpaper: wallpaper, content: naiveBg, profile: p)
        XCTAssertFalse(bad.looksSeamless)
        XCTAssertEqual(bad.measuredWidgetColorMap?.scale[1] ?? 0, 1.2, accuracy: 0.1)
    }

    /// Tank style: with iOS zooming the wallpaper, the stand's top edge must still appear on
    /// screen just under the widget (hidden by at most the 2-art-px overlap).
    func testStandLandsUnderZoomedWidget() throws {
        let room = try XCTUnwrap(SceneBundle.assetURL(\.roomAsset).flatMap(PixelBuffer.load(url:)))
        let stand = try XCTUnwrap(SceneBundle.assetURL(\.standAsset).flatMap(PixelBuffer.load(url:)))
        let phone = PixelSize(width: 1320, height: 2868), k = 9
        let widget = PixelRect(x: 75, y: 901, width: 1170, height: 1170)
        let zoom = WallpaperTransform(scale: 1.118, translationX: -85, translationY: -268)
        let with = WallpaperRenderer.roomWallpaper(room: room, stand: stand, screen: phone, pxPerArtPixel: k,
                                                   widgetRect: widget, transform: zoom)
        let plain = WallpaperRenderer.sceneWallpaper(art: room, screen: phone, pxPerArtPixel: k)
        // First screen row (below the widget's top) at the widget's centre column showing the stand.
        let cx = Double(widget.x + widget.width / 2)
        var standTop: Int?
        for y in widget.y..<phone.height {
            let p = zoom.toWallpaper(CGPoint(x: cx, y: Double(y) + 0.5))
            if with.pixel(Int(p.x), Int(p.y)) != plain.pixel(Int(p.x), Int(p.y)) { standTop = y; break }
        }
        let top = try XCTUnwrap(standTop)
        let artPxOnScreen = Double(k) * zoom.scale
        XCTAssertLessThanOrEqual(top, widget.maxY, "gap between tank and stand")
        XCTAssertGreaterThanOrEqual(Double(top), Double(widget.maxY) - 3 * artPxOnScreen, "stand too high")
    }

    func testTankBackgroundCompensatesWidgetTint() {
        let art = PixelBuffer(width: 2, height: 2, fill: RGBA(r: 80, g: 100, b: 120))
        let bg = WidgetBackgroundRenderer.tank(art: art, size: PixelSize(width: 10, height: 10),
                                               widgetColorMap: ColorMap(scale: [2, 1.25, 1.5], offset: [20, 0, 0]))
        XCTAssertEqual(bg.width, 10)
        XCTAssertEqual(bg.pixel(9, 9), RGBA(r: 30, g: 80, b: 80))
    }

    /// The corners iOS rounds off must show the same base colour as the widget shows next to them.
    func testRoomUnderlayMatchesWidgetAtRoundedCorners() throws {
        let room = try XCTUnwrap(SceneBundle.assetURL(\.roomAsset).flatMap(PixelBuffer.load(url:)))
        let stand = try XCTUnwrap(SceneBundle.assetURL(\.standAsset).flatMap(PixelBuffer.load(url:)))
        let tank = try XCTUnwrap(SceneBundle.assetURL(\.tankAsset).flatMap(PixelBuffer.load(url:)))
        let phone = PixelSize(width: 1320, height: 2868)
        let widget = PixelRect(x: 75, y: 901, width: 1170, height: 1170)
        let zoom = WallpaperTransform(scale: 1.118, translationX: -85, translationY: -268)
        let wallMap = ColorMap(scale: [1.21, 0.98, 0.97], offset: [13, 0, 0])
        let widgetMap = ColorMap(scale: [2.55, 1.23, 1.46], offset: [30, 20, 38])
        let wallpaper = WallpaperRenderer.roomWallpaper(room: room, stand: stand, screen: phone, pxPerArtPixel: 9,
                                                        widgetRect: widget, transform: zoom, tank: tank, wallpaperColorMap: wallMap)
        let bg = WidgetBackgroundRenderer.tank(art: tank, size: PixelSize(width: 1170, height: 1170), widgetColorMap: widgetMap)
        func shown(_ c: RGBA, _ m: ColorMap) -> [Double] {
            [m.apply(Double(c.r), channel: 0), m.apply(Double(c.g), channel: 1), m.apply(Double(c.b), channel: 2)]
        }
        // Bottom-left corner pixel (clipped by iOS) vs the widget pixel just inside the curve.
        for (sx, sy) in [(widget.x + 5, widget.maxY - 20), (widget.maxX - 6, widget.maxY - 12)] {
            let w = zoom.toWallpaper(CGPoint(x: Double(sx) + 0.5, y: Double(sy) + 0.5))
            let underlay = shown(wallpaper.pixel(Int(w.x), Int(w.y)), wallMap)
            let widgetPx = shown(bg.pixel(sx - widget.x + 40, sy - widget.y), widgetMap)
            for c in 0..<3 { XCTAssertEqual(underlay[c], widgetPx[c], accuracy: 6, "channel \(c) at \(sx),\(sy)") }
        }
    }
}
