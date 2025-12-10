// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapgoCapacitorPay",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapgoCapacitorPay",
            targets: ["PayPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "PayPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/PayPlugin"),
        .testTarget(
            name: "PayPluginTests",
            dependencies: ["PayPlugin"],
            path: "ios/Tests/PayPluginTests")
    ]
)
