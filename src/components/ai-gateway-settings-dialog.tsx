import { CheckIcon, EyeIcon, EyeOffIcon, Trash2Icon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  formatGatewayConfigForEditor,
  isGatewayCredentialsEmpty,
  normalizeStoredGatewayConfig,
  type ResolvedGatewayConfig,
  type StoredGatewayConfig,
} from "@/ai/gateway-config"
import {
  ensureTrailingDraftModelRow,
  modelByIdToRows,
  modelRowsToModelById,
  type ModelConfigRow,
} from "@/ai/use-ai-gateway-config"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type AiGatewaySettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialConfig: ResolvedGatewayConfig
  onSave: (config: StoredGatewayConfig) => void
  onClear: () => void
}

function formStateFromConfig(config: ResolvedGatewayConfig) {
  return {
    apiKeyInput: config.apiKey,
    apiUrlInput: config.apiUrl,
    modelRows: modelByIdToRows(config.modelById),
    jsonConfigInput: formatGatewayConfigForEditor(config),
  }
}

export function AiGatewaySettingsDialog({
  open,
  onOpenChange,
  initialConfig,
  onSave,
  onClear,
}: AiGatewaySettingsDialogProps) {
  const [apiKeyInput, setApiKeyInput] = useState(initialConfig.apiKey)
  const [apiUrlInput, setApiUrlInput] = useState(initialConfig.apiUrl)
  const [modelRows, setModelRows] = useState<ModelConfigRow[]>(() =>
    modelByIdToRows(initialConfig.modelById)
  )
  const [configEditorMode, setConfigEditorMode] = useState<"form" | "json">("form")
  const [jsonConfigInput, setJsonConfigInput] = useState(() =>
    formatGatewayConfigForEditor(initialConfig)
  )
  const [showApiKey, setShowApiKey] = useState(false)

  const resetToSaved = useCallback(() => {
    const next = formStateFromConfig(initialConfig)
    setApiKeyInput(next.apiKeyInput)
    setApiUrlInput(next.apiUrlInput)
    setModelRows(next.modelRows)
    setJsonConfigInput(next.jsonConfigInput)
    setConfigEditorMode("form")
    setShowApiKey(false)
  }, [initialConfig])

  useEffect(() => {
    if (open) resetToSaved()
  }, [open, resetToSaved])

  const buildConfigFromForm = useCallback((): ResolvedGatewayConfig => {
    const nextModelById = modelRowsToModelById(modelRows)
    return normalizeStoredGatewayConfig({
      apiKey: apiKeyInput.trim(),
      apiUrl: apiUrlInput.trim(),
      libraries: initialConfig.libraries,
      modelById: nextModelById,
    })
  }, [apiKeyInput, apiUrlInput, initialConfig.libraries, modelRows])

  const syncJsonFromForm = useCallback(() => {
    setJsonConfigInput(formatGatewayConfigForEditor(buildConfigFromForm()))
  }, [buildConfigFromForm])

  const handleSave = useCallback(() => {
    if (configEditorMode === "json") {
      try {
        const parsed = JSON.parse(jsonConfigInput) as StoredGatewayConfig
        const normalized = normalizeStoredGatewayConfig(parsed)
        if (isGatewayCredentialsEmpty(normalized)) {
          onClear()
          toast.success("API settings removed")
          onOpenChange(false)
          return
        }
        onSave(normalized)
        toast.success("API settings saved")
        onOpenChange(false)
      } catch (error) {
        toast.error("Invalid JSON config", {
          description: error instanceof Error ? error.message : "Use valid JSON.",
        })
      }
      return
    }

    const normalized = buildConfigFromForm()
    if (isGatewayCredentialsEmpty(normalized)) {
      onClear()
      toast.success("API settings removed")
      onOpenChange(false)
      return
    }

    onSave(normalized)
    toast.success("API settings saved")
    onOpenChange(false)
  }, [
    buildConfigFromForm,
    configEditorMode,
    jsonConfigInput,
    onClear,
    onOpenChange,
    onSave,
  ])

  const handleCancel = useCallback(() => {
    resetToSaved()
    onOpenChange(false)
  }, [onOpenChange, resetToSaved])

  const handleModelRowFieldChange = useCallback(
    (rowId: string, field: "name" | "modelId", value: string) => {
      setModelRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
      )
    },
    []
  )

  const handleSaveModelRow = useCallback((rowId: string) => {
    setModelRows((prev) => {
      const next = prev.map((row) =>
        row.id === rowId ? { ...row, saved: true } : row
      )
      return ensureTrailingDraftModelRow(next)
    })
  }, [])

  const handleRemoveModelRow = useCallback((rowId: string) => {
    setModelRows((prev) =>
      ensureTrailingDraftModelRow(prev.filter((row) => row.id !== rowId))
    )
  }, [])

  const handleEditorModeChange = useCallback(
    (value: string) => {
      const mode = value as "form" | "json"
      if (mode === "json") syncJsonFromForm()
      setConfigEditorMode(mode)
    },
    [syncJsonFromForm]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI gateway configuration</DialogTitle>
          <DialogDescription>
            Stored in browser localStorage ({`upload-with-ai:ai-gateway-url`}). Used
            for Scan with AI.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={configEditorMode} onValueChange={handleEditorModeChange}>
          <TabsList>
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="form">
            <div className="space-y-3">
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>API key</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  autoComplete="off"
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-…"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => setShowApiKey((p) => !p)}
                  >
                    {showApiKey ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>URL</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  placeholder="https://your-gateway.example/v1/chat/completions"
                />
              </InputGroup>
            </div>
            <div className="mt-3 space-y-2 rounded-md border p-3">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground">
                <span>Name</span>
                <span>Model id</span>
                <span />
              </div>
              {modelRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <InputGroupInput
                    value={row.name}
                    placeholder="Display name"
                    onChange={(e) =>
                      handleModelRowFieldChange(row.id, "name", e.target.value)
                    }
                  />
                  <InputGroupInput
                    value={row.modelId}
                    placeholder="gateway-model-id"
                    onChange={(e) =>
                      handleModelRowFieldChange(row.id, "modelId", e.target.value)
                    }
                  />
                  {row.saved ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleRemoveModelRow(row.id)}
                    >
                      <Trash2Icon size={14} />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => handleSaveModelRow(row.id)}
                    >
                      <CheckIcon size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                Save
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="json">
            <Textarea
              className="min-h-72 font-mono text-xs"
              value={jsonConfigInput}
              onChange={(e) => setJsonConfigInput(e.target.value)}
              rows={16}
            />
            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                Save
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
