# SeekAR SDK — Examples

Sample apps and developer documentation for the **SeekAR SDK** — a drop-in,
location-based (geospatial) AR component. Add one dependency, supply coordinates
+ a 3D model, and render the viewer. Everything (AR engine, credentials, native
config, default assets) ships inside the SDK.

This is the **public** repo: it contains **no SDK source and no secrets** — only
sample apps and guides for authenticating to pull each pre-packaged artifact.

## SDKs & samples

| Platform | Package | Sample | Status |
| --- | --- | --- | --- |
| React Native | `@seekar/react-native` (npm) | [`react-native/`](./react-native) | Available |
| iOS (Swift) | `SeekAR` (`.xcframework` / SPM / CocoaPods) | [`swift/`](./swift) | Coming soon (Phase 2) |
| Android (Kotlin) | `io.seekar:seekar-android` (Maven) | [`kotlin/`](./kotlin) | Coming soon (Phase 3) |

All SDKs implement the same spec (`spec-v1.0.0`) so behavior is identical across
platforms.

## Getting access

The SDKs are distributed as private, pre-packaged artifacts. See the access
guides in [`docs/`](./docs):

- [npm (React Native)](./docs/access-npm.md)
- [Maven (Android)](./docs/access-maven.md)
- [XCFramework / SPM / CocoaPods (iOS)](./docs/access-xcframework.md)

To request access (a distribution token / license key), contact the SeekAR team.

## Repo layout

```text
seekar-sdk-examples/
  react-native/   Expo app consuming @seekar/react-native
  swift/          iOS sample (Phase 2)
  kotlin/         Android sample (Phase 3)
  assets/         shared sample collectibles / coordinates (identical across apps)
  docs/           SDK access guides (npm / Maven / XCFramework)
```

## Two consume modes

Each sample supports a `local` mode (link to an in-progress SDK build, for SeekAR
devs) and a `published` mode (install the released artifact — the real end-user
path). See each app's README and the access docs.
