// What deck drafting costs. Prices are US$ per million tokens (Anthropic's
// list prices); update them here if they change.

export interface ModelPrice {
  label: string;
  input: number;
  output: number;
}

export const PRICES: Record<string, ModelPrice> = {
  'claude-sonnet-5-5': { label: 'Claude Sonnet 5.5', input: 2, output: 10 },
  'claude-opus-5-5': { label: 'Claude Opus 5.5', input: 4, output: 20 },
  'claude-haiku-5-5': { label: 'Claude Haiku 5.5', input: 0.1, output: 0.5 },
  // A declined request can be rerun on another model (server-side fallback).
  'claude-opus-4-8': { label: 'Claude Opus 4.8', input: 5, output: 25 },
};

// Caching multiplies the input price: writing a cache costs more, reading one far less.
const CACHE_WRITE = 1.25;
const CACHE_READ = 0.1;

export interface TokenUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/** The cost of one request in US$, or null for a model not in the table. */
export function costOf(u: TokenUsage): number | null {
  const p = PRICES[u.model];
  if (!p) return null;
  const input =
    u.input_tokens + (u.cache_creation_input_tokens ?? 0) * CACHE_WRITE + (u.cache_read_input_tokens ?? 0) * CACHE_READ;
  return (input * p.input + u.output_tokens * p.output) / 1_000_000;
}

/**
 * What Claude writes can't be known before it runs: the drafts, plus its
 * thinking. Both grow with how much the deck says. Calibrated on a test run
 * (a 27-slide, one-project pitch: 1.7k out on Sonnet 5.5), with the top end
 * left wide for showcase decks that hold many projects.
 */
export function outputRange(textTokens: number): [number, number] {
  return [Math.round(1000 + textTokens * 0.25), Math.round(6000 + textTokens * 1.5)];
}

export function formatUsd(n: number) {
  if (n < 0.01) return 'under US$0.01';
  return `US$${n.toFixed(2)}`;
}

export function formatTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
