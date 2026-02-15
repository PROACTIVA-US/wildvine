import CoreLocation
import Foundation
import WildvineKit
import UIKit

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: WildvineCameraSnapParams) async throws -> (format: String, base64: String, width: Int, height: Int)
    func clip(params: WildvineCameraClipParams) async throws -> (format: String, base64: String, durationMs: Int, hasAudio: Bool)
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
}

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

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
