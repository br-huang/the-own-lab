// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "NFLCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NFLCore", targets: ["NFLCore"])
    ],
    targets: [
        .target(name: "NFLCore"),
        .testTarget(
            name: "NFLCoreTests",
            dependencies: ["NFLCore"]
        )
    ]
)
