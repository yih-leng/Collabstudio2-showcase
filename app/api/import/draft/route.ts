import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { isRequestAdmin } from '@/lib/server-admin';
import { PRICES, costOf, outputRange } from '@/lib/import/pricing';
import type { DraftEstimate, DraftUsage, ListNames } from '@/lib/import/types';

// Drafts showcase projects from one deck's slides with Claude. The browser
// sends the slide text, what's on each slide, small previews of the pictures
// and the names already in Clients and tags; Claude sends back projects in
// the editor's fields, pointing at the deck's own assets by id.

export const runtime = 'nodejs';
// A long deck with many pictures can take a minute or two to read.
export const maxDuration = 300;

// Sonnet keeps the cost per deck low. Set IMPORT_MODEL=claude-opus-5-5 for sharper picks and notes at about twice the cost.
const MODEL = process.env.IMPORT_MODEL || 'claude-sonnet-5-5';
const MAX_IMAGES = 60;

interface DraftRequest {
  /** "estimate" counts the tokens and prices the draft without running it. */
  mode?: 'estimate' | 'draft';
  fileName: string;
  slides: {
    n: number;
    text: string;
    notes: string;
    assets: { id: string; kind: string; width: number; height: number; decorative: boolean }[];
    links: string[];
  }[];
  /** Previews of the assets worth looking at, as JPEG data URLs. */
  previews: { id: string; data: string }[];
  lists: ListNames;
}

const SYSTEM = `You turn agency decks into project entries for CollabStudio, the portfolio site of KULT, a Malaysian creative studio that makes AI-assisted films, campaigns, characters and content for brands.

A deck is usually a pitch or a case study for one project, but it can hold several projects (a showcase deck), and it often carries leftovers: slides pasted from another project, internal notes, empty storyboard templates, briefs with TBC fields. Split the deck into the projects it actually presents, and leave out what doesn't belong to them.

Write each project in the site's fields:
- title: the project's name as the deck presents it (a campaign, character or film name; not the client alone, and without tags like [KULT][EXT]).
- client_names: the brand or brands it was made for. Reuse a name from the existing clients list when it is the same client, spelled exactly as listed.
- type_name: the kind of project. Reuse one of the existing types when one fits; otherwise a short new one in the same style.
- year: the year the work was made if the deck shows it, else 0.
- status: "concept" for pitches and ideas not yet made, "approved" for work signed off but not made, "in_progress" for work being made, "live" for work that has launched. A pitch deck is "concept" unless it says otherwise.
- one_liner: one sentence that sells the idea, in the deck's own voice.
- about: the brief and the challenge, two to four sentences.
- output_summary and deliverables: what was or will be made (episodes, films, stickers, formats). Deliverables are short items.
- overview_blocks: two to five blocks that tell the idea, each with a short label (such as "Big idea", "Story / Concept", "Audience", "Look and cast", "Versions", "Timeline") and a short paragraph.
- capabilities_summary and capability_names: what the studio did (such as "AI animation", "Character design", "Scriptwriting"). Reuse existing capability names when they fit.
- workflow_label, workflow_steps and tool_names: how AI was used, step by step, and the AI tools named in the deck. Leave them empty when the deck doesn't say; never guess tools.
- slides: the slide numbers this project uses.
- asset_ids: the deck's pictures and videos worth showing on the project page, best first. Leave out logos, decorative backgrounds, slide furniture, text-only graphics, and pictures from slides you excluded. Only use ids that appear in the deck.
- cover_asset_id: the strongest picture for the project's card (a key visual, not a title slide, logo or text). Empty when there is none.
- video_links: the YouTube, Vimeo or Google Drive links from this project's slides that are the work itself.
- reviewer_notes: short notes for the person who will check the draft, about anything they must look at before publishing: slides you left out and why, internal notes or confidential brief details, numbers or claims you couldn't verify, placeholder text, missing information.

Keep the deck's facts. Don't invent clients, results, numbers, dates or tools. Write in plain British English, keep the deck's tone, and keep Malay or Chinese lines from the deck as they are where they are quoted. Strip emoji and mis-encoded characters, but keep ordinary punctuation such as hyphens ("No-sell", not "Nosell").`;

const PROJECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'client_names',
    'type_name',
    'year',
    'status',
    'one_liner',
    'about',
    'output_summary',
    'deliverables',
    'overview_blocks',
    'capabilities_summary',
    'capability_names',
    'workflow_label',
    'workflow_steps',
    'tool_names',
    'slides',
    'asset_ids',
    'cover_asset_id',
    'video_links',
    'reviewer_notes',
  ],
  properties: {
    title: { type: 'string' },
    client_names: { type: 'array', items: { type: 'string' } },
    type_name: { type: 'string' },
    year: { type: 'integer' },
    status: { type: 'string', enum: ['live', 'approved', 'in_progress', 'concept'] },
    one_liner: { type: 'string' },
    about: { type: 'string' },
    output_summary: { type: 'string' },
    deliverables: { type: 'array', items: { type: 'string' } },
    overview_blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'body'],
        properties: { label: { type: 'string' }, body: { type: 'string' } },
      },
    },
    capabilities_summary: { type: 'string' },
    capability_names: { type: 'array', items: { type: 'string' } },
    workflow_label: { type: 'string' },
    workflow_steps: { type: 'array', items: { type: 'string' } },
    tool_names: { type: 'array', items: { type: 'string' } },
    slides: { type: 'array', items: { type: 'integer' } },
    asset_ids: { type: 'array', items: { type: 'string' } },
    cover_asset_id: { type: 'string' },
    video_links: { type: 'array', items: { type: 'string' } },
    reviewer_notes: { type: 'array', items: { type: 'string' } },
  },
} as const;

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['projects'],
  properties: { projects: { type: 'array', items: PROJECT_SCHEMA } },
};

export async function POST(req: Request) {
  if (!(await isRequestAdmin())) return NextResponse.json({ error: 'Sign in as an admin first.' }, { status: 401 });
  // Without a key the browser drafts with simple rules instead.
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'no-key' }, { status: 501 });

  let body: DraftRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'That request could not be read.' }, { status: 400 });
  }

  const deckText = body.slides
    .map((s) => {
      const assets = s.assets
        .map((a) => `${a.id} (${a.kind}${a.width ? `, ${a.width}×${a.height}` : ''}${a.decorative ? ', likely decorative' : ''})`)
        .join('; ');
      return [
        `--- Slide ${s.n} ---`,
        s.text || '(no text)',
        s.notes && `Speaker notes: ${s.notes}`,
        assets && `Assets: ${assets}`,
        s.links.length > 0 && `Video links: ${s.links.join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    {
      type: 'text',
      text: [
        `Existing clients: ${body.lists.clients.join(', ') || '(none)'}`,
        `Existing project types: ${body.lists.types.join(', ') || '(none)'}`,
        `Existing capabilities: ${body.lists.capabilities.join(', ') || '(none)'}`,
        `Existing AI tools: ${body.lists.tools.join(', ') || '(none)'}`,
        '',
        `Deck file: ${body.fileName}`,
        '',
        deckText,
      ].join('\n'),
    },
  ];
  // Previews follow, each labelled with its asset id, so Claude can choose pictures by what they show.
  for (const p of body.previews.slice(0, MAX_IMAGES)) {
    const data = p.data.replace(/^data:image\/jpeg;base64,/, '');
    content.push({ type: 'text', text: `Preview of ${p.id}:` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
  }
  content.push({ type: 'text', text: 'Draft the projects this deck presents.' });

  const request = {
    model: MODEL,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  } satisfies Anthropic.Beta.MessageCountTokensParams;

  const client = new Anthropic();
  try {
    if (body.mode === 'estimate') {
      // Free: counts what would be sent. What comes back can only be a range.
      const { input_tokens } = await client.beta.messages.countTokens(request);
      const textTokens = Math.round(deckText.length / 3.5);
      const [outLow, outHigh] = outputRange(textTokens);
      const at = (output_tokens: number) => costOf({ model: MODEL, input_tokens, output_tokens }) ?? 0;
      return NextResponse.json({
        model: MODEL,
        model_label: PRICES[MODEL]?.label ?? MODEL,
        input_tokens,
        output_tokens: [outLow, outHigh],
        cost: [at(outLow), at(outHigh)],
      } satisfies DraftEstimate);
    }

    const stream = client.beta.messages.stream({
      ...request,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    const message = await stream.finalMessage();
    // `model` is the model that answered: a fallback model if the first one declined.
    const usage: DraftUsage = {
      model: message.model,
      model_label: PRICES[message.model]?.label ?? message.model,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_creation_input_tokens: message.usage.cache_creation_input_tokens,
      cache_read_input_tokens: message.usage.cache_read_input_tokens,
      cost: costOf({ ...message.usage, model: message.model }),
    };
    // A failed draft is still billed, so the cost goes back either way.
    if (message.stop_reason === 'refusal') {
      return NextResponse.json({ error: "Claude couldn't draft from this deck. Try removing sensitive slides, or create the project by hand.", usage }, { status: 422 });
    }
    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'This deck is too long to draft in one go. Split it into smaller files.', usage }, { status: 422 });
    }
    const text = message.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No draft came back.');
    return NextResponse.json({ ...JSON.parse(text.text), usage });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'The ANTHROPIC_API_KEY on the server was rejected. Check it in your environment settings.' }, { status: 502 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Claude is busy right now. Wait a minute and try again.' }, { status: 429 });
    }
    if (err instanceof Anthropic.BadRequestError) {
      return NextResponse.json({ error: `Claude couldn't read this deck: ${err.message}` }, { status: 400 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Claude had a problem (${err.status}). Try again.` }, { status: 502 });
    }
    return NextResponse.json({ error: (err as Error).message || 'Drafting failed.' }, { status: 500 });
  }
}
