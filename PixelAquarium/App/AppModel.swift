import Photos
import SwiftUI
import UIKit
import WidgetKit

@MainActor
final class AppModel: ObservableObject {
    let store = SharedConfigurationStore.shared
    let engine: AquariumAnimationEngine?
    let engineError: String?

    @Published private(set) var settings: WidgetSettings
    @Published private(set) var profile: CalibrationProfile?
    @Published private(set) var alignment: AlignmentReport?
    @Published private(set) var manualTests: [ManualTestRecord]
    @Published private(set) var lastReloadRequest: Date?
    @Published private(set) var backgroundVersion = 0
    @Published var device: DeviceInfo
    @Published var statusMessage: String?

    init() {
        do {
            engine = try AquariumAnimationEngine.load()
            engineError = nil
        } catch {
            engine = nil
            engineError = error.localizedDescription
        }
        settings = store.settings
        profile = store.profile
        alignment = store.alignmentReport
        manualTests = store.manualTests
        lastReloadRequest = store.lastReloadRequest
        device = DeviceInfoProvider.current()
        // Pick up anything written while the app was closed (or by tests).
        requestWidgetReload()
    }

    // MARK: Widget settings

    func update(_ change: (inout WidgetSettings) -> Void) {
        var s = settings
        change(&s)
        settings = s
        store.settings = s
        requestWidgetReload()
    }

    /// Asks WidgetKit for a reload; the system decides when it happens.
    func requestWidgetReload() {
        WidgetCenter.shared.reloadTimelines(ofKind: SharedConfigurationStore.widgetKind)
        let now = Date()
        store.lastReloadRequest = now
        lastReloadRequest = now
    }

    // MARK: Wallpaper

    /// Renders the calibration wallpaper at native screen resolution, keeps a reference copy
    /// in the App Group (used for cropping) and returns a shareable file URL.
    func exportCalibrationWallpaper() async throws -> URL {
        let size = device.screenPixelSize
        let png = await Task.detached { WallpaperRenderer.calibrationWallpaper(size: size).pngData() }.value
        return try storeWallpaper(png, name: "Calibration")
    }

    /// The aquarium scene at native resolution, art pixels = `artPixelPoints` points (same as the fish).
    /// Tank style: room with the stand under the calibrated widget (default spot before
    /// calibration). Seamless style: full-screen water.
    func exportAquariumWallpaper() async throws -> URL {
        let size = device.screenPixelSize
        let k = Int(device.displayScale.rounded()) * (engine?.manifest.artPixelPoints ?? 3)
        if settings.style == .tank {
            guard let room = SceneBundle.assetURL(\.roomAsset).flatMap(PixelBuffer.load(url:)),
                  let stand = SceneBundle.assetURL(\.standAsset).flatMap(PixelBuffer.load(url:)) else {
                throw AppError.message("Room art missing from the app bundle")
            }
            let rect = profile?.widgetBoundsPixels, transform = profile?.wallpaperTransform ?? .identity
            let wallMap = profile?.wallpaperColorMap ?? .identity
            let tank = SceneBundle.assetURL(\.tankAsset).flatMap(PixelBuffer.load(url:))
            let png = await Task.detached {
                WallpaperRenderer.roomWallpaper(room: room, stand: stand, screen: size, pxPerArtPixel: k,
                                                widgetRect: rect, transform: transform,
                                                tank: tank, wallpaperColorMap: wallMap).pngData()
            }.value
            return try storeWallpaper(png, name: "Room")
        }
        guard let url = SceneBundle.wallpaperArtURL(), let art = PixelBuffer.load(url: url) else {
            throw AppError.message("Wallpaper art missing from the app bundle")
        }
        let png = await Task.detached { WallpaperRenderer.sceneWallpaper(art: art, screen: size, pxPerArtPixel: k).pngData() }.value
        return try storeWallpaper(png, name: "Aquarium")
    }

    /// Keeps the reference copy used for widget crops and returns a shareable file.
    private func storeWallpaper(_ png: Data?, name: String) throws -> URL {
        guard let png else { throw AppError.message("Could not encode wallpaper PNG") }
        try png.write(to: store.wallpaperURL, options: .atomic)
        let size = device.screenPixelSize
        let shareURL = FileManager.default.temporaryDirectory.appendingPathComponent("PixelAquarium-\(name)-\(size.width)x\(size.height).png")
        try png.write(to: shareURL, options: .atomic)
        return shareURL
    }

