import XCTest
@testable import PixelAquarium

final class CalibrationTests: XCTestCase {
    private let screen = PixelSize(width: 600, height: 1200)

    /// A widget in Calibration mode: border-coloured ring (16 pt = 48 px) around chart content.
    private func drawWidget(_ img: inout PixelBuffer, _ r: PixelRect, _ color: RGBA) {
        img.fillRect(x: r.x, y: r.y, width: r.width, height: r.height, color)
        img.fillRect(x: r.x + 48, y: r.y + 48, width: r.width - 96, height: r.height - 96, RGBA(r: 105, g: 150, b: 60))
    }

    func testNormalization() {
        let r = PixelRect(x: 60, y: 600, width: 480, height: 300)
        let n = r.normalized(in: screen)
        XCTAssertEqual(n.x, 0.1, accuracy: 1e-9)
        XCTAssertEqual(n.y, 0.5, accuracy: 1e-9)
        XCTAssertEqual(n.width, 0.8, accuracy: 1e-9)
        XCTAssertEqual(n.height, 0.25, accuracy: 1e-9)
    }

    func testTransformSolveRecoversScaleAndOffset() throws {
        let truth = WallpaperTransform(scale: 1.05, translationX: -12, translationY: 7.5)
        let wall = WallpaperRenderer.fiducialCenters(size: screen)
        let shown = wall.map(truth.toScreen)
        let solved = try XCTUnwrap(WallpaperTransform.solve(wallpaper: wall, screen: shown))
        XCTAssertEqual(solved.scale, 1.05, accuracy: 1e-9)
        XCTAssertEqual(solved.translationX, -12, accuracy: 1e-6)
        XCTAssertEqual(solved.translationY, 7.5, accuracy: 1e-6)
        let p = CGPoint(x: 100, y: 200)
        let back = solved.toWallpaper(solved.toScreen(p))
        XCTAssertEqual(back.x, p.x, accuracy: 1e-9)
        XCTAssertEqual(back.y, p.y, accuracy: 1e-9)
    }

    /// End-to-end on a synthetic screenshot: calibration wallpaper shown 1:1 with a magenta
    /// widget on top must yield the exact widget rect and an identity transform.
    func testDetectionOnSyntheticScreenshot() throws {
        var shot = WallpaperRenderer.calibrationWallpaper(size: screen)
        let widget = PixelRect(x: 70, y: 640, width: 460, height: 420)
        drawWidget(&shot, widget, .calibrationMagenta)

        let d = CalibrationManager.detect(screenshot: shot, wallpaperSize: screen)
        XCTAssertEqual(d.widgetRect, widget)
        XCTAssertEqual(d.fiducialsFound, 4)
        let t = try XCTUnwrap(d.transform)
        XCTAssertEqual(t.scale, 1, accuracy: 0.002)
        XCTAssertEqual(t.translationX, 0, accuracy: 0.5)
        XCTAssertEqual(t.translationY, 0, accuracy: 0.5)
    }

    /// iOS softens ~3 px at widget edges (iPhone19,7: magenta box 1164 px for a 1170 px widget);
    /// the known widget size is centred on the box instead.
    func testDetectionSnapsToReportedWidgetSize() {
        var shot = WallpaperRenderer.calibrationWallpaper(size: screen)
        drawWidget(&shot, PixelRect(x: 73, y: 643, width: 454, height: 414), .calibrationMagenta)
        let d = CalibrationManager.detect(screenshot: shot, wallpaperSize: screen,
                                          expectedWidgetSize: PixelSize(width: 460, height: 420))
        XCTAssertEqual(d.widgetRect, PixelRect(x: 70, y: 640, width: 460, height: 420))
    }

    /// Midnight Manor: the Large widget shows a magenta border, the Medium one cyan; both are found.
    func testFindsLargeAndMediumWidgets() {
        var shot = WallpaperRenderer.calibrationWallpaper(size: screen)
        drawWidget(&shot, PixelRect(x: 40, y: 20, width: 520, height: 340), .calibrationCyan)
        drawWidget(&shot, PixelRect(x: 40, y: 420, width: 520, height: 520), .calibrationMagenta)
        XCTAssertEqual(CalibrationManager.detectWidgetRect(in: shot, color: .calibrationCyan), PixelRect(x: 40, y: 20, width: 520, height: 340))
        XCTAssertEqual(CalibrationManager.detectWidgetRect(in: shot, color: .calibrationMagenta), PixelRect(x: 40, y: 420, width: 520, height: 520))
    }

    /// Yellow-ish pixels elsewhere (brass pulls, cat eyes) must not stretch the Small widget's box.
    func testBorderDetectionIgnoresStrayPixels() {
        var shot = WallpaperRenderer.calibrationWallpaper(size: screen)
        drawWidget(&shot, PixelRect(x: 150, y: 100, width: 400, height: 400), .calibrationYellow)
        for (x, y) in [(20, 900), (580, 1150), (100, 40)] { shot.fillRect(x: x, y: y, width: 3, height: 3, RGBA(r: 228, g: 196, b: 42)) }
        XCTAssertEqual(CalibrationManager.detectWidgetRect(in: shot, color: .calibrationYellow), PixelRect(x: 150, y: 100, width: 400, height: 400))
    }

