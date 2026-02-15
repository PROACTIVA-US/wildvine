import Foundation

public enum WildvineCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum WildvineCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum WildvineCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum WildvineCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct WildvineCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: WildvineCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: WildvineCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: WildvineCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: WildvineCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct WildvineCameraClipParams: Codable, Sendable, Equatable {
    public var facing: WildvineCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: WildvineCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: WildvineCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: WildvineCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
