# Setting up the private npm registry (+ license server)

How to stand up, publish to, and consume the **private node repo** for the React
Native SDK — and how that SDK ties into the **SeekAR license server** at runtime.

The RN SDK ships as **`@nexrage/react-native`** on a **private npm registry**
hosted by **GitHub Packages**. The `@nexrage` scope must match the GitHub org that
owns the package (`Nexrage`) — GitHub Packages keys the npm scope to the
owning org/user, so the scope and the org name are not independent.

> **Consumers** (installing the SDK) only need [`access-npm.md`](./access-npm.md).
> This guide is the **maintainer/operator** view: registry config, publishing,
> and the license-server wiring behind it.

## Audiences at a glance

| You want to… | Read |
| --- | --- |
| Install the SDK in an app | [`access-npm.md`](./access-npm.md) |
| Publish a new SDK version | [Publishing](#3-publishing-the-package-ci) below |
| Stand up / configure the registry | [Registry setup](#2-registry-setup) below |
| Wire the runtime license check | [License server](#5-license-server-tie-in) below |

## 1. Prerequisites

- A GitHub account in the **`Nexrage`** org with access to the `seekar-sdk` repo.
- Node 20+ and npm.
- A GitHub **personal access token (classic)** with the right package scopes:
  - `read:packages` — to **install** (consume) the SDK.
  - `write:packages` (+ `read:packages`) — to **publish** (maintainers).
  - `repo` — additionally required if the package/repo is private.
- In CI, the built-in `GITHUB_TOKEN` (with `packages: write`) is enough to
  publish to the same org; no PAT needed.

## 2. Registry setup

GitHub Packages exposes a per-account npm registry at
`https://npm.pkg.github.com`. There is nothing to "provision" beyond getting the
scope, package config, and access right.

1. **Scope = org.** The package is named `@nexrage/<name>` so it publishes under
   the `Nexrage` org. Renaming the org or scope means renaming the package.
2. **Package config** lives in the SDK repo's `package.json`:

   ```jsonc
   {
     "name": "@nexrage/react-native",
     "publishConfig": {
       "registry": "https://npm.pkg.github.com",
       "access": "restricted"
     },
     "repository": { "type": "git", "url": "git+https://github.com/Nexrage/seekar-sdk.git" },
     "files": ["dist", "app.plugin.js", "README.md"]
   }
   ```

   - `publishConfig.registry` pins publishing to GitHub Packages (so a stray
     `npm publish` can't push to the public npmjs registry).
   - `access: "restricted"` keeps the package private.
   - `repository.url` links the package to its repo (required for GitHub to
     associate the package with `Nexrage/seekar-sdk`).
   - `files` is the published allowlist — only the built `dist/`, the Expo
     plugin entry, and the README ship.
3. **Visibility & permissions.** After the first publish, the package appears
   under the org's *Packages*. Set its visibility (private) and grant the
   `seekar-sdk` repo + relevant teams read/write under the package's
   *Settings → Manage Actions access / Manage access*.

## 3. Publishing the package (CI)

Publishing is **tag-driven** and handled by `.github/workflows/release.yml` in
the SDK repo. Releases are disambiguated by **tag prefix** (`rn-v*` for this
package — see the SDK's `docs/release-conventions.md`).

Flow for an RN release:

1. Land changes on `master` via PR (green CI).
2. Bump the version in **both** `package.json` and `src/version.ts`
   (`SEEKAR_SDK_VERSION`), in a release PR.
3. Tag and push:

   ```bash
   git tag rn-v0.3.0 && git push origin rn-v0.3.0
   ```

4. `release.yml` routes the tag → the `react-native` job, which:
   - `npm ci`
   - `npm run typecheck`
   - **guards** that the tag version (`rn-v0.3.0` → `0.3.0`) matches
     `package.json` — fails the release on drift.
   - `npm publish` with `NODE_AUTH_TOKEN` (the publish token).

The package's `prepare` script (`npm run build`) compiles `dist/` automatically
on `npm publish`/`npm pack`, so the published tarball always carries a fresh
build (`tsc` + bundled assets). You never commit `dist/`.

### Manual publish (break-glass)

```bash
# from the SDK repo root, with an .npmrc that authenticates to GitHub Packages
export NODE_AUTH_TOKEN=ghp_xxx   # token with write:packages
npm publish                      # prepare builds dist first
```

## 4. Consuming the package

Full steps are in [`access-npm.md`](./access-npm.md). In short, each project (or
`~/.npmrc`) needs:

```ini
@nexrage:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
export NODE_AUTH_TOKEN=ghp_xxx   # token with read:packages
npm install @nexrage/react-native
```

**Local dev (SeekAR engineers):** the sample in [`react-native/`](../react-native)
consumes the SDK via a `file:` link (`file:../../seekar-sdk`) for fast iteration —
no registry round-trip. Switch to the published version for release verification.

## 5. License server tie-in

Pulling the package is **distribution** access. **Runtime** access is gated
separately by the **SeekAR license server**: the SDK checks in on init to confirm
the app's subscription (`seekar-spec` §5.1). The two are independent — a valid
npm token does not grant a runtime license, and vice versa.

### Endpoints

| Environment | License server |
| --- | --- |
| Production | `https://license.seekar.io` |
| Dev (Azure AKS) | `https://license-dev.seekar.io` |

### The check-in contract

On `initializeSeekAR(...)` the SDK performs a single check-in:

```
POST {licenseServerUrl}/v1/checkin
  headers: Authorization: Bearer <license key (JWT)>
  body:    { product, sdk_version, platform }     # PII-free (spec §9.3)
  200 -> { status, licensee, products, expires_at, policy, lease }
  401/403 -> definitive rejection (invalid/expired key, or product not entitled)
```

- The **license key travels in the `Authorization` header**, never the body.
- 4xx is a **hard rejection**; transient 5xx/network/timeout errors fall back to
  a grace window (see the SDK's `LicensePolicy`) so a flaky network doesn't brick
  a paying app.

### Wiring it in the app

```ts
import { configureSeekAR, initializeSeekAR } from "@nexrage/react-native"

configureSeekAR({ /* assetResolver, audio, particleImage ... */ })

initializeSeekAR(process.env.SEEKAR_LICENSE_KEY!, {
  product: "rn",
  // licenseServerUrl defaults to https://license.seekar.io;
  // point at https://license-dev.seekar.io (or the local stub) for dev.
})
```

The license **key** is baked into the app build via env (`SEEKAR_LICENSE_KEY` in
the example's `.env`) — it is not pulled from the registry and not committed.

### Minting a license key (maintainers)

Keys are JWTs issued by the license server's admin endpoint:

```bash
curl -s https://license-dev.seekar.io/v1/keys/issue \
  -H "X-Admin-Token: $SEEKAR_ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"licensee":"<customer>","products":["rn"],"ttl_days":365}'
```

The admin token and JWT signing secret live in the AKS secret
`seekar-license-secrets` (ns `seekar-ingress`) — see the SDK repo's
`docs/secrets.md`. **Never** commit keys or admin tokens.

### Local, offline development (no minted key)

The SDK repo ships a zero-dependency stub mirroring the deployed contract, for
offline work or to exercise reject/expired/timeout paths deterministically:

```bash
npm run license-stub     # from the seekar-sdk repo → http://0.0.0.0:8787
```

Point the SDK at it (use your machine's LAN IP on a physical device, not
`localhost`):

```ts
initializeSeekAR(licenseKey, { licenseServerUrl: "http://192.168.1.50:8787" })
```

## 6. Secrets summary

| Secret | Where it lives | Used for |
| --- | --- | --- |
| `NODE_AUTH_TOKEN` | GitHub Actions secret (CI); local `.env` / `~/.npmrc` (dev) | publish / install the npm package |
| `SEEKAR_LICENSE_KEY` | app build env (baked in); **never** in git | runtime license check-in |
| `SEEKAR_ADMIN_TOKEN`, JWT signing secret | AKS secret `seekar-license-secrets` | minting + validating keys (server-side) |

No real secrets belong in this repo — it is the **public** examples repo. See the
SDK repo's `docs/secrets.md` for the full source-of-truth matrix.

## Status / follow-ups

- The SDK repo's `package.json` (`name`) and `docs/release-conventions.md` should
  use the **`@nexrage`** scope to match this guide and GitHub Packages' org
  requirement. Reconcile any remaining `@seekar` references there so the `file:`
  link and registry publish resolve to the same package name.
