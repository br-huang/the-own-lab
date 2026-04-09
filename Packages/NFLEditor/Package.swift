// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "NFLEditor",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NFLEditor", targets: ["NFLEditor"])
    ],
    dependencies: [
        .package(path: "../NFLCore")
    ],
    targets: [
        .target(
            name: "NFLEditor",
            dependencies: ["NFLCore"]
        ),
        .testTarget(
            name: "NFLEditorTests",
            dependencies: ["NFLEditor"]
        )
    ]
)
