-- Compartero - catalogo oficial de aves
-- Ejecutar en Supabase SQL Editor antes de importar data/birds_clements_v2025_import.csv.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.birds (
  id uuid primary key default gen_random_uuid(),
  source_taxonomy text not null check (char_length(trim(source_taxonomy)) > 0),
  source_version text not null check (char_length(trim(source_version)) > 0),
  source_url text not null check (source_url ~* '^https?://'),
  taxon_concept_id text unique,
  species_code text,
  sort_order numeric,
  category text not null default 'species',
  common_name text not null check (char_length(trim(common_name)) > 0),
  scientific_name text not null check (char_length(trim(scientific_name)) > 0),
  authority text,
  taxonomic_order text,
  family text,
  country_text text,
  range_text text,
  habitat text,
  is_extinct boolean not null default false,
  created_at timestamptz not null default now(),
  unique (source_taxonomy, source_version, scientific_name)
);

create index if not exists idx_birds_common_name on public.birds(common_name);
create index if not exists idx_birds_scientific_name on public.birds(scientific_name);
create index if not exists idx_birds_family on public.birds(family);
create index if not exists idx_birds_country_text on public.birds(country_text);
create index if not exists idx_birds_habitat on public.birds(habitat);
create index if not exists idx_birds_taxonomic_order on public.birds(taxonomic_order);
create index if not exists idx_birds_sort_order on public.birds(sort_order);
create index if not exists idx_birds_common_name_trgm on public.birds using gin (common_name gin_trgm_ops);
create index if not exists idx_birds_scientific_name_trgm on public.birds using gin (scientific_name gin_trgm_ops);
create index if not exists idx_birds_range_text_trgm on public.birds using gin (range_text gin_trgm_ops);

alter table public.birds enable row level security;

drop policy if exists "birds_select_public" on public.birds;
create policy "birds_select_public"
on public.birds for select
using (true);

drop policy if exists "birds_insert_authenticated" on public.birds;
create policy "birds_insert_authenticated"
on public.birds for insert
to authenticated
with check (
  char_length(trim(source_taxonomy)) > 0
  and char_length(trim(source_version)) > 0
  and source_url ~* '^https?://'
  and char_length(trim(common_name)) > 0
  and char_length(trim(scientific_name)) > 0
);

alter table public.sightings
add column if not exists bird_id uuid references public.birds(id) on delete restrict;

alter table public.sightings
alter column species_id drop not null;

alter table public.sightings
drop constraint if exists sightings_catalog_species_check;

alter table public.sightings
add constraint sightings_catalog_species_check
check (bird_id is not null or species_id is not null);

create index if not exists idx_sightings_bird_id on public.sightings(bird_id);

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
  count(distinct coalesce(s.bird_id, s.species_id))::int as species_count
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
  count(distinct coalesce(s.bird_id, s.species_id))::int as species_count
from public.profiles p
join public.sightings s on s.user_id = p.id
group by p.id
order by species_count desc;

create or replace view public.ranking_photos_by_likes as
select
  s.id as sighting_id,
  s.photo_url,
  s.user_id,
  coalesce(b.common_name, bs.common_name, 'Especie no disponible') as common_name,
  coalesce(b.scientific_name, bs.scientific_name, '') as scientific_name,
  count(l.id)::int as likes_count
from public.sightings s
left join public.birds b on b.id = s.bird_id
left join public.bird_species bs on bs.id = s.species_id
left join public.likes l on l.sighting_id = s.id
group by s.id, b.common_name, b.scientific_name, bs.common_name, bs.scientific_name
having count(l.id) > 0
order by likes_count desc;

grant select on public.birds to anon, authenticated;
grant insert on public.birds to authenticated;
grant select on public.profile_public_stats, public.ranking_users_by_sightings, public.ranking_users_by_species, public.ranking_photos_by_likes to anon, authenticated;
