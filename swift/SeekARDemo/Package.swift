// swift-tools-version:5.9
// SeekAR iOS sample — consumer of the SeekAR SDK (Phase 2a "prove consume").
//
// Local dev mode (Appendix A.2): consumes the prebuilt SeekAR.xcframework copied
// in by scripts/sync-sdk.sh via a local `.binaryTarget(path:)`. This is the same
// integration a real consumer gets, but pointed at the locally-built artifact
// instead of the token-gated host.
//
// Published mode (release verification): swap the binaryTarget below for the
// hosted form — see seekar-sdk-examples/docs/access-xcframework.md:
//   .binaryTarget(
//       name: "SeekAR",
//       url: "https://sdk-dev.seekar.io/ios/SeekAR-<version>.xcframework.zip",
//       checksum: "<sha256 from the release>")
import PackageDescription

let package = Package(
    name: "SeekARDemo",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "SeekARDemo", targets: ["SeekARDemo"])
    ],
    targets: [
        .binaryTarget(
            name: "SeekAR",
            path: "Frameworks/SeekAR.xcframework"
        ),
        .target(
            name: "SeekARDemo",
            dependencies: ["SeekAR"]
        ),
    ]
)
