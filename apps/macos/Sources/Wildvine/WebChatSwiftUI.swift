import AppKit
import WildvineChatUI
import WildvineKit
import WildvineProtocol
import Foundation
import OSLog
import QuartzCore
import SwiftUI

private let webChatSwiftLogger = Logger(subsystem: "com.wildvine", category: "WebChatSwiftUI")

private enum WebChatSwiftUILayout {
    static let windowSize = NSSize(width: 500, height: 840)
    static let panelSize = NSSize(width: 480, height: 640)
    static let windowMinSize = NSSize(width: 480, height: 360)
    static let anchorPadding: CGFloat = 8
}

struct MacGatewayChatTransport: WildvineChatTransport, Sendable {
    func requestHistory(sessionKey: String) async throws -> WildvineChatHistoryPayload {
        try await GatewayConnection.shared.chatHistory(sessionKey: sessionKey)
    }

    func abortRun(sessionKey: String, runId: String) async throws {
        _ = try await GatewayConnection.shared.request(
            method: "chat.abort",
            params: [
                "sessionKey": AnyCodable(sessionKey),
                "runId": AnyCodable(runId),
            ],
            timeoutMs: 10000)
    }

    func listSessions(limit: Int?) async throws -> WildvineChatSessionsListResponse {
        var params: [String: AnyCodable] = [
            "includeGlobal": AnyCodable(true),
            "includeUnknown": AnyCodable(false),
        ]
        if let limit {
            params["limit"] = AnyCodable(limit)
        }
        let data = try await GatewayConnection.shared.request(
            method: "sessions.list",
            params: params,
            timeoutMs: 15000)
        return try JSONDecoder().decode(WildvineChatSessionsListResponse.self, from: data)
    }

    func listModels() async throws -> [WildvineChatModelChoice] {
        let data = try await GatewayConnection.shared.requestRaw(
            method: .modelsList,
            timeoutMs: 15000)
        let result = try JSONDecoder().decode(ModelsListResult.self, from: data)
        return result.models.map { WildvineChatModelChoice(id: $0.id, name: $0.name, provider: $0.provider) }
    }

    func patchSession(key: String, model: String) async throws {
        _ = try await GatewayConnection.shared.request(
            method: "sessions.patch",
            params: [
                "key": AnyCodable(key),
                "model": AnyCodable(model),
            ],
            timeoutMs: 10000)
    }

    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [WildvineChatAttachmentPayload]) async throws -> WildvineChatSendResponse
    {
        try await GatewayConnection.shared.chatSend(
            sessionKey: sessionKey,
            message: message,
            thinking: thinking,
            idempotencyKey: idempotencyKey,
            attachments: attachments)
    }

    func requestHealth(timeoutMs: Int) async throws -> Bool {
        try await GatewayConnection.shared.healthOK(timeoutMs: timeoutMs)
    }

    func events() -> AsyncStream<WildvineChatTransportEvent> {
        AsyncStream { continuation in
            let task = Task {
                do {
                    try await GatewayConnection.shared.refresh()
                } catch {
                    webChatSwiftLogger.error("gateway refresh failed \(error.localizedDescription, privacy: .public)")
                }

                let stream = await GatewayConnection.shared.subscribe()
                for await push in stream {
                    if Task.isCancelled { return }
                    if let evt = Self.mapPushToTransportEvent(push) {
                        continuation.yield(evt)
                    }
                }
            }

            continuation.onTermination = { @Sendable _ in
                task.cancel()
            }
        }
    }

    static func mapPushToTransportEvent(_ push: GatewayPush) -> WildvineChatTransportEvent? {
        switch push {
        case let .snapshot(hello):
            let ok = (try? JSONDecoder().decode(
                WildvineGatewayHealthOK.self,
                from: JSONEncoder().encode(hello.snapshot.health)))?.ok ?? true
            return .health(ok: ok)

        case let .event(evt):
            switch evt.event {
            case "health":
                guard let payload = evt.payload else { return nil }
                let ok = (try? JSONDecoder().decode(
                    WildvineGatewayHealthOK.self,
                    from: JSONEncoder().encode(payload)))?.ok ?? true
                return .health(ok: ok)
            case "tick":
                return .tick
            case "chat":
                guard let payload = evt.payload else { return nil }
                guard let chat = try? JSONDecoder().decode(
                    WildvineChatEventPayload.self,
                    from: JSONEncoder().encode(payload))
                else {
                    return nil
                }
                return .chat(chat)
            case "agent":
                guard let payload = evt.payload else { return nil }
                guard let agent = try? JSONDecoder().decode(
                    WildvineAgentEventPayload.self,
                    from: JSONEncoder().encode(payload))
                else {
                    return nil
                }
                return .agent(agent)
            case "update":
                guard let payload = evt.payload else { return nil }
                guard let data = try? JSONEncoder().encode(payload),
                      let parsed = try? JSONDecoder().decode(CodeUpdatePayload.self, from: data),
                      parsed.available
                else { return nil }
                return .codeUpdate(behind: parsed.behind)
            default:
                return nil
            }

        case .seqGap:
            return .seqGap
        }
    }
}

