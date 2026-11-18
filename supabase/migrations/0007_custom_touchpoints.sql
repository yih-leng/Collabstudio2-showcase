-- AI touchpoints of your own: besides the fixed list, a touchpoint can be
-- "custom", with its own name in label.
-- Run after 0006_story.sql. Safe to run twice.

alter table public.ai_touchpoints add column if not exists label text;

alter table public.ai_touchpoints drop constraint if exists ai_touchpoints_kind_check;
alter table public.ai_touchpoints add constraint ai_touchpoints_kind_check check (kind in (
  'world_building', 'brand_integration', 'video', 'image', 'music_sound', 'voice_over', 'localisation',
  'script_storyboard', 'look_development', 'upscale_finish', 'custom'
));

-- A custom touchpoint needs a name.
alter table public.ai_touchpoints drop constraint if exists ai_touchpoints_custom_label;
alter table public.ai_touchpoints add constraint ai_touchpoints_custom_label check (kind <> 'custom' or coalesce(trim(label), '') <> '');
