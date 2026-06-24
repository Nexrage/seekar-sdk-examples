# SeekAR — iOS (Swift) sample

Phase 2 of the SeekAR build-out. `SeekARDemo/` is a Swift package that **consumes
the SeekAR SDK as a binary `.xcframework`** — the real consumer integration. The
geospatial AR viewer (`SeekARView`, license check-in on init) lands in Phase 2b;
for now this proves the package → build → consume path (Phase 2a).

## Layout

```text
SeekARDemo/
  Package.swift                     consumes SeekAR via .binaryTarget
  Sources/SeekARDemo/SeekARDemo.swift   smoke check: import SeekAR + read versions
  scripts/sync-sdk.sh               build + copy the local .xcframework (dev loop)
  Frameworks/SeekAR.xcframework     synced artifact (gitignored)
```

## Consume modes

Like the React Native sample, there are two modes (build-workflow Appendix A.2):

### Local (default for dev)

Builds the `.xcframework` from the sibling `seekar-sdk` repo and copies it in,
then resolves it via `.binaryTarget(path: "Frameworks/SeekAR.xcframework")`.

```bash
cd swift/SeekARDemo
./scripts/sync-sdk.sh    # builds the SDK xcframework + copies it to Frameworks/
xcodebuild -scheme SeekARDemo -destination 'generic/platform=iOS Simulator' build
```

Requires the private `seekar-sdk` repo checked out as a sibling
(`Projects/seekar-sdk` next to `Projects/seekar-sdk-examples`).

### Published (release verification)

Swap the `binaryTarget` in `Package.swift` for the hosted form and pin the
checksum from the release (auth via `~/.netrc`). See
[`../docs/access-xcframework.md`](../docs/access-xcframework.md):

```swift
.binaryTarget(
    name: "SeekAR",
    url: "https://sdk-dev.seekar.io/ios/SeekAR-<version>.xcframework.zip",
    checksum: "<sha256 from the release>")
```

## Preview of the consumer API (Phase 2b)

```swift
import SeekAR

SeekAR.initialize(licenseKey: ProcessInfo.processInfo.environment["SEEKAR_LICENSE_KEY"]!,
                  product: "swift")
let view = SeekARView(collectibleId: id, modelUrl: url, targetLat: lat, targetLng: lng)
```
