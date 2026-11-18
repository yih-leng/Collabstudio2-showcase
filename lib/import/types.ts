import type { ProjectStatus } from '../types';

// Deck import: a PowerPoint, PDF or OpenDocument deck is read in the browser
// into slides and assets, Claude drafts projects from it, an admin reviews the
// drafts, and the chosen ones are created as draft projects.

export type DeckFormat = 'pptx' | 'pdf' | 'odp';
export type AssetKind = 'image' | 'video' | 'audio';

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
  about: string;
  output_summary: string;
  deliverables: string[];
  overview_blocks: { label: string; body: string }[];
  capabilities_summary: string;
  capability_names: string[];
  workflow_label: string;
  workflow_steps: string[];
  tool_names: string[];
  slides: number[];
  asset_ids: string[];
  cover_asset_id: string;
  video_links: string[];
  reviewer_notes: string[];
}

/** What the draft API sends back. */
export interface DraftResponse {
  projects: ProjectDraft[];
  /** True when no AI key is set and the drafts came from simple rules. */
  basic?: boolean;
}

/** The names already in Clients and tags, so drafts reuse them. */
export interface ListNames {
  clients: string[];
  types: string[];
  capabilities: string[];
  tools: string[];
}
