import SwiftUI
import WidgetKit

/// Large widget: the theme's main object (aquarium tank, witch portrait).
struct AquariumWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetRole.primary.kind, provider: AquariumTimelineProvider(role: .primary)) { entry in
            AquariumWidgetView(entry: entry)
        }
        .configurationDisplayName("Pidgy · Large")
        .description("The scene's main animated object (tank, portrait).")
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}

/// Medium widget: the theme's second object (Midnight Manor window).
struct SecondaryWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetRole.secondary.kind, provider: AquariumTimelineProvider(role: .secondary)) { entry in
            AquariumWidgetView(entry: entry)
        }
        .configurationDisplayName("Pidgy · Medium")
        .description("The scene's second animated object (window).")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

/// Small widget: the theme's small object (Haunted ghost frame).
struct SmallWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetRole.small.kind, provider: AquariumTimelineProvider(role: .small)) { entry in
            AquariumWidgetView(entry: entry)
        }
        .configurationDisplayName("Pidgy · Small")
        .description("The scene's small animated object (ghost frame).")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

/// Second Small widget: lets a theme use two different Small widgets (Haunted: the bottom-right one).
struct SmallWidget2: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetRole.small2.kind, provider: AquariumTimelineProvider(role: .small2)) { entry in
            AquariumWidgetView(entry: entry)
        }
        .configurationDisplayName("Pidgy · Small 2")
        .description("The scene's second small widget (Haunted: bottom right).")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

@main
struct AquariumWidgetBundle: WidgetBundle {
    var body: some Widget {
        AquariumWidget()
        SecondaryWidget()
        SmallWidget()
        SmallWidget2()
    }
}
