import Foundation

public enum WildvineDeviceCommand: String, Codable, Sendable {
    case status = "device.status"
    case info = "device.info"
}

public enum WildvineBatteryState: String, Codable, Sendable {
    case unknown
    case unplugged
    case charging
    case full
}

public enum WildvineThermalState: String, Codable, Sendable {
    case nominal
    case fair
    case serious
    case critical
}

public enum WildvineNetworkPathStatus: String, Codable, Sendable {
    case satisfied
    case unsatisfied
    case requiresConnection
}

public enum WildvineNetworkInterfaceType: String, Codable, Sendable {
    case wifi
    case cellular
    case wired
    case other
}

public struct WildvineBatteryStatusPayload: Codable, Sendable, Equatable {
    public var level: Double?
    public var state: WildvineBatteryState
    public var lowPowerModeEnabled: Bool

    public init(level: Double?, state: WildvineBatteryState, lowPowerModeEnabled: Bool) {
        self.level = level
        self.state = state
        self.lowPowerModeEnabled = lowPowerModeEnabled
    }
}

public struct WildvineThermalStatusPayload: Codable, Sendable, Equatable {
    public var state: WildvineThermalState

    public init(state: WildvineThermalState) {
        self.state = state
    }
}

public struct WildvineStorageStatusPayload: Codable, Sendable, Equatable {
    public var totalBytes: Int64
    public var freeBytes: Int64
    public var usedBytes: Int64

    public init(totalBytes: Int64, freeBytes: Int64, usedBytes: Int64) {
        self.totalBytes = totalBytes
        self.freeBytes = freeBytes
        self.usedBytes = usedBytes
    }
}

public struct WildvineNetworkStatusPayload: Codable, Sendable, Equatable {
    public var status: WildvineNetworkPathStatus
    public var isExpensive: Bool
    public var isConstrained: Bool
    public var interfaces: [WildvineNetworkInterfaceType]

    public init(
        status: WildvineNetworkPathStatus,
        isExpensive: Bool,
        isConstrained: Bool,
        interfaces: [WildvineNetworkInterfaceType])
    {
        self.status = status
        self.isExpensive = isExpensive
        self.isConstrained = isConstrained
        self.interfaces = interfaces
    }
}

public struct WildvineDeviceStatusPayload: Codable, Sendable, Equatable {
    public var battery: WildvineBatteryStatusPayload
    public var thermal: WildvineThermalStatusPayload
    public var storage: WildvineStorageStatusPayload
    public var network: WildvineNetworkStatusPayload
    public var uptimeSeconds: Double

    public init(
        battery: WildvineBatteryStatusPayload,
        thermal: WildvineThermalStatusPayload,
        storage: WildvineStorageStatusPayload,
        network: WildvineNetworkStatusPayload,
        uptimeSeconds: Double)
    {
        self.battery = battery
        self.thermal = thermal
        self.storage = storage
        self.network = network
        self.uptimeSeconds = uptimeSeconds
    }
}

public struct WildvineDeviceInfoPayload: Codable, Sendable, Equatable {
    public var deviceName: String
    public var modelIdentifier: String
    public var systemName: String
    public var systemVersion: String
    public var appVersion: String
    public var appBuild: String
    public var locale: String

    public init(
        deviceName: String,
        modelIdentifier: String,
        systemName: String,
        systemVersion: String,
        appVersion: String,
        appBuild: String,
        locale: String)
    {
        self.deviceName = deviceName
        self.modelIdentifier = modelIdentifier
        self.systemName = systemName
        self.systemVersion = systemVersion
        self.appVersion = appVersion
        self.appBuild = appBuild
        self.locale = locale
    }
}
