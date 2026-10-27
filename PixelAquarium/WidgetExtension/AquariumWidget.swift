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

@main
struct AquariumWidgetBundle: WidgetBundle {
    var body: some Widget {
        AquariumWidget()
        SecondaryWidget()
    }
}