private struct CodeUpdatePayload: Decodable {
    let available: Bool
    let behind: Int
}

// MARK: - Window controller

@MainActor
final class WebChatSwiftUIWindowController {
    private let presentation: WebChatPresentation
    private let sessionKey: String
    private let hosting: NSHostingController<WildvineChatView>
    private let contentController: NSViewController
    private var window: NSWindow?
    private var dismissMonitor: Any?
    private var toolbarDelegate: ChatWindowToolbarDelegate?
    var onClosed: (() -> Void)?
    var onVisibilityChanged: ((Bool) -> Void)?

    convenience init(sessionKey: String, presentation: WebChatPresentation) {
        self.init(sessionKey: sessionKey, presentation: presentation, transport: MacGatewayChatTransport())
    }

    init(sessionKey: String, presentation: WebChatPresentation, transport: any WildvineChatTransport) {
        self.sessionKey = sessionKey
        self.presentation = presentation
        let savedProviders = Self.loadEnabledProviders()
        let vm = WildvineChatViewModel(sessionKey: sessionKey, transport: transport, enabledProviders: savedProviders)
        vm.onEnabledProvidersChanged = { [weak vm] in
            guard let providers = vm?.enabledProviders else { return }
            UserDefaults.standard.set(Array(providers), forKey: enabledModelProvidersKey)
        }
        let accent = Self.color(fromHex: AppStateStore.shared.seamColorHex)
        self.hosting = NSHostingController(rootView: WildvineChatView(
            viewModel: vm,
            showsSessionSwitcher: true,
            userAccent: accent))
        self.contentController = Self.makeContentController(for: presentation, hosting: self.hosting)
        self.window = Self.makeWindow(for: presentation, contentViewController: self.contentController)
        if case .window = presentation, let window {
            let delegate = ChatWindowToolbarDelegate()
            self.toolbarDelegate = delegate
            let toolbar = NSToolbar(identifier: "WildvineChatWindowToolbar")
            toolbar.delegate = delegate
            toolbar.displayMode = .iconOnly
            window.toolbar = toolbar
            window.toolbarStyle = .unified
        }
    }

    deinit {}

    var isVisible: Bool {
        self.window?.isVisible ?? false
    }

    func show() {
        guard let window else { return }
        self.ensureWindowSize()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        self.onVisibilityChanged?(true)
    }

    func presentAnchored(anchorProvider: () -> NSRect?) {
        guard case .panel = self.presentation, let window else { return }
        self.installDismissMonitor()
        let target = self.reposition(using: anchorProvider)

        if !self.isVisible {
            let start = target.offsetBy(dx: 0, dy: 8)
            window.setFrame(start, display: true)
            window.alphaValue = 0
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.18
                context.timingFunction = CAMediaTimingFunction(name: .easeOut)
                window.animator().setFrame(target, display: true)
                window.animator().alphaValue = 1
            }
        } else {
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
        }

