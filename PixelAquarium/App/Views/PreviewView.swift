import SwiftUI

/// In-app development preview (PRD FR-08). Uses the same assets, frame data and layout as the
/// widget. Foreground rendering here proves nothing about the Home Screen.
struct PreviewView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.displayScale) private var displayScale

    enum Renderer: String, CaseIterable, Identifiable {
        case engine = "Engine (TimelineView)"
        case clock = "Clock driver (widget view)"
        var id: String { rawValue }
    }

    @State private var renderer: Renderer
    @State private var playing = true
    @State private var animated = true
    @State private var showBounds = true
    @State private var startDate = Date()
    @State private var pausedElapsed: TimeInterval?
    @State private var meter = FrameRateMeter()

    init(initialRenderer: Renderer = .engine) {
        _renderer = State(initialValue: initialRenderer)
    }

    var body: some View {
        if let engine = model.engine {
            content(engine)
        } else {
            ContentUnavailableView("Scene failed to load", systemImage: "exclamationmark.triangle",
                                   description: Text(model.engineError ?? ""))
        }
    }

    private func content(_ engine: AquariumAnimationEngine) -> some View {
        let pixels = try? PixelArtRenderer(clip: engine.clip)
        return ScrollView {
            VStack(spacing: 16) {
                Text("In-app preview — not Home Screen evidence")
                    .font(.caption.bold())
                    .foregroundStyle(.orange)

                TimelineView(.animation(minimumInterval: engine.schedule.frameDuration, paused: !playing || !animated)) { ctx in
                    let elapsed = pausedElapsed ?? ctx.date.timeIntervalSince(startDate)
                    let frame = animated ? engine.frameIndex(elapsed: elapsed) : engine.clip.posterFrame
                    // In clock mode the playhead is the wall clock, as on the Home Screen.
                    let shown = renderer == .clock && animated ? engine.schedule.predictedFrame(at: ctx.date) : frame
                    let measured = meter.tick(frame: shown, at: ctx.date)
                    VStack(spacing: 8) {
                        widgetBox(engine: engine, frame: frame, pixels: pixels, now: ctx.date)
                        HStack {
                            stat(renderer == .clock ? "Predicted frame" : "Frame", "\(shown) / \(engine.clip.frameCount)")
                            stat("Target FPS", "\(engine.clip.fps)")
                            stat("Measured", String(format: "%.1f fps", measured))
                        }
                    }
                }

                Picker("Renderer", selection: $renderer) {
                    ForEach(Renderer.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                HStack {
                    Button(playing ? "Pause" : "Play") { togglePlay() }
                        .buttonStyle(.borderedProminent)
                    Button("Restart loop") { restart() }
                        .buttonStyle(.bordered)
                }
                .disabled(renderer == .clock)
                Toggle("Animated (off = static poster frame)", isOn: $animated)
                Toggle("Debug boundaries", isOn: $showBounds)
                if renderer == .clock {
                    Text("The clock driver runs off the wall clock like the widget, so play/pause and restart do not apply. The barcode at the top encodes the displayed frame.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .padding()
        }
        .navigationTitle("Preview")
    }

    private func widgetBox(engine: AquariumAnimationEngine, frame: Int, pixels: PixelArtRenderer?, now: Date) -> some View {
        let size = widgetSize
        let fish: AquariumCanvasView.FishContent
        var codeAnchor: Date?
        if renderer == .clock && animated {
            let anchor = engine.schedule.anchor(for: now)
            fish = .clock(anchor: anchor)
            codeAnchor = anchor
        } else if let image = pixels?.frameImage(frame) {
            fish = .image(image)
        } else {
            fish = .none
        }
        return ZStack {
            if let bg = model.previewBackgroundImage {
                Image(uiImage: bg).resizable().interpolation(.none)
            } else {
                Color(red: 22 / 255, green: 92 / 255, blue: 110 / 255)
            }
            AquariumCanvasView(engine: engine, size: size, displayScale: displayScale, fish: fish,
                               showCanvasBounds: showBounds, frameCodeAnchor: codeAnchor)
        }
        .frame(width: size.width, height: size.height)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay {
            if showBounds { RoundedRectangle(cornerRadius: 22, style: .continuous).stroke(Color.red, lineWidth: 1) }
        }
        // The anchor must stay fixed while the clock driver is on screen.
        .id(renderer == .clock ? engine.schedule.anchor(for: now).timeIntervalSince1970 : 0)
    }

    /// Calibrated widget size in points, or a typical large-widget size until calibrated.
    private var widgetSize: CGSize {
        if let p = model.profile {
            return CGSize(width: Double(p.widgetBoundsPixels.width) / p.displayScale,
                          height: Double(p.widgetBoundsPixels.height) / p.displayScale)
        }
        return CGSize(width: 338, height: 354)
    }

    private func stat(_ label: String, _ value: String) -> some View {
        VStack {
            Text(label).font(.caption2).foregroundStyle(.secondary)
            Text(value).font(.callout.monospacedDigit())
        }
        .frame(maxWidth: .infinity)
    }

    private func togglePlay() {
        if playing {
            pausedElapsed = Date().timeIntervalSince(startDate)
        } else if let paused = pausedElapsed {
            startDate = Date().addingTimeInterval(-paused)
            pausedElapsed = nil
        }
        playing.toggle()
    }

    private func restart() {
        startDate = Date()
        pausedElapsed = playing ? nil : 0
    }
}

/// Counts distinct displayed frames per second over a sliding one-second window.
final class FrameRateMeter {
    private var lastFrame: Int?
    private var changes: [Date] = []

    func tick(frame: Int, at date: Date) -> Double {
        if frame != lastFrame {
            lastFrame = frame
            changes.append(date)
        }
        changes.removeAll { date.timeIntervalSince($0) > 1 }
        return Double(changes.count)
    }
}
