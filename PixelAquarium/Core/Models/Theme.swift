import Foundation

/// Which widget a view/background belongs to. Each role is its own widget kind, so a widget
/// always knows what it is (WidgetKit doesn't tell a widget where it sits).
enum WidgetRole: String, Codable, CaseIterable {
    /// Large widget (kind "AquariumWidget", kept so placed widgets survive).
    case primary
    /// Medium widget.
    case secondary

    var kind: String { self == .primary ? SharedConfigurationStore.widgetKind : "SecondaryWidget" }
}

enum ThemeId: String, Codable, CaseIterable, Identifiable {
    case aquarium
    case midnightManor

    var id: String { rawValue }
    var title: String { self == .aquarium ? "Aquarium" : "Midnight Manor" }
    var theme: Theme { self == .aquarium ? .aquarium : .midnightManor }
}

/// Static description of a theme: wallpaper art and what each widget shows.
struct Theme {
    struct WidgetArt {
        /// Bundle PNG drawn as the widget background (and painted under the widget in the wallpaper).
        var staticArt: String
        var motion: Motion
    }

    enum Motion {
        /// The aquarium fish engine (frames.json + AquaFrames fonts), placed in the scene's water region.
        case fish
        /// A full-widget animated layer: fonts "<prefix><j>-Regular" made by Tools/generate_layer_fonts.py.
        case layer(fontPrefix: String)
    }

    var id: ThemeId
    /// Points per art pixel; wallpaper and widget art share it so their pixels match.
    var artPixelPoints: Int
    var roomArt: String
    /// Optional furniture pasted under the primary widget (the aquarium's cabinet).
    var standArt: String?
    var primary: WidgetArt
    var secondary: WidgetArt?

    func art(for role: WidgetRole) -> WidgetArt? { role == .primary ? primary : secondary }

    static let aquarium = Theme(id: .aquarium, artPixelPoints: 3, roomArt: "room_art.png", standArt: "stand_art.png",
                                primary: WidgetArt(staticArt: "tank_art.png", motion: .fish), secondary: nil)

    static let midnightManor = Theme(id: .midnightManor, artPixelPoints: 2, roomArt: "hw_room.png", standArt: nil,
                                     primary: WidgetArt(staticArt: "hw_portrait.png", motion: .layer(fontPrefix: "HWPortrait")),
                                     secondary: WidgetArt(staticArt: "hw_window.png", motion: .layer(fontPrefix: "HWWindow")))
}

extension SceneBundle {
    static func image(_ file: String, bundle: Bundle = .main) -> URL? {
        let name = file as NSString
        return bundle.url(forResource: name.deletingPathExtension, withExtension: name.pathExtension)
    }
}
