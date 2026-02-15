import AppKit

enum VineIconRenderer {
    private static let size = NSSize(width: 18, height: 18)

    struct Badge {
        let symbolName: String
        let prominence: IconState.BadgeProminence
    }

    /// Cached menu bar icon loaded from bundle
    private static let cachedIcon: NSImage? = {
        // Try to load the bundled icon
        if let iconURL = Bundle.main.url(forResource: "menubar-icon", withExtension: "png"),
           let image = NSImage(contentsOf: iconURL) {
            image.size = size
            return image
        }
        // Fallback: try loading from app icon
        if let appIcon = NSImage(named: "Wildvine") {
            let resized = NSImage(size: size)
            resized.lockFocus()
            appIcon.draw(in: NSRect(origin: .zero, size: size),
                        from: NSRect(origin: .zero, size: appIcon.size),
                        operation: .copy,
                        fraction: 1.0)
            resized.unlockFocus()
            return resized
        }
        return nil
    }()

    /// Creates a vine icon - uses bundled icon image
    /// - Parameters:
    ///   - sway: Amount of sway (ignored - for API compatibility)
    ///   - growth: Growth pulse (0 to 1), indicates working state
    ///   - windEffect: Wind effect (ignored - for API compatibility)
    ///   - isIdle: If true, shows dimmed state
    ///   - badge: Optional badge overlay
    static func makeIcon(
        sway: CGFloat = 0,
        growth: CGFloat = 0,
        windEffect: CGFloat = 0,
        isIdle: Bool = false,
        badge: Badge? = nil
    ) -> NSImage {
        // Try to use cached bundled icon first
        if let baseIcon = cachedIcon {
            return self.applyEffects(to: baseIcon, growth: growth, isIdle: isIdle, badge: badge)
        }

        // Fallback to programmatic icon if no bundled icon
        return self.makeIconProgrammatic(sway: sway, growth: growth, windEffect: windEffect, isIdle: isIdle, badge: badge)
    }

    private static func applyEffects(to baseIcon: NSImage, growth: CGFloat, isIdle: Bool, badge: Badge?) -> NSImage {
        let isWorking = growth > 0.1
        let scale = isWorking ? (1.0 + growth * 0.12) : 1.0

        let result = NSImage(size: size)
        result.lockFocus()

        guard let ctx = NSGraphicsContext.current?.cgContext else {
            result.unlockFocus()
            return baseIcon
        }

        // Apply scale for "working" animation
        if scale != 1.0 {
            ctx.translateBy(x: size.width / 2, y: size.height / 2)
            ctx.scaleBy(x: scale, y: scale)
            ctx.translateBy(x: -size.width / 2, y: -size.height / 2)
        }

        // Draw the icon
        baseIcon.draw(in: NSRect(origin: .zero, size: size),
                     from: NSRect(origin: .zero, size: baseIcon.size),
                     operation: .sourceOver,
                     fraction: 1.0)

        // Draw badge if present
        if let badge {
            self.drawBadge(badge, context: ctx, size: size)
        }

        result.unlockFocus()
        result.isTemplate = false
        return result
    }

