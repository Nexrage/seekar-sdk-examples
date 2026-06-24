/**
 * SeekAR API data models (core subset), per the documented BE contract.
 * These shapes map field-for-field onto the SDK's AR viewer props.
 */

export type AssetType = "MODEL_3D" | "IMAGE" | "AUDIO" | "VIDEO" | "PDF"

export interface Asset {
  id: string
  fileUrl: string
  type: AssetType
  fbxUpAxis?: number | null
  is2D?: boolean
  thumbnailUrl?: string | null
}

export interface AudioCue {
  id: string
  label?: string
  timeSeconds: number
  audioAssetId: string
  audioAssetFileUrl?: string | null
  volume: number
  oneShot: boolean
  interruptPrevious: boolean
}

export type TranslationAxis = "X" | "Y" | "Z" | null
export type TranslationLoopMode = "LOOP" | "PING_PONG" | "ONCE"
export type Environment = "INDOOR" | "OUTDOOR"

export interface Collectible {
  id: string
  name: string
  description?: string

  // Listing thumbnail. The server provides this at the collectible level for
  // every item (asset.thumbnailUrl is usually null), so prefer this field.
  thumbnailUrl?: string | null

  // Geospatial placement (server may send latitude/longitude/proximityRadius;
  // normalized to lat/lng/radius client-side — see normalizeCollectible).
  lat?: number | null
  lng?: number | null
  radius?: number | null
  elevation?: number | null
  environment?: Environment

  asset?: Asset
  spawnAudioAsset?: Asset
  backgroundAudioAsset?: Asset

  scaleX?: number
  scaleY?: number
  scaleZ?: number
  modelRotationX?: number
  modelRotationY?: number
  modelRotationZ?: number
  rotateInAR?: boolean

  modelAnimationName?: string | null
  audioCues?: AudioCue[]

  translationAxis?: TranslationAxis
  translationDistance?: number
  translationSpeed?: number
  translationLoopMode?: TranslationLoopMode
  translationFlipOnReverse?: boolean
  translationDelayMs?: number
  translationLoopDelayMs?: number

  instanceId?: string | null
}

export interface PaginationMeta {
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
}

export interface ListResponse<T> {
  data: T[]
  meta?: PaginationMeta
}

export interface CollectResult {
  success: boolean
  alreadyCollected?: boolean
  soldOut?: boolean
  message?: string
  pointsEarned?: number
  collectible?: Collectible
}
