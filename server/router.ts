/**
 * Model Router — auto-selects the best model for each task type.
 */

export type TaskType =
  | "decision"
  | "general_chat"
  | "react_execution"
  | "twin_edit_learning"
  | "twin_result_learning"
  | "morning_digest"
  | "weekly_reflection";

export type ModelTier = "strong" | "balanced" | "tool_use" | "cheap";

export const ROUTING_TABLE: Record<TaskType, ModelTier> = {
  decision:             "strong",
  general_chat:         "balanced",
  react_execution:      "tool_use",
  twin_edit_learning:   "cheap",
  twin_result_learning: "cheap",
  morning_digest:       "cheap",
  weekly_reflection:    "cheap",
};

export const TIER_PREFERENCES: Record<ModelTier, string[]> = {
  strong: [
    "claude-sonnet-4-6",
    "gpt-4o",
    "gemini-2.5-pro-preview-06-05",
    "deepseek-reasoner",
  ],
  balanced: [
    "gpt-4o-mini",
    "claude-haiku-4-5-20251001",
    "deepseek-chat",
    "qwen-plus",
    "gemini-2.0-flash",
  ],
  tool_use: [
    "claude-sonnet-4-6",
    "gpt-4o",
    "gemini-2.0-flash",
  ],
  cheap: [
    "deepseek-chat",
    "qwen-plus",
    "gemini-2.0-flash",
    "gpt-4o-mini",
    "claude-haiku-4-5-20251001",
  ],
};

const MODEL_KEY_MAP: Record<string, string> = {
  "claude-": "ANTHROPIC_API_KEY",
  "gpt-": "OPENAI_API_KEY",
  "deepseek-": "DEEPSEEK_API_KEY",
  "qwen-": "QWEN_API_KEY",
  "gemini-": "GOOGLE_API_KEY",
};

export function getRequiredKey(modelId: string): string {
  for (const [prefix, key] of Object.entries(MODEL_KEY_MAP)) {
    if (modelId.startsWith(prefix)) return key;
  }
  return "ANTHROPIC_API_KEY";
}

export function hasKey(modelId: string): boolean {
  return !!process.env[getRequiredKey(modelId)];
}

export function selectModelId(task: TaskType): string {
  const tier = ROUTING_TABLE[task];
  const candidates = TIER_PREFERENCES[tier];

  for (const modelId of candidates) {
    if (hasKey(modelId)) return modelId;
  }

  throw new Error(`No API key configured for any ${tier}-tier model (task: ${task})`);
}

export function getRoutingStatus(): { task: TaskType; tier: ModelTier; model: string | null }[] {
  return (Object.keys(ROUTING_TABLE) as TaskType[]).map(task => {
    const tier = ROUTING_TABLE[task];
    let model: string | null = null;
    try { model = selectModelId(task); } catch {}
    return { task, tier, model };
  });
}
