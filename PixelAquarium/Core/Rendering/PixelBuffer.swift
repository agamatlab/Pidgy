import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

/// Simple 8-bit RGBA (premultiplied, sRGB) bitmap used for pixel-exact drawing and analysis.
struct PixelBuffer {
    let width: Int
    let height: Int
    var data: [UInt8]

    static let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!

    init(width: Int, height: Int, fill: RGBA = .clear) {
        self.width = width
        self.height = height
        data = [UInt8](repeating: 0, count: width * height * 4)
        if fill != .clear {
            for i in 0..<(width * height) { set(i % width, i / width, fill) }
        }
    }

    /// Converts any CGImage (e.g. a Display P3 screenshot) into sRGB RGBA8.
    init?(image: CGImage) {
        width = image.width
        height = image.height
        data = [UInt8](repeating: 0, count: width * height * 4)
        let ok = data.withUnsafeMutableBytes { raw -> Bool in
            guard let ctx = CGContext(data: raw.baseAddress, width: width, height: height, bitsPerComponent: 8,
                                      bytesPerRow: width * 4, space: Self.colorSpace,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            ctx.interpolationQuality = .none
            ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        if !ok { return nil }
    }

    @inline(__always) func pixel(_ x: Int, _ y: Int) -> RGBA {
        let i = (y * width + x) * 4
        return RGBA(r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3])
    }

    @inline(__always) mutating func set(_ x: Int, _ y: Int, _ c: RGBA) {
        let i = (y * width + x) * 4
        data[i] = c.r
        data[i + 1] = c.g
        data[i + 2] = c.b
        data[i + 3] = c.a
    }

    mutating func fillRect(x: Int, y: Int, width w: Int, height h: Int, _ c: RGBA) {
        for yy in max(0, y)..<min(height, y + h) {
            for xx in max(0, x)..<min(width, x + w) { set(xx, yy, c) }
        }
    }

    /// Source-over composite of an unpremultiplied-opaque-or-transparent sprite (alpha 0 or 255).
    mutating func blit(_ src: PixelBuffer, x: Int, y: Int, flipped: Bool = false) {
        for sy in 0..<src.height {
            let dy = y + sy
            guard dy >= 0, dy < height else { continue }
            for sx in 0..<src.width {
                let dx = x + sx
                guard dx >= 0, dx < width else { continue }
                let c = src.pixel(flipped ? src.width - 1 - sx : sx, sy)
                if c.a >= 128 { set(dx, dy, RGBA(r: c.r, g: c.g, b: c.b, a: 255)) }
            }
        }
    }

    mutating func applyColorMap(_ map: ColorMap) {
        for i in stride(from: 0, to: data.count, by: 4) {
            for c in 0..<3 {
                data[i + c] = UInt8(max(0, min(255, map.apply(Double(data[i + c]), channel: c).rounded())))
            }
        }
    }

    func cropped(_ rect: PixelRect) -> PixelBuffer {
        var out = PixelBuffer(width: rect.width, height: rect.height)
        for y in 0..<rect.height {
            let sy = rect.y + y
            guard sy >= 0, sy < height else { continue }
            for x in 0..<rect.width {
                let sx = rect.x + x
                guard sx >= 0, sx < width else { continue }
                out.set(x, y, pixel(sx, sy))
            }
        }
        return out
    }

    func cgImage() -> CGImage? {
        let provider = CGDataProvider(data: Data(data) as CFData)!
        return CGImage(width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: width * 4,
                       space: Self.colorSpace, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
                       provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)
    }

    func pngData() -> Data? {
        guard let image = cgImage() else { return nil }
        let out = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(out, UTType.png.identifier as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(dest, image, nil)
        return CGImageDestinationFinalize(dest) ? out as Data : nil
    }

    static func load(url: URL) -> PixelBuffer? {
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
        return PixelBuffer(image: image)
    }

    static func load(data: Data) -> PixelBuffer? {
        guard let src = CGImageSourceCreateWithData(data as CFData, nil),
              let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
        return PixelBuffer(image: image)
    }
}

struct RGBA: Equatable {
    var r: UInt8
    var g: UInt8
    var b: UInt8
    var a: UInt8 = 255

    static let clear = RGBA(r: 0, g: 0, b: 0, a: 0)
    static let calibrationMagenta = RGBA(r: 255, g: 0, b: 255)
    static let calibrationCyan = RGBA(r: 0, g: 255, b: 255)
    static let fiducialGreen = RGBA(r: 0, g: 255, b: 0)
    static let water = RGBA(r: 22, g: 92, b: 110)
}
