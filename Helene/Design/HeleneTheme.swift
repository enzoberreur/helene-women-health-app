import SwiftUI

enum HeleneTheme {

    // MARK: - Brand accent (same in both modes)
    static let rose = Color(hex: "#D0607A")

    // MARK: - Pastel Card Fills — same in light and dark
    //
    // These stay as soft pastels in both modes.
    // Views that use these as a card background should apply
    // .environment(\.colorScheme, .light) so text on them stays dark and legible.
    //
    static let lavenderFill = Color(hex: "#E4D0EC")
    static let sageFill     = Color(hex: "#FCC8CC")
    static let marigoldFill = Color(hex: "#FCE4A8")
    static let peachFill    = Color(hex: "#FCD4C8")
    static let mintFill     = Color(hex: "#D0E8E4")

    // MARK: - Semantic Colors (adaptive)
    enum Colors {

        // ─── Surfaces ───────────────────────────────────────────────────────
        /// Light: warm parchment  ·  Dark: near-black with the faintest warm hint
        static let background  = Color(light: "#F7F4F0", dark: "#0D0B0E")

        /// Light: warm cream  ·  Dark: very dark elevated surface
        static let surface     = Color(light: "#EDEAE6", dark: "#181520")

        // ─── Text ───────────────────────────────────────────────────────────
        /// Light: warm near-black  ·  Dark: warm off-white
        static let textPrimary = Color(light: "#242018", dark: "#F0EAE0")

        /// Light: warm mid-grey  ·  Dark: muted warm-grey
        static let textSecond  = Color(light: "#8A8070", dark: "#9A8E80")

        /// Light: muted  ·  Dark: dim warm-grey — captions, placeholders
        static let textLight   = Color(light: "#B8B0A8", dark: "#564E48")

        // ─── UI chrome ──────────────────────────────────────────────────────
        /// Light: subtle warm divider  ·  Dark: barely-there dark line
        static let separator   = Color(light: "#E2DED8", dark: "#1E1A24")

        /// CTA button + tab bar capsule.
        ///
        /// Light → near-black #1C1917   White text: 16:1 ✓
        /// Dark  → rose-wine  #8C3E5A   White text:  6:1 ✓
        ///
        /// The rose-wine directly echoes the brand's rose and glows
        /// against the near-black background with strong presence.
        static let dark        = Color(light: "#1C1917", dark: "#8C3E5A")
    }

    // MARK: - Radius
    enum Radius {
        static let small:  CGFloat = 10
        static let medium: CGFloat = 16
        static let card:   CGFloat = 24
        static let button: CGFloat = 16
        static let pill:   CGFloat = 100
    }

    // MARK: - Spacing
    enum Spacing {
        static let xs:  CGFloat = 4
        static let sm:  CGFloat = 8
        static let md:  CGFloat = 16
        static let lg:  CGFloat = 24
        static let xl:  CGFloat = 32
        static let xxl: CGFloat = 52
    }
}

// MARK: - Color helpers

extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: h).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch h.count {
        case 3:  (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:  (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:  (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB,
                  red:     Double(r) / 255,
                  green:   Double(g) / 255,
                  blue:    Double(b) / 255,
                  opacity: Double(a) / 255)
    }

    /// Adaptive colour — switches between light and dark hex values automatically.
    init(light lightHex: String, dark darkHex: String) {
        self.init(UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: darkHex)
                : UIColor(hex: lightHex)
        })
    }
}

// MARK: - Conditional light-scheme helper
//
// Apply .environment(\.colorScheme, .light) only when a view sits on a pastel fill.
// Usage: .lightSchemeOnFill(isSelected)
//
extension View {
    @ViewBuilder
    func lightSchemeOnFill(_ condition: Bool) -> some View {
        if condition {
            environment(\.colorScheme, .light)
        } else {
            self
        }
    }
}

extension UIColor {
    convenience init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: h).scanHexInt64(&int)
        let r = CGFloat(int >> 16 & 0xFF) / 255
        let g = CGFloat(int >>  8 & 0xFF) / 255
        let b = CGFloat(int        & 0xFF) / 255
        self.init(red: r, green: g, blue: b, alpha: 1)
    }
}
