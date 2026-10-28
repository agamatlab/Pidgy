import CoreGraphics
import Foundation

/// What the widget shows in Calibration mode: a magenta border (found in screenshots to get the
/// widget rectangle) around a grid of known colours (read back to measure how iOS alters
/// widget content). Layout is in widget points and shared by widget and app.
enum CalibrationChart {
    static let borderPoints: CGFloat = 16
    static let columns = 6
    static let rows = 6
    /// Low levels are needed: iOS 27 boosts red ~2.5x, so only dark reds stay measurable. Some
    /// patches therefore resemble border colours; border detection tells them apart by shape.
    private static let levels: [Double] = [16, 60, 105, 150, 195, 240]

    /// Each channel takes every level equally often and the channels vary independently.
    static let colors: [RGBA] = (0..<(columns * rows)).map { i in
        let a = i % 6, b = i / 6
        return RGBA(r: UInt8(levels[a]), g: UInt8(levels[b]), b: UInt8(levels[(a + 2 * b) % 6]))
    }

    static func patchRect(_ index: Int, widgetSize: CGSize) -> CGRect {
        let inset = borderPoints + 6
        let w = (widgetSize.width - 2 * inset) / CGFloat(columns)
        let h = (widgetSize.height - 2 * inset) / CGFloat(rows)
        return CGRect(x: inset + CGFloat(index % columns) * w, y: inset + CGFloat(index / columns) * h, width: w, height: h)
    }

    /// Median colour of the central half of every patch in a screenshot.
    static func readPatches(screenshot: PixelBuffer, widgetRect: PixelRect, widgetPointSize: CGSize) -> [[Double]] {
        let k = Double(widgetRect.width) / widgetPointSize.width
        return colors.indices.map { i in
            let r = patchRect(i, widgetSize: widgetPointSize)
            var ch: [[Double]] = [[], [], []]
            let x0 = Int(Double(widgetRect.x) + (r.minX + r.width * 0.25) * k)
            let x1 = Int(Double(widgetRect.x) + (r.maxX - r.width * 0.25) * k)
            let y0 = Int(Double(widgetRect.y) + (r.minY + r.height * 0.25) * k)
            let y1 = Int(Double(widgetRect.y) + (r.maxY - r.height * 0.25) * k)
            for y in stride(from: max(0, y0), to: min(screenshot.height, y1), by: 2) {
                for x in stride(from: max(0, x0), to: min(screenshot.width, x1), by: 2) {
                    let p = screenshot.pixel(x, y)
                    ch[0].append(Double(p.r)); ch[1].append(Double(p.g)); ch[2].append(Double(p.b))
                }
            }
            return ch.map(CalibrationManager.median)
        }
    }

    /// Fit of screen = map(content); clipped channels are skipped per patch (iOS 27 lifts red
    /// ~2.5x, so bright red patches saturate).
    static func fitWidgetMap(observed: [[Double]]) -> ColorMap? {
        ColorMap.fit(source: colors.map { [Double($0.r), Double($0.g), Double($0.b)] }, screen: observed)
    }
}
