import type { AnyTouchpointKind } from './touchpoints';

export type ProjectStatus = 'live' | 'approved' | 'in_progress' | 'concept';
export type Visibility = 'published' | 'draft' | 'hidden';
export type MediaKind = 'image' | 'video' | 'audio' | 'embed';
export type Aspect = '16:9' | '9:16' | '4:5' | '1:1';
export type TagType = 'capability' | 'tool';
export type ListItemType = 'deliverable' | 'ai_workflow';

export interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  logo_path: string | null;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  sort_order: number;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  client_ids: string[];
  category_ids: string[];
  tag_ids: string[];
  year: number | null;
  status: ProjectStatus;
  status_note: string | null;
  one_liner: string | null;
  /** No longer shown: replaced by summary, objective and concept (migration 0006). */
  about: string | null;
  /** 01 About this project: what the project is. */
  summary: string | null;
  /** The client's objective or production bottleneck, in 1–2 sentences. */
  objective: string | null;
  /** The creative idea, visual style and narrative, in 2–3 sentences. */
  concept: string | null;
  output_summary: string | null;
  /** 04 Turnaround / result: production time, efficiency or results. */
  turnaround: string | null;
  capabilities_summary: string | null;
  workflow_label: string | null;
  featured: boolean;
  featured_order: number;
  sort_order: number;
  visibility: Visibility;
  is_internal: boolean;
  cover_media_id: string | null;
  hero_media_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OverviewBlock {
  id: string;
  project_id: string;
  label: string;
  body: string;
  sort_order: number;
}

/** 02 AI touchpoints: one of the kinds in lib/touchpoints.ts, or your own ("custom", named in label), with what it did here. */
export interface AiTouchpoint {
  id: string;
  project_id: string;
  kind: AnyTouchpointKind;
  label: string | null;
  body: string;
  sort_order: number;
}

/** 04 A key figure under Turnaround / result: "13 days" · "storyboard lock to final approval". */
export interface ResultFigure {
  id: string;
  project_id: string;
  value: string;
  label: string;
  sort_order: number;
}

export interface ListItemRow {
  id: string;
  project_id: string;
  type: ListItemType;
  text: string;
  sort_order: number;
}

export interface Media {
  id: string;
  project_id: string;
  kind: MediaKind;
  url: string;
  storage_path: string | null;
  aspect: Aspect;
  caption: string | null;
  sort_order: number;
  created_at?: string;
}

export interface Enquiry {
  id: string;
  name: string;
  company: string | null;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Showreel {
  kind: 'video' | 'embed';
  url: string;
  storage_path?: string | null;
}

export interface SiteSettings {
  hero_title: string;
  hero_intro: string;
  showreel: Showreel | null;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
}

export interface Lists {
  clients: Client[];
  categories: Category[];
  tags: Tag[];
}

/** A project with everything the public pages show, resolved. */
/** A project type on the home page: how much published work it has, and the covers to preview. */
export interface ProjectTypeSummary {
  id: string;
  name: string;
  count: number;
  covers: Media[];
}

export interface ProjectCardData {
  id: string;
  slug: string;
  title: string;
  clients: Client[];
  categories: Category[];
  capabilities: Tag[];
  tools: Tag[];
  year: number | null;
  status: ProjectStatus;
  status_note: string | null;
  one_liner: string | null;
  featured: boolean;
  cover: Media | null;
}

/** One slide in the home page banner: a project, or the studio showreel. */
export interface ShowcaseSlide {
  id: string;
  /** Null for the showreel, which links to the Work page. */
  slug: string | null;
  title: string;
  eyebrow: string;
  one_liner: string | null;
  media: Pick<Media, 'kind' | 'url' | 'aspect' | 'caption'> | null;
}

export interface ProjectDetailData extends ProjectCardData {
  summary: string | null;
  objective: string | null;
  concept: string | null;
  output_summary: string | null;
  turnaround: string | null;
  touchpoints: AiTouchpoint[];
  figures: ResultFigure[];
  visibility: Visibility;
  is_internal: boolean;
  hero: Media | null;
  deliverables: ListItemRow[];
  gallery: Media[];
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}
