import SwiftUI

/// Developer diagnostics (PRD 10). In-app measurements and widget-reported values are
/// labelled separately; neither is a Home Screen observation.
struct DiagnosticsView: View {
    @EnvironmentObject private var model: AppModel
    @State private var confirmReset = false

    var body: some View {
        List {
            Section("Device (measured in app)") {
                row("Model", "\(model.device.modelName) · \(model.device.modelIdentifier)")
                row("OS", model.device.osVersion)
                row("Screen", "\(model.device.screenPixelSize.width)×\(model.device.screenPixelSize.height) px, \(model.device.screenPointSize.width)×\(model.device.screenPointSize.height) pt")
                row("Display scale", "\(model.device.displayScale)")
                row("Appearance", model.device.appearance)
            }

            Section("Widget (reported by extension)") {
                row("Configuration", "systemLarge · \(model.settings.mode.title)")
                if let hb = model.store.heartbeat {
                    row("Last timeline build", hb.renderedAt.formatted(date: .abbreviated, time: .standard))
                    row("Mode at build", hb.mode.title)
                    row("Display size", String(format: "%.1f × %.1f pt", hb.displayWidthPoints, hb.displayHeightPoints))
                    row("Background loaded", hb.backgroundLoaded ? "yes" : "no")
                    if let e = hb.error { row("Error", e) }
                } else {
                    row("Last timeline build", "never (add the widget)")
                }
                row("Last reload request", model.lastReloadRequest?.formatted(date: .abbreviated, time: .standard) ?? "none")
                row("App Group", model.store.isUsingAppGroup ? "shared container" : "NOT available — widget cannot read settings")
            }

            Section("Animation") {
                if let engine = model.engine {
                    ForEach(engine.diagnostics, id: \.0) { row($0.0, $0.1) }
                    let issues = engine.validate()
                    row("Data validation", issues.isEmpty ? "OK" : issues.joined(separator: "; "))
                } else {
                    row("Asset error", model.engineError ?? "unknown")
                }
            }

            Section("Calibration") {
                if let p = model.profile {
                    Text(prettyJSON(p)).font(.caption.monospaced()).textSelection(.enabled)
                } else {
                    row("Profile", "not calibrated")
                }
                if let a = model.alignment { row("Alignment", a.summary) }
            }

            Section("Home Screen observations") {
                NavigationLink("Manual test results") { ManualTestsView() }
                ShareLink("Export test report (Markdown)", item: TestReportBuilder.markdown(model: model))
            }

            Section("Actions") {
                Button("Request widget reload") { model.requestWidgetReload() }
                Button("Restore debug mode") {
                    model.update { $0.mode = .calibration; $0.showDebugOverlay = true; $0.showCanvasBounds = true }
                }
                Button("Reset calibration", role: .destructive) { confirmReset = true }
            }
        }
        .navigationTitle("Diagnostics")
        .confirmationDialog("Delete calibration, alignment report and generated images?", isPresented: $confirmReset) {
            Button("Reset calibration", role: .destructive) { model.resetCalibration() }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        LabeledContent(label) { Text(value).multilineTextAlignment(.trailing).textSelection(.enabled) }
    }
}

func prettyJSON<T: Encodable>(_ value: T) -> String {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    encoder.dateEncodingStrategy = .iso8601
    return (try? encoder.encode(value)).flatMap { String(data: $0, encoding: .utf8) } ?? "-"
}

struct ManualTestsView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        List {
            Section {
                Text("Record what you saw on the Home Screen. Mark in-app checks as such; they do not validate the concept.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            ForEach(ManualTestCatalog.groups) { group in
                Section(group.title) {
                    ForEach(group.items) { item in
                        ManualTestRow(item: item, record: model.testRecord(item.id)) { model.record($0) }
                    }
                }
            }
        }
        .navigationTitle("Tests")
    }
}

private struct ManualTestRow: View {
    let item: ManualTestCatalog.Item
    @State var record: ManualTestRecord
    let save: (ManualTestRecord) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(item.title).font(.headline)
            if !item.detail.isEmpty { Text(item.detail).font(.caption).foregroundStyle(.secondary) }
            Picker("Result", selection: $record.outcome) {
                ForEach(TestOutcome.allCases) { Text($0.title).tag($0) }
            }
            Toggle("Observed on Home Screen", isOn: $record.observedOnHomeScreen)
            TextField("Notes", text: $record.notes, axis: .vertical)
        }
        .onChange(of: record) { _, new in save(new) }
    }
}
