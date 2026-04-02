import CoreLocation
import Foundation
import WildvineKit
import UIKit

typealias WildvineCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias WildvineCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: WildvineCameraSnapParams) async throws -> WildvineCameraSnapResult
    func clip(params: WildvineCameraClipParams) async throws -> WildvineCameraClipResult
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: WildvineLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: WildvineLocationGetParams,
        desiredAccuracy: WildvineLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: WildvineLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> WildvineDeviceStatusPayload
    func info() -> WildvineDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: WildvinePhotosLatestParams) async throws -> WildvinePhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: WildvineContactsSearchParams) async throws -> WildvineContactsSearchPayload
    func add(params: WildvineContactsAddParams) async throws -> WildvineContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: WildvineCalendarEventsParams) async throws -> WildvineCalendarEventsPayload
    func add(params: WildvineCalendarAddParams) async throws -> WildvineCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: WildvineRemindersListParams) async throws -> WildvineRemindersListPayload
    func add(params: WildvineRemindersAddParams) async throws -> WildvineRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: WildvineMotionActivityParams) async throws -> WildvineMotionActivityPayload
    func pedometer(params: WildvinePedometerParams) async throws -> WildvinePedometerPayload
}

struct WatchMessagingStatus: Sendable, Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchQuickReplyEvent: Sendable, Equatable {
    var replyId: String
    var promptId: String
    var actionId: String
    var actionLabel: String?
    var sessionKey: String?
    var note: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchNotificationSendResult: Sendable, Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func setReplyHandler(_ handler: (@Sendable (WatchQuickReplyEvent) -> Void)?)
    func sendNotification(
        id: String,
        params: WildvineWatchNotifyParams) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