        self.onVisibilityChanged?(true)
    }

    func close() {
        self.window?.orderOut(nil)
        self.onVisibilityChanged?(false)
        self.onClosed?()
        self.removeDismissMonitor()
    }

    @discardableResult
    private func reposition(using anchorProvider: () -> NSRect?) -> NSRect {
        guard let window else { return .zero }
        guard let anchor = anchorProvider() else {
            let frame = WindowPlacement.topRightFrame(
                size: WebChatSwiftUILayout.panelSize,
                padding: WebChatSwiftUILayout.anchorPadding)
            window.setFrame(frame, display: false)
            return frame
        }
        let screen = NSScreen.screens.first { screen in
            screen.frame.contains(anchor.origin) || screen.frame.contains(NSPoint(x: anchor.midX, y: anchor.midY))
        } ?? NSScreen.main
        let bounds = (screen?.visibleFrame ?? .zero).insetBy(
            dx: WebChatSwiftUILayout.anchorPadding,
            dy: WebChatSwiftUILayout.anchorPadding)
        let frame = WindowPlacement.anchoredBelowFrame(
            size: WebChatSwiftUILayout.panelSize,
            anchor: anchor,
            padding: WebChatSwiftUILayout.anchorPadding,
            in: bounds)
        window.setFrame(frame, display: false)
        return frame
    }

    private func installDismissMonitor() {
        if ProcessInfo.processInfo.isRunningTests { return }
        guard self.dismissMonitor == nil, self.window != nil else { return }
        self.dismissMonitor = NSEvent.addGlobalMonitorForEvents(
            matching: [.leftMouseDown, .rightMouseDown, .otherMouseDown])
        { [weak self] _ in
            guard let self, let win = self.window else { return }
            let pt = NSEvent.mouseLocation
            if !win.frame.contains(pt) {
                self.close()
            }
        }
    }

    private func removeDismissMonitor() {
        if let monitor = self.dismissMonitor {
            NSEvent.removeMonitor(monitor)
            self.dismissMonitor = nil
        }
    }

    private static func makeWindow(
        for presentation: WebChatPresentation,
        contentViewController: NSViewController) -> NSWindow
    {
        switch presentation {
        case .window:
            let window = NSWindow(
                contentRect: NSRect(origin: .zero, size: WebChatSwiftUILayout.windowSize),
                styleMask: [.titled, .closable, .resizable, .miniaturizable],
                backing: .buffered,
                defer: false)
            window.title = "Wildvine Chat"
            window.contentViewController = contentViewController
            window.isReleasedWhenClosed = false
            window.titleVisibility = .visible
            window.titlebarAppearsTransparent = false
            window.backgroundColor = .clear
            window.isOpaque = false
            window.center()
            WindowPlacement.ensureOnScreen(window: window, defaultSize: WebChatSwiftUILayout.windowSize)
            window.minSize = WebChatSwiftUILayout.windowMinSize
            window.contentView?.wantsLayer = true
            window.contentView?.layer?.backgroundColor = NSColor.clear.cgColor
            return window
        case .panel:
            let panel = WebChatPanel(
                contentRect: NSRect(origin: .zero, size: WebChatSwiftUILayout.panelSize),
                styleMask: [.borderless],
                backing: .buffered,
                defer: false)
            panel.level = .statusBar
            panel.hidesOnDeactivate = true
            panel.hasShadow = true
            panel.isMovable = false
            panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            panel.titleVisibility = .hidden
            panel.titlebarAppearsTransparent = true
            panel.backgroundColor = .clear
            panel.isOpaque = false
            panel.contentViewController = contentViewController
            panel.becomesKeyOnlyIfNeeded = true
            panel.contentView?.wantsLayer = true
            panel.contentView?.layer?.backgroundColor = NSColor.clear.cgColor
            panel.setFrame(
                WindowPlacement.topRightFrame(
                    size: WebChatSwiftUILayout.panelSize,
                    padding: WebChatSwiftUILayout.anchorPadding),
                display: false)
            return panel
        }
    }

    private static func makeContentController(
        for presentation: WebChatPresentation,
        hosting: NSHostingController<WildvineChatView>) -> NSViewController
    {
        let controller = NSViewController()
        let effectView = NSVisualEffectView()
        effectView.material = .sidebar
        effectView.blendingMode = .behindWindow
        effectView.state = .active
        effectView.wantsLayer = true
        effectView.layer?.cornerCurve = .continuous
        let cornerRadius: CGFloat = switch presentation {
        case .panel:
            16
        case .window:
            0
        }
        effectView.layer?.cornerRadius = cornerRadius
        effectView.layer?.masksToBounds = true

        effectView.translatesAutoresizingMaskIntoConstraints = true
        effectView.autoresizingMask = [.width, .height]
        let rootView = effectView

        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        hosting.view.wantsLayer = true
        hosting.view.layer?.backgroundColor = NSColor.clear.cgColor

        controller.addChild(hosting)
        effectView.addSubview(hosting.view)
        controller.view = rootView

        NSLayoutConstraint.activate([
            hosting.view.leadingAnchor.constraint(equalTo: effectView.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: effectView.trailingAnchor),
            hosting.view.topAnchor.constraint(equalTo: effectView.topAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: effectView.bottomAnchor),
        ])

        return controller
    }

    private func ensureWindowSize() {
        guard case .window = self.presentation, let window else { return }
        let current = window.frame.size
        let min = WebChatSwiftUILayout.windowMinSize
        if current.width < min.width || current.height < min.height {
            let frame = WindowPlacement.centeredFrame(size: WebChatSwiftUILayout.windowSize)
            window.setFrame(frame, display: false)
        }
    }

    static func loadEnabledProviders() -> Set<String>? {
        guard let array = UserDefaults.standard.stringArray(forKey: enabledModelProvidersKey),
              !array.isEmpty
        else { return nil }
        return Set(array)
    }

    private static func color(fromHex raw: String?) -> Color? {
        let trimmed = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let hex = trimmed.hasPrefix("#") ? String(trimmed.dropFirst()) : trimmed
        guard hex.count == 6, let value = Int(hex, radix: 16) else { return nil }
        let r = Double((value >> 16) & 0xFF) / 255.0
        let g = Double((value >> 8) & 0xFF) / 255.0
        let b = Double(value & 0xFF) / 255.0
        return Color(red: r, green: g, blue: b)
    }
}

