-- "About this project": the brief and the challenge, shown first on a project page.
-- Run after 0001_init.sql. Safe to run twice.
alter table public.projects add column if not exists about text;
