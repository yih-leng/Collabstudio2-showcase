# CollabStudio · AI Creative Showcase

KULT's AI creative work, for clients and the sales team. Featured projects play
in the home page banner; everything sits in the filterable Our Works page. Projects,
media, clients, tags and site text are all managed in `/admin`,
with no code changes.

Built with Next.js (App Router) + TypeScript, Supabase (database, login,
file storage) and the **Collabrium design system v2.0** (`@collabrium/ui`),
branded as CollabStudio.

---

## 1. Run it on your computer (5 minutes)

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Supabase keys yet, it runs as a **local
demo**: the site shows the six sample projects from the AI Creative Showcase
deck, and the admin works too.

- Sign in at http://localhost:3000/admin with `admin@collabstudio.test` and
  password `demo1234` (the login page fills them in for you).
- Everything you do in the admin (projects, uploads, clients, settings) saves
  to a `.demo` folder on your computer and shows on the site straight away.
- Delete the `.demo` folder to start over with the sample projects.
- The demo only runs with `npm run dev`. A deployed site without Supabase keys
  shows the sample projects read-only, with no admin.

## 2. Set up Supabase (10 minutes, once)

1. Create a free project at [supabase.com](https://supabase.com). Pick a region
   near your audience (Singapore for Malaysia).
2. **Create the tables.** In Supabase, open **SQL Editor → New query**, paste
   all of `supabase/migrations/0001_init.sql`, and press **Run**.
   Then do the same with `supabase/migrations/0002_about.sql`,
   `0003_audio.sql`, `0004_hide_internal.sql`, `0005_activity.sql`, `0006_story.sql` and `0007_custom_touchpoints.sql`.
3. **Add the sample projects.** New query again, paste all of
   `supabase/seed.sql`, and **Run**. (Both files are safe to run twice.)
4. **Turn off public sign-up.** **Authentication → Sign In / Providers →
   Email**: keep Email on, turn **Allow new users to sign up** off.
5. **Copy your keys.** **Project Settings → API**: copy the Project URL and
   the `anon` `public` key. Copy `.env.example` to `.env.local` and paste
   them in:

   ```bash
   cp .env.example .env.local
   ```

6. Restart `npm run dev`.

### Add an admin

Only people on the admin list can edit.

1. **Authentication → Users → Add user → Create new user.** Enter their email
   and a password, and tick **Auto Confirm User**.
2. **SQL Editor**, run (with their email):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'name@kult.studio';
   ```

3. They sign in at `/admin/login`. The public site has no link to the admin:
   bookmark `/admin`.

To remove someone: `delete from public.admins where user_id = (select id from auth.users where email = 'name@kult.studio');`
and delete the user under **Authentication → Users**.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In [vercel.com](https://vercel.com): **Add New → Project**, pick the
   repository. Vercel detects Next.js; leave the build settings as they are.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`). **Deploy.**
4. In Supabase, **Authentication → URL Configuration**: set **Site URL** to
   your Vercel address (for example `https://collabstudio-showcase.vercel.app`).

`vercel.json` runs the site's server in Singapore (`sin1`), next to a Supabase
project in Singapore, so pages don't wait on trips to the US. If your Supabase
project is in another region, change it to the matching Vercel region.

The design system ships inside the repo as `vendor/collabrium-ui.tgz`, so
Vercel installs it like any other package. To take a newer version of the
design system, run `npm run setup` in `collabrium-dls-v2.0`, copy its fresh
`collabrium-ui.tgz` over `vendor/collabrium-ui.tgz`, and run
`npm install ./vendor/collabrium-ui.tgz`.

## 4. Add a new project

1. Sign in at `/admin`. **Projects → New project.** It starts as a **Draft**,
   so nobody sees it yet.
