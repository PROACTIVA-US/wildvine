// swift-tools-version: 6.2
// Package manifest for the Wildvine macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "Wildvine",
    platforms: [
        .macOS(.v26),
    ],
    products: [
        .library(name: "WildvineIPC", targets: ["WildvineIPC"]),
        .library(name: "WildvineDiscovery", targets: ["WildvineDiscovery"]),
        .executable(name: "Wildvine", targets: ["Wildvine"]),
        .executable(name: "wildvine-mac", targets: ["WildvineMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/WildvineKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "WildvineIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "WildvineDiscovery",
            dependencies: [
                .product(name: "WildvineKit", package: "WildvineKit"),
            ],
            path: "Sources/WildvineDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Wildvine",
            dependencies: [
                "WildvineIPC",
                "WildvineDiscovery",
                .product(name: "WildvineKit", package: "WildvineKit"),
                .product(name: "WildvineChatUI", package: "WildvineKit"),
                .product(name: "WildvineProtocol", package: "WildvineKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/Wildvine.icns"),
                .copy("Resources/DeviceModels"),
                .copy("Resources/menubar-icon.png"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "WildvineMacCLI",
            dependencies: [
                "WildvineDiscovery",
                .product(name: "WildvineKit", package: "WildvineKit"),
                .product(name: "WildvineProtocol", package: "WildvineKit"),
            ],
            path: "Sources/WildvineMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "WildvineIPCTests",
            dependencies: [
                "WildvineIPC",
                "Wildvine",
                "WildvineDiscovery",
                .product(name: "WildvineProtocol", package: "WildvineKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
