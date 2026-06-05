-- Compartero - Supabase schema
-- Ejecutar en Supabase SQL Editor. No incluye datos ficticios ni seeds.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text check (username is null or username ~ '^[a-z0-9_]{3,32}$'),
  full_name text,
  avatar_url text,
  country text,
  bio text check (bio is null or char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_username_key;

create table if not exists public.bird_species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null check (char_length(trim(common_name)) > 0),
  scientific_name text not null check (char_length(trim(scientific_name)) > 0),
  family text not null check (char_length(trim(family)) > 0),
  conservation_status text not null default 'NE'
    check (conservation_status in ('LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE')),
  source text not null check (char_length(trim(source)) > 0),
  source_url text not null check (source_url ~* '^https?://'),
  created_at timestamptz not null default now(),
  unique (scientific_name)
);

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  species_id uuid not null references public.bird_species(id) on delete restrict,
  photo_url text not null check (photo_url ~* '^https?://'),
  storage_path text not null,
  location_name text not null check (char_length(trim(location_name)) > 0),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  notes text check (notes is null or char_length(notes) <= 1000),
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, sighting_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_sightings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, sighting_id)
);

create unique index if not exists idx_profiles_username_lower
on public.profiles (lower(username))
where username is not null;
create index if not exists idx_bird_species_common_name on public.bird_species(common_name);
create index if not exists idx_bird_species_scientific_name on public.bird_species(scientific_name);
create index if not exists idx_sightings_created_at on public.sightings(created_at desc);
create index if not exists idx_sightings_user_id on public.sightings(user_id);
create index if not exists idx_sightings_species_id on public.sightings(species_id);
create index if not exists idx_sightings_location on public.sightings(location_name);
create index if not exists idx_likes_sighting_id on public.likes(sighting_id);
create index if not exists idx_comments_sighting_id on public.comments(sighting_id);
create index if not exists idx_saved_user_id on public.saved_sightings(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
begin
  desired_username := regexp_replace(
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'observer_' || substr(new.id::text, 1, 8)),
    '[^A-Za-z0-9_]',
    '',
    'g'
  );

  insert into public.profiles (id, username, full_name, country)
  values (
    new.id,
    lower(desired_username),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'country', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.bird_species enable row level security;
alter table public.sightings enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.saved_sightings enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
on public.profiles for select
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "bird_species_select_public" on public.bird_species;
create policy "bird_species_select_public"
on public.bird_species for select
using (true);

drop policy if exists "bird_species_insert_authenticated" on public.bird_species;
create policy "bird_species_insert_authenticated"
on public.bird_species for insert
to authenticated
with check (
  char_length(trim(common_name)) > 0
  and char_length(trim(scientific_name)) > 0
  and char_length(trim(family)) > 0
  and char_length(trim(source)) > 0
  and source_url ~* '^https?://'
);

drop policy if exists "sightings_select_public" on public.sightings;
create policy "sightings_select_public"
on public.sightings for select
using (true);

drop policy if exists "sightings_insert_own" on public.sightings;
create policy "sightings_insert_own"
on public.sightings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "sightings_update_own" on public.sightings;
create policy "sightings_update_own"
on public.sightings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sightings_delete_own" on public.sightings;
create policy "sightings_delete_own"
on public.sightings for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "likes_select_public" on public.likes;
create policy "likes_select_public"
on public.likes for select
using (true);

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
on public.likes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
on public.likes for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public"
on public.comments for select
using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
on public.comments for insert
to authenticated
with check (auth.uid() = user_id and char_length(trim(content)) between 1 and 1000);

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own"
on public.comments for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id and char_length(trim(content)) between 1 and 1000);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
on public.comments for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_select_own" on public.saved_sightings;
create policy "saved_select_own"
on public.saved_sightings for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_insert_own" on public.saved_sightings;
create policy "saved_insert_own"
on public.saved_sightings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_delete_own" on public.saved_sightings;
create policy "saved_delete_own"
on public.saved_sightings for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sighting-photos',
  'sighting-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_sighting_photos_select_public" on storage.objects;
create policy "storage_sighting_photos_select_public"
on storage.objects for select
using (bucket_id = 'sighting-photos');

drop policy if exists "storage_sighting_photos_insert_own_folder" on storage.objects;
create policy "storage_sighting_photos_insert_own_folder"
on storage.objects for insert
to authenticated
with check (bucket_id = 'sighting-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_sighting_photos_update_own_folder" on storage.objects;
create policy "storage_sighting_photos_update_own_folder"
on storage.objects for update
to authenticated
using (bucket_id = 'sighting-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'sighting-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_sighting_photos_delete_own_folder" on storage.objects;
create policy "storage_sighting_photos_delete_own_folder"
on storage.objects for delete
to authenticated
using (bucket_id = 'sighting-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_avatars_select_public" on storage.objects;
create policy "storage_avatars_select_public"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "storage_avatars_insert_own_folder" on storage.objects;
create policy "storage_avatars_insert_own_folder"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_avatars_update_own_folder" on storage.objects;
create policy "storage_avatars_update_own_folder"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_avatars_delete_own_folder" on storage.objects;
create policy "storage_avatars_delete_own_folder"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace view public.profile_public_stats as
select
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.country,
  p.bio,
  p.created_at,
  count(s.id)::int as sightings_count,
  count(distinct s.species_id)::int as species_count
from public.profiles p
left join public.sightings s on s.user_id = p.id
group by p.id;

create or replace view public.ranking_users_by_sightings as
select
  p.id as user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.country,
  count(s.id)::int as sightings_count
from public.profiles p
join public.sightings s on s.user_id = p.id
group by p.id
order by sightings_count desc;

create or replace view public.ranking_users_by_species as
select
  p.id as user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.country,
  count(distinct s.species_id)::int as species_count
from public.profiles p
join public.sightings s on s.user_id = p.id
group by p.id
order by species_count desc;

create or replace view public.ranking_photos_by_likes as
select
  s.id as sighting_id,
  s.photo_url,
  s.user_id,
  b.common_name,
  b.scientific_name,
  count(l.id)::int as likes_count
from public.sightings s
join public.bird_species b on b.id = s.species_id
left join public.likes l on l.sighting_id = s.id
group by s.id, b.common_name, b.scientific_name
having count(l.id) > 0
order by likes_count desc;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.bird_species, public.sightings, public.likes, public.comments to anon, authenticated;
grant select on public.saved_sightings to authenticated;
grant select on public.profile_public_stats, public.ranking_users_by_sightings, public.ranking_users_by_species, public.ranking_photos_by_likes to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert on public.bird_species, public.sightings, public.likes, public.comments, public.saved_sightings to authenticated;
grant update on public.sightings, public.comments to authenticated;
grant delete on public.sightings, public.likes, public.comments, public.saved_sightings to authenticated;
