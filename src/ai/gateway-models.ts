import type { ResolvedGatewayConfig } from "./gateway-config"

export type GatewayModelOption = {
  id: string
  name: string
  chefSlug: string
  providers: string[]
}

export function gatewayModelOptionsFromConfig(
  config: ResolvedGatewayConfig
): GatewayModelOption[] {
  const chefSlug = config.provider === "genial" ? "genial" : "openai"
  return Object.keys(config.modelById).map((id) => ({
    chefSlug,
    id,
    name: id,
    providers: [chefSlug],
  }))
}
