import SwiftUI

/// Guided setup (PRD FR-10). Every Home Screen change is done by the user; the app never
/// claims to have placed the widget or changed the wallpaper.
struct SetupView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        List {
            step(1, "Place widget") {
                Text("Long-press the Home Screen › Edit › Add Widget › Pixel Aquarium › Large. Drag it as low as it will go above the dock. Keep the Home Screen icon style on Default (not Clear/Tinted) for this test.")
                Button("Set widget to Calibration mode") { model.update { $0.mode = .calibration } }
            }
            step(2, "Calibrate") {
                Text("Export the calibration wallpaper, apply it, take a Home Screen screenshot (side + volume up) and import it. The app detects the magenta widget and the green markers.")
                NavigationLink("Open calibration") { CalibrationView() }
            }
            step(3, "Export wallpaper") {
                Text("Phase 0 uses the calibration wallpaper as the scene. The cozy-room wallpaper is generated around the calibrated slot only after the feasibility gates pass.")
            }
            step(4, "Apply wallpaper") {
                Text("Settings › Wallpaper › Add New Wallpaper › Photos › pick the exported PNG. Do not pinch or move it. Turn off Depth Effect / Spatial Scene. For the Home Screen choose the original photo (not Blur, Colour or Gradient) and turn off wallpaper dimming in dark mode if offered.")
            }
            step(5, "Activate aquarium") {
                Text("After calibration, generate the matching background, then switch the widget to the experimental animated mode. Without a calibration the fish swim over plain water, which is enough for Gate A.")
                Button("Set widget to Animated (experimental)") { model.update { $0.mode = .animatedAquarium } }
            }
            step(6, "Verify") {
                Text("Watch the Home Screen for 5 minutes, record the screen, and fill in the checklist. Only Home Screen observations count as evidence.")
                NavigationLink("Open checklist") { ManualTestsView() }
            }
        }
        .navigationTitle("Setup")
    }

    private func step<Content: View>(_ n: Int, _ title: String, @ViewBuilder content: () -> Content) -> some View {
        Section("Step \(n) — \(title)") {
            content().font(.callout)
        }
    }
}
