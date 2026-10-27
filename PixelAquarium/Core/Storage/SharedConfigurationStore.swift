import Foundation

enum WidgetMode: String, Codable, CaseIterable, Identifiable {
    case calibration
    case staticAquarium
    case animatedAquarium

    var id: String { rawValue }

    var title: String {
        switch self {
        case .calibration: return "Calibration"
        case .staticAquarium: return "Static aquarium"
        case .animatedAquarium: return "Animated aquarium (experimental)"
        }
    }
}

enum SceneStyle: String, Codable, CaseIterable, Identifiable {
    /// The widget is a glass tank on a stand in a room: its edge is meant to be seen, so the
    /// iOS widget rim reads as the tank glass.
    case tank
    /// Full-screen water wallpaper; the widget tries to disappear into it.
    case seamless

    var id: String { rawValue }
    var title: String { self == .tank ? "Tank on a stand" : "Full-screen water" }
}

/// Settings shared between the app and the widget extension.
struct WidgetSettings: Codable, Equatable {
    var mode: WidgetMode = .calibration
    var style: SceneStyle = .tank
    /// Small status box in the widget: mode, rendering mode, render time, live system timer.
    var showDebugOverlay = true
    /// Monochrome frame-index barcode driven by the same clock schedule (for recordings).
    var showFrameCode = false
    /// Draw a frame around the fish canvas.
    var showCanvasBounds = false

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = WidgetSettings()
        mode = try c.decodeIfPresent(WidgetMode.self, forKey: .mode) ?? d.mode
        style = try c.decodeIfPresent(SceneStyle.self, forKey: .style) ?? d.style
        showDebugOverlay = try c.decodeIfPresent(Bool.self, forKey: .showDebugOverlay) ?? d.showDebugOverlay
        showFrameCode = try c.decodeIfPresent(Bool.self, forKey: .showFrameCode) ?? d.showFrameCode
        showCanvasBounds = try c.decodeIfPresent(Bool.self, forKey: .showCanvasBounds) ?? d.showCanvasBounds
    }
}

enum TestOutcome: String, Codable, CaseIterable, Identifiable {
    case notTested, pass, fail, continues, pauses, restarts, disappears, becameStatic

    var id: String { rawValue }

    var title: String {
        switch self {
        case .notTested: return "Not tested"
        case .pass: return "Pass"
        case .fail: return "Fail"
        case .continues: return "Continues"
        case .pauses: return "Pauses"
        case .restarts: return "Restarts"
        case .disappears: return "Disappears"
        case .becameStatic: return "Becomes static"
        }
    }
}

/// A manual observation. `observedOnHomeScreen` separates real widget evidence from in-app checks.
struct ManualTestRecord: Codable, Equatable, Identifiable {
    var id: String
    var outcome: TestOutcome = .notTested
    var observedOnHomeScreen = true
    var notes = ""
    var updatedAt = Date()
}

/// What the widget extension last reported about itself.
struct WidgetHeartbeat: Codable, Equatable {
    var renderedAt: Date
    var mode: WidgetMode
    var displayWidthPoints: Double
    var displayHeightPoints: Double
    var backgroundLoaded: Bool
    var error: String?
}

/// App Group backed store. Files live in the shared container so the widget extension
/// can read calibration output without the app running.
final class SharedConfigurationStore {
    static let appGroupIdentifier = "group.com.aghamatlab.pixelaquarium"
    static let widgetKind = "AquariumWidget"
    static let shared = SharedConfigurationStore()

    let baseURL: URL
    let isUsingAppGroup: Bool

    init(baseURL: URL? = nil) {
        if let baseURL {
            self.baseURL = baseURL
            isUsingAppGroup = false
        } else if let group = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier) {
            self.baseURL = group.appendingPathComponent("PixelAquarium", isDirectory: true)
            isUsingAppGroup = true
        } else {
            self.baseURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("PixelAquarium", isDirectory: true)
            isUsingAppGroup = false
        }
        try? FileManager.default.createDirectory(at: self.baseURL, withIntermediateDirectories: true)
    }

    // MARK: Files

    var wallpaperURL: URL { baseURL.appendingPathComponent("wallpaper.png") }
    var widgetBackgroundURL: URL { baseURL.appendingPathComponent("widget_background.png") }
    private var settingsURL: URL { baseURL.appendingPathComponent("settings.json") }
    private var profileURL: URL { baseURL.appendingPathComponent("calibration_profile.json") }
    private var testsURL: URL { baseURL.appendingPathComponent("manual_tests.json") }
    private var heartbeatURL: URL { baseURL.appendingPathComponent("widget_heartbeat.json") }
    private var reloadURL: URL { baseURL.appendingPathComponent("last_reload_request.json") }
    private var alignmentURL: URL { baseURL.appendingPathComponent("alignment_report.json") }

    // MARK: Typed accessors

    var settings: WidgetSettings {
        get { read(settingsURL) ?? WidgetSettings() }
        set { write(newValue, to: settingsURL) }
    }

    var profile: CalibrationProfile? {
        get { read(profileURL) }
        set { write(newValue, to: profileURL) }
    }

    var manualTests: [ManualTestRecord] {
        get { read(testsURL) ?? [] }
        set { write(newValue, to: testsURL) }
    }

    var heartbeat: WidgetHeartbeat? {
        get { read(heartbeatURL) }
        set { write(newValue, to: heartbeatURL) }
    }

    var lastReloadRequest: Date? {
        get { (read(reloadURL) as Stamp?)?.date }
        set { write(newValue.map(Stamp.init), to: reloadURL) }
    }

    var alignmentReport: AlignmentReport? {
        get { read(alignmentURL) }
        set { write(newValue, to: alignmentURL) }
    }

    var hasWidgetBackground: Bool { FileManager.default.fileExists(atPath: widgetBackgroundURL.path) }

    func resetCalibration() {
        for url in [profileURL, alignmentURL, widgetBackgroundURL, wallpaperURL] {
            try? FileManager.default.removeItem(at: url)
        }
        var s = settings
        s.mode = .calibration
        s.showDebugOverlay = true
        settings = s
    }

    // MARK: JSON helpers

    private struct Stamp: Codable { var date: Date }

    private func read<T: Decodable>(_ url: URL) -> T? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(T.self, from: data)
    }

    private func write<T: Encodable>(_ value: T?, to url: URL) {
        guard let value else {
            try? FileManager.default.removeItem(at: url)
            return
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        if let data = try? encoder.encode(value) {
            try? data.write(to: url, options: .atomic)
        }
    }
}