2. Fill in what you have. Every project page follows the same template, in
   this order, and a section only shows when it has content:

   | On the page | In the editor |
   |---|---|
   | Title, one-liner, project type, status and facts | **1 · Basics** and **2 · Client details** |
   | Hero video or image | **3 · Hero and gallery**: pick the hero (a video if you have one) |
   | 01 About this project | **4 · About this project**: three parts, Summary (what it is), The objective (1–2 sentences) and The concept (2–3 sentences) |
   | 02 AI touchpoints | **5 · AI touchpoints**: pick 3 or 4 from the list, or choose **Your own…** and name it, and say what each did on this project |
   | 03 Output | **6 · Output**: a one-line summary, then each deliverable |
   | 04 Turnaround / result | **7 · Turnaround / result**: how fast it was made or what it achieved, plus optional key figures ("13 days" · "storyboard to approval") |
   | 05 Gallery | Every other image and video from **3 · Hero and gallery** |

   The touchpoint list lives in `lib/touchpoints.ts`: World building and
   characterisation, Brand placement / product integration, Video generation,
   Image generation, Music and sound, Voice over, Localisation, Script and
   storyboard, Look development, and Upscaling and finishing. Anything else
   goes in as your own touchpoint.

   - **Basics**: title, web address, one-liner (the card text), clients,
     **project type** (required: Film, Key Visual, Microdrama, Brand Campaign,
     Storyboard; add more under Clients and tags), year, status.
   - **Visibility**: Published, Draft or Hidden (Hidden is for confidential
     work: only signed-in admins see it); **Featured** puts it in the home
     page banner.
   - **Media**: drag in images, videos (MP4, MOV, WebM) and audio (MP3, WAV,
     M4A, AIFF, FLAC), or paste a YouTube, Vimeo or Google Drive link. Videos
     over 20 MB and WAV/AIFF/FLAC audio are turned into a smaller web preview
     in your browser before they upload (the progress bar shows it), so a
     300 MB master is fine to drop in. Use Chrome, Edge or Safari for this.
     Every item also appears in the carousel at the top of the project page. Set each one's shape (16:9, 9:16, 4:5, 1:1) and caption, drag
     to reorder, and pick the **cover** (the card thumbnail) and the **hero**
     (the big one at the top of the project page, and what plays in the home
     page banner). Media saves as you go.
3. **Preview** saves and opens the page as visitors will see it (drafts only
   show to signed-in admins).
4. Set Visibility to **Published** and **Save**. It's live.

**Ordering.** Projects → **Featured order** sets the order of the home page
banner, which plays featured projects only (if nothing is featured, it shows
all published work); **Site order** sets the Our Works page and next/previous links. Drag the
handle, or focus it and use Space and the arrow keys.

**Archiving.** **Archive** (a row action on the Projects list) takes a project off the site but keeps everything;
restore it any time from the **Archived** tab on Projects, or delete it for good there.

**Large videos.** Big files are compressed to a web preview (at most 1920 px,
bitrate chosen to land under 40 MB) before upload, because Supabase's free
plan accepts files up to 50 MB. Very long films can still come out too big;
for those, upload to YouTube (unlisted) or Vimeo and paste the link instead.
Keep your full-quality masters elsewhere: only the preview is stored here.

**Clients, project types and tags while you edit.** Type in the Clients,
Project type, Capability tags or Tools field: pick a match, or choose
"Add …" to create it. New items join the lists under Clients and tags.

## 5. Import from deck

The **Import from deck** button on Projects opens an overlay that turns pitch
and case-study decks into draft projects, in four steps: Add decks, Draft,
Review and Done.

1. Drop in one or more decks: PowerPoint (`.pptx`), PDF, or OpenDocument
   (`.odp`). From Google Slides, use **File → Download → Microsoft PowerPoint
   (.pptx)**: that keeps the full-size pictures and any videos stored in the
   deck. Decks are opened in your browser, not uploaded, so a 100 MB file is
   fine.
2. Claude reads each deck and drafts the projects in it (a showcase deck can
   hold several): title, clients, type, status, one-liner, About, Output,
   Summary, Objective, Concept, AI touchpoints, Turnaround, which pictures to use and the
   cover. It also leaves notes on anything to check, such as slides from
   another project, internal notes, or brief details marked TBC; each note
   shows under the field it's about.
   You don't have to wait: **Run in background** (or closing the overlay)
   keeps drafting going while you use the rest of the admin. The button on
   Projects glows while it works and becomes **Review drafts** when it's done,
   and a message pops up with a link back. Drafting runs in your browser tab,
   so closing or reloading the tab stops it; the browser asks first.
3. Check each draft, one at a time, in the same sections as the project
   editor. Edit the words, tick the pictures and video links you want, set the
   cover, and switch off **Create this project** for drafts that shouldn't be
   projects.
4. **Create drafts.** Pictures are shrunk and uploaded, big videos become web
   previews, new clients and tags join Clients and tags, and each project is
   saved as a **Draft**. Open it in the editor to finish it, then publish.

What comes out of each format:

| Format | Text | Pictures | Videos |
|---|---|---|---|
| PowerPoint (.pptx) | Every slide, plus speaker notes | Original files, full size | Files stored in the deck, plus YouTube, Vimeo and Drive links |
| OpenDocument (.odp) | Every slide, plus speaker notes | Original files | YouTube, Vimeo and Drive links |
| PDF | Every page | One picture per page (the whole page, 1920 px wide) | YouTube, Vimeo and Drive links |

Hidden slides are skipped. Logos and backgrounds that repeat across slides
are set aside under "More from this deck". Keynote: export to PowerPoint
first.

