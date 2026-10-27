import XCTest
@testable import PixelAquarium

final class CalibrationTests: XCTestCase {
    private let screen = PixelSize(width: 600, height: 1200)

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
        shot.fillRect(x: widget.x, y: widget.y, width: widget.width, height: widget.height, .calibrationMagenta)
        shot.fillRect(x: widget.x + 200, y: widget.y + 200, width: 40, height: 3, RGBA(r: 255, g: 255, b: 255))

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
        shot.fillRect(x: 73, y: 643, width: 454, height: 414, .calibrationMagenta)
        let d = CalibrationManager.detect(screenshot: shot, wallpaperSize: screen,
                                          expectedWidgetSize: PixelSize(width: 460, height: 420))
        XCTAssertEqual(d.widgetRect, PixelRect(x: 70, y: 640, width: 460, height: 420))
    }

    /// Midnight Manor: the Large widget shows a magenta border, the Medium one cyan; both are found.
    func testFindsLargeAndMediumWidgets() {
        var shot = WallpaperRenderer.calibrationWallpaper(size: screen)
        shot.fillRect(x: 40, y: 120, width: 520, height: 240, .calibrationCyan)
        shot.fillRect(x: 40, y: 420, width: 520, height: 520, .calibrationMagenta)
        XCTAssertEqual(CalibrationManager.detectWidgetRect(in: shot, color: .calibrationCyan), PixelRect(x: 40, y: 120, width: 520, height: 240))
        XCTAssertEqual(CalibrationManager.detectWidgetRect(in: shot, color: .calibrationMagenta), PixelRect(x: 40, y: 420, width: 520, height: 520))
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
