-- Activity log: who changed what, and when, plus what AI drafting cost.
-- Triggers write it, so every change is recorded whichever screen made it.
-- Admins can read it and add to it (the deck importer logs its AI usage),
-- but nobody can edit or delete entries from the site.

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  -- project.created, project.edited, project.published, project.visibility, project.featured,
  -- project.unfeatured, project.trashed, project.restored, project.deleted, media.added,
  -- media.removed, list.added, list.renamed, list.logo, list.removed, settings.updated,
  -- enquiry.received, ai.draft
  action text not null,
  -- project, media, client, type, capability, tool, settings, enquiry, deck
  entity_type text not null,
  entity_id uuid,
  label text,
  -- Kept without a foreign key, so a project's history outlives the project.
  project_id uuid,
  details jsonb not null default '{}'
);

create index if not exists activity_created_idx on public.activity (created_at desc);
create index if not exists activity_project_idx on public.activity (project_id);

alter table public.activity enable row level security;
drop policy if exists "admin read" on public.activity;
create policy "admin read" on public.activity for select using (public.is_admin());
drop policy if exists "admin add" on public.activity;
create policy "admin add" on public.activity for insert with check (public.is_admin());

-- Every entry is stamped with the signed-in person and the exact time,
-- whatever the insert says, so entries can't be made in someone else's name
-- and several from one save keep their order.
create or replace function public.stamp_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.actor_id := auth.uid();
  new.actor_email := (select email from auth.users where id = new.actor_id);
  new.created_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists activity_stamp on public.activity;
create trigger activity_stamp before insert on public.activity
  for each row execute function public.stamp_activity();

-- Writes one entry (for the triggers below).
create or replace function public.write_activity(
  p_action text, p_entity_type text, p_entity_id uuid, p_label text, p_project_id uuid, p_details jsonb default '{}'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity (action, entity_type, entity_id, label, project_id, details)
  values (p_action, p_entity_type, p_entity_id, p_label, p_project_id, coalesce(p_details, '{}'));
end;
$$;

-- Projects: created, published, trashed and the rest. Reordering alone isn't logged.
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
  if new.output_summary is distinct from old.output_summary then changed := array_append(changed, 'output_summary'); end if;
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

drop trigger if exists projects_activity on public.projects;
create trigger projects_activity after insert or update or delete on public.projects
  for each row execute function public.log_project_activity();

-- A project's parts: media, overview blocks, deliverables and AI workflow steps.
-- Skipped when the project itself is being deleted (its own entry covers it).
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
  else
    field := case when to_jsonb(r) ->> 'type' = 'deliverable' then 'deliverables' else 'ai_workflow' end;
    if tg_op = 'UPDATE' and new.text is not distinct from old.text then return r; end if;
  end if;
  perform public.write_activity('project.edited', 'project', r.project_id, title, r.project_id, jsonb_build_object('fields', jsonb_build_array(field)));
  return r;
end;
$$;

drop trigger if exists media_activity on public.media;
create trigger media_activity after insert or delete on public.media
  for each row execute function public.log_project_part_activity();
drop trigger if exists overview_blocks_activity on public.overview_blocks;
create trigger overview_blocks_activity after insert or update or delete on public.overview_blocks
  for each row execute function public.log_project_part_activity();
drop trigger if exists list_items_activity on public.list_items;
create trigger list_items_activity after insert or update or delete on public.list_items
  for each row execute function public.log_project_part_activity();

-- Clients, project types, capabilities and tools.
create or replace function public.log_list_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record := coalesce(new, old);
  kind text;
begin
  -- Tags carry their kind (capability or tool); clients and categories have no type column.
  kind := case tg_table_name when 'clients' then 'client' when 'categories' then 'type' else to_jsonb(r) ->> 'type' end;
  if tg_op = 'INSERT' then
    perform public.write_activity('list.added', kind, new.id, new.name, null);
  elsif tg_op = 'DELETE' then
    perform public.write_activity('list.removed', kind, old.id, old.name, null);
  elsif new.name is distinct from old.name then
    perform public.write_activity('list.renamed', kind, new.id, new.name, null, jsonb_build_object('from', old.name));
  elsif tg_table_name = 'clients' and new.logo_url is distinct from old.logo_url then
    perform public.write_activity('list.logo', kind, new.id, new.name, null);
  end if;
  return r;
end;
$$;

drop trigger if exists clients_activity on public.clients;
create trigger clients_activity after insert or update or delete on public.clients
  for each row execute function public.log_list_activity();
drop trigger if exists categories_activity on public.categories;
create trigger categories_activity after insert or update or delete on public.categories
  for each row execute function public.log_list_activity();
drop trigger if exists tags_activity on public.tags;
create trigger tags_activity after insert or update or delete on public.tags
  for each row execute function public.log_list_activity();

-- Site settings (only values that actually changed) and new enquiries.
create or replace function public.log_misc_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'settings' then
    if tg_op = 'UPDATE' and new.value is not distinct from old.value then return new; end if;
    perform public.write_activity('settings.updated', 'settings', null, new.key, null);
  else
    perform public.write_activity('enquiry.received', 'enquiry', new.id, coalesce(new.company, new.name), null);
  end if;
  return new;
end;
$$;

drop trigger if exists settings_activity on public.settings;
create trigger settings_activity after insert or update on public.settings
  for each row execute function public.log_misc_activity();
drop trigger if exists enquiries_activity on public.enquiries;
create trigger enquiries_activity after insert on public.enquiries
  for each row execute function public.log_misc_activity();

-- Only the triggers call these.
revoke all on function public.write_activity(text, text, uuid, text, uuid, jsonb) from public, anon, authenticated;
