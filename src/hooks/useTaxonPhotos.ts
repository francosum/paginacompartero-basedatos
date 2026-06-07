import { useEffect, useMemo, useState } from "react";
import type { CatalogBird } from "../types/models";
import { catalogBirdKey } from "../utils/birds";

export interface TaxonPhoto {
  attribution: string | null;
  licenseCode: string | null;
  mediumUrl: string;
  sourceName: string;
  sourceUrl: string;
  squareUrl: string;
}

type CacheEntry = TaxonPhoto | null;

const CACHE_KEY = "compartero-taxon-photo-cache-v3";
const MAX_CACHE_ITEMS = 1200;

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    const entries = Object.entries(cache).slice(-MAX_CACHE_ITEMS);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Cache is an optimization only.
  }
}

function wikipediaTitle(name: string) {
  return encodeURIComponent(name.trim().replace(/\s+/g, "_"));
}

function wikimediaThumb(url: string, width: number) {
  const resizedThumb = url.replace(/\/\d+px-([^/]+)$/u, `/${width}px-$1`);
  if (resizedThumb !== url) return resizedThumb;

  const originalMatch = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([^/]+)\/([^/]+)\/(.+)$/u);
  if (!originalMatch) return url;

  const [, base, hashOne, hashTwo, fileName] = originalMatch;
  return `${base}/thumb/${hashOne}/${hashTwo}/${fileName}/${width}px-${fileName}`;
}

async function fetchWikipediaPhoto(
  bird: CatalogBird,
  signal: AbortSignal,
): Promise<TaxonPhoto | null> {
  const names = [bird.scientific_name, bird.common_name].filter(Boolean);

  for (const name of names) {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${wikipediaTitle(name)}`,
      { signal },
    );

    if (!response.ok) continue;

    const payload = (await response.json()) as {
      content_urls?: { desktop?: { page?: string } };
      originalimage?: { source?: string };
      thumbnail?: { source?: string };
      title?: string;
    };

    const thumbnail = payload.thumbnail?.source ?? payload.originalimage?.source ?? null;
    if (!thumbnail) continue;

    return {
      attribution: payload.title ? `Wikipedia: ${payload.title}` : "Wikipedia",
      licenseCode: "wikimedia",
      mediumUrl: wikimediaThumb(payload.originalimage?.source ?? thumbnail, 900),
      sourceName: "Wikipedia",
      sourceUrl: payload.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${wikipediaTitle(name)}`,
      squareUrl: wikimediaThumb(thumbnail, 240),
    };
  }

  return null;
}

async function fetchInaturalistPhoto(
  bird: CatalogBird,
  signal: AbortSignal,
): Promise<TaxonPhoto | null> {
  const query = encodeURIComponent(bird.scientific_name || bird.common_name);
  const response = await fetch(
    `https://api.inaturalist.org/v1/taxa?q=${query}&rank=species&iconic_taxa=Aves&per_page=1`,
    { signal },
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    results?: Array<{
      id: number;
      default_photo?: {
        attribution?: string | null;
        license_code?: string | null;
        medium_url?: string | null;
        square_url?: string | null;
        url?: string | null;
      } | null;
    }>;
  };

  const result = payload.results?.[0];
  const photo = result?.default_photo;
  const squareUrl = photo?.square_url ?? photo?.url ?? null;
  const mediumUrl = photo?.medium_url ?? squareUrl;

  if (!result || !squareUrl || !mediumUrl) return null;

  return {
    attribution: photo?.attribution ?? null,
    licenseCode: photo?.license_code ?? null,
    mediumUrl,
    sourceName: "iNaturalist",
    sourceUrl: `https://www.inaturalist.org/taxa/${result.id}`,
    squareUrl,
  };
}

async function fetchTaxonPhoto(bird: CatalogBird, signal: AbortSignal): Promise<TaxonPhoto | null> {
  return (await fetchWikipediaPhoto(bird, signal)) ?? fetchInaturalistPhoto(bird, signal);
}

export function useTaxonPhotos(birds: CatalogBird[]) {
  const [photos, setPhotos] = useState<Record<string, TaxonPhoto>>({});

  const photoTargets = useMemo(() => {
    const unique = new Map<string, CatalogBird>();
    birds.forEach((bird) => {
      const cacheKey = normalizeName(bird.scientific_name || bird.common_name);
      if (!cacheKey || unique.has(cacheKey)) return;
      unique.set(cacheKey, bird);
    });
    return Array.from(unique.entries());
  }, [birds]);

  useEffect(() => {
    if (photoTargets.length === 0) return undefined;

    const controller = new AbortController();
    const cache = readCache();
    const missing = photoTargets.filter(([cacheKey, bird]) => {
      const key = catalogBirdKey(bird);
      const cached = cache[cacheKey];

      if (cached) {
        setPhotos((current) => ({ ...current, [key]: cached }));
        return false;
      }

      return !(cacheKey in cache);
    });

    async function load() {
      const nextCache = { ...cache };

      for (let index = 0; index < missing.length; index += 6) {
        if (controller.signal.aborted) return;

        const batch = missing.slice(index, index + 6);
        const results = await Promise.all(
          batch.map(async ([cacheKey, bird]) => {
            try {
              const photo = await fetchTaxonPhoto(bird, controller.signal);
              return { bird, cacheKey, photo };
            } catch {
              return { bird, cacheKey, photo: null };
            }
          }),
        );

        results.forEach(({ bird, cacheKey, photo }) => {
          nextCache[cacheKey] = photo;
          if (photo) {
            const key = catalogBirdKey(bird);
            setPhotos((current) => ({ ...current, [key]: photo }));
          }
        });
        writeCache(nextCache);
      }
    }

    void load();

    return () => controller.abort();
  }, [photoTargets]);

  return photos;
}
