# CollabStudio · AI Creative Showcase

KULT's AI creative work, for clients and the sales team. Featured projects play
in the home page banner; everything sits in the filterable Our Works page. Projects,
media, clients, tags, site text and enquiries are all managed in `/admin`,
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
   Then do the same with `supabase/migrations/0002_about.sql` and
   `supabase/migrations/0003_audio.sql` and `0004_hide_internal.sql`.
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
   | Hero video or image | **1 · Hero and gallery**: pick the hero (a video if you have one) |
   | Title, project type, status and facts | **Basics** |
   | About this project | **2 · About this project**: the brief and the challenge, a short paragraph |
   | Output | **3 · Output**: a one-line summary, then each deliverable |
   | Overview | **4 · Overview**: blocks like Big idea, Story, Look and cast, Timeline |
   | Capabilities | **5 · Capabilities**: capability tags, how AI was used, tools |
   | Gallery | Every other image and video from **1 · Hero and gallery** |

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

**Deleting.** **Trash** takes a project off the site but keeps everything;
restore it any time from **Trash**, or delete it for good there.

**Large videos.** Big files are compressed to a web preview (at most 1920 px,
bitrate chosen to land under 40 MB) before upload, because Supabase's free
plan accepts files up to 50 MB. Very long films can still come out too big;
for those, upload to YouTube (unlisted) or Vimeo and paste the link instead.
Keep your full-quality masters elsewhere: only the preview is stored here.

**Clients, project types and tags while you edit.** Type in the Clients,
Project type, Capability tags or Tools field: pick a match, or choose
"Add …" to create it. New items join the lists under Clients and tags.

## Other admin screens

- **Enquiries**: everything sent from the contact form at `/contact` (it's no
  longer in the site menu; link to it from elsewhere if you need it). New ones
  are counted in the menu. Open one to read it in full and reply by email.
- **Clients and tags**: clients (with logo upload for the home page client
  strip), project types, capabilities and tools. Rename, reorder, delete
  (deleting takes it off any project that used it).
- **Site settings**: the home page title and intro, the showreel (link or
  MP4), and the contact details shown beside the enquiry form.

---

## For developers

| Path | What it is |
|---|---|
| `app/(site)/` | Public pages: Home, Work, project detail, Work with us |
| `app/admin/` | Login, and the admin (`(app)/`) behind it |
| `components/` | Site shell, project card, media frame, gallery; `admin/` holds the admin pieces |
| `lib/data.ts` | Server reads for public pages (Supabase, or the seed when not configured) |
| `lib/admin-api.ts` | Uploads and ordering helpers for the admin |
| `supabase/migrations/` | Tables, row-level security, storage bucket and policies (`0001`), the About column (`0002`) |
| `lib/demo/` and `app/api/demo/` | The local demo: a stand-in for Supabase that saves to `.demo/` and applies the same row-level rules. Off once Supabase keys are set, and off in production |
| `supabase/seed-source.mjs` | The deck's projects, with their media. Edit, then `npm run seed:build` to regenerate `seed.sql`, `updates/deck-update.sql` and `lib/seed.generated.json` |
| `supabase/updates/deck-update.sql` | Brings a database already in use up to date with `seed-source.mjs`: run it in the SQL Editor. It replaces the deck projects' text and sets their cover and hero, and keeps featured/visibility settings and anything added in the admin |
| `public/projects/` | Images for the deck projects, optimised for the web and served with the site |

**Security model.** Row-level security does the gatekeeping: the public can
read only published, non-internal, non-deleted projects (and their blocks,
lists and media), and can only *insert* enquiries. Everything else needs a
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
