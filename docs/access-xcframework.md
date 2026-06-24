# Access — iOS (`SeekAR`)

The iOS SDK ships as a versioned **`.xcframework`** served by a token-gated host
(`https://sdk-dev.seekar.io`; prod `https://sdk.seekar.io`). Consume via Swift
Package Manager (binary target) or CocoaPods. Auth is HTTP Basic with the
distribution **username + token**.

## Option A — Swift Package Manager (binary target)

Authenticate downloads via `~/.netrc` (never commit):

```netrc
machine sdk-dev.seekar.io
  login seekar
  password <your dist token>
```

`Package.swift`:

```swift
.binaryTarget(
    name: "SeekAR",
    url: "https://sdk-dev.seekar.io/ios/SeekAR-<version>.xcframework.zip",
    checksum: "<sha256 from the release>"
)
```

## Option B — CocoaPods

```ruby
# Podfile
pod 'SeekAR', :http => 'https://sdk-dev.seekar.io/ios/SeekAR-<version>.xcframework.zip'
```

Configure credentials for the download (e.g. via `~/.netrc` as above).

## Use it

```swift
import SeekAR

SeekAR.initialize(licenseKey: ProcessInfo.processInfo.environment["SEEKAR_LICENSE_KEY"]!,
                  product: "swift")

let view = SeekARView(collectibleId: id, modelUrl: url, targetLat: lat, targetLng: lng)
```

Bake your runtime **license key** into the build; the SDK checks in on init
(`seekar-spec` §5.1). See [access overview](./README.md).
