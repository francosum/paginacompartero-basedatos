import type { Bird, BirdSpecies, CatalogBird, FeedSighting } from "../types/models";

export function catalogBirdKey(bird: Pick<CatalogBird, "catalog" | "id">) {
  return `${bird.catalog}:${bird.id}`;
}

export function officialBirdToCatalog(row: Bird): CatalogBird {
  return {
    id: row.id,
    catalog: "birds",
    common_name: row.common_name,
    scientific_name: row.scientific_name,
    family: row.family || "Sin familia cargada",
    source: [row.source_taxonomy, row.source_version].filter(Boolean).join(" "),
    source_url: row.source_url,
    source_taxonomy: row.source_taxonomy,
    source_version: row.source_version,
    taxonomic_order: row.taxonomic_order,
    country_text: row.country_text,
    range_text: row.range_text,
    habitat: row.habitat,
    is_extinct: row.is_extinct,
    created_at: row.created_at,
  };
}

export function legacySpeciesToCatalog(row: BirdSpecies): CatalogBird {
  return {
    id: row.id,
    catalog: "bird_species",
    common_name: row.common_name,
    scientific_name: row.scientific_name,
    family: row.family,
    conservation_status: row.conservation_status,
    source: row.source,
    source_url: row.source_url,
    created_at: row.created_at,
  };
}

export function sightingCatalogBird(sighting: FeedSighting): CatalogBird | null {
  if (sighting.birds) return officialBirdToCatalog(sighting.birds);
  if (sighting.bird_species) return legacySpeciesToCatalog(sighting.bird_species);
  return null;
}

export function sightingCatalogKey(sighting: FeedSighting) {
  const bird = sightingCatalogBird(sighting);
  return bird ? catalogBirdKey(bird) : null;
}

export function sightingSpeciesIdentity(sighting: FeedSighting) {
  return sighting.bird_id ?? sighting.species_id ?? null;
}
