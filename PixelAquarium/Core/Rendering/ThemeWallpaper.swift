import CoreGraphics
import Foundation

/// The wallpaper of an object-style theme, laid out round the calibrated widgets: the room (or
/// the adaptive bookcase), furniture attached to each widget, each widget's own art painted under
/// its rounded corners, all pre-compensated for how iOS shows wallpaper colours.
enum ThemeWallpaper {
    static func render(theme: Theme, profile: CalibrationProfile?, screen size: PixelSize, pxPerArtPixel k: Int,
                       bundle: Bundle = .main) -> PixelBuffer? {
        func load(_ file: String) -> PixelBuffer? { SceneBundle.image(file, bundle: bundle).flatMap(PixelBuffer.load(url:)) }
        guard var room = load(theme.roomArt) else { return nil }
        let transform = profile?.wallpaperTransform ?? .identity
        if theme.adaptiveBookshelf {
            // the bookcase is laid out round the widgets: their edges become shelves and uprights
            let ox = (room.width * k - size.width) / 2, oy = (room.height * k - size.height) / 2
            func art(_ r: PixelRect) -> CGRect {
                let w = transform.toWallpaper(r.cgRect)
                return CGRect(x: (w.minX + CGFloat(ox)) / CGFloat(k), y: (w.minY + CGFloat(oy)) / CGFloat(k),
                              width: w.width / CGFloat(k), height: w.height / CGFloat(k))
            }
            let rects = WidgetRole.allCases.compactMap { role in theme.art(for: role) != nil ? profile?.bounds(role).map(art) : nil }
            let floorY = rects.map { Int($0.maxY.rounded()) }.max().map { min($0, room.height - 20) } ?? 404
            guard let floor = load("hw_floor_strip.png") else { return nil }
            let books = (1...3).compactMap { load("lib_books_\($0).png") }
            room = BookshelfRoom.render(.init(room: room, ceiling: 40, books: books, floor: floor),
                                        size: PixelSize(width: room.width, height: room.height), widgets: rects, floorY: floorY)
        }
        // furniture follows each calibrated widget; before calibration only the main widget's
        // stand goes to a default spot
        var attachments: [WallpaperRenderer.Attachment] = []
        for role in WidgetRole.allCases {
            guard let art = theme.art(for: role) else { continue }
            let rect = profile?.bounds(role)
            if rect == nil && (profile != nil || role != .primary) { continue }
            for (file, under) in [(art.under, true), (art.over, false)] {
                if let file, let img = load(file) { attachments.append(.init(art: img, rect: rect, under: under)) }
            }
        }
        let underlays = WidgetRole.allCases.compactMap { role -> (art: PixelBuffer, rect: PixelRect)? in
            guard let r = profile?.bounds(role), let file = theme.art(for: role)?.staticArt, var art = load(file) else { return nil }
            // what the widget shows in front of its animation belongs under its corners too
            if let fgFile = theme.art(for: role)?.foreground, let fg = load(fgFile), fg.width == art.width, fg.height == art.height {
                art.blit(fg, x: 0, y: 0)
            }
            return (art, r)
        }
        let glows = WidgetRole.allCases.compactMap { role in theme.art(for: role)?.edgeGlow == true ? profile?.bounds(role) : nil }
        return WallpaperRenderer.roomWallpaper(room: room, attachments: attachments, screen: size, pxPerArtPixel: k,
                                               transform: transform, underlays: underlays, glows: glows,
                                               wallpaperColorMap: profile?.wallpaperColorMap ?? .identity)
    }
}