// MARK: - Chat window toolbar

@MainActor
final class ChatWindowToolbarDelegate: NSObject, NSToolbarDelegate {
    private static let settingsID = NSToolbarItem.Identifier("settings")
    private static let dashboardID = NSToolbarItem.Identifier("dashboard")
    private static let flexibleSpaceID = NSToolbarItem.Identifier.flexibleSpace

    func toolbarDefaultItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        [Self.flexibleSpaceID, Self.dashboardID, Self.settingsID]
    }

    func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        [Self.settingsID, Self.dashboardID, Self.flexibleSpaceID]
    }

    func toolbar(
        _ toolbar: NSToolbar,
        itemForItemIdentifier itemIdentifier: NSToolbarItem.Identifier,
        willBeInsertedIntoToolbar flag: Bool) -> NSToolbarItem?
    {
        switch itemIdentifier {
        case Self.settingsID:
            let item = NSToolbarItem(itemIdentifier: itemIdentifier)
            item.label = "Settings"
            item.toolTip = "Open Settings"
            item.image = NSImage(systemSymbolName: "gearshape", accessibilityDescription: "Settings")
            item.target = self
            item.action = #selector(openSettings)
            return item

        case Self.dashboardID:
            let item = NSToolbarItem(itemIdentifier: itemIdentifier)
            item.label = "Dashboard"
            item.toolTip = "Open Dashboard"
            item.image = NSImage(systemSymbolName: "gauge", accessibilityDescription: "Dashboard")
            item.target = self
            item.action = #selector(openDashboard)
            return item

        default:
            return nil
        }
    }

    @objc private func openSettings() {
        SettingsWindowOpener.shared.open()
    }

    @objc private func openDashboard() {
        Task { @MainActor in
            do {
                let config = try await GatewayEndpointStore.shared.requireConfig()
                let url = try GatewayEndpointStore.dashboardURL(
                    for: config, mode: AppStateStore.shared.connectionMode)
                NSWorkspace.shared.open(url)
            } catch {
                let alert = NSAlert()
                alert.messageText = "Dashboard unavailable"
                alert.informativeText = error.localizedDescription
                alert.runModal()
            }
        }
    }
}
