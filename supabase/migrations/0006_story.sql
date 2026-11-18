-- The project story in four parts, as on the project page:
--   01 About this project: summary, the objective, the concept
--   02 AI touchpoints: 3 or 4 picked from a fixed list, each with a line for this project
--   03 Output: output_summary and deliverables (unchanged)
--   04 Turnaround / result: a short text, plus optional key figures
-- The older fields (about, overview blocks, capabilities summary, AI workflow
-- steps) stay in the database but are no longer shown.
-- Run after 0005_activity.sql. Safe to run twice.

alter table public.projects add column if not exists summary text;
alter table public.projects add column if not exists objective text;
alter table public.projects add column if not exists concept text;
alter table public.projects add column if not exists turnaround text;

create table if not exists public.ai_touchpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- The touchpoint, from the list in lib/touchpoints.ts.
  kind text not null check (kind in (
    'world_building', 'brand_integration', 'video', 'image', 'music_sound', 'voice_over', 'localisation',
    'script_storyboard', 'look_development', 'upscale_finish'
  )),
  body text not null default '',
  sort_order int not null default 0
);

create table if not exists public.result_figures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- A figure and what it measures: "13 days" · "storyboard lock to final approval".
  value text not null,
  label text not null default '',
  sort_order int not null default 0
);

create index if not exists ai_touchpoints_project_idx on public.ai_touchpoints (project_id);
create index if not exists result_figures_project_idx on public.result_figures (project_id);

alter table public.ai_touchpoints enable row level security;
alter table public.result_figures enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ai_touchpoints', 'result_figures'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (public.project_is_public(project_id) or public.is_admin())', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Activity log: the new fields and parts count as edits (as in 0005).
create or replace function public.log_project_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed text[] := '{}';
begin
  if tg_op = 'INSERT' then
    perform public.write_activity('project.created', 'project', new.id, new.title, new.id, jsonb_build_object('visibility', new.visibility));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.write_activity('project.deleted', 'project', old.id, old.title, old.id);
    return old;
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    perform public.write_activity('project.trashed', 'project', new.id, new.title, new.id);
    return new;
  elsif old.deleted_at is not null and new.deleted_at is null then
    perform public.write_activity('project.restored', 'project', new.id, new.title, new.id);
    return new;
  end if;

  if new.title is distinct from old.title then changed := array_append(changed, 'title'); end if;
  if new.slug is distinct from old.slug then changed := array_append(changed, 'slug'); end if;
  if new.client_ids is distinct from old.client_ids then changed := array_append(changed, 'client_ids'); end if;
  if new.category_ids is distinct from old.category_ids then changed := array_append(changed, 'category_ids'); end if;
  if new.tag_ids is distinct from old.tag_ids then changed := array_append(changed, 'tag_ids'); end if;
  if new.year is distinct from old.year then changed := array_append(changed, 'year'); end if;
  if new.status is distinct from old.status then changed := array_append(changed, 'status'); end if;
  if new.status_note is distinct from old.status_note then changed := array_append(changed, 'status_note'); end if;
  if new.one_liner is distinct from old.one_liner then changed := array_append(changed, 'one_liner'); end if;
  if new.about is distinct from old.about then changed := array_append(changed, 'about'); end if;
  if new.summary is distinct from old.summary then changed := array_append(changed, 'summary'); end if;
  if new.objective is distinct from old.objective then changed := array_append(changed, 'objective'); end if;
  if new.concept is distinct from old.concept then changed := array_append(changed, 'concept'); end if;
  if new.output_summary is distinct from old.output_summary then changed := array_append(changed, 'output_summary'); end if;
  if new.turnaround is distinct from old.turnaround then changed := array_append(changed, 'turnaround'); end if;
  if new.capabilities_summary is distinct from old.capabilities_summary then changed := array_append(changed, 'capabilities_summary'); end if;
  if new.workflow_label is distinct from old.workflow_label then changed := array_append(changed, 'workflow_label'); end if;
  if new.cover_media_id is distinct from old.cover_media_id then changed := array_append(changed, 'cover_media_id'); end if;
  if new.hero_media_id is distinct from old.hero_media_id then changed := array_append(changed, 'hero_media_id'); end if;

  if new.visibility is distinct from old.visibility then
    perform public.write_activity(
      case when new.visibility = 'published' then 'project.published' else 'project.visibility' end,
      'project', new.id, new.title, new.id,
      jsonb_build_object('from', old.visibility, 'to', new.visibility, 'fields', to_jsonb(changed))
    );
  elsif array_length(changed, 1) > 0 then
    perform public.write_activity('project.edited', 'project', new.id, new.title, new.id, jsonb_build_object('fields', to_jsonb(changed)));
  end if;

  if new.featured is distinct from old.featured then
    perform public.write_activity(case when new.featured then 'project.featured' else 'project.unfeatured' end, 'project', new.id, new.title, new.id);
  end if;
  return new;
end;
$$;

create or replace function public.log_project_part_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record := coalesce(new, old);
  title text;
  field text;
begin
  select p.title into title from public.projects p where p.id = r.project_id;
  if title is null then return r; end if;

  if tg_table_name = 'media' then
    if tg_op = 'INSERT' then
      perform public.write_activity('media.added', 'media', new.id, title, new.project_id, jsonb_build_object('kind', new.kind));
    elsif tg_op = 'DELETE' then
      perform public.write_activity('media.removed', 'media', old.id, title, old.project_id, jsonb_build_object('kind', old.kind));
    end if;
    return r;
  end if;

  if tg_table_name = 'overview_blocks' then
    field := 'overview';
    if tg_op = 'UPDATE' and new.label is not distinct from old.label and new.body is not distinct from old.body then return r; end if;
  elsif tg_table_name = 'ai_touchpoints' then
    field := 'ai_touchpoints';
    if tg_op = 'UPDATE' and to_jsonb(new) - 'sort_order' = to_jsonb(old) - 'sort_order' then return r; end if;
  elsif tg_table_name = 'result_figures' then
    field := 'result_figures';
    if tg_op = 'UPDATE' and to_jsonb(new) - 'sort_order' = to_jsonb(old) - 'sort_order' then return r; end if;
  else
    field := case when to_jsonb(r) ->> 'type' = 'deliverable' then 'deliverables' else 'ai_workflow' end;
    if tg_op = 'UPDATE' and new.text is not distinct from old.text then return r; end if;
  end if;
  perform public.write_activity('project.edited', 'project', r.project_id, title, r.project_id, jsonb_build_object('fields', jsonb_build_array(field)));
  return r;
end;
$$;

drop trigger if exists ai_touchpoints_activity on public.ai_touchpoints;
create trigger ai_touchpoints_activity after insert or update or delete on public.ai_touchpoints
  for each row execute function public.log_project_part_activity();
drop trigger if exists result_figures_activity on public.result_figures;
create trigger result_figures_activity after insert or update or delete on public.result_figures
  for each row execute function public.log_project_part_activity();
