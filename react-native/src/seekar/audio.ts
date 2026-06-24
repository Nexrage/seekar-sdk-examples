/**
 * SeekAR audio adapter for the demo.
 *
 * The SDK calls `notifyOtherAudioStarted` when an AR scene mounts (and any AR
 * audio begins) and `notifyOtherAudioStopped` when it unmounts, so a host app
 * can duck/resume its own background music. This demo has no background music
 * track, so the adapter is a safe, ref-counted no-op that simply logs. Wire a
 * real background player here to replicate the reference app's ducking.
 */
import type { SeekARAudioAdapter } from "@nexrage/react-native"

let activeArAudioCount = 0

export const seekarAudioAdapter: SeekARAudioAdapter = {
  notifyOtherAudioStarted() {
    activeArAudioCount += 1
    if (activeArAudioCount === 1) {
      // e.g. backgroundMusicPlayer.fadeOut()
      console.log("[seekar-demo] AR audio started — duck background music here")
    }
  },
  notifyOtherAudioStopped() {
    activeArAudioCount = Math.max(0, activeArAudioCount - 1)
    if (activeArAudioCount === 0) {
      // e.g. backgroundMusicPlayer.resume()
      console.log("[seekar-demo] AR audio stopped — resume background music here")
    }
  },
}
