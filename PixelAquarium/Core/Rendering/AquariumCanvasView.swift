import SwiftUI

/// Widget-sized foreground content (no background), shared by the widget and the app preview
/// so both use the same assets, layout and driver.
struct AquariumCanvasView: View {
    enum FishContent {
        /// Clock-driven animation (experimental technique).
        case clock(anchor: Date)
        /// One pre-rendered frame (fallback A, or the engine-driven preview).
        case image(CGImage)
        case none
    }

    let engine: AquariumAnimationEngine
    let size: CGSize
    let displayScale: CGFloat
    let fish: FishContent
    var showCanvasBounds = false
    /// Frame-index barcode for screen-recording analysis (Tools/analyze_recording.py).
    var frameCodeAnchor: Date?

    static let codeStripHeight: CGFloat = 10

    private var codeSchedule: ClockSchedule {
        var s = engine.schedule
        s.handoffOverlap = 0
        return s
    }

    var canvasRect: CGRect {
        FishCanvasLayout.rect(widgetSize: size, region: engine.manifest.aquariumRegion,
                              canvasWidth: engine.clip.canvasWidth, canvasHeight: engine.clip.canvasHeight,
                              displayScale: displayScale, artPixelPoints: engine.clip.artPixelPoints)
    }

    var body: some View {
        let rect = canvasRect
        ZStack(alignment: .topLeading) {
            fishLayer(rect.size)
                .frame(width: rect.width, height: rect.height)
                .overlay {
                    if showCanvasBounds { Rectangle().stroke(Color.yellow, lineWidth: 1) }
                }
                .offset(x: rect.minX, y: rect.minY)

            if let frameCodeAnchor {
                let h = Self.codeStripHeight
                let w = h * CGFloat(engine.clip.driver.codeCells)
                // No hand-off overlap: overlapping codes would OR together, and gaps (blank
                // strip) are exactly what the recording analysis needs to count.
                ClockAnimationDriver(schedule: codeSchedule, fontPrefix: engine.clip.driver.codeFont,
                                     blinkFont: engine.clip.driver.blinkFont,
                                     blinkInverseFont: engine.clip.driver.blinkInverseFont, anchor: frameCodeAnchor,
                                     size: CGSize(width: w, height: h))
                    .foregroundStyle(Color.white)
                    .background(Color.black)
                    .padding(2)
                    .background(Color.black)
                    .offset(x: (size.width - w) / 2 - 2, y: 4)
            }
        }
        .frame(width: size.width, height: size.height, alignment: .topLeading)
    }

    @ViewBuilder
    private func fishLayer(_ canvas: CGSize) -> some View {
        switch fish {
        case .clock(let anchor):
            ClockAnimationDriver(schedule: engine.schedule, fontPrefix: engine.clip.driver.framesFont,
                                 blinkFont: engine.clip.driver.blinkFont,
                                 blinkInverseFont: engine.clip.driver.blinkInverseFont, anchor: anchor, size: canvas)
                // Colour comes from the SVG glyphs. Magenta here means the monochrome
                // fallback outlines were drawn instead (colour glyphs unsupported).
                .foregroundStyle(Color(red: 1, green: 0, blue: 1))
        case .image(let image):
            Image(decorative: image, scale: 1)
                .resizable()
                .interpolation(.none)
        case .none:
            EmptyView()
        }
    }
}
