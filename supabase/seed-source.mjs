// Seed content from the "AI Creative Showcase" deck.
// Edit this file, then run `npm run seed:build` to regenerate
// supabase/seed.sql and lib/seed.generated.json.

export const settings = {
  hero_title: 'AI Creative Showcase',
  hero_intro:
    'KULT makes films, characters, key visuals and brand campaigns with AI, from the first brief to the final master.',
  showreel: null, // { kind: 'video' | 'embed', url }
  contact_email: 'hello@kult.studio',
  contact_phone: '',
  contact_address: 'Kuala Lumpur, Malaysia',
};

export const clients = ['Skechers', 'Cloakwork', 'U Mobile', 'ShopeePay', 'CelcomDigi', 'Astro'];

// Project types: every project has exactly one.
export const categories = ['Film', 'Key Visual', 'Microdrama', 'Brand Campaign', 'Storyboard'];

export const capabilities = [
  'AI film',
  'AI characters & talent',
  'Microdrama',
  'Key visuals',
  'Brand strategy',
  'Music & voice',
  'Multi-language versions',
];

export const tools = ['Veo 3.1', 'Suno', 'Topaz', 'Higgsfield'];

export const projects = [
  {
    slug: 'skechers-cloakwork-merch-film',
    title: 'Skechers × Cloakwork Merch Film',
    clients: ['Skechers', 'Cloakwork'],
    categories: ['Film'],
    year: 2026,
    status: 'live',
    featured: true,
    is_internal: false,
    one_liner: 'A four-part character film where T-shirt art comes alive in 2D animation.',
    about:
      "Hero and teaser videos for the SKECHERS SKECHVIBE × Cloakwork launch.",
    output_summary: '60s hero film, 3 teasers, key visual, 24 product stills',
    capabilities_summary:
      'Four-part character story, live-action look mixed with 2D animation, print and social assets',
    capabilities: ['AI film', 'AI characters & talent', 'Key visuals', 'Music & voice'],
    tools: [],
    cover: '/seed/skechers-cloakwork.jpg',
    blocks: [
      [
        'Big idea',
        '"Skech Your Vibe": creative freedom found anywhere, from city alleys to the beach to street music. Tagline: "Skech in style, feel the vibe."',
      ],
      [
        'Story',
        "One character's journey in four parts: alley, beach, busking band and night city. His T-shirt artwork turns into 2D animation at each stop.",
      ],
      [
        'Look and cast',
        'Stylised cinematic realism, with a live-action look mixed with animated 2D Cloakwork artwork. 8 characters: 6 male, 2 female.',
      ],
      ['Timeline', 'Storyboard 10 Jun to final approval 23 Jun 2026; client review rounds to 10 Jul 2026.'],
    ],
    deliverables: [
      '60s hero film built from four 15s parts, in 4K horizontal and vertical (1080 × 1920)',
      '3 teaser videos, 15s each',
      '4K key visual adapted from the hero film end frame',
      '24 product stills: 6 angles × 4 formats (IG 1080 × 1350, 1:1, A1 vertical, A1 horizontal)',
      'Animated (6s) and static campaign mastheads',
    ],
    ai_workflow: [
      'Brief to script with LLM grounding, then an AI storyboard',
      'AI video generation, AI editing, AI voice and music',
      'Client sign-off on the storyboard before generation starts',
      'Part-by-part reviews as each 15s section is ready',
      'Changes made by re-prompting, not reshooting',
    ],
  },
  {
    slug: 'umobile-prepaid-ultra-superhero-5g',
    title: 'UMobile Prepaid ULTRA Superhero 5G',
    clients: ['U Mobile'],
    categories: ['Film'],
    year: 2026,
    status: 'live',
    featured: true,
    is_internal: false,
    one_liner: 'Three AI superheroes launch Prepaid ULTRA across TV, OOH and retail.',
    about:
      "Announce the launch of Prepaid ULTRA in April with an AI-generated launch video for TVC, addressable TV, OOH and retail displays.",
    output_summary: '30s launch video and cutdowns, English and BM, 4K',
    capabilities_summary:
      'AI characters and world-building, custom soundtrack, multi-language and multi-format versions',
    capabilities: ['AI film', 'AI characters & talent', 'Music & voice', 'Multi-language versions'],
    tools: [],
    cover: '/seed/umobile-ultra.jpg',
    blocks: [
      ['Audience', 'Young generation: rural mass on the East Coast, and urban households in the Klang Valley.'],
      [
        'Big idea',
        'Superhero-film energy with human-like characters in forward-futuristic fashion, training their abilities. Pillars: Fashion, Action, Attitude.',
      ],
      [
        'Look and cast',
        'Stylised reality in a bright orange-sky metropolis, never dark or dystopian. 3 AI characters: The Charger, The Breaker, The Mover.',
      ],
      [
        'Timeline',
        'Brief 25 Mar 2026, final approval 10 Apr, live 13 Apr; language and format submissions to 13 May 2026.',
      ],
    ],
    deliverables: [
      '30s main video with 20s and 15s cutdowns',
      'English and Bahasa Malaysia versions of every cut',
      '4K, 25 fps, TVC-ready, in horizontal and vertical',
      'Custom AI soundtrack with English and BM lyrics',
      'Character prompts documented for LPF submission',
    ],
    ai_workflow: [
      'Three AI characters designed, with outfit and face options',
      'Two city worlds explored',
      'Music options reviewed, from cinematic trailer to electronic rock',
      'Storyboard, then 10s sections for approval, then the full 30s',
      'Language and format versions in the final rounds',
    ],
  },
  {
    slug: 'umobile-family-first-airplane',
    title: 'UMobile Family 1st (Airplane)',
    clients: ['U Mobile'],
    categories: ['Key Visual'],
    year: 2026,
    status: 'live',
    featured: true,
    is_internal: false,
    one_liner: 'A mother and son in business class, cast and filmed entirely with AI.',
    about:
      "Main key visual in two versions plus a 30s video, set on a business class flight, warm and cosy.",
    output_summary: 'Key visuals for West and East Coast, 30s film, music and voice-over options',
    capabilities_summary:
      'AI-generated pan-Asian talent, culturally tailored versions, film with music, VO and SFX',
    capabilities: ['AI film', 'AI characters & talent', 'Key visuals', 'Music & voice', 'Multi-language versions'],
    tools: ['Veo 3.1', 'Suno', 'Topaz', 'Higgsfield'],
    cover: '/seed/umobile-family-first.jpg',
    blocks: [
      [
        'Big idea',
        '"Because family comes first, we made priority shareable." UMobile ULTRA sits alongside premium choices like flying business class.',
      ],
      ['Cast', 'A mother in her late 20s and her 2-year-old son, with a pan-Asian look for Malay and Chinese audiences.'],
      [
        'Versions',
        'West Coast: the approved key visual. East Coast: a modern tudung or hijab look for the T20 audience.',
      ],
      [
        'Timeline',
        'Hi-res key visual due 12 Mar 2026, launch 7 Apr 2026. One year in Malaysia across BTL, digital, web, social and on-ground.',
      ],
    ],
    deliverables: [
      'Key visual in West Coast and East Coast versions',
      'Key visual in 16:9, 4:5 and 9:16',
      '30s film in 6 shot blocks, ending on a sunrise call-to-action',
      '3 music options',
      'Voice-over in English, BM and Chinese, plus sound effects',
    ],
    ai_workflow: [
      'Persona sheets for Maya (mother) and Danial (son)',
      'Storyboard stills with alternate angles to keep faces consistent',
      'Video in Veo 3.1 for 4K, or upscaled with Topaz in Higgsfield',
      'Music made in Suno',
      'Shot-by-shot plan with camera moves and timing',
    ],
  },
  {
    slug: 'shopeepay-master-brand-campaign',
    workflow_label: 'How it was built',
    title: 'ShopeePay Master Brand Campaign',
    clients: ['ShopeePay'],
    categories: ['Brand Campaign'],
    year: 2026,
    status: 'in_progress',
    featured: false,
    is_internal: false,
    one_liner: 'One masterline, "More Value in Every Way", in two key visual directions.',
    about:
      "Two distinct key visual directions, each with a moodboard, palette, typography and keywords. Keep Shopee's generosity but lose the sale-event look: more trust than playfulness.",
    output_summary: 'Brand strategy, masterline and 2 key visual directions',
    capabilities_summary: 'Positioning, two visual directions, masterline in English, BM and Chinese',
    capabilities: ['Brand strategy', 'Key visuals', 'Multi-language versions'],
    tools: [],
    cover: null,
    blocks: [
      [
        'Big idea',
        '"More Value in Every Way" across more rewards (QR Pay), more flexibility (SPayLater) and more potential returns (Money+).',
      ],
      [
        'Two directions',
        'Say "More" Boldly: big type with lifestyle photography. The Infinite "More": a flowing wave headline with warm everyday moments.',
      ],
    ],
    deliverables: [
      'Master brand strategy',
      'Masterline in English, BM and Chinese',
      'Direction 1, Say "More" Boldly, in 4 options',
      'Direction 2, The Infinite "More", with its own tone and palette',
      'Palette, typography and tone for each direction',
    ],
    ai_workflow: [
      'Market context from Ipsos Malaysia (Aug 2026)',
      "Competitor read of Touch 'n Go, MAE and GrabPay",
      'Shopee and ShopeePay set as two identities with the same DNA',
      'A shift to one idea: More',
      'Lifestyle photography with large type',
    ],
  },
  {
    slug: 'celcomdigi-scam-call-protection',
    title: 'CelcomDigi Scam Call Protection',
    clients: ['CelcomDigi'],
    categories: ['Microdrama'],
    year: 2026,
    status: 'approved',
    status_note: 'Episode 1',
    featured: false,
    is_internal: false,
    one_liner: 'A vertical microdrama series where every episode is a scam to pause on.',
    about:
      "A friendly reminder, not a hard sell: scam-protection stories from real scenarios, with CelcomDigi as the network that has your back.",
    output_summary: 'Vertical drama series concept, Episode 1 film (60s) horizontal and vertical',
    capabilities_summary: 'AI microdrama with character motion and lip-sync, built to client brand rules',
    capabilities: ['Microdrama', 'AI characters & talent', 'AI film'],
    tools: [],
    cover: null,
    blocks: [
      [
        'Big idea',
        '"When Life Gives You Twists": vertical dramas inspired by Chinese and Korean TikTok dramas. Melodramatic, humorous and fast-paced.',
      ],
      [
        'Series',
        '4 episodes, one scam each: fake job, lucky draw, investment and love scam. The message: scams prey on emotions, so pause.',
      ],
      ['Second concept', '"Shadow Lines", a Black Mirror-inspired suspense series around phone screens and SMS threads.'],
      ['Timeline', 'Reviews 28 Aug to 14 Sep 2026; vertical version 28 Sep 2026.'],
    ],
    deliverables: [
      'Episode 1, "The Ominous Offer": 22-frame storyboard and a 60s film',
      'Horizontal (1920 × 1080) and vertical (1080 × 1920) versions',
      'Client end screen, logo lockup and scam statistic',
      'Storylines for episodes 2 to 4',
      'Cinematic look, warm daylight turning cooler as the scam unfolds',
    ],
    ai_workflow: [
      'Phase 1, sign-off: storyboard and frame lock',
      'Phase 2, execution: AI image and video, character motion and consistency',
      'Phase 3, delivery: edit, grade, audio, lip-sync and masters',
      'Characters, lighting and composition locked early',
    ],
  },
  {
    slug: 'astro-whats-next',
    workflow_label: 'How it was built',
    title: "Astro What's Next (Internal)",
    clients: ['Astro'],
    categories: ['Storyboard'],
    year: 2026,
    status: 'concept',
    featured: false,
    is_internal: true,
    one_liner: 'A day in the life of Adam, told in 23 Wes Anderson-style frames.',
    about:
      "A first-person day of \"Adam\", 6:30 AM to 10:30 PM, with a cheeky narrator commenting on his phone habits.",
    output_summary: '23-frame storyboard for a day-in-the-life film',
    capabilities_summary: 'First-person storytelling, Wes Anderson-style look, brand placement inside scenes',
    capabilities: ['AI film'],
    tools: [],
    cover: null,
    blocks: [
      [
        'Astro touchpoints',
        "Stadium Astro, Syok podcast, Sooka, KULT Offside, Awani and AstroGO's Ikatan Terlarang.",
      ],
      [
        'Story arc',
        'It starts and ends in bed on his phone; a watch timelapse from Casio to Rolex shows career growth.',
      ],
      ['Look and sound', 'Wes Anderson cinematography and palettes, with ASMR cues: clock flips, shower, train doors.'],
      ['Brand placement', 'A U Mobile billboard seen from the train, and Mamee cup noodles at lunch.'],
    ],
    deliverables: [
      '23-frame storyboard with script, camera note and sound cue per frame',
      'Style reference board',
      'Alternate stills: bedroom, office lunch, train and kitchen',
      'Final video length and format to be confirmed',
    ],
    ai_workflow: [
      'Style reference set first',
      'POV shots: phone, laptop, train window, car',
      'Scene replacements noted per frame',
      'Time-of-day markers tie the frames into one day',
      'Review comments marked on frames',
    ],
  },
];
