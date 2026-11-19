'use client';

import {
  Buildings,
  DeviceMobile,
  FilmSlate,
  ImageSquare,
  Megaphone,
  Shapes,
  Sparkle,
  Television,
  Waveform,
  type Icon,
} from '@phosphor-icons/react';

// An icon for each project type, picked from its name so new types get one too.
// More specific words come first ("Animated series" before "Film").
const BY_NAME: [RegExp, Icon][] = [
  [/micro\s*drama|drama/i, DeviceMobile],
  [/anim|cartoon|series/i, Television],
  [/audio|radio|sound|music|podcast|voice/i, Waveform],
  [/\booh\b|dooh|billboard|outdoor/i, Buildings],
  [/key\s*visual|visual|image|photo|still|print/i, ImageSquare],
  [/brand|campaign/i, Megaphone],
  [/film|video|commercial|tvc/i, FilmSlate],
  [/3d|cgi|motion|design/i, Shapes],
];

export function projectTypeIcon(name: string): Icon {
  return BY_NAME.find(([re]) => re.test(name))?.[1] ?? Sparkle;
}
