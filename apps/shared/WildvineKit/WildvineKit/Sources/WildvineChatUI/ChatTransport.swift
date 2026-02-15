import Foundation

public enum WildvineChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(WildvineChatEventPayload)
    case agent(WildvineAgentEventPayload)
    case codeUpdate(behind: Int)
    case seqGap
}

public protocol WildvineChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> WildvineChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [WildvineChatAttachmentPayload]) async throws -> WildvineChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> WildvineChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<WildvineChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws

    func listModels() async throws -> [WildvineChatModelChoice]
    func patchSession(key: String, model: String) async throws
}

extension WildvineChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "WildvineChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> WildvineChatSessionsListResponse {
        throw NSError(
            domain: "WildvineChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }

    public func listModels() async throws -> [WildvineChatModelChoice] {
        throw NSError(
            domain: "WildvineChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "models.list not supported by this transport"])
    }

    public func patchSession(key _: String, model _: String) async throws {
        throw NSError(
            domain: "WildvineChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.patch not supported by this transport"])
    }
}
