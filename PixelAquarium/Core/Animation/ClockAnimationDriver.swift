import SwiftUI

/// EXPERIMENTAL. Adapts the timer-ligature technique from
/// github.com/brycebostwick/WidgetAnimation to transparent, full-colour frame fonts.
///
/// No timers, TimelineView or timeline reloads are involved: the system keeps
/// `Text(date, style: .timer)` views ticking on the Home Screen, and custom fonts turn the
/// seconds digits of each timer into an animation frame.
///  - `fontCount` (= 2 * fps) timers are layered, one per frame font. Font j's timer is offset
///    by 1 + j / fps and ligates its seconds digits into glyph (seconds % loop) / 2.
///  - The reference stacks opaque frames so later layers cover earlier ones. Fish frames are
///    transparent, so every layer instead gets its own window: blink(j) shows a full glyph on
///    even seconds of a timer offset by j / fps, inverse-blink(j + 1) shows one on odd seconds
///    of a timer offset by (j + 1) / fps. Their intersection is open for the j-th 1/fps slot
///    of each 2 s window (plus `handoffOverlap`), and font j's glyph only changes while closed.
/// Keep all knowledge of the trick inside this file.
struct ClockAnimationDriver: View {
    let schedule: ClockSchedule
    /// Font family prefix; fonts are named "<prefix><j>-Regular".
    let fontPrefix: String
    let blinkFont: String
    let blinkInverseFont: String
    let anchor: Date
    /// Canvas size in points. Height drives the font size; width must match the glyph aspect.
    let size: CGSize

    var body: some View {
        ZStack {
            ForEach(0..<schedule.fontCount, id: \.self) { j in
                frameText(j)
                    .mask(mask(blinkFont, offset: Double(j) * schedule.frameDuration))
                    .mask(mask(blinkInverseFont, offset: Double(j + 1) * schedule.frameDuration + schedule.handoffOverlap))
            }
        }
        .frame(width: size.width, height: size.height)
        .clipped()
        // Timer digits must be ASCII 0-9 for the ligatures to match.
        .environment(\.locale, Locale(identifier: "en_US_POSIX"))
    }

    private func frameText(_ index: Int) -> some View {
        Text(anchor.addingTimeInterval(1 + Double(index) * schedule.frameDuration), style: .timer)
            .font(.custom("\(fontPrefix)\(index)-Regular", fixedSize: size.height))
            .trailingGlyph(width: size.width, height: size.height)
    }

    /// Square mask glyph large enough to cover the canvas, pinned top-leading.
    private func mask(_ font: String, offset: TimeInterval) -> some View {
        let side = max(size.width, size.height)
        return Text(anchor.addingTimeInterval(offset), style: .timer)
            .font(.custom("\(font)-Regular", fixedSize: side))
            .trailingGlyph(width: side, height: side)
            .frame(width: size.width, height: size.height, alignment: .topLeading)
            .clipped()
    }
}

private extension Text {
    /// Pins the timer's last glyph (the ligated seconds) to a `width` x `height` box.
    /// Filler glyphs (minutes, colon) have ~zero advance and draw nothing.
    func trailingGlyph(width: CGFloat, height: CGFloat) -> some View {
        self
            .lineLimit(1)
            .multilineTextAlignment(.trailing)
            .frame(width: width * 4, height: height, alignment: .trailing)
            .frame(width: width, height: height, alignment: .trailing)
    }
}
