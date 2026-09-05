-- Create the storage bucket for the gallery
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- Set up RLS policies on storage.objects

-- Allow public read access to all files in the gallery bucket
create policy "Public read access to gallery"
on storage.objects for select
to public
using ( bucket_id = 'gallery' );

-- Allow staff to insert, update, and delete files in the gallery bucket
-- We use the existing is_staff() function from 0001_core_schema.sql
create policy "Staff upload access to gallery"
on storage.objects for insert
with check ( bucket_id = 'gallery' and is_staff() );

create policy "Staff update access to gallery"
on storage.objects for update
using ( bucket_id = 'gallery' and is_staff() );

create policy "Staff delete access to gallery"
on storage.objects for delete
using ( bucket_id = 'gallery' and is_staff() );
