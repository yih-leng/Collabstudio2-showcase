import type { AnyTouchpointKind } from '../touchpoints';
import type { ProjectStatus } from '../types';

// Deck import: a PowerPoint, PDF or OpenDocument deck is read in the browser
// into slides and assets, Claude drafts projects from it, an admin reviews the
// drafts, and the chosen ones are created as draft projects.

export type DeckFormat = 'pptx' | 'pdf' | 'odp';
export type AssetKind = 'image' | 'video' | 'audio';

/** The draft field a reviewer note is about, so the review can show it under that field. */
export const NOTE_FIELDS = [
  'title', 'one_liner', 'clients', 'type', 'year', 'status', 'summary', 'objective', 'concept', 'touchpoints', 'output', 'turnaround', 'media', 'general',
] as const;
export type NoteField = (typeof NOTE_FIELDS)[number];

export interface ReviewerNote {
  field: NoteField;
  note: string;
}

export interface DeckAsset {
  /** Short and stable within the deck ("a7"), so the drafts can point at it. */
  id: string;
  kind: AssetKind;
  file: File;
  width: number;
  height: number;
  /** Slide numbers it appears on (1-based). */
  slides: number[];
  /** Logos, backgrounds and rules: on many slides, tiny, or a thin strip. Left out by default. */
  decorative: boolean;
  /** A small JPEG preview (data URL), for the review screen and for Claude to look at. */
  thumb: string | null;
}

export interface DeckSlide {
  n: number;
  text: string;
  notes: string;
  assetIds: string[];
  links: string[];
}

export interface ParsedDeck {
  id: string;
  fileName: string;
  format: DeckFormat;
  slides: DeckSlide[];
  assets: DeckAsset[];
  /** Video links found in the deck (YouTube, Vimeo, Google Drive), deduplicated. */
  links: string[];
}

/** One project as Claude drafts it. Empty strings and lists mean "nothing found". */
export interface ProjectDraft {
  title: string;
  client_names: string[];
  type_name: string;
  /** 0 when the deck doesn't say. */
  year: number;
  status: ProjectStatus;
  one_liner: string;
  /** 01 About this project. */
  summary: string;
  objective: string;
  concept: string;
  /** 02 AI touchpoints: a kind from lib/touchpoints.ts (or your own, named in label) and what it did here. */
  touchpoints: { kind: AnyTouchpointKind; label?: string; body: string }[];
  /** 03 Output. */
  output_summary: string;
  deliverables: string[];
  /** 04 Turnaround / result, as the deck states it. */
  turnaround: string;
  capability_names: string[];
  tool_names: string[];
  slides: number[];
  asset_ids: string[];
  cover_asset_id: string;
  video_links: string[];
  reviewer_notes: ReviewerNote[];
}

/** Tokens Claude used for one draft, and what that cost in US$ (null for a model with no known price). */
export interface DraftUsage {
  model: string;
  model_label: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  cost: number | null;
}

/** The price of drafting a deck, before it runs: input is counted exactly, output is a range. */
export interface DraftEstimate {
  model: string;
  model_label: string;
  input_tokens: number;
  output_tokens: [number, number];
  cost: [number, number];
}

/** The names already in Clients and tags, so drafts reuse them. */
export interface ListNames {
  clients: string[];
  types: string[];
  capabilities: string[];
  tools: string[];
}
