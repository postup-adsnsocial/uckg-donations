-- Run once in the Supabase SQL editor after the database migrations.
-- Both buckets are private. The API accesses them with the service role and
-- always prefixes every object with the active church UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('envelopes', 'envelopes', false, 8000000, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 10000000, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
