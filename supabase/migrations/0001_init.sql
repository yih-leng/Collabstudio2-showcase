-- CollabStudio AI Creative Showcase: schema, row-level security and storage.
-- Run once in the Supabase SQL editor (or `supabase db push`), then run seed.sql.


-- ---------------------------------------------------------------------------
-- Admins: only users listed here can edit. Sign-up stays off in Supabase Auth.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Lists
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  logo_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('capability', 'tool')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (name, type)
);

-- ---------------------------------------------------------------------------
-- Projects
-- client_ids / category_ids / tag_ids are uuid arrays: one row per project,
-- easy to edit, and list deletes clean them up in the app.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  client_ids uuid[] not null default '{}',
  category_ids uuid[] not null default '{}',
  tag_ids uuid[] not null default '{}',
  year int,
  status text not null default 'concept' check (status in ('live', 'approved', 'in_progress', 'concept')),
  status_note text,
  one_liner text,
  output_summary text,
  capabilities_summary text,
  workflow_label text,
  featured boolean not null default false,
  featured_order int not null default 0,
  sort_order int not null default 0,
  visibility text not null default 'draft' check (visibility in ('published', 'draft', 'hidden')),
  is_internal boolean not null default false,
  cover_media_id uuid,
  hero_media_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists projects_public_idx on public.projects (visibility, is_internal, deleted_at);

create table if not exists public.overview_blocks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  body text not null default '',
  sort_order int not null default 0
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (type in ('deliverable', 'ai_workflow')),
  text text not null,
  sort_order int not null default 0
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'embed')),
  url text not null,
  storage_path text,
  aspect text not null default '16:9' check (aspect in ('16:9', '9:16', '4:5', '1:1')),
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.projects
  drop constraint if exists projects_cover_media_fk,
  add constraint projects_cover_media_fk foreign key (cover_media_id) references public.media (id) on delete set null,
  drop constraint if exists projects_hero_media_fk,
  add constraint projects_hero_media_fk foreign key (hero_media_id) references public.media (id) on delete set null;

create index if not exists overview_blocks_project_idx on public.overview_blocks (project_id);
create index if not exists list_items_project_idx on public.list_items (project_id);
create index if not exists media_project_idx on public.media (project_id);

-- ---------------------------------------------------------------------------
-- Settings and enquiries
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  company text check (char_length(company) <= 200),
  email text not null check (char_length(email) between 3 and 320),
  message text not null check (char_length(message) between 1 and 5000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- Public: published, non-internal, non-deleted projects and their children.
-- Admins: everything.
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.clients enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.projects enable row level security;
alter table public.overview_blocks enable row level security;
alter table public.list_items enable row level security;
alter table public.media enable row level security;
alter table public.settings enable row level security;
alter table public.enquiries enable row level security;

create or replace function public.project_is_public(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid and p.visibility = 'published' and not p.is_internal and p.deleted_at is null
  );
$$;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['clients', 'categories', 'tags', 'settings'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;

  foreach t in array array['overview_blocks', 'list_items', 'media'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (public.project_is_public(project_id) or public.is_admin())', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "public read" on public.projects;
create policy "public read" on public.projects for select
  using ((visibility = 'published' and not is_internal and deleted_at is null) or public.is_admin());
drop policy if exists "admin write" on public.projects;
create policy "admin write" on public.projects for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "anyone can send" on public.enquiries;
create policy "anyone can send" on public.enquiries for insert with check (true);
drop policy if exists "admin manage" on public.enquiries;
create policy "admin manage" on public.enquiries for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: one public bucket for project media, client logos and the showreel.
-- Anyone can read a file by its URL; only admins can upload or delete.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete using (bucket_id = 'media' and public.is_admin());
