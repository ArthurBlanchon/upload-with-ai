import { useCallback, useMemo, useState } from "react"

import {
  clearGatewayConfigStorage,
  readGatewayConfigFromStorage,
  readSelectedModelKeyFromStorage,
  writeGatewayConfigToStorage,
  writeSelectedModelKeyToStorage,
} from "./gateway-config-storage"
import {
  EMPTY_GATEWAY_CONFIG,
  isGatewayConfigured,
  listGatewayModelKeys,
  normalizeStoredGatewayConfig,
  type ResolvedGatewayConfig,
  type StoredGatewayConfig,
} from "./gateway-config"
import { gatewayModelOptionsFromConfig } from "./gateway-models"

export type ModelConfigRow = {
  id: string
  name: string
  modelId: string
  saved: boolean
}

function createModelConfigRow(
  input?: Partial<Pick<ModelConfigRow, "name" | "modelId" | "saved">>
): ModelConfigRow {
  return {
    id: `model-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    modelId: input?.modelId ?? "",
    name: input?.name ?? "",
    saved: input?.saved ?? false,
  }
}

export function modelByIdToRows(modelById: Record<string, string>): ModelConfigRow[] {
  const rows = Object.entries(modelById).map(([name, modelId]) =>
    createModelConfigRow({ modelId, name, saved: true })
  )
  return [...rows, createModelConfigRow()]
}

export function modelRowsToModelById(rows: ModelConfigRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    if (!row.saved) continue
    const name = row.name.trim()
    const modelId = row.modelId.trim()
    if (name && modelId) out[name] = modelId
  }
  return out
}

export function ensureTrailingDraftModelRow(rows: ModelConfigRow[]): ModelConfigRow[] {
  return rows.some((row) => !row.saved) ? rows : [...rows, createModelConfigRow()]
}

export function useAiGatewayConfig() {
  const [config, setConfig] = useState<ResolvedGatewayConfig>(() =>
    readGatewayConfigFromStorage()
  )
  const [selectedModelKey, setSelectedModelKeyState] = useState<string | null>(() =>
    readSelectedModelKeyFromStorage()
  )

  const configured = useMemo(() => isGatewayConfigured(config), [config])

  const availableModels = useMemo(
    () => gatewayModelOptionsFromConfig(config),
    [config]
  )

  const activeModelKey = useMemo(() => {
    const keys = listGatewayModelKeys(config)
    if (keys.length === 0) return null
    if (selectedModelKey && keys.includes(selectedModelKey)) return selectedModelKey
    return keys[0]
  }, [config, selectedModelKey])

  const setSelectedModelKey = useCallback((modelKey: string) => {
    setSelectedModelKeyState(modelKey)
    writeSelectedModelKeyToStorage(modelKey)
  }, [])

  const persist = useCallback((next: StoredGatewayConfig) => {
    const normalized = normalizeStoredGatewayConfig(next)
    writeGatewayConfigToStorage(normalized)
    setConfig(normalized)
    return normalized
  }, [])

  const reset = useCallback(() => {
    clearGatewayConfigStorage()
    writeSelectedModelKeyToStorage(null)
    setConfig(EMPTY_GATEWAY_CONFIG)
    setSelectedModelKeyState(null)
  }, [])

  const reload = useCallback(() => {
    setConfig(readGatewayConfigFromStorage())
  }, [])

  return {
    activeModelKey,
    availableModels,
    config,
    configured,
    persist,
    reload,
    reset,
    selectedModelKey: activeModelKey,
    setSelectedModelKey,
  }
}
