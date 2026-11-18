// AI touchpoints: how AI made a project's output. A project shows 3 or 4,
// each picked from this list with a line on what it did for that project.
// Keep the ids in step with the check in supabase/migrations/0006_story.sql.
// Icons are in touchpoint-icons.ts, which only the browser loads.

export const TOUCHPOINT_KINDS = [
  'world_building',
  'brand_integration',
  'video',
  'image',
  'music_sound',
  'voice_over',
  'localisation',
  'script_storyboard',
  'look_development',
  'upscale_finish',
] as const;

export type TouchpointKind = (typeof TOUCHPOINT_KINDS)[number];

export const TOUCHPOINTS: Record<TouchpointKind, { label: string; description: string }> = {
  world_building: {
    label: 'World building and characterisation',
    description: 'Realistic or surreal settings, plus AI character sheets that set the tone of the direction.',
  },
  brand_integration: {
    label: 'Brand placement / product integration',
    description: 'Logos, packshots and product screens placed inside scenes.',
  },
  video: {
    label: 'Video generation',
    description: 'Moving shots, camera moves, character motion and lip-sync.',
  },
  image: {
    label: 'Image generation',
    description: 'Key visuals, product stills and large-format OOH.',
  },
  music_sound: {
    label: 'Music and sound',
    description: 'Custom tracks, re-engineered tracks and sound effects.',
  },
  voice_over: {
    label: 'Voice over',
    description: 'Voice options with different tones, in several languages.',
  },
  localisation: {
    label: 'Localisation',
    description: 'One idea in many languages, scripts and cultures.',
  },
  script_storyboard: {
    label: 'Script and storyboard',
    description: 'Scripts, storyboards and animatics drafted and refined with AI.',
  },
  look_development: {
    label: 'Look development',
    description: 'Moodboards, style frames and visual directions explored before production.',
  },
  upscale_finish: {
    label: 'Upscaling and finishing',
    description: 'Upscaling to 4K, clean-up, retouching and compositing for final delivery.',
  },
};

export const isTouchpointKind = (k: string): k is TouchpointKind => (TOUCHPOINT_KINDS as readonly string[]).includes(k);

/** A touchpoint of your own, named in its label (migration 0007). */
export const CUSTOM = 'custom';
export type AnyTouchpointKind = TouchpointKind | typeof CUSTOM;

/** The name a touchpoint shows under: the list's, or its own. */
export const touchpointLabel = (t: { kind: string; label?: string | null }) =>
  t.kind === CUSTOM ? (t.label ?? '').trim() : isTouchpointKind(t.kind) ? TOUCHPOINTS[t.kind].label : '';
