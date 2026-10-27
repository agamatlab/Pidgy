import PhotosUI
import SwiftUI

/// Three steps: wallpaper, one calibration screenshot, optional check & refine.
/// Everything measurable is measured from screenshots; nothing to type in.
struct CalibrationView: View {
    @EnvironmentObject private var model: AppModel

    @State private var wallpaperURL: URL?
    @State private var calibrationItem: PhotosPickerItem?
    @State private var checkItem: PhotosPickerItem?
    @State private var busy = false
    @State private var message: String?

    var body: some View {
        Form {
            if let message {
                Section { Text(message).font(.callout) }
            }
            wallpaperSection
            calibrateSection
            if !model.usesObjectStyle { checkSection }
            advancedSection
        }
        .navigationTitle("Calibration")
        .disabled(busy)
        .overlay { if busy { ProgressView("Measuring…").padding().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12)) } }
        .onChange(of: calibrationItem) { _, item in if let item { importCalibration(item) } }
        .onChange(of: checkItem) { _, item in if let item { importCheck(item) } }
    }

    // MARK: Sections

    private var wallpaperSection: some View {
        Section("1 · Wallpaper") {
            Picker("Theme", selection: Binding(get: { model.settings.theme }, set: { theme in
                model.update { $0.theme = theme }
                run { try await model.generateWidgetBackground() }
            })) {
                ForEach(ThemeId.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)
            if model.settings.theme == .aquarium {
                Picker("Style", selection: Binding(get: { model.settings.style }, set: { style in
                    model.update { $0.style = style }
                    run { try await model.generateWidgetBackground() }
                })) {
                    ForEach(SceneStyle.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
            }
            Text(model.settings.theme == .midnightManor
                 ? "A Victorian parlour at midnight. Add two widgets: Pidgy · Large (the witch portrait) and Pidgy · Medium (the Gothic window), e.g. the window in the top two rows and the portrait under it. Save the room to Photos and set it as your Home Screen wallpaper (don't pinch or move it)."
                 : model.settings.style == .tank
                 ? "The widget is a glass tank standing on a cabinet in a pixel-art room. Its edge is meant to be seen, so the iOS widget rim looks like the tank's glass. Save the room to Photos and set it as your Home Screen wallpaper (don't pinch or move it)."
                 : "Saves the full-screen water wallpaper (\(model.device.screenPixelSize.width)×\(model.device.screenPixelSize.height)) to Photos. Set it as the Home Screen wallpaper and don't pinch or move it. The widget's background is cut from this exact image, so after generating again you must re-apply it and redo step 2.")
                .font(.footnote).foregroundStyle(.secondary)
            Button(model.usesObjectStyle ? "Generate room wallpaper + save to Photos" : "Generate aquarium wallpaper + save to Photos") {
                run {
                    let url = try await model.exportAquariumWallpaper()
                    wallpaperURL = url
                    try await model.saveToPhotos(url)
                    if model.usesObjectStyle && model.profile != nil {
                        // Already calibrated: the new wallpaper is aligned, refresh the widget to match.
                        try await model.generateWidgetBackground()
                        message = "Aligned room wallpaper saved to Photos and the widgets refreshed. Set the wallpaper as your Home Screen wallpaper (don't pinch or move it) and you're done."
                    } else {
                        message = "Saved to Photos. Set it as your Home Screen wallpaper, then do step 2."
                    }
                }
            }
            if let wallpaperURL { ShareLink("Share PNG", item: wallpaperURL) }
        }
    }

    private var calibrateSection: some View {
        Section("2 · Calibrate (one screenshot)") {
            Text(model.usesObjectStyle
                 ? "Shows a colour chart on each widget (pink border on the Large one, cyan on the Medium one). Go to the Home Screen, wait until the widgets show it, take a screenshot, come back and import it. The app measures where each widget is and how iOS changes its colours, starts the animation, and saves a new room wallpaper fitted around the widgets. Apply that one to finish."
                 : "Shows a colour chart with a pink border on the widget. Go to the Home Screen, wait until the widget shows it, take a screenshot, come back and import it. The app measures where the widget is, how iOS zooms the wallpaper and how iOS changes the widget's colours, then starts the aquarium.")
                .font(.footnote).foregroundStyle(.secondary)
            Button("Show calibration chart on widget") {
                model.update { $0.mode = .calibration }
                message = "Chart requested. Go to the Home Screen; it usually appears within a few seconds."
            }
            PhotosPicker("Import calibration screenshot", selection: $calibrationItem, matching: .screenshots)
            if let image = model.widgetBackgroundImage {
                Image(uiImage: image).resizable().interpolation(.none).scaledToFit().frame(maxHeight: 140)
            }
        }
    }

    private var checkSection: some View {
        Section("3 · Check & refine (optional)") {
            Text("Screenshot the Home Screen with the aquarium running and import it. The app measures the colour step at the widget's edge; if it's visible it corrects position and colours and regenerates. Repeat until it says seamless.")
                .font(.footnote).foregroundStyle(.secondary)
            PhotosPicker("Import aquarium screenshot", selection: $checkItem, matching: .screenshots)
                .disabled(model.profile == nil)
            if let r = model.alignment {
                LabeledContent("Edge step", value: String(format: "%.1f (wallpaper itself %.1f)", r.edgeStep, r.naturalEdgeStep))
                LabeledContent("Position error", value: "(\(r.bestShiftX), \(r.bestShiftY)) px")
                LabeledContent("Result", value: r.looksSeamless ? "Seamless" : "Visible edge")
            }
        }
    }

    private var advancedSection: some View {
        Section {
            DisclosureGroup("Advanced") {
                if let p = model.profile {
                    LabeledContent("Widget", value: "\(p.widgetBoundsPixels.width)×\(p.widgetBoundsPixels.height) at (\(p.widgetBoundsPixels.x), \(p.widgetBoundsPixels.y)) px")
                    LabeledContent("Wallpaper zoom", value: String(format: "%.3f×, offset (%.0f, %.0f)", p.wallpaperTransform.scale,
                                                                   p.wallpaperTransform.translationX, p.wallpaperTransform.translationY))
                    LabeledContent("Wallpaper colours", value: describe(p.wallpaperColorMap))
                    LabeledContent("Widget colours", value: describe(p.widgetColorMap))
                    HStack {
                        Text("Nudge widget")
                        Spacer()
                        ForEach([("←", -1, 0), ("→", 1, 0), ("↑", 0, -1), ("↓", 0, 1)], id: \.0) { label, dx, dy in
                            Button(label) { nudge(dx, dy) }.buttonStyle(.bordered)
                        }
                    }
                } else {
                    Text("Not calibrated yet.")
                }
                Button("Calibration grid wallpaper (alignment test) + save to Photos") {
                    run {
                        let url = try await model.exportCalibrationWallpaper()
                        wallpaperURL = url
                        try await model.saveToPhotos(url)
                        message = "Calibration grid saved to Photos. It replaces the aquarium as the reference until you generate the aquarium again."
                    }
                }
            }
        }
    }

    private func describe(_ m: ColorMap) -> String {
        (0..<3).map { String(format: "%@ ×%.2f%+.0f", ["R", "G", "B"][$0], m.scale[$0], m.offset[$0]) }.joined(separator: "  ")
    }

    // MARK: Actions

    private func importCalibration(_ item: PhotosPickerItem) {
        run {
            let shot = try await loadScreenshot(item)
            let r = try await model.calibrate(screenshot: shot)
            message = model.usesObjectStyle
                ? String(format: "Calibrated. Widget %d×%d px at (%d, %d), wallpaper zoom %.3f×. The animation is running, and a new room wallpaper fitted around your widgets is in Photos: set it as your Home Screen wallpaper (same way as before) to finish.",
                         r.widgetRect.width, r.widgetRect.height, r.widgetRect.x, r.widgetRect.y, r.transform.scale)
                : String(format: "Calibrated. Widget %d×%d px at (%d, %d). Wallpaper zoom %.3f×. Background generated and aquarium started; check the Home Screen, then do step 3.",
                         r.widgetRect.width, r.widgetRect.height, r.widgetRect.x, r.widgetRect.y, r.transform.scale)
        }
    }

    private func importCheck(_ item: PhotosPickerItem) {
        run {
            let shot = try await loadScreenshot(item)
            let (r, corrected) = try await model.checkAndRefine(screenshot: shot)
            if !corrected {
                message = String(format: "Seamless: the edge step (%.1f) is no bigger than the wallpaper's own variation.", r.edgeStep)
            } else {
                message = String(format: "Edge visible (step %.1f vs %.1f). Corrected position by (%d, %d) px and re-measured widget colours; background regenerated. Take another screenshot to confirm.",
                                 r.edgeStep, r.naturalEdgeStep, r.bestShiftX, r.bestShiftY)
            }
        }
    }

    private func nudge(_ dx: Int, _ dy: Int) {
        guard var p = model.profile else { return }
        p.setWidgetBounds(p.widgetBoundsPixels.offsetBy(dx: dx, dy: dy))
        model.saveProfile(p)
        run { try await model.generateWidgetBackground() }
    }

    private func loadScreenshot(_ item: PhotosPickerItem) async throws -> PixelBuffer {
        guard let data = try await item.loadTransferable(type: Data.self),
              let buffer = PixelBuffer.load(data: data) else { throw AppError.message("Could not read the screenshot") }
        return buffer
    }

    private func run(_ work: @escaping () async throws -> Void) {
        busy = true
        Task {
            do { try await work() } catch { message = error.localizedDescription }
            busy = false
            calibrationItem = nil
            checkItem = nil
        }
    }
}
