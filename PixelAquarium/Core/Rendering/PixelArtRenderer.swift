import CoreGraphics
import Foundation

/// Composites animation frames at logical (1 px = 1 art pixel) resolution.
/// Scaling to the screen happens in SwiftUI with `.interpolation(.none)`.
struct PixelArtRenderer {
    let clip: AnimationClip
    private let sprites: [String: [PixelBuffer]]

    init(clip: AnimationClip, bundle: Bundle = .main) throws {
        self.clip = clip
        var sprites: [String: [PixelBuffer]] = [:]
        for el in clip.elements {
            let name = (el.sprite as NSString).deletingPathExtension
            guard let url = bundle.url(forResource: name, withExtension: "png") else {
                throw SceneError.missingResource(el.sprite)
            }
            guard let sheet = PixelBuffer.load(url: url) else { throw SceneError.invalidSprite(el.sprite) }
            let count = sheet.width / el.frameWidth
            sprites[el.id] = (0..<count).map {
                sheet.cropped(PixelRect(x: $0 * el.frameWidth, y: 0, width: el.frameWidth, height: el.frameHeight))
            }
        }
        self.sprites = sprites
    }

    /// Fish layer only, transparent elsewhere.
    func frame(_ index: Int) -> PixelBuffer {
        var canvas = PixelBuffer(width: clip.canvasWidth, height: clip.canvasHeight)
        for (el, p) in zip(clip.elements, clip.placements(frame: index)) {
            guard let frames = sprites[el.id], p.spriteFrame < frames.count else { continue }
            canvas.blit(frames[p.spriteFrame], x: p.x, y: p.y, flipped: p.flipped)
        }
        return canvas
    }

    func frameImage(_ index: Int) -> CGImage? { frame(index).cgImage() }
}

/// Where the fish canvas sits inside a widget-sized box, snapped so one art pixel is a whole
/// number of device pixels (PRD 6.1). Shared by the widget and the in-app preview.
enum FishCanvasLayout {
    /// `artPixelPoints` caps the fish pixel at the wallpaper's art-pixel size so both match.
    static func rect(widgetSize: CGSize, region: NormalizedRect, canvasWidth: Int, canvasHeight: Int,
                     displayScale: CGFloat, artPixelPoints: Int? = nil) -> CGRect {
        let scale = max(displayScale, 1)
        let water = region.denormalized(in: widgetSize)
        var pxPerArtPixel = max(1, min((water.width * scale / CGFloat(canvasWidth)).rounded(.down),
                                       (water.height * scale / CGFloat(canvasHeight)).rounded(.down)))
        if let artPixelPoints { pxPerArtPixel = min(pxPerArtPixel, CGFloat(artPixelPoints) * scale) }
        let w = pxPerArtPixel * CGFloat(canvasWidth) / scale
        let h = pxPerArtPixel * CGFloat(canvasHeight) / scale
        let x = ((water.midX - w / 2) * scale).rounded() / scale
        let y = ((water.midY - h / 2) * scale).rounded() / scale
        return CGRect(x: x, y: y, width: w, height: h)
    }
}
