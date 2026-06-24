# SeekAR — iOS (Swift) sample

> **Coming soon (Phase 2).** This is a placeholder. The iOS sample app is built
> alongside the Swift SDK and will demonstrate the geospatial AR viewer on
> device.

## What it will show

- Adding the `SeekAR` package (SPM `binaryTarget` or CocoaPods).
- License check-in on init (observable status).
- Rendering `SeekARView(collectibleId:modelUrl:targetLat:targetLng:)`.
- Map → AR → tap-to-collect, matching the React Native sample.

## Access

The iOS SDK ships as a versioned `.xcframework` behind a token-gated host. See
[`../docs/access-xcframework.md`](../docs/access-xcframework.md).

```swift
// Preview of the consumer API (see the spec):
import SeekAR
let view = SeekARView(collectibleId: id, modelUrl: url, targetLat: lat, targetLng: lng)
```
