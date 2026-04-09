// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "NFLNetwork",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NFLNetwork", targets: ["NFLNetwork"])
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0"),
        .package(path: "../NFLCore")
    ],
    targets: [
        .target(
            name: "NFLNetwork",
            dependencies: [
                "NFLCore",
                .product(name: "Supabase", package: "supabase-swift")
            ]
        ),
        .testTarget(
            name: "NFLNetworkTests",
            dependencies: ["NFLNetwork"]
        )
    ]
)
