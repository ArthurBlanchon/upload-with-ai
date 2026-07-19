import { CheckIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import type { GatewayModelOption } from "@/ai/gateway-models"
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import { Button } from "@/components/ui/button"

type GatewayModelSelectorProps = {
  models: GatewayModelOption[]
  selectedModelKey: string | null
  onSelect: (modelKey: string) => void
  disabled?: boolean
  size?: "sm" | "default"
}

function ModelItem({
  m,
  isSelected,
  onSelect,
}: {
  m: GatewayModelOption
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  const handleSelect = useCallback(() => {
    onSelect(m.id)
  }, [onSelect, m.id])

  return (
    <ModelSelectorItem onSelect={handleSelect} value={m.id}>
      <ModelSelectorLogo provider={m.chefSlug} />
      <ModelSelectorName>{m.name}</ModelSelectorName>
      <ModelSelectorLogoGroup>
        {m.providers.map((provider) => (
          <ModelSelectorLogo key={provider} provider={provider} />
        ))}
      </ModelSelectorLogoGroup>
      {isSelected ? (
        <CheckIcon className="ml-auto size-4" />
      ) : (
        <div className="ml-auto size-4" />
      )}
    </ModelSelectorItem>
  )
}

export function GatewayModelSelector({
  models,
  selectedModelKey,
  onSelect,
  disabled,
  size = "sm",
}: GatewayModelSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedModel = useMemo(
    () => models.find((m) => m.id === selectedModelKey),
    [models, selectedModelKey]
  )

  const handleSelect = useCallback(
    (modelKey: string) => {
      onSelect(modelKey)
      setOpen(false)
    },
    [onSelect]
  )

  if (models.length === 0) {
    return (
      <Button type="button" variant="outline" size={size} disabled>
        No models
      </Button>
    )
  }

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={disabled}
          className="max-w-48"
        >
          {selectedModel?.chefSlug ? (
            <ModelSelectorLogo provider={selectedModel.chefSlug} />
          ) : null}
          <span className="truncate">
            {selectedModel?.name ?? "Select model"}
          </span>
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent className="sm:max-w-md">
        <ModelSelectorInput placeholder="Search models…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Models">
            {models.map((m) => (
              <ModelItem
                isSelected={selectedModelKey === m.id}
                key={m.id}
                m={m}
                onSelect={handleSelect}
              />
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