    func saveToPhotos(_ url: URL) async throws {
        let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        guard status == .authorized || status == .limited else { throw AppError.message("Photos add access was denied") }
        try await PHPhotoLibrary.shared().performChanges {
            PHAssetCreationRequest.forAsset().addResource(with: .photo, fileURL: url, options: nil)
        }
    }

    // MARK: Calibration

    func saveProfile(_ p: CalibrationProfile) {
        var p = p
        p.savedAt = Date()
        store.profile = p
        profile = p
    }

    /// Crops the stored wallpaper under the calibrated widget rect into the widget background.
    func generateWidgetBackground() async throws {
        let store = store
        if settings.style == .tank {
            // Needs only the widget's pixel size and (if calibrated) its colour change.
            let scale = device.displayScale
            let size = profile.map { PixelSize(width: $0.widgetBoundsPixels.width, height: $0.widgetBoundsPixels.height) }
                ?? store.heartbeat.map { PixelSize(width: Int(($0.displayWidthPoints * scale).rounded()),
                                                   height: Int(($0.displayHeightPoints * scale).rounded())) }
            guard let size else { throw AppError.message("Add the widget to the Home Screen first") }
            guard let art = SceneBundle.assetURL(\.tankAsset).flatMap(PixelBuffer.load(url:)) else {
                throw AppError.message("Tank art missing from the app bundle")
            }
            let map = profile?.widgetColorMap ?? .identity
            let profile = profile
            let png = await Task.detached { () -> Data? in
                // Calibrated: the wall around the lid comes from the stored wallpaper.
                let wall = profile.flatMap { p in
                    PixelBuffer.load(url: store.wallpaperURL).map { WidgetBackgroundRenderer.background(wallpaper: $0, profile: p) }
                }
                return WidgetBackgroundRenderer.tank(art: art, size: size, widgetColorMap: map, wall: wall).pngData()
            }.value
            guard let png else { throw AppError.message("Could not encode the tank image") }
            try png.write(to: store.widgetBackgroundURL, options: .atomic)
            backgroundVersion += 1
            requestWidgetReload()
            return
        }
        guard let profile else { throw AppError.message("Save a calibration first") }
        let png = await Task.detached { () -> Data? in
            guard let wallpaper = PixelBuffer.load(url: store.wallpaperURL) else { return nil }
            return WidgetBackgroundRenderer.background(wallpaper: wallpaper, profile: profile).pngData()
        }.value
        guard let png else { throw AppError.message("Export the calibration wallpaper first (none stored)") }
        try png.write(to: store.widgetBackgroundURL, options: .atomic)
        backgroundVersion += 1
        requestWidgetReload()
    }

    /// Step 2: one screenshot of the Calibration widget over the generated wallpaper measures the
    /// widget rectangle, the wallpaper zoom/offset and both colour changes, then starts the aquarium.
    func calibrate(screenshot: PixelBuffer) async throws -> CalibrationManager.Calibration {
        let url = store.wallpaperURL
        let pointSize = store.heartbeat.map { CGSize(width: $0.displayWidthPoints, height: $0.displayHeightPoints) }
        let scale = device.displayScale
        let result = try await Task.detached { () throws -> CalibrationManager.Calibration in
            guard let wallpaper = PixelBuffer.load(url: url) else {
                throw AppError.message("Generate the aquarium wallpaper first (step 1).")
            }
            return try CalibrationManager.calibrate(screenshot: screenshot, wallpaper: wallpaper,
                                                     widgetPointSize: pointSize, displayScale: scale)
        }.value
        if result.wallpaperResidual > 20 {
            throw AppError.message(String(format: "The wallpaper on your Home Screen is not the one generated in step 1 (difference %.0f/255). Apply that exact image from Photos, then take a new screenshot.", result.wallpaperResidual))
        }
        var p = profile ?? CalibrationProfile(device: device, widgetBounds: result.widgetRect, appearance: device.appearance)
        p.deviceModel = device.modelIdentifier
        p.osVersion = device.osVersion
        p.screenPixelSize = device.screenPixelSize
        p.displayScale = device.displayScale
        p.homeScreenAppearance = device.appearance
        p.setWidgetBounds(result.widgetRect)
        p.wallpaperTransform = result.transform
        p.wallpaperColorMap = result.wallpaperColorMap
        p.widgetColorMap = result.widgetColorMap
        saveProfile(p)
        var aligned: URL?
        if settings.style == .tank {
            // New room wallpaper with stand and tank base under the widget (stored as the new
            // reference, so the widget's wall pixels are cut from it). Same image size, so iOS
            // applies the same zoom when it is applied.
            aligned = try await exportAquariumWallpaper()
        }
        try await generateWidgetBackground()
        update { $0.mode = .animatedAquarium; $0.showDebugOverlay = false; $0.showFrameCode = false; $0.showCanvasBounds = false }
        if let aligned { try await saveToPhotos(aligned) }
        return result
    }

