const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const projectRoot = __dirname
// The SeekAR SDK is consumed as a local `file:` dependency (see package.json),
// which npm symlinks into node_modules. It lives in the sibling private repo.
// Switch this example to the published package for release verification.
const sdkPath = path.resolve(projectRoot, "../../seekar-sdk")

const config = getDefaultConfig(projectRoot)

// Follow the symlinked local SDK and watch it so Metro picks up SDK rebuilds.
config.resolver.unstable_enableSymlinks = true
config.watchFolders = [sdkPath]

// Resolve from this example first (so react / react-native / expo resolve to a
// single instance here), then from the linked SDK's own node_modules. A `file:`
// link does NOT install the SDK's dependencies (Viro, etc.) into this app, so
// the SDK resolves them from its own repo. The published-package path installs
// those deps normally and needs only the first entry.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(sdkPath, "node_modules"),
]
config.resolver.disableHierarchicalLookup = true

module.exports = config
