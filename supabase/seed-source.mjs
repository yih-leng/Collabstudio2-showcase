// Seed content from the "AI Creative Showcase" deck (updated 17 Nov 2026).
// Edit this file, then run `npm run seed:build` to regenerate
// supabase/seed.sql, supabase/updates/deck-update.sql and lib/seed.generated.json.
//
// Media: `src` is a file in public/ (images) or a link (Google Drive, YouTube,
// Vimeo). `cover` names the card thumbnail and `hero` the first item on the
// project page; both are media keys.

export const settings = {
  hero_title: 'AI Creative Showcase',
  hero_intro:
    'KULT makes films, characters, key visuals and brand campaigns with AI, from the first brief to the final master.',
  showreel: null, // { kind: 'video' | 'embed', url }
  contact_email: 'hello@kult.studio',
  contact_phone: '',
  contact_address: 'Kuala Lumpur, Malaysia',
};

export const clients = [
  'Skechers',
  'Cloakwork',
  'U Mobile',
  'ShopeePay',
  'CelcomDigi',
  'Astro',
  'Enchanteur',
  'Dashing',
];

// Project types: every project has exactly one.
export const categories = ['Film', 'Key Visual', 'Microdrama', 'Brand Campaign', 'Storyboard', 'Audio Ad', 'OOH and DOOH'];

export const capabilities = [
  'AI film',
  'AI characters & talent',
  'Microdrama',
  'Key visuals',
  'Brand strategy',
  'Music & voice',
  'Multi-language versions',
  'Large format',
  'Local content',
];

export const tools = ['Veo 3.1', 'Suno', 'Topaz', 'Higgsfield'];

