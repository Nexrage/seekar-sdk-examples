# SeekAR SDK — access guides

How to authenticate and pull each pre-packaged SeekAR SDK. The SDKs are private;
you need a **distribution token** (and, at runtime, a **license key**) from the
SeekAR team.

| Platform | Channel | Guide |
| --- | --- | --- |
| React Native | private npm (GitHub Packages, `@nexrage` scope) | [access-npm.md](./access-npm.md) |
| Android (Kotlin) | authenticated Maven (Reposilite) | [access-maven.md](./access-maven.md) |
| iOS (Swift) | XCFramework via SPM / CocoaPods | [access-xcframework.md](./access-xcframework.md) |

## Two things you need

1. **Distribution access** — a token to *download* the SDK artifact (per channel,
   below). The Maven and XCFramework channels share one HTTP Basic credential
   (username + token).
2. **License key** — a runtime SeekAR license key (a JWT). The SDK presents it to
   the license server (`https://license.seekar.io`) on init to confirm your
   subscription (`seekar-spec` §5.1). Bake it into your app build.

Endpoints (dev shown; production drops the `-dev`):

| Service | Dev endpoint |
| --- | --- |
| License server | `https://license-dev.seekar.io` |
| Maven (Android) | `https://maven-dev.seekar.io` |
| XCFramework host (iOS) | `https://sdk-dev.seekar.io` |

## Maintainer / operator guides

- [setup-private-npm.md](./setup-private-npm.md) — stand up, publish to, and
  consume the private npm registry (`@nexrage`, GitHub Packages), plus the
  runtime license-server tie-in.
- [runbook-rn-ios.md](./runbook-rn-ios.md) — build & run the React Native
  example on a physical iPhone (yarn), the local SDK consume mode, and fixes for
  the Viro + `react-native-maps` + New Architecture build gotchas.
