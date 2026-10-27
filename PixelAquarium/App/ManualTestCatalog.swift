import Foundation

/// The PRD's manual, device-only checks (gates 3A-C, acceptance 8.1, stability 8.4).
enum ManualTestCatalog {
    struct Item: Identifiable {
        let id: String
        let title: String
        let detail: String
    }

    struct Group: Identifiable {
        let id: String
        let title: String
        let items: [Item]
    }

    static let groups: [Group] = [
        Group(id: "gates", title: "Feasibility gates", items: [
            Item(id: "gateA", title: "Gate A — animated widget",
                 detail: "Animated mode on the Home Screen. Multi-frame movement repeats for 5 min with the app closed. Record the screen."),
            Item(id: "gateB", title: "Gate B — wallpaper alignment",
                 detail: "Static mode with matching background. Widget edge looks continuous at normal distance; check the alignment report."),
            Item(id: "gateC", title: "Gate C — full-colour animation",
                 detail: "Fish are orange/blue (not magenta silhouettes), transparent around sprites, clipped by the rounded corners, in the Default icon style."),
        ]),
        Group(id: "acceptance", title: "Acceptance (8.1)", items: [
            Item(id: "T01", title: "T01 App builds and installs", detail: "On the physical iPhone."),
            Item(id: "T02", title: "T02 Large widget in gallery", detail: ""),
            Item(id: "T03", title: "T03 Lower placement possible", detail: "Note the row the widget occupies."),
            Item(id: "T04", title: "T04 Calibration saved and reused", detail: ""),
            Item(id: "T05", title: "T05 Wallpaper size/position", detail: "Fiducials detected with scale ≈ 1."),
            Item(id: "T06", title: "T06 Visual integration", detail: ""),
            Item(id: "T07", title: "T07 Continuous multi-frame movement", detail: "Measure with Tools/analyze_recording.py."),
            Item(id: "T08", title: "T08 Loop without visible jump", detail: ""),
            Item(id: "T09", title: "T09 Works with app closed", detail: "Force-quit the app first."),
            Item(id: "T10", title: "T10 Recovers after lock/unlock", detail: ""),
            Item(id: "T11", title: "T11 Settings survive app restart", detail: ""),
            Item(id: "T12", title: "T12 Works offline", detail: "Airplane mode."),
        ]),
        Group(id: "stability", title: "Stability (8.4)", items: [
            Item(id: "S1", title: "Home Screen visible 5 min", detail: "Longest freeze must be ≤ 2 s."),
            Item(id: "S2", title: "Open another app and return", detail: ""),
            Item(id: "S3", title: "Lock several minutes, unlock", detail: ""),
            Item(id: "S4", title: "Force-quit container app", detail: ""),
            Item(id: "S5", title: "Restart the phone", detail: ""),
            Item(id: "S6", title: "Other Home Screen page and back", detail: ""),
            Item(id: "S7", title: "Change Home Screen appearance", detail: "Light/Dark, then Clear/Tinted (documented only)."),
            Item(id: "S8", title: "Low Power Mode", detail: ""),
            Item(id: "S9", title: "After device idle", detail: ""),
            Item(id: "S10", title: "Battery / energy observation", detail: "Settings › Battery after a long session; Xcode energy gauge if attached."),
        ]),
    ]
}
