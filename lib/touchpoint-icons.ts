'use client';

import {
  ArrowsOut,
  FilmStrip,
  GlobeHemisphereWest,
  ImageSquare,
  Microphone,
  MusicNotes,
  Notebook,
  Package,
  Palette,
  Sparkle,
  Translate,
  type Icon,
} from '@phosphor-icons/react';
import type { AnyTouchpointKind } from './touchpoints';

export const TOUCHPOINT_ICONS: Record<AnyTouchpointKind, Icon> = {
  world_building: GlobeHemisphereWest,
  brand_integration: Package,
  video: FilmStrip,
  image: ImageSquare,
  music_sound: MusicNotes,
  voice_over: Microphone,
  localisation: Translate,
  script_storyboard: Notebook,
  look_development: Palette,
  upscale_finish: ArrowsOut,
  custom: Sparkle,
};
