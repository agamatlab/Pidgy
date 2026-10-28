import Foundation

/// Device-specific rendering information (PRD 5.3). Reusable across scenes as long as the
/// Home Screen layout has not changed.
struct CalibrationProfile: Codable, Equatable {
    static let currentVersion = 1

    var calibrationVersion = CalibrationProfile.currentVersion
    var deviceModel: String
    var osVersion: String
    var screenPixelSize: PixelSize
    var displayScale: Double
    var widgetFamily = "systemLarge"
    /// Observed widget rectangle in screenshot pixels.
    var widgetBoundsPixels: PixelRect
    /// Same rectangle normalized to the screen; descriptive only, not portable to other devices.
    var widgetBoundsNormalized: NormalizedRect
    /// Observed rectangle of every calibrated widget, keyed by `WidgetRole.rawValue`.
    /// `widgetBoundsPixels` mirrors the first one found (used by the single-widget styles).
    var roleBounds: [String: PixelRect]?
    /// iOS's measured corner curve per widget (px inset per row from the top), keyed like `roleBounds`.
    var cornerInsets: [String: [Int]]?
    var widgetContentInsets = PixelInsets()
    var wallpaperTransform = WallpaperTransform.identity
    /// How the Home Screen shows wallpaper file colours.
    var wallpaperColorMap = ColorMap.identity
    /// How the Home Screen shows widget content colours.
    var widgetColorMap = ColorMap.identity
    var widgetCornerRadiusPixels: Int?
    var homeScreenAppearance: String
    /// Manually recorded Home Screen layout facts (icon size, page, row the widget sits on).
    var homeScreenLayoutNote = ""
    var savedAt = Date()

    init(device: DeviceInfo, widgetBounds: PixelRect, appearance: String) {
        deviceModel = device.modelIdentifier
        osVersion = device.osVersion
        screenPixelSize = device.screenPixelSize
        displayScale = device.displayScale
        widgetBoundsPixels = widgetBounds
        widgetBoundsNormalized = widgetBounds.normalized(in: device.screenPixelSize)
        homeScreenAppearance = appearance
    }

    func bounds(_ role: WidgetRole) -> PixelRect? {
        if let roleBounds { return roleBounds[role.rawValue] }
        return role == .primary ? widgetBoundsPixels : nil
    }

    mutating func setWidgetBounds(_ rect: PixelRect) {
        widgetBoundsPixels = rect
        widgetBoundsNormalized = rect.normalized(in: screenPixelSize)
    }
}

struct DeviceInfo: Codable, Equatable {
    var modelIdentifier: String
    var modelName: String
    var osVersion: String
    var screenPixelSize: PixelSize
    var screenPointSize: PixelSize
    var displayScale: Double
    var appearance: String
}
