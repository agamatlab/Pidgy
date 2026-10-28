import Foundation

/// Which widget a view/background belongs to. Each role is its own widget kind, so a widget
/// always knows what it is (WidgetKit doesn't tell a widget where it sits).
enum WidgetRole: String, Codable, CaseIterable {
    /// Large widget (kind "AquariumWidget", kept so placed widgets survive).
    case primary
    /// Medium widget.
    case secondary
    /// Small widget.
    case small
    /// Second Small widget (its own kind, so two Small widgets can show different things).
    case small2

    var kind: String {
        switch self {
        case .primary: return SharedConfigurationStore.widgetKind
        case .secondary: return "SecondaryWidget"
        case .small: return "SmallWidget"
        case .small2: return "SmallWidget2"
        }
    }

    /// Border colour of the calibration chart, so one screenshot tells the widgets apart.
    var calibrationColor: RGBA {
        switch self {
        case .primary: return .calibrationMagenta
        case .secondary: return .calibrationCyan
        case .small: return .calibrationYellow
        case .small2: return .calibrationBlue
        }
    }
}

enum ThemeId: String, Codable, CaseIterable, Identifiable {
    case aquarium
    case midnightManor
    case hauntedWindow

    var id: String { rawValue }
    var title: String {
        switch self {
        case .aquarium: return "Aquarium"
        case .midnightManor: return "Manor"
        case .hauntedWindow: return "Haunted"
        }
    }
    var theme: Theme {
        switch self {
        case .aquarium: return .aquarium
        case .midnightManor: return .midnightManor
        case .hauntedWindow: return .hauntedWindow
        }
    }
}

/// Static description of a theme: wallpaper art and what each widget shows.
struct Theme {
    struct WidgetArt {
        /// Bundle PNG drawn as the widget background (and painted under the widget in the wallpaper).
        var staticArt: String
        var motion: Motion
        /// Furniture pasted into the wallpaper right under the widget (aquarium cabinet, window seat).
        var under: String? = nil
        /// Something pasted right above it (the nail and wire a picture frame hangs from).
        var over: String? = nil
        /// Drawn over the animation: things the animated character goes behind.
        var foreground: String? = nil
        /// Light the wall around the widget's edge (hides the light rim iOS draws round widgets).
        var edgeGlow = false
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
    /// Build the wall as a bookcase laid out round the calibrated widgets (BookshelfRoom);
    /// `roomArt` then only supplies the ceiling.
    var adaptiveBookshelf = false
    /// Fill the corners iOS rounds off with woodwork that follows the measured curve, so each
    /// widget reads as a compartment with carved rounded corners.
    var roundedCompartments = false
    /// A finished wallpaper used exactly as it is (for screens of its size) instead of composing
    /// one; the widgets are cut from it like from a composed one.
    var fixedWallpaper: String? = nil
    var primary: WidgetArt?
    var secondary: WidgetArt?
    var small: WidgetArt? = nil
    var small2: WidgetArt? = nil

    func art(for role: WidgetRole) -> WidgetArt? {
        switch role {
        case .primary: return primary
        case .secondary: return secondary
        case .small: return small
        case .small2: return small2
        }
    }

    static let aquarium = Theme(id: .aquarium, artPixelPoints: 3, roomArt: "room_art.png",
                                primary: WidgetArt(staticArt: "tank_art.png", motion: .fish, under: "stand_art.png"), secondary: nil)

    static let midnightManor = Theme(id: .midnightManor, artPixelPoints: 2, roomArt: "hw_room.png",
                                     primary: WidgetArt(staticArt: "hw_portrait.png", motion: .layer(fontPrefix: "HWPortrait")),
                                     secondary: WidgetArt(staticArt: "hw_window.png", motion: .layer(fontPrefix: "HWWindow")))

    /// Halloween v2: a candle-lit wall of bookshelves; one ghost runs a 30 s loop across two Small
    /// widgets that blend into the wall (no frames). Top left: out of a secret door, loops, back
    /// in. Bottom right: out from behind the fireplace, a spin, behind the chair, out of the screen.
    static let hauntedWindow = Theme(id: .hauntedWindow, artPixelPoints: 2, roomArt: "hw_library2.png", adaptiveBookshelf: true,
                                     fixedWallpaper: "hw_haunted_wallpaper.png",
                                     primary: nil, secondary: nil,
                                     small: WidgetArt(staticArt: "hw_ghost_a.png", motion: .layer(fontPrefix: "HWGhostA"),
                                                      over: "hw_sconce.png", foreground: "hw_ghost_a_fg.png"),
                                     small2: WidgetArt(staticArt: "hw_ghost_b.png", motion: .layer(fontPrefix: "HWGhostB"),
                                                       over: "hw_sconce.png", foreground: "hw_ghost_b_fg.png"))
}

extension SceneBundle {
    static func image(_ file: String, bundle: Bundle = .main) -> URL? {
        let name = file as NSString
        return bundle.url(forResource: name.deletingPathExtension, withExtension: name.pathExtension)
    }
}