**Setting up the AI.** Drafting uses Claude Sonnet 5.5. Create a key at
[platform.claude.com](https://platform.claude.com) → API keys, and add it as
`ANTHROPIC_API_KEY` in Vercel (**Settings → Environment Variables**), then
redeploy. For your computer, add it to `.env.local` and restart `npm run dev`.
A one-project pitch deck costs about US$0.05 to draft (a showcase deck with
ten projects, more like US$0.20–0.40). Before drafting, each deck shows an
estimate (its input is counted exactly, for free; what Claude writes can only
be a range) and waits for **Draft with AI**. Afterwards it shows what the
draft actually cost, and the Done step gives the total. Prices live in
`lib/import/pricing.ts`. For sharper picture choices and reviewer notes at
about twice the cost, add `IMPORT_MODEL=claude-opus-5-5`. Only the slide text and small
previews of the pictures are sent to Claude. Without a key, the importer still
works: each deck becomes one draft with its title, pictures and a passage of
text, and you fill in the rest.

## 6. Activity log

**Activity** (in the admin menu, under Setup) lists who changed what, and
when: projects created, edited, published, featured, trashed, restored or
deleted; pictures and videos added or removed; clients, types and tags added,
renamed or removed; site settings changed; and every AI draft
from Import from deck, with its tokens and cost. Changes made together read as
one line ("Created Blinkie as a draft with 16 pictures"). At the top: AI spend
this month and all time, and how many projects were drafted with AI. Filter by
area or search by project, person or file; project names link to the editor.

**Set it up once:** in Supabase → SQL Editor, run
`supabase/migrations/0005_activity.sql`. Logging starts from then (earlier
changes aren't in it). The database writes the log itself, so it records
changes from every screen, and stamps each entry with the signed-in person.
Entries can't be edited or deleted from the site.

## Other admin screens

- **Clients and tags**: clients (with logo upload for the home page client
  strip), project types, capabilities and tools. Rename, reorder, delete
  (deleting takes it off any project that used it).
- **Site settings**: the home page title and intro, and the showreel (link or
  MP4).

The site has no contact page, so there's no enquiries inbox. The `enquiries`
table and the contact fields in `settings` stay in the database, unused.

---

## For developers

| Path | What it is |
|---|---|
| `app/(site)/` | Public pages: Home and Our Works, with each project's page |
| `app/admin/` | Login, and the admin (`(app)/`) behind it |
| `components/` | Site shell, project card, media frame, gallery; `admin/` holds the admin pieces |
| `lib/data.ts` | Server reads for public pages (Supabase, or the seed when not configured) |
| `lib/admin-api.ts` | Uploads and ordering helpers for the admin |
| `lib/import/` and `app/api/import/draft/` | Import from deck: reading PPTX, ODP and PDF in the browser, drafting with Claude (structured output), and creating the projects |
| `supabase/migrations/` | Tables, row-level security, storage bucket and policies (`0001`), the About column (`0002`), audio (`0003`), Hidden replaces Internal (`0004`), the activity log and its triggers (`0005`), the four-part story: summary, objective, concept, AI touchpoints, turnaround and key figures (`0006`), touchpoints of your own (`0007`) |
| `lib/activity.ts` and `lib/demo/activity.ts` | How log entries read and group on the Activity page, and the local demo's copy of the `0005` triggers (keep the two in step) |
| `lib/demo/` and `app/api/demo/` | The local demo: a stand-in for Supabase that saves to `.demo/` and applies the same row-level rules. Off once Supabase keys are set, and off in production |
| `supabase/seed-source.mjs` | The deck's projects, with their media. Edit, then `npm run seed:build` to regenerate `seed.sql`, `updates/deck-update.sql` and `lib/seed.generated.json` |
| `supabase/updates/deck-update.sql` | Brings a database already in use up to date with `seed-source.mjs`: run it in the SQL Editor. It replaces the deck projects' text and sets their cover and hero, and keeps featured/visibility settings and anything added in the admin |
| `public/projects/` | Images for the deck projects, optimised for the web and served with the site |

**Security model.** Row-level security does the gatekeeping: the public can
read only published, non-internal, non-deleted projects (and their blocks,
lists and media). Everything else needs a
user listed in `public.admins`. The middleware keeps `/admin` behind the login,
and the admin double-checks the admin list on load. Uploaded files sit in one
public `media` bucket: anyone with a file's exact URL can open it, including
files on internal projects, so keep truly confidential cuts as private
YouTube/Vimeo/Drive links.

**Design system.** Every control, card, table, modal, toast, nav and form
field comes from `@collabrium/ui`; our own CSS (CSS modules) only lays out
wrappers, with tokens only. Where the system has no component, the code says
so with `TODO(design-system: …)`: the gallery lightbox and the drag-to-reorder
list.

```bash
npm run dev         # local server
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # production build
npm run seed:build  # regenerate seed files from supabase/seed-source.mjs
```
