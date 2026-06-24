#!/usr/bin/env bash
#
# Sync the local SeekAR .xcframework into this sample (local consume mode,
# build-workflow Appendix A.2). Builds the artifact in the sibling seekar-sdk
# repo and copies it to Frameworks/SeekAR.xcframework, which Package.swift
# resolves via `.binaryTarget(path:)`. Mirrors the RN `npm run sync:sdk` loop.
#
# Assumes the private SDK repo is checked out as a sibling:
#   Projects/seekar-sdk            (SDK source)
#   Projects/seekar-sdk-examples   (this repo)
#
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_SWIFT="$(cd "${DEMO_DIR}/../../../seekar-sdk/packages/swift" 2>/dev/null && pwd || true)"

if [[ -z "${SDK_SWIFT}" ]]; then
  echo "error: sibling SDK not found at ../../../seekar-sdk/packages/swift" >&2
  echo "       check out github.com/Nexrage/seekar-sdk next to this repo." >&2
  exit 1
fi

echo "==> building xcframework in ${SDK_SWIFT}"
"${SDK_SWIFT}/scripts/build-xcframework.sh"

DEST="${DEMO_DIR}/Frameworks"
mkdir -p "${DEST}"
rm -rf "${DEST}/SeekAR.xcframework"
cp -R "${SDK_SWIFT}/build/SeekAR.xcframework" "${DEST}/SeekAR.xcframework"
echo "==> synced -> ${DEST}/SeekAR.xcframework"
