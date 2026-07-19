import {
  AI_GATEWAY_STORAGE_KEY,
  EMPTY_GATEWAY_CONFIG,
  LEGACY_AI_GATEWAY_STORAGE_KEY,
  SELECTED_MODEL_STORAGE_KEY,
  normalizeStoredGatewayConfig,
  type ResolvedGatewayConfig,
  type StoredGatewayConfig,
} from "./gateway-config"

export function readGatewayConfigFromStorage(): ResolvedGatewayConfig {
  if (typeof window === "undefined") {
    return EMPTY_GATEWAY_CONFIG
  }

  migrateLegacyStorageKey()

  const raw = window.localStorage.getItem(AI_GATEWAY_STORAGE_KEY)
  if (!raw) {
    return EMPTY_GATEWAY_CONFIG
  }

  try {
    return normalizeStoredGatewayConfig(JSON.parse(raw) as StoredGatewayConfig)
  } catch {
    return normalizeStoredGatewayConfig({ apiUrl: raw })
  }
}

export function writeGatewayConfigToStorage(config: StoredGatewayConfig): void {
  if (typeof window === "undefined") return
  const normalized = normalizeStoredGatewayConfig(config)
  if (!normalized.apiKey.trim() && !normalized.apiUrl.trim()) {
    window.localStorage.removeItem(AI_GATEWAY_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(AI_GATEWAY_STORAGE_KEY, JSON.stringify(normalized))
}

export function clearGatewayConfigStorage(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AI_GATEWAY_STORAGE_KEY)
}

export function readSelectedModelKeyFromStorage(): string | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(SELECTED_MODEL_STORAGE_KEY)
  return raw?.trim() ? raw : null
}

export function writeSelectedModelKeyToStorage(modelKey: string | null): void {
  if (typeof window === "undefined") return
  if (!modelKey?.trim()) {
    window.localStorage.removeItem(SELECTED_MODEL_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelKey)
}

function migrateLegacyStorageKey(): void {
  const current = window.localStorage.getItem(AI_GATEWAY_STORAGE_KEY)
  if (current) return

  const legacy = window.localStorage.getItem(LEGACY_AI_GATEWAY_STORAGE_KEY)
  if (!legacy) return

  window.localStorage.setItem(AI_GATEWAY_STORAGE_KEY, legacy)
  window.localStorage.removeItem(LEGACY_AI_GATEWAY_STORAGE_KEY)
}