const drive = (id) => `https://drive.google.com/file/d/${id}/view`;
const img = (slug, name) => `/projects/${slug}/${name}.jpg`;

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
      'Create a series of hero and teaser videos to support the launch of the SKECHERS SKECHVIBE × Cloakwork collaboration.',
    output_summary: '60s hero film, 3 teasers, 24 product stills and campaign mastheads',
    capabilities_summary:
      'Four-part character story, live-action look mixed with 2D animation, product stills in four formats',
    capabilities: ['AI film', 'AI characters & talent', 'Key visuals', 'Music & voice'],
    tools: [],
    blocks: [
      [
        'Big idea',
        '“Skech Your Vibe”: creative freedom can be found anywhere, from city alleys to the beach to street music. Tagline: “Skech in style, feel the vibe.”',
      ],
      [
        'Story',
        'One character’s journey in four parts: alley, beach, busking band and night city. His T-shirt artwork turns into 2D animation at each stop.',
      ],
      [
        'Look and cast',
        'Stylised cinematic realism, with a live-action look mixed with animated 2D Cloakwork artwork. 8 characters: 6 male, 2 female.',
      ],
      ['Timeline', 'Planned: storyboard 10 Jun to final approval 23 Jun 2026. Client review rounds continued to 10 Jul 2026.'],
    ],
    deliverables: [
      '60s hero film',
      '3 teaser videos',
      '24 product stills: 6 angles in 4 formats',
      'Animated (6s) and static campaign mastheads',
    ],
    ai_workflow: [
      'Brief to script with LLM grounding, then an AI storyboard',
      'AI video generation, AI editing, AI voice and music',
      'Artwork to animation with AI',
    ],
    cover: 'cover',
    hero: 'film',
    media: [
      { key: 'film', kind: 'embed', src: drive('1hIm05pI8Feq_V4_hCX3r1PEs_97ZCtAb'), aspect: '16:9', caption: 'Hero film' },
      { key: 'cover', kind: 'image', src: img('skechers-cloakwork-merch-film', 'output'), aspect: '16:9' },
      { key: 'merch-1', kind: 'image', src: img('skechers-cloakwork-merch-film', 'merch-1'), aspect: '4:5' },
      { key: 'merch-2', kind: 'image', src: img('skechers-cloakwork-merch-film', 'merch-2'), aspect: '4:5' },
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
      'Announce the launch of UMobile Prepaid ULTRA in April with an AI-generated launch video for TVC, addressable TV, OOH and retail displays.',
    output_summary: '30s launch video with 20s and 15s cutdowns, in English and BM, with a custom soundtrack',
    capabilities_summary: 'AI characters and world-building, custom soundtrack, multi-language versions',
    capabilities: ['AI film', 'AI characters & talent', 'Music & voice', 'Multi-language versions'],
    tools: [],
    blocks: [
      ['Audience', 'Young generation: rural mass on the East Coast, and urban households in the Klang Valley.'],
      [
        'Big idea',
        'Superhero-film energy with human-like characters in forward-futuristic fashion, shown training their abilities. Pillars: Fashion, Action, Attitude.',
      ],
      ['Look and cast', 'Stylised reality: realistic characters in a bright orange-sky metropolis, never dark or dystopian.'],
      [
        'Timeline',
        'Brief 25 Mar 2026, target final approval 10 Apr, live date 13 Apr. Final language and format submissions ran to 13 May 2026.',
      ],
    ],
    deliverables: [
      '30s main launch video + shorter cutdowns (20s and 15s)',
      'English and Bahasa Malaysia versions',
      'Custom AI-generated soundtrack with lyrics in EN & BM',
      'Character prompts documented for LPF submission',
    ],
    ai_workflow: [
      'Three AI characters designed, with outfit and face options',
      'Two city worlds explored: sunset city & intense orange city',
      'Music options reviewed, from cinematic trailer to electronic rock',
    ],
    cover: 'cover',
    hero: 'film',
    media: [
      { key: 'film', kind: 'embed', src: drive('1W2n81k36kVOZNKjouTPjkkHOoADkOcw-'), aspect: '16:9', caption: 'Launch video' },
      { key: 'cover', kind: 'image', src: img('umobile-prepaid-ultra-superhero-5g', 'output'), aspect: '16:9' },
      { key: 'world', kind: 'image', src: img('umobile-prepaid-ultra-superhero-5g', 'world'), aspect: '16:9' },
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
      'Main key visual in two versions plus a 30s video, set on a business class flight with a warm, cosy feeling.',
    output_summary: 'Key visuals for West and East Coast, a 30s film, and voice-over options in three languages',
    capabilities_summary: 'AI-generated pan-Asian talent, culturally tailored versions, film with music, VO and SFX',
    capabilities: ['AI film', 'AI characters & talent', 'Key visuals', 'Music & voice', 'Multi-language versions'],
    tools: ['Suno'],
    blocks: [
      [
        'Big idea',
        '“Because family comes first, we made priority shareable.” It places UMobile ULTRA alongside other premium choices, like flying business class.',
      ],
      [
        'Cast',
        'A mother in her late 20s and her 2-year-old son, with a pan-Asian look that represents both Malay and Chinese audiences in Malaysia.',
      ],
      [
        'Versions',
        'West Coast: the approved key visual. East Coast: the mother wears a modern tudung or hijab look that appeals to the T20 income audience.',
      ],
      [
        'Timeline and usage',
        'Hi-res key visual due 12 Mar 2026; launch 7 Apr 2026. Usage in Malaysia for 1 year across BTL, digital, website, social media and on-ground.',
      ],
    ],
    deliverables: [
      'Key visual for West Coast and East Coast',
      '30s film storyboarded in 6 shot blocks, ending on a sunrise call-to-action frame',
      'Voice-over options in English, BM and Chinese, plus sound effects',
    ],
    ai_workflow: [
      'Persona sheets for the mother (Maya) and son (Danial) set the look of the talent',
      'Music created in Suno, editable to fit each story block',
      'Shot-by-shot plan with camera move and timing for each scene',
    ],
    cover: 'cover',
    hero: 'film',
    media: [
      { key: 'film', kind: 'embed', src: drive('1zPd5kcFpQscwYN4Hn69Iad7bzGnJXWWE'), aspect: '16:9', caption: '30s film' },
      { key: 'cover', kind: 'image', src: img('umobile-family-first-airplane', 'output'), aspect: '16:9' },
      { key: 'key-visual', kind: 'image', src: img('umobile-family-first-airplane', 'key-visual'), aspect: '4:5' },
    ],
  },
  {
    slug: 'umobile-spotify-ad',
    title: 'UMobile Spotify Ad',
    clients: ['U Mobile'],
    categories: ['Audio Ad'],
    year: 2026,
    status: 'live',
    featured: false,
    is_internal: false,
    one_liner: 'From buffer to bliss: a 30s audio ad in English and BM, built for the ear.',
    about:
      'An audio ad on Spotify for UMobile Ultra Prepaid, in English and Bahasa Malaysia, built around what listeners hear rather than see.',
    output_summary: '30s audio ad in English and Bahasa Melayu, with AI voice options, to Spotify specs',
    capabilities_summary: 'Re-engineered music, multiple AI voice generations, tonality options',
    capabilities: ['Music & voice', 'Multi-language versions'],
    tools: [],
    blocks: [
      [
        'Big idea',
        '“From Buffer to Bliss”: the lag and low-fi sound of a bad connection flips into crisp, instant, high-speed sound. Line: “Why settle for a life on buffer?”',
      ],
      [
        'Music',
        'Two track ideas: re-engineer the Ultra superhero track, or flip U Mobile’s own jingle. Both move from a slow, muted start to a high-energy payoff.',
      ],
      ['Timeline', 'Feedback on 25 May, 8 Jun and 12 Jun 2026, ending with a final English track and a final BM track.'],
    ],
    deliverables: ['30s English + Bahasa Melayu audio ad', 'AI voice options', 'Spotify’s audio ad specs: MP3 or WAV, stereo'],
    ai_workflow: ['Existing music re-engineered', 'Multiple AI voice generations', 'Tonality options based on client’s preference'],
    cover: 'cover',
    // Drive has no picture for audio, so the page opens on the artwork; the tracks follow.
    hero: 'cover',
    media: [
      { key: 'track-en', kind: 'embed', src: drive('1a4-ltgs3lzIBgK9IxBrx2RLSqtPDVyIA'), aspect: '16:9', caption: 'EN: Music Track Option 2 + Brook VO' },
      { key: 'track-bm', kind: 'embed', src: drive('1LnfcTrmouQAi6Tu1spxFmSmmKL1DBkRD'), aspect: '16:9', caption: 'BM: Music Track Option 2 + Khalid VO R2' },
      { key: 'cover', kind: 'image', src: img('umobile-spotify-ad', 'artwork'), aspect: '1:1' },
    ],
  },
  {
    slug: 'umobile-migrant',
    title: 'UMobile Migrant',
    clients: ['U Mobile'],
    categories: ['Film'],
    year: 2026,
    status: 'live',
    featured: false,
    is_internal: false,
    one_liner: 'Your screen, your world: six first-person stories in Indonesian, Bengali and Nepali.',
    about:
      'Promote the all-new Ultra Prepaid to Indonesian, Bangladeshi and Nepali migrant communities with AI video for digital. Brief dated 29 May 2026.',
    output_summary: '6 story videos in 3 languages, each as a 20s main video and 6s cutdown in three formats',
    capabilities_summary: 'One product in many worlds without a shoot, with audio and text in three languages',
    capabilities: ['AI film', 'Music & voice', 'Multi-language versions', 'Local content'],
    tools: [],
    blocks: [
      [
        'Big idea',
        '“Your Screen. Your World.” The phone screen is a portal: press play and you enter the action as the hero. Ultra Prepaid gives you passage, not just data.',
      ],
      [
        'Story',
        'Each film pulls the viewer from a phone screen into a hero moment in first person, then out to a third-person view and the product end frame.',
      ],
      [
        'Six moments',
        'Football, motorsport, esports gaming, DJ music, a birthday video call with family, and a K-drama scene, matched to what each community enjoys.',
      ],
      [
        'Timeline',
        'Storyboard rounds 22 to 29 Jul, video rounds 4 to 26 Aug 2026, then final videos for Indonesia, Nepal and Bangladesh.',
      ],
    ],
    deliverables: [
      '20s main video and 6s cutdown, in 16:9, 9:16 and 1:1',
      '6 story videos in each of 3 languages: Indonesian, Bengali and Nepali',
      'Custom soundtrack, no voice-over, and an AI-content disclaimer in each language',
    ],
    ai_workflow: [
      'AI video generation, AI editing, AI voice and music',
      'One product, multiple environments without physical shoot',
      'Audio and text translations',
    ],
    cover: 'cover',
    hero: 'film-1',
    media: [
      { key: 'film-1', kind: 'embed', src: drive('1uvMpYvm8Ew-LBhqdbFqh7frWr3C_25N2'), aspect: '16:9', caption: 'Football' },
      { key: 'film-2', kind: 'embed', src: drive('13WLWtvK-FPDH48KYj5bRcIse5MzLaojX'), aspect: '16:9', caption: 'Esports gaming' },
      { key: 'film-3', kind: 'embed', src: drive('1bpvB_ZwRFMPx6UHFe-KIxmBxZR4YuM55'), aspect: '16:9', caption: 'Birthday video call' },
      { key: 'film-4', kind: 'embed', src: drive('1Io7dFVLZl7UQ_lPvFYjZZnpR-sYw9a1-'), aspect: '16:9', caption: 'K-drama scene' },
      { key: 'cover', kind: 'image', src: img('umobile-migrant', 'football'), aspect: '16:9', caption: 'Football (still)' },
      { key: 'esports', kind: 'image', src: img('umobile-migrant', 'esports'), aspect: '16:9', caption: 'Esports gaming (still)' },
      { key: 'birthday', kind: 'image', src: img('umobile-migrant', 'birthday-call'), aspect: '16:9', caption: 'Birthday video call (still)' },
      { key: 'k-drama', kind: 'image', src: img('umobile-migrant', 'k-drama'), aspect: '16:9', caption: 'K-drama scene (still)' },
      { key: 'dj', kind: 'image', src: img('umobile-migrant', 'dj-music'), aspect: '16:9', caption: 'DJ music' },
      { key: 'k-drama-still', kind: 'image', src: img('umobile-migrant', 'k-drama-still'), aspect: '16:9' },
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
    one_liner: 'When life gives you twists: a vertical microdrama series about real scam calls.',
    about:
      'A friendly reminder, not a hard sell: scam-protection stories rooted in real scenarios, showing CelcomDigi as the network that has your back.',
    output_summary: '4-episode 60s microdrama, horizontal and vertical, with storylines and scripts',
    capabilities_summary: 'Full AI video generation with localised lip-sync, built on real Malaysian scam cases',
    capabilities: ['Microdrama', 'AI characters & talent', 'AI film'],
    tools: [],
    blocks: [
      [
        'Big idea',
        '“When Life Gives You Twists”: vertical dramas inspired by Chinese and Korean TikTok dramas. Melodramatic, humorous and fast-paced.',
      ],
      [
        'Series',
        '4 episodes, one scam each: fake job offer, lucky draw prize, investment and love scam. Key message: scams prey on emotions, so pause.',
      ],
      [
        'Second concept',
        'Also pitched: “Shadow Lines”, a Black Mirror-inspired suspense series built around everyday phone screens and SMS threads.',
      ],
      ['Timeline', 'Review rounds from 28 Aug to 14 Sep 2026, then the vertical version adapted on 28 Sep 2026. Episode 1 approved.'],
    ],
    deliverables: ['4-episode 60s film, horizontal & vertical', 'Storylines and scriptwriting', 'Cinematic microdrama style'],
    ai_workflow: ['Define most prevalent scam call cases in Malaysia', 'Full AI video generation', 'Localised audio lip-sync'],
    cover: 'cover',
    hero: 'film',
    media: [
      { key: 'film', kind: 'embed', src: drive('14t4aQgYQf9nUxrjN8Gn9qKtjBh_tVSeR'), aspect: '16:9', caption: 'Episode 1' },
      { key: 'cover', kind: 'image', src: img('celcomdigi-scam-call-protection', 'output'), aspect: '16:9' },
      { key: 'still', kind: 'image', src: img('celcomdigi-scam-call-protection', 'still'), aspect: '16:9' },
    ],
  },
  {
    slug: 'astro-whats-next',
    title: 'Astro What’s Next (Internal)',
    clients: ['Astro'],
    categories: ['Film'],
    year: 2026,
    status: 'concept',
    featured: false,
    // Confidential: hidden from the public site, visible to signed-in admins.
    visibility: 'hidden',
    is_internal: false,
    one_liner: 'A day in the life of Adam, told first person, with Astro woven through every hour.',
    about:
      'A first-person day in the life of “Adam”, from 6:30 AM wake-up to 10:30 PM sleep, with a cheeky narrator commenting on his phone habits.',
    output_summary: '4-episode 60s film, horizontal and vertical, with storylines and scripts',
    capabilities_summary: 'First-person storytelling, Wes Anderson-style look, brand placement inside scenes',
    capabilities: ['AI film'],
    tools: [],
    blocks: [
      [
        'Astro touchpoints',
        'Stadium Astro, Syok podcast, Sooka, KULT Offside, Awani and AstroGO’s Ikatan Terlarang appear naturally through his day.',
      ],
      [
        'Story arc',
        'A full circle: the day starts and ends in bed on his phone, and a watch timelapse from Casio to Rolex shows career growth with Astro.',
      ],
      [
        'Look and sound',
        'Wes Anderson-style cinematography and colour palettes, with ASMR sound cues such as clock flips, a running shower and train doors.',
      ],
      [
        'Brand placement',
        'Brands placed inside scenes, including a U Mobile billboard seen from the train and Mamee cup noodles at lunch.',
      ],
    ],
    deliverables: ['4-episode 60s film, horizontal & vertical', 'Storylines and scriptwriting', 'Cinematic microdrama style'],
    ai_workflow: ['Full AI video generation', 'Style-specific cinematic grounding'],
    cover: 'cover',
    hero: 'film',
    media: [
      { key: 'film', kind: 'embed', src: drive('1AOaaypumXgHXHEnvLYVOq4SvbTQF6Imr'), aspect: '16:9', caption: 'Film' },
      { key: 'cover', kind: 'image', src: img('astro-whats-next', 'output'), aspect: '16:9' },
      { key: 'train', kind: 'image', src: img('astro-whats-next', 'train'), aspect: '16:9' },
      { key: 'lunch', kind: 'image', src: img('astro-whats-next', 'lunch'), aspect: '16:9' },
    ],
  },
  {
    slug: 'spaylater-borneo',
    title: 'SPayLater Borneo',
    clients: ['ShopeePay'],
    categories: ['OOH and DOOH'],
    year: 2026,
    status: 'live',
    featured: false,
    is_internal: false,
    one_liner: 'Bah! Scan DuitNow QR: static and digital out-of-home for Sabah and Sarawak.',
    about:
      'Static OOH and DOOH for the Shopee PayLater launch in Sabah and Sarawak, in Bahasa Malaysia. Brief dated 5 Mar 2026. The objective: educate users on paying with DuitNow QR through SPayLater, then lift adoption and repeat use, for an audience aged 18 to 35.',
    output_summary: '5 static OOH visuals and 7 DOOH videos, fully in Bahasa Malaysia',
    capabilities_summary: 'AI visuals for large-format OOH and AI video for DOOH, localised for Borneo',
    capabilities: ['Key visuals', 'AI film', 'Large format', 'Local content'],
    tools: [],
    blocks: [
      [
        'Big idea',
        '“Bah! Scan DuitNow QR”, with the hero message “Caj 0%, Pilih 1 Bulan”. Localised for Borneo, with bold type and high-contrast orange.',
      ],
      ['Story', 'Three everyday shoppers scanning at the counter: groceries, Sabah handicraft fashion, and gadgets with friends.'],
      ['Timeline', 'Storyboard approved at round 12, static OOH approved 17 Apr and DOOH approved 24 Apr 2026.'],
    ],
    deliverables: [
      '5 static OOH visuals, from a 6 × 13.6 ft banner to a 120 × 20 ft wall',
      '7 DOOH videos (4 at 15s, 3 at 10s) for screens in Kuching and Kota Kinabalu malls',
      'Full Bahasa Malaysia',
    ],
    ai_workflow: [
      'AI-generated visuals for static OOH and AI-generated video for DOOH',
      'Two animation approaches tested: phone interface scanning and natural hand movement',
    ],
    cover: 'cover',
    hero: 'film-1',
    media: [
      { key: 'film-1', kind: 'embed', src: drive('1pvS1FU8l8V-AY6SbLiWdBjO8KQIY3ISx'), aspect: '16:9', caption: 'DOOH video 1' },
      { key: 'film-2', kind: 'embed', src: drive('1jFHg0-zNCUZa_BAtaLzC0xgA9LCpST3C'), aspect: '16:9', caption: 'DOOH video 2' },
      { key: 'cover', kind: 'image', src: img('spaylater-borneo', 'groceries'), aspect: '16:9' },
      { key: 'banner', kind: 'image', src: img('spaylater-borneo', 'ooh-banner'), aspect: '16:9', caption: 'Large-format OOH' },
      { key: 'fashion', kind: 'image', src: img('spaylater-borneo', 'fashion'), aspect: '16:9' },
    ],
  },
  {
    slug: 'shopeepay-master-brand-campaign',
    title: 'ShopeePay Master Brand Campaign',
    clients: ['ShopeePay'],
    categories: ['Brand Campaign'],
    year: 2026,
    status: 'in_progress',
    featured: false,
    is_internal: false,
    one_liner: 'More value in every way: one masterline and two key visual directions.',
    about:
      'Create two distinct key visual directions for the ShopeePay master brand, each with a moodboard, colour palette, typography and keywords. The challenge: keep Shopee’s generosity but lose the sale-event look, with more trust than playfulness, a recognised brand character, and more out of every cent.',
    output_summary: 'Master brand strategy, a masterline in three languages, and key visual options',
    capabilities_summary: 'Research and insights, AI persona variations, photorealistic lifestyle imagery',
    capabilities: ['Brand strategy', 'Key visuals', 'AI characters & talent', 'Multi-language versions'],
    tools: [],
    blocks: [
      [
        'Big idea',
        '“More Value in Every Way.” One masterline across three product truths: more rewards (QR Pay), more flexibility (SPayLater), more potential returns (Money+).',
      ],
      [
        'Two directions',
        'Say “More” Boldly: big type with lifestyle photography. The Infinite “More”: a flowing wave-style headline with warm everyday moments.',
      ],
      [
        'Tonality',
        'Everyday: real people and everyday experiences at the centre of the brand. Confident: bold, declarative sans-serif headlines. Brand first: polished but friendly, less like a typical e-wallet ad.',
      ],
      ['Status', 'Draft for discussion, Nov 2026. Direction 1 reached its 7th revision round.'],
    ],
    deliverables: [
      'Master brand strategy: market context, brand dimensions and strategic response',
      'Masterline in English, Bahasa Malaysia and Chinese',
      'Key visual options',
    ],
    ai_workflow: [
      'Research & market insights',
      'AI persona character variations: multiple styles & angles',
      'Photorealistic lifestyle images',
    ],
    cover: 'cover',
    hero: 'cover',
    media: [
      { key: 'cover', kind: 'image', src: img('shopeepay-master-brand-campaign', 'key-visual'), aspect: '16:9' },
      { key: 'direction-1', kind: 'image', src: img('shopeepay-master-brand-campaign', 'direction-1'), aspect: '9:16', caption: 'Say “More” Boldly' },
      { key: 'direction-2', kind: 'image', src: img('shopeepay-master-brand-campaign', 'direction-2'), aspect: '9:16', caption: 'The Infinite “More”' },
      { key: 'persona', kind: 'image', src: img('shopeepay-master-brand-campaign', 'persona'), aspect: '9:16', caption: 'AI persona' },
    ],
  },
  {
    slug: 'enchanteur-dashing-gawai-kaamatan',
    title: 'Enchanteur × Dashing Gawai Kaamatan',
    clients: ['Enchanteur', 'Dashing'],
    categories: ['OOH and DOOH'],
    year: 2026,
    status: 'live',
    featured: false,
    is_internal: false,
    one_liner: 'Before we meet, scents do: a festive romance across Sabah and Sarawak.',
    about:
      'Raise consideration of Enchanteur and Dashing perfumes as a must-have for Gawai and Kaamatan, for East Malaysians aged 22 to 44. Brief dated 28 Apr 2026.',
    output_summary: '10 DOOH videos fitted to 8 screen sizes, plus Meta and TikTok versions',
    capabilities_summary: 'Culturally accurate AI characters, real products in AI scenes, Malay, Iban and Dusun copy',
    capabilities: ['AI film', 'AI characters & talent', 'Local content', 'Multi-language versions'],
    tools: [],
    blocks: [
      [
        'Big idea',
        '“Before We Meet, Scents Do”: a playful romance where a couple separated by a wall meet when their scent trails break through.',
      ],
      [
        'Cast and setting',
        'A Kadazan-Dusun man for Kaamatan and an Iban woman for Gawai, in traditional attire, against harvest fields and longhouses.',
      ],
      ['Language', 'Malay copy, with Iban for Sarawak and Dusun for Sabah on the end frame, plus an AI-content disclaimer in Malay.'],
      ['Timeline', 'Storyboard rounds 8 to 11 May, DOOH review 13 May, final approval 21 to 22 May, live 25 May 2026.'],
    ],
    deliverables: [
      '10 DOOH videos, 15s each, fitted to 8 screen sizes for screens in Kota Kinabalu, Tawau, Kuching and Miri',
      'Meta (4:5) and TikTok (9:16) versions, 15s each',
    ],
    ai_workflow: [
      'Culturally accurate AI characters',
      'Actual product to AI generation integration',
      'Local dialect translations in Malay, Iban and Dusun',
    ],
    cover: 'cover',
    hero: 'film',
    media: [
      { key: 'film', kind: 'embed', src: drive('11SjCMhdIdMwVkDYo_uNZB1aD5tMx2pir'), aspect: '16:9', caption: 'DOOH video' },
      { key: 'cover', kind: 'image', src: img('enchanteur-dashing-gawai-kaamatan', 'output'), aspect: '16:9' },
      { key: 'key-visual', kind: 'image', src: img('enchanteur-dashing-gawai-kaamatan', 'key-visual'), aspect: '16:9' },
    ],
  },
];
