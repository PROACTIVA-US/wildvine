// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "WildvineKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "WildvineProtocol", targets: ["WildvineProtocol"]),
        .library(name: "WildvineKit", targets: ["WildvineKit"]),
        .library(name: "WildvineChatUI", targets: ["WildvineChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "WildvineProtocol",
            path: "Sources/WildvineProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "WildvineKit",
            dependencies: [
                "WildvineProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/WildvineKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "WildvineChatUI",
            dependencies: [
                "WildvineKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/WildvineChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "WildvineKitTests",
            dependencies: ["WildvineKit", "WildvineChatUI"],
            path: "Tests/WildvineKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
