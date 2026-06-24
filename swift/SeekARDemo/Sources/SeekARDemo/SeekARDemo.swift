import Foundation
import SeekAR

/// Phase 2a smoke check: proves the SeekAR binary `.xcframework` links and its
/// public surface is reachable from a consumer module. The real geospatial AR
/// demo (`SeekARView`, license check-in on init) lands in Phase 2b.
public enum SeekARDemo {
    /// Versions reported by the linked SeekAR SDK binary.
    public static func sdkInfo() -> String {
        "SeekAR sdk \(SeekAR.sdkVersion) (spec \(SeekAR.specVersion))"
    }
}
