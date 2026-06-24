# Access — React Native (`@nexrage/react-native`)

The RN SDK is published to a **private npm registry** (GitHub Packages, `@nexrage`
scope). You need a token with `read:packages`.

## 1. Configure the registry

Add an `.npmrc` to your project (or `~/.npmrc`):

```ini
@nexrage:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Export your token (never commit it):

```bash
export NODE_AUTH_TOKEN=ghp_xxx   # token with read:packages
```

## 2. Install

```bash
npm install @nexrage/react-native
```

## 3. Configure the app

Add the Expo config plugin and initialize licensing:

```ts
// app.config.ts
plugins: ["@nexrage/react-native", /* ... */]
```

```ts
// at startup
import { initializeSeekAR, configureSeekAR } from "@nexrage/react-native"

configureSeekAR({ /* assetResolver, audio, particleImage ... */ })

initializeSeekAR(process.env.SEEKAR_LICENSE_KEY!, {
  product: "rn",
  // licenseServerUrl defaults to https://license.seekar.io
})
```

Then render `<SeekARView .../>`. See the runnable
[`react-native/`](../react-native) sample.

## Local dev (SeekAR engineers)

The sample consumes the SDK via a `file:` link (`file:../../seekar-sdk`) for fast
iteration. Switch to the published package for release verification.
