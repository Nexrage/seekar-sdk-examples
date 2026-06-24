# SeekAR — Android (Kotlin) sample

> **Coming soon (Phase 3).** This is a placeholder. The Android sample app is
> built alongside the Kotlin SDK and will demonstrate the geospatial AR viewer
> on device.

## What it will show

- Adding the `io.seekar:seekar-android` dependency + applying the SeekAR Gradle
  plugin (which injects manifest meta-data, permissions, and the baked ARCore key).
- License check-in on init (observable status).
- Rendering `SeekARView` configured with collectible coordinates + model URL.
- Map → AR → tap-to-collect, matching the React Native sample.

## Access

The Android SDK is published to a token-authenticated Maven repository. See
[`../docs/access-maven.md`](../docs/access-maven.md).

```kotlin
// Preview of the consumer API (see the spec):
val view = SeekARView(context).apply {
    configure(collectibleId = id, modelUrl = url, targetLat = lat, targetLng = lng)
}
```
