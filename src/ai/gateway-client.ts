import {
  inferGatewayProviderFromApiUrl,
  resolveGatewayModel,
  type ResolvedGatewayConfig,
} from "./gateway-config"

type GatewayMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type GatewayChatResponse = {
  choices?: Array<{
    message?: { content?: string | Array<{ text?: string; type?: string }> }
    content?: string | Array<{ text?: string; type?: string }>
    text?: string
  }>
  message?: { content?: string | Array<{ text?: string; type?: string }> }
  content?: string | Array<{ text?: string; type?: string }>
  text?: string
  error?: { message?: string }
}

function coerceText(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item)).join("").trim()
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if ("text" in record) return coerceText(record.text)
    if ("value" in record) return coerceText(record.value)
    if ("content" in record) return coerceText(record.content)
  }
  return ""
}

function extractAssistantText(payload: GatewayChatResponse): string {
  const choice = payload.choices?.[0]
  const message = choice?.message ?? payload.message
  const text =
    coerceText(message?.content ?? choice?.content) ||
    (typeof choice?.text === "string" ? choice.text : "") ||
    (typeof payload.text === "string" ? payload.text : "") ||
    coerceText(payload.content)
  return text
}

export type GatewayCompletionRequest = {
  config: ResolvedGatewayConfig
  modelKey: string
  messages: GatewayMessage[]
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

export async function runGatewayCompletion(
  request: GatewayCompletionRequest
): Promise<string> {
  const { config, modelKey, messages, maxTokens = 4096, temperature = 0.1, signal } =
    request

  const apiKey = config.apiKey.trim()
  const apiUrl = config.apiUrl.trim()
  if (!apiKey || !apiUrl) {
    throw new Error("Configure the AI gateway (API key and URL) before scanning.")
  }

  const isGenialProvider = inferGatewayProviderFromApiUrl(apiUrl) === "genial"

  const body: Record<string, unknown> = {
    max_tokens: maxTokens,
    messages,
    model: resolveGatewayModel(config, modelKey),
    stream: false,
    temperature,
    top_p: 0.75,
  }

  if (isGenialProvider && config.libraries.length > 0) {
    body.libraries = config.libraries
  }

  const response = await fetch(apiUrl, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  })

  const rawBody = await response.text()
  let payload: GatewayChatResponse = {}
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as GatewayChatResponse
    } catch {
      payload = { text: rawBody }
    }
  }

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `AI Gateway request failed (${response.status})`
    )
  }

  const text = extractAssistantText(payload)
  if (!text) {
    throw new Error("The AI Gateway returned an empty response.")
  }
  return text
}
