import WildvineKit
import WildvineProtocol
import Foundation

// Prefer the WildvineKit wrapper to keep gateway request payloads consistent.
typealias AnyCodable = WildvineKit.AnyCodable
typealias InstanceIdentity = WildvineKit.InstanceIdentity

extension AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: AnyCodable]? { self.value as? [String: AnyCodable] }
    var arrayValue: [AnyCodable]? { self.value as? [AnyCodable] }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}

extension WildvineProtocol.AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: WildvineProtocol.AnyCodable]? { self.value as? [String: WildvineProtocol.AnyCodable] }
    var arrayValue: [WildvineProtocol.AnyCodable]? { self.value as? [WildvineProtocol.AnyCodable] }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: WildvineProtocol.AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [WildvineProtocol.AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}
