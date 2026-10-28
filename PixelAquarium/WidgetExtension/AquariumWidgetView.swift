import SwiftUI
import WidgetKit

struct AquariumWidgetView: View {
    let entry: AquariumEntry
    @Environment(\.widgetRenderingMode) private var renderingMode
    @Environment(\.displayScale) private var displayScale

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                // The matching background is always a content layer: iOS 26 lays a sheen over
                // `containerBackground` and iOS 27 (device) tints it; content layers are left alone.
                if entry.settings.mode != .calibration {
                    background.frame(width: geo.size.width, height: geo.size.height)
                }
                // What the animated character goes behind is part of its frames (chosen per moment),
                // so no still foreground is drawn over it: that hid the ghost behind the doorframe.
                content(size: geo.size)
                if (entry.settings.showDebugOverlay && entry.settings.mode != .calibration) || entry.error != nil {
                    debugOverlay(size: geo.size)
                }
            }
        }
        .containerBackground(for: .widget) { background }
    }

    @ViewBuilder
    private var background: some View {
        if entry.settings.mode == .calibration {
            let c = entry.role.calibrationColor
            Color(.sRGB, red: Double(c.r) / 255, green: Double(c.g) / 255, blue: Double(c.b) / 255)
        } else if let image = entry.background {
            Image(uiImage: image).resizable().interpolation(.none).widgetAccentedRenderingMode(.fullColor)
        } else {
            Color(red: 22 / 255, green: 92 / 255, blue: 110 / 255)
        }
    }

    @ViewBuilder
    private func content(size: CGSize) -> some View {
        if entry.settings.mode == .calibration {
            CalibrationPattern(size: size, scale: displayScale, border: entry.role.calibrationColor)
        } else if let engine = entry.engine, case .layer(let prefix)? = entry.settings.theme.theme.art(for: entry.role)?.motion {
            // Full-widget animated layer over the theme art.
            if entry.settings.mode == .animatedAquarium {
                ClockAnimationDriver(schedule: engine.schedule, fontPrefix: prefix, blinkFont: engine.clip.driver.blinkFont,
                                     blinkInverseFont: engine.clip.driver.blinkInverseFont,
                                     anchor: engine.schedule.anchor(for: entry.date), size: size)
            }
        } else if entry.settings.theme.theme.art(for: entry.role) == nil {
            Text("Not used by the \(entry.settings.theme.title) theme")
                .font(.caption).foregroundStyle(.white).frame(width: size.width, height: size.height)
        } else if let engine = entry.engine {
            let anchor = engine.schedule.anchor(for: entry.date)
            AquariumCanvasView(
                engine: engine,
                size: size,
                displayScale: displayScale,
                fish: fishContent(anchor: anchor),
                showCanvasBounds: entry.settings.showCanvasBounds,
                frameCodeAnchor: entry.settings.showFrameCode && entry.settings.mode == .animatedAquarium ? anchor : nil
            )
        }
    }

    private func fishContent(anchor: Date) -> AquariumCanvasView.FishContent {
        switch entry.settings.mode {
        case .animatedAquarium: return .clock(anchor: anchor)
        case .staticAquarium: return entry.posterFrame.map { .image($0) } ?? .none
        case .calibration: return .none
        }
    }

    private func debugOverlay(size: CGSize) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(entry.settings.mode.title)
            Text("render \(renderingModeName) · \(Int(size.width))×\(Int(size.height))pt @\(Int(displayScale))x")
            Text("rendered \(entry.date.formatted(date: .omitted, time: .standard))")
            // A plain system timer: if this stops, timers are frozen, not the fonts.
            HStack(spacing: 2) {
                Text("timer")
                Text(entry.date, style: .timer)
            }
            if let error = entry.error { Text(error).foregroundStyle(.red) }
        }
        .font(.system(size: 8, weight: .medium, design: .monospaced))
        .foregroundStyle(.white)
        .padding(3)
        .background(Color.black.opacity(0.55))
        .environment(\.locale, Locale(identifier: "en_US_POSIX"))
        .offset(x: 8, y: size.height - 52)
    }

    private var renderingModeName: String {
        switch renderingMode {
        case .fullColor: return "fullColor"
        case .accented: return "accented"
        case .vibrant: return "vibrant"
        default: return "other"
        }
    }
}

/// Calibration mode (PRD FR-02): a magenta border (its bounding box in a screenshot is the
/// widget rectangle) around a chart of known colours (read back to measure how iOS changes
/// widget colours), plus the widget's own reported size.
struct CalibrationPattern: View {
    let size: CGSize
    let scale: CGFloat
    var border: RGBA = .calibrationMagenta

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color(.sRGB, red: Double(border.r) / 255, green: Double(border.g) / 255, blue: Double(border.b) / 255)
            ForEach(CalibrationChart.colors.indices, id: \.self) { i in
                let r = CalibrationChart.patchRect(i, widgetSize: size)
                let c = CalibrationChart.colors[i]
                Rectangle()
                    .fill(Color(.sRGB, red: Double(c.r) / 255, green: Double(c.g) / 255, blue: Double(c.b) / 255))
                    .frame(width: r.width, height: r.height)
                    .offset(x: r.minX, y: r.minY)
            }
            Text("\(Int(size.width))×\(Int(size.height)) pt · \(Int(size.width * scale))×\(Int(size.height * scale)) px")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)
                .frame(width: size.width, height: CalibrationChart.borderPoints)
                .offset(y: size.height - CalibrationChart.borderPoints)
        }
        .frame(width: size.width, height: size.height)
    }
}
