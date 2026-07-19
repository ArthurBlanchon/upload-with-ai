export const AI_GATEWAY_STORAGE_KEY = "upload-with-ai:ai-gateway-url"
export const LEGACY_AI_GATEWAY_STORAGE_KEY = "ask-genial:ai-gateway-url"
export const SELECTED_MODEL_STORAGE_KEY = "upload-with-ai:selected-model-key"

export type StoredGatewayConfig = {
  apiKey?: string
  apiUrl?: string
  modelById?: Record<string, string>
  provider?: "openai" | "genial"
  libraries?: string[]
}

export type ResolvedGatewayConfig = Required<
  Pick<StoredGatewayConfig, "apiKey" | "apiUrl" | "provider" | "libraries" | "modelById">
>

/** Unconfigured gateway state (no default URL or models). */
export const EMPTY_GATEWAY_CONFIG: ResolvedGatewayConfig = {
  apiKey: "",
  apiUrl: "",
  provider: "openai",
  libraries: [],
  modelById: {},
}

/** @deprecated Use {@link EMPTY_GATEWAY_CONFIG}. */
export const DEFAULT_GATEWAY_CONFIG = EMPTY_GATEWAY_CONFIG

export function inferGatewayProviderFromApiUrl(apiUrl: string): "openai" | "genial" {
  const lower = apiUrl.toLowerCase()
  return lower.includes("genial") || lower.includes("artemis") ? "genial" : "openai"
}

export function normalizeStoredGatewayConfig(
  config?: StoredGatewayConfig
): ResolvedGatewayConfig {
  const modelById =
    config?.modelById && typeof config.modelById === "object"
      ? config.modelById
      : {}
  const apiUrl = config?.apiUrl ?? ""

  return {
    apiKey: config?.apiKey ?? "",
    apiUrl,
    provider: apiUrl.trim()
      ? inferGatewayProviderFromApiUrl(apiUrl)
      : (config?.provider ?? "openai"),
    libraries: Array.isArray(config?.libraries)
      ? config.libraries.filter((lib): lib is string => typeof lib === "string")
      : [],
    modelById,
  }
}

export function listGatewayModelKeys(config: ResolvedGatewayConfig): string[] {
  return Object.keys(config.modelById)
}

export function isGatewayConfigured(config: ResolvedGatewayConfig): boolean {
  return Boolean(
    config.apiKey.trim() &&
      config.apiUrl.trim() &&
      listGatewayModelKeys(config).length > 0
  )
}

/** True when both API key and URL are blank (safe for optional stored fields). */
export function isGatewayCredentialsEmpty(
  config: Pick<StoredGatewayConfig, "apiKey" | "apiUrl">
): boolean {
  return !(config.apiKey ?? "").trim() && !(config.apiUrl ?? "").trim()
}

export function resolveGatewayModel(
  config: ResolvedGatewayConfig,
  modelKey: string
): string {
  return config.modelById[modelKey] ?? modelKey
}

/** JSON text for the settings editor (matches persisted shape). */
export function formatGatewayConfigForEditor(
  config: ResolvedGatewayConfig | StoredGatewayConfig
): string {
  const normalized = normalizeStoredGatewayConfig(config)
  return JSON.stringify(
    {
      apiKey: normalized.apiKey,
      apiUrl: normalized.apiUrl,
      provider: normalized.provider,
      libraries: normalized.libraries,
      modelById: normalized.modelById,
    } satisfies StoredGatewayConfig,
    null,
    2
  )
}
