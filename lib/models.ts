/**
 * Model pricing for the token-cost estimator.
 *
 * Prices are USD per million tokens, standard (non-batch, non-cached) rates, as
 * published on the providers' pricing pages on the date in PRICING_AS_OF.
 * They move often — check the linked pages before budgeting against them.
 *
 * `tokenizer` says how the token count for that model is produced:
 *   'o200k'  — the model's real tokenizer, counted exactly.
 *   'cl100k' — the model's real tokenizer, counted exactly.
 *   'approx' — no browser-side tokenizer exists for this family, so the count
 *              is cl100k scaled by `factor`. Shown in the UI as an estimate.
 */

export const PRICING_AS_OF = '2026-10-23';

export const PRICING_SOURCES = [
  { label: 'OpenAI pricing', url: 'https://developers.openai.com/api/docs/pricing' },
  { label: 'Anthropic pricing', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
];

export type Encoding = 'o200k_base' | 'cl100k_base';

export interface Model {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic';
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
  encoding: Encoding;
  /**
   * Multiplier applied to the encoded count when the model's real tokenizer is
   * not available in the browser. 1 means the count is exact.
   */
  factor: number;
  note?: string;
}

export const MODELS: Model[] = [
  // --- OpenAI (exact: o200k_base is the GPT-4o and later tokenizer) ---
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', provider: 'OpenAI', input: 10, output: 50, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', provider: 'OpenAI', input: 2, output: 10, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-6-sol', name: 'GPT-6 Sol', provider: 'OpenAI', input: 2, output: 10, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna', provider: 'OpenAI', input: 0.1, output: 0.5, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', provider: 'OpenAI', input: 4, output: 20, encoding: 'o200k_base', factor: 1, note: 'Promotional rate' },
  { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', provider: 'OpenAI', input: 2, output: 12, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', provider: 'OpenAI', input: 0.2, output: 1.2, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5.5', name: 'GPT-5.5', provider: 'OpenAI', input: 5, output: 30, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5.4', name: 'GPT-5.4', provider: 'OpenAI', input: 2.5, output: 15, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', provider: 'OpenAI', input: 0.75, output: 4.5, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano', provider: 'OpenAI', input: 0.2, output: 1.25, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI', input: 1.25, output: 10, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', input: 1.25, output: 10, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5-mini', name: 'GPT-5 mini', provider: 'OpenAI', input: 0.25, output: 2, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-5-nano', name: 'GPT-5 nano', provider: 'OpenAI', input: 0.05, output: 0.4, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', input: 2, output: 8, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', provider: 'OpenAI', input: 0.4, output: 1.6, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', input: 2.5, output: 10, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', input: 0.15, output: 0.6, encoding: 'o200k_base', factor: 1 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', input: 10, output: 30, encoding: 'cl100k_base', factor: 1 },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', input: 0.5, output: 1.5, encoding: 'cl100k_base', factor: 1 },

  // --- Anthropic (estimated) ---
  // Claude's tokenizer is not published as a browser package. Claude 4.7 and
  // later use a newer tokenizer that produces roughly 30% more tokens for the
  // same text than the previous one, so the two generations get different
  // factors rather than one blended guess.
  { id: 'claude-fable-5-1', name: 'Claude Fable 5.1', provider: 'Anthropic', input: 10, output: 50, encoding: 'cl100k_base', factor: 1.3 },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', provider: 'Anthropic', input: 4, output: 20, encoding: 'cl100k_base', factor: 1.3 },
  { id: 'claude-opus-5', name: 'Claude Opus 5', provider: 'Anthropic', input: 5, output: 25, encoding: 'cl100k_base', factor: 1.3 },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', provider: 'Anthropic', input: 2, output: 10, encoding: 'cl100k_base', factor: 1.3 },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', input: 2, output: 10, encoding: 'cl100k_base', factor: 1.3 },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', input: 3, output: 15, encoding: 'cl100k_base', factor: 1 },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', provider: 'Anthropic', input: 0.1, output: 0.5, encoding: 'cl100k_base', factor: 1.3, note: 'Rate shown is for prompts under 100K tokens' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic', input: 1, output: 5, encoding: 'cl100k_base', factor: 1 },
];

export const DEFAULT_MODEL_ID = 'gpt-6.1-sol';

export const isEstimated = (model: Model): boolean => model.factor !== 1;
