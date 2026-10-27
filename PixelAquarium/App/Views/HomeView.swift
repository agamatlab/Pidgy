import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var model: AppModel
    /// `-openClockPreview` launch argument: jump straight to the clock-driver preview (simulator checks).
    @State private var openClockPreview = ProcessInfo.processInfo.arguments.contains("-openClockPreview")

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Phase 0 prototype. Feasibility gates must pass on the physical iPhone before the room artwork is built. The in-app preview is never evidence that the Home Screen widget animates.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Widget mode") {
                    Picker("Mode", selection: Binding(get: { model.settings.mode },
                                                      set: { m in model.update { $0.mode = m } })) {
                        ForEach(WidgetMode.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                    Toggle("Debug overlay", isOn: Binding(get: { model.settings.showDebugOverlay },
                                                          set: { v in model.update { $0.showDebugOverlay = v } }))
                    Toggle("Frame-index barcode", isOn: Binding(get: { model.settings.showFrameCode },
                                                                set: { v in model.update { $0.showFrameCode = v } }))
                    Toggle("Fish canvas bounds", isOn: Binding(get: { model.settings.showCanvasBounds },
                                                               set: { v in model.update { $0.showCanvasBounds = v } }))
                    if let date = model.lastReloadRequest {
                        LabeledContent("Reload requested", value: date.formatted(date: .omitted, time: .standard))
                    }
                }

                Section("Workflow") {
                    NavigationLink("Setup wizard") { SetupView() }
                    NavigationLink("Calibration") { CalibrationView() }
                    NavigationLink("Aquarium preview (in-app)") { PreviewView() }
                    NavigationLink("Feasibility gates & tests") { ManualTestsView() }
                    NavigationLink("Diagnostics") { DiagnosticsView() }
                }
            }
            .navigationTitle("Pixel Aquarium")
            .navigationDestination(isPresented: $openClockPreview) { PreviewView(initialRenderer: .clock) }
            .onAppear { model.device = DeviceInfoProvider.current() }
        }
    }
}