    /// Fallback programmatic icon (simplified leaf shape)
    private static func makeIconProgrammatic(
        sway: CGFloat = 0,
        growth: CGFloat = 0,
        windEffect: CGFloat = 0,
        isIdle: Bool = false,
        badge: Badge? = nil
    ) -> NSImage {
        guard let rep = self.makeBitmapRep() else {
            return NSImage(size: self.size)
        }
        rep.size = self.size

        NSGraphicsContext.saveGraphicsState()
        defer { NSGraphicsContext.restoreGraphicsState() }

        guard let context = NSGraphicsContext(bitmapImageRep: rep) else {
            return NSImage(size: self.size)
        }
        NSGraphicsContext.current = context
        context.cgContext.setShouldAntialias(true)

        let w = size.width
        let h = size.height
        let ctx = context.cgContext
        let isWorking = growth > 0.1
        let scale = isWorking ? (1.0 + growth * 0.12) : 1.0

        ctx.saveGState()
        ctx.translateBy(x: w / 2, y: h / 2)
        ctx.scaleBy(x: scale, y: scale)
        ctx.translateBy(x: -w / 2, y: -h / 2)

        // Draw a simple, recognizable leaf shape in cyan
        let leafColor = NSColor(calibratedRed: 0.0, green: 0.9, blue: 0.9, alpha: 1.0)
        ctx.setFillColor(leafColor.cgColor)

        // Main leaf - simple teardrop shape
        let leafPath = CGMutablePath()
        leafPath.move(to: CGPoint(x: w * 0.5, y: h * 0.1))
        leafPath.addQuadCurve(to: CGPoint(x: w * 0.9, y: h * 0.5),
                              control: CGPoint(x: w * 0.9, y: h * 0.1))
        leafPath.addQuadCurve(to: CGPoint(x: w * 0.5, y: h * 0.9),
                              control: CGPoint(x: w * 0.9, y: h * 0.9))
        leafPath.addQuadCurve(to: CGPoint(x: w * 0.1, y: h * 0.5),
                              control: CGPoint(x: w * 0.1, y: h * 0.9))
        leafPath.addQuadCurve(to: CGPoint(x: w * 0.5, y: h * 0.1),
                              control: CGPoint(x: w * 0.1, y: h * 0.1))
        ctx.addPath(leafPath)
        ctx.fillPath()

        // Stem/vein
        ctx.setStrokeColor(NSColor(calibratedRed: 0.0, green: 0.7, blue: 0.7, alpha: 1.0).cgColor)
        ctx.setLineWidth(1.5)
        ctx.move(to: CGPoint(x: w * 0.5, y: h * 0.15))
        ctx.addLine(to: CGPoint(x: w * 0.5, y: h * 0.85))
        ctx.strokePath()

        ctx.restoreGState()

        if let badge {
            self.drawBadge(badge, context: ctx, size: size)
        }

        let image = NSImage(size: size)
        image.addRepresentation(rep)
        image.isTemplate = false
        return image
    }

    private static func makeBitmapRep() -> NSBitmapImageRep? {
        let pixelsWide = 36
        let pixelsHigh = 36
        return NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: pixelsWide,
            pixelsHigh: pixelsHigh,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bitmapFormat: [],
            bytesPerRow: 0,
            bitsPerPixel: 0
        )
    }

    private static func drawBadge(_ badge: Badge, context: CGContext, size: NSSize) {
        let strength: CGFloat = switch badge.prominence {
        case .primary: 1.0
        case .secondary: 0.58
        case .overridden: 0.85
        }

        let diameter = size.width * 0.52 * (0.92 + 0.08 * strength)
        let margin = max(0.45, size.width * 0.03)
        let rect = CGRect(
            x: size.width - diameter - margin,
            y: margin,
            width: diameter,
            height: diameter
        )

        context.saveGState()
        context.setShouldAntialias(true)

        context.saveGState()
        context.setBlendMode(.clear)
        context.addEllipse(in: rect.insetBy(dx: -1.0, dy: -1.0))
        context.fillPath()
        context.restoreGState()

        let fillAlpha: CGFloat = min(1.0, 0.36 + 0.24 * strength)
        let strokeAlpha: CGFloat = min(1.0, 0.78 + 0.22 * strength)

        context.setFillColor(NSColor.labelColor.withAlphaComponent(fillAlpha).cgColor)
        context.addEllipse(in: rect)
        context.fillPath()

        context.setStrokeColor(NSColor.labelColor.withAlphaComponent(strokeAlpha).cgColor)
        context.setLineWidth(max(1.25, size.width * 0.075))
        context.strokeEllipse(in: rect.insetBy(dx: 0.45, dy: 0.45))

        if let base = NSImage(systemSymbolName: badge.symbolName, accessibilityDescription: nil) {
            let pointSize = max(7.0, diameter * 0.82)
            let config = NSImage.SymbolConfiguration(pointSize: pointSize, weight: .black)
            let symbol = base.withSymbolConfiguration(config) ?? base
            symbol.isTemplate = true

            let symbolRect = rect.insetBy(dx: diameter * 0.17, dy: diameter * 0.17)
            context.saveGState()
            context.setBlendMode(.clear)
            symbol.draw(
                in: symbolRect,
                from: .zero,
                operation: .sourceOver,
                fraction: 1,
                respectFlipped: true,
                hints: nil
            )
            context.restoreGState()
        }

        context.restoreGState()
    }
}
