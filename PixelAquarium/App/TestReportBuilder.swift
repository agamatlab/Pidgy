import Foundation

/// Markdown dump of everything needed for TEST_REPORT.md.
@MainActor
enum TestReportBuilder {
    static func markdown(model: AppModel) -> String {
        var lines = ["# Pixel Aquarium — device test export", "",
                     "Exported \(Date().formatted(date: .abbreviated, time: .standard))", "",
                     "## Device (in-app measurement)", "",
                     "- Model: \(model.device.modelName) (\(model.device.modelIdentifier))",
                     "- OS: \(model.device.osVersion)",
                     "- Screen: \(model.device.screenPixelSize.width)×\(model.device.screenPixelSize.height) px @\(model.device.displayScale)x",
                     "- Appearance: \(model.device.appearance)", ""]

        lines += ["## Widget (extension heartbeat)", ""]
        if let hb = model.store.heartbeat {
            lines += [String(format: "- Display size: %.1f × %.1f pt", hb.displayWidthPoints, hb.displayHeightPoints),
                      "- Last build: \(hb.renderedAt.formatted()) in \(hb.mode.title)",
                      "- Background loaded: \(hb.backgroundLoaded)"]
        } else {
            lines.append("- No heartbeat (widget never built a timeline)")
        }

        lines += ["", "## Calibration", "", "```json", model.profile.map(prettyJSON) ?? "none", "```", ""]
        if let a = model.alignment {
            lines += ["## Alignment report", "", "```json", prettyJSON(a), "```", ""]
        }

        lines += ["## Manual observations", "", "| Test | Result | Where | Notes |", "|---|---|---|---|"]
        for group in ManualTestCatalog.groups {
            for item in group.items {
                let r = model.testRecord(item.id)
                let notes = r.notes.replacingOccurrences(of: "\n", with: " ").replacingOccurrences(of: "|", with: "/")
                lines.append("| \(item.title) | \(r.outcome.title) | \(r.observedOnHomeScreen ? "Home Screen" : "in-app") | \(notes) |")
            }
        }
        return lines.joined(separator: "\n")
    }
}
