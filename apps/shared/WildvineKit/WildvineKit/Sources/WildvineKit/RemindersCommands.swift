import Foundation

public enum WildvineRemindersCommand: String, Codable, Sendable {
    case list = "reminders.list"
    case add = "reminders.add"
}

public enum WildvineReminderStatusFilter: String, Codable, Sendable {
    case incomplete
    case completed
    case all
}

public struct WildvineRemindersListParams: Codable, Sendable, Equatable {
    public var status: WildvineReminderStatusFilter?
    public var limit: Int?

    public init(status: WildvineReminderStatusFilter? = nil, limit: Int? = nil) {
        self.status = status
        self.limit = limit
    }
}

public struct WildvineRemindersAddParams: Codable, Sendable, Equatable {
    public var title: String
    public var dueISO: String?
    public var notes: String?
    public var listId: String?
    public var listName: String?

    public init(
        title: String,
        dueISO: String? = nil,
        notes: String? = nil,
        listId: String? = nil,
        listName: String? = nil)
    {
        self.title = title
        self.dueISO = dueISO
        self.notes = notes
        self.listId = listId
        self.listName = listName
    }
}

public struct WildvineReminderPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var title: String
    public var dueISO: String?
    public var completed: Bool
    public var listName: String?

    public init(
        identifier: String,
        title: String,
        dueISO: String? = nil,
        completed: Bool,
        listName: String? = nil)
    {
        self.identifier = identifier
        self.title = title
        self.dueISO = dueISO
        self.completed = completed
        self.listName = listName
    }
}

public struct WildvineRemindersListPayload: Codable, Sendable, Equatable {
    public var reminders: [WildvineReminderPayload]

    public init(reminders: [WildvineReminderPayload]) {
        self.reminders = reminders
    }
}

public struct WildvineRemindersAddPayload: Codable, Sendable, Equatable {
    public var reminder: WildvineReminderPayload

    public init(reminder: WildvineReminderPayload) {
        self.reminder = reminder
    }
}