    /// Haunted theme: Medium + Small charts, no Large widget. Their pink-looking chart patches
    /// must not be taken for a Large widget, and each border is found exactly.
    func testChartPatchesAreNotMistakenForWidgets() {
        let phone = PixelSize(width: 1320, height: 2868)
        var shot = PixelBuffer(width: phone.width, height: phone.height, fill: RGBA(r: 70, g: 50, b: 90))
        func chart(_ rect: PixelRect, _ border: RGBA) {
            shot.fillRect(x: rect.x, y: rect.y, width: rect.width, height: rect.height, border)
            let pt = CGSize(width: Double(rect.width) / 3, height: Double(rect.height) / 3)
            for (i, c) in CalibrationChart.colors.enumerated() {
                let r = CalibrationChart.patchRect(i, widgetSize: pt)
                shot.fillRect(x: rect.x + Int(r.minX * 3), y: rect.y + Int(r.minY * 3), width: Int(r.width * 3) + 1, height: Int(r.height * 3) + 1, c)
            }
        }
        let medium = PixelRect(x: 75, y: 300, width: 1170, height: 552), small = PixelRect(x: 75, y: 920, width: 552, height: 552)
        chart(medium, .calibrationCyan)
        chart(small, .calibrationYellow)
        XCTAssertNil(CalibrationManager.detectWidgetRect(in: shot, color: .calibrationMagenta))
        XCTAssertEqual(CalibrationManager.detectWidgetRect(in: shot, color: .calibrationCyan), medium)
        XCTAssertEqual(CalibrationManager.detectWidgetRect(in: shot, color: .calibrationYellow), small)
    }

    /// The corner curve is measured from the border's rounded corner, row by row.
    func testMeasuresCornerCurve() {
        var shot = PixelBuffer(width: 600, height: 600, fill: RGBA(r: 60, g: 40, b: 50))
        let r = PixelRect(x: 100, y: 100, width: 400, height: 400), radius = 60.0
        for y in r.y..<r.maxY { for x in r.x..<r.maxX {
            let dx = max(0, Double(r.x) + radius - (Double(x) + 0.5)), dy = max(0, Double(r.y) + radius - (Double(y) + 0.5))
            if dx * dx + dy * dy <= radius * radius { shot.set(x, y, .calibrationYellow) }
        } }
        let ins = CalibrationManager.cornerInsets(in: shot, rect: r, color: .calibrationYellow)
        // a 60 px circle: the top pixel row already starts ~52 px in, and the curve meets the side
        // after ~53 rows
        XCTAssertEqual(ins.first ?? 0, 52, accuracy: 2)
        XCTAssertEqual(ins.last ?? 99, 0, accuracy: 1)
        XCTAssertEqual(ins.count, 53, accuracy: 2)
        XCTAssertGreaterThan(ins[10], ins[40])
    }

    func testProfilePersistsAcrossStoreInstances() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let device = DeviceInfo(modelIdentifier: "iPhone18,3", modelName: "iPhone", osVersion: "iOS 27.0",
                                screenPixelSize: screen, screenPointSize: PixelSize(width: 200, height: 400),
                                displayScale: 3, appearance: "light")
        var profile = CalibrationProfile(device: device, widgetBounds: PixelRect(x: 1, y: 2, width: 3, height: 4), appearance: "dark")
        profile.wallpaperTransform = WallpaperTransform(scale: 1.01, translationX: 2, translationY: -3)
        profile.widgetColorMap = ColorMap(scale: [2.5, 1.2, 1.4], offset: [30, 20, 38])

        SharedConfigurationStore(baseURL: dir).profile = profile
        var settings = WidgetSettings()
        settings.mode = .animatedAquarium
        SharedConfigurationStore(baseURL: dir).settings = settings

        let reopened = SharedConfigurationStore(baseURL: dir)
        let loaded = try XCTUnwrap(reopened.profile)
        XCTAssertEqual(loaded.widgetBoundsPixels, profile.widgetBoundsPixels)
        XCTAssertEqual(loaded.widgetBoundsNormalized, profile.widgetBoundsNormalized)
        XCTAssertEqual(loaded.wallpaperTransform, profile.wallpaperTransform)
        XCTAssertEqual(loaded.widgetColorMap, profile.widgetColorMap)
        XCTAssertEqual(reopened.settings.mode, .animatedAquarium)

        reopened.resetCalibration()
        XCTAssertNil(SharedConfigurationStore(baseURL: dir).profile)
        XCTAssertEqual(SharedConfigurationStore(baseURL: dir).settings.mode, .calibration)
    }
}
