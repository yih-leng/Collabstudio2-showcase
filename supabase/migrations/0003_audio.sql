-- Audio files (music, voice-over) in a project's media. Run after 0002. Safe to run twice.
alter table public.media drop constraint if exists media_kind_check;
alter table public.media add constraint media_kind_check check (kind in ('image', 'video', 'audio', 'embed'));