    /// Step 3: screenshot of the running aquarium. Measures the seam; if it is visible, applies
    /// the measured shift and widget colour change and regenerates. Returns the report taken
    /// before any correction.
    func checkAndRefine(screenshot: PixelBuffer) async throws -> (report: AlignmentReport, corrected: Bool) {
        guard let profile else { throw AppError.message("Calibrate first (step 2).") }
        let wallURL = store.wallpaperURL, bgURL = store.widgetBackgroundURL
        let report = await Task.detached { () -> AlignmentReport? in
            guard let wallpaper = PixelBuffer.load(url: wallURL) else { return nil }
            return CalibrationManager.analyzeAlignment(screenshot: screenshot, wallpaper: wallpaper,
                                                       content: PixelBuffer.load(url: bgURL), profile: profile)
        }.value
        guard let report else { throw AppError.message("No stored wallpaper to compare against") }
        store.alignmentReport = report
        alignment = report
        guard !report.looksSeamless else { return (report, false) }
        var p = profile
        p.setWidgetBounds(p.widgetBoundsPixels.offsetBy(dx: report.bestShiftX, dy: report.bestShiftY))
        if let m = report.measuredWidgetColorMap, m.scale.allSatisfy({ $0 > 0.3 && $0 < 4 }) {
            p.widgetColorMap = m
        }
        saveProfile(p)
        try await generateWidgetBackground()
        return (report, true)
    }

    func resetCalibration() {
        store.resetCalibration()
        profile = nil
        alignment = nil
        settings = store.settings
        backgroundVersion += 1
        requestWidgetReload()
    }

    // MARK: Manual tests

    func record(_ record: ManualTestRecord) {
        var all = manualTests.filter { $0.id != record.id }
        var r = record
        r.updatedAt = Date()
        all.append(r)
        store.manualTests = all
        manualTests = all
    }

    func testRecord(_ id: String) -> ManualTestRecord {
        manualTests.first { $0.id == id } ?? ManualTestRecord(id: id)
    }

    /// What the widget shows behind the fish: calibrated crop, else the bundled tank.
    var previewBackgroundImage: UIImage? {
        widgetBackgroundImage ?? SceneBundle.staticBackgroundURL().flatMap { UIImage(contentsOfFile: $0.path) }
    }

    var widgetBackgroundImage: UIImage? {
        _ = backgroundVersion
        return UIImage(contentsOfFile: store.widgetBackgroundURL.path)
    }
}

enum AppError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self { case .message(let m): return m }
    }
}

enum DeviceInfoProvider {
    @MainActor
    static func current() -> DeviceInfo {
        let screen = UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.screen }.first
        let native = screen?.nativeBounds.size ?? .zero
        let points = screen?.bounds.size ?? .zero
        let style = UITraitCollection.current.userInterfaceStyle
        return DeviceInfo(
            modelIdentifier: modelIdentifier(),
            modelName: UIDevice.current.model,
            osVersion: "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion)",
            screenPixelSize: PixelSize(width: Int(min(native.width, native.height)), height: Int(max(native.width, native.height))),
            screenPointSize: PixelSize(width: Int(min(points.width, points.height)), height: Int(max(points.width, points.height))),
            displayScale: Double(screen?.nativeScale ?? 3),
            appearance: style == .dark ? "dark" : "light"
        )
    }

    static func modelIdentifier() -> String {
        if let sim = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] { return "\(sim) (Simulator)" }
        var info = utsname()
        uname(&info)
        return withUnsafeBytes(of: &info.machine) { String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self) }
    }
}
