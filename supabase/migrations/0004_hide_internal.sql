-- "Internal or confidential" is gone from the admin: confidential work is now simply Hidden.
-- Moves any internal project to Hidden. Run after 0003. Safe to run twice.
update public.projects set visibility = 'hidden', is_internal = false where is_internal;
