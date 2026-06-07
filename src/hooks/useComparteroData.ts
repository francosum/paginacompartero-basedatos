import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ConservationStatus, Database } from "../types/database";
import type {
  Bird,
  BirdSpecies,
  CatalogBird,
  CatalogSource,
  FeedSighting,
  PlatformStats,
  Profile,
} from "../types/models";
import {
  legacySpeciesToCatalog,
  officialBirdToCatalog,
  sightingSpeciesIdentity,
} from "../utils/birds";
import { safeFileName, sanitizeComment } from "../utils/format";

interface CreateSightingPayload {
  userId: string;
  catalogBirdId: string;
  catalog: CatalogSource;
  photo: File;
  locationName: string;
  observedAt: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface CreateSpeciesPayload {
  common_name: string;
  scientific_name: string;
  family: string;
  conservation_status: ConservationStatus;
  source: string;
  source_url: string;
}

type SchemaError = {
  code?: string;
  message?: string;
};

type ComparteroClient = NonNullable<typeof supabase>;

const emptyStats: PlatformStats = {
  sightings: 0,
  species: 0,
  profiles: 0,
};

const SCHEMA_CACHE_ERROR_CODES = new Set(["PGRST200", "PGRST202", "PGRST204", "PGRST205"]);

function isMissingSchemaError(error: SchemaError | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    SCHEMA_CACHE_ERROR_CODES.has(error.code ?? "") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("relationship") ||
    message.includes("column")
  );
}

async function fetchOfficialBirds(client: ComparteroClient) {
  const rows: Bird[] = [];
  const pageSize = 1000;
  const maxRows = 20000;

  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await client
      .from("birds")
      .select("*")
      .order("common_name")
      .range(from, from + pageSize - 1);

    if (error) {
      if (isMissingSchemaError(error)) return { rows: [], available: false };
      throw error;
    }

    const page = (data ?? []) as Bird[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return { rows, available: true };
}

async function fetchOfficialBirdCount(client: ComparteroClient) {
  const { count, error } = await client
    .from("birds")
    .select("id", { count: "exact", head: true });

  if (error) {
    if (isMissingSchemaError(error)) return { count: 0, available: false };
    throw error;
  }

  return { count: count ?? 0, available: true };
}

function sightingsSelect(includeOfficialBirds: boolean, includeSaved: boolean) {
  const saved = includeSaved ? ", saved_sightings(*)" : "";
  const official = includeOfficialBirds ? "birds(*)," : "";

  return `
    *,
    profiles(*),
    ${official}
    bird_species(*),
    likes(*),
    comments(*, profiles(*))
    ${saved}
  `;
}

async function fetchSightings(client: ComparteroClient, userId?: string | null) {
  const includeSaved = Boolean(userId);

  let result = await client
    .from("sightings")
    .select(sightingsSelect(true, includeSaved))
    .order("created_at", { ascending: false })
    .limit(150);

  if (result.error && isMissingSchemaError(result.error)) {
    result = await client
      .from("sightings")
      .select(sightingsSelect(false, includeSaved))
      .order("created_at", { ascending: false })
      .limit(150);
  }

  if (result.error) throw result.error;

  return ((result.data ?? []) as unknown as FeedSighting[]).map((item) => ({
    ...item,
    birds: item.birds ?? null,
    bird_species: item.bird_species ?? null,
    saved_sightings: item.saved_sightings ?? [],
  }));
}

function buildCatalog(
  officialBirds: Bird[],
  legacySpecies: BirdSpecies[],
  sightings: FeedSighting[],
): CatalogBird[] {
  const officialCatalog = officialBirds.map(officialBirdToCatalog);
  const legacyCatalog = legacySpecies.map(legacySpeciesToCatalog);

  if (officialCatalog.length === 0) return legacyCatalog;

  const legacyIdsStillUsed = new Set(
    sightings.map((sighting) => sighting.species_id).filter(Boolean) as string[],
  );
  const legacyStillVisible = legacyCatalog.filter((item) => legacyIdsStillUsed.has(item.id));

  return [...officialCatalog, ...legacyStillVisible];
}

export function useComparteroData(userId?: string | null, catalogEnabled = false) {
  const [sightings, setSightings] = useState<FeedSighting[]>([]);
  const [species, setSpecies] = useState<CatalogBird[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<PlatformStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const configured = Boolean(supabase);

  const refresh = useCallback(async (options?: { forceCatalog?: boolean }) => {
    if (!supabase) {
      setLoading(false);
      setSightings([]);
      setSpecies([]);
      setProfiles([]);
      setStats(emptyStats);
      setCatalogLoaded(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = supabase;
      const shouldFetchCatalog = catalogEnabled && (!catalogLoaded || options?.forceCatalog);
      const [
        sightingsData,
        catalogResult,
        profilesResult,
        sightingsCount,
        officialBirdCount,
        legacySpeciesCount,
        profilesCount,
      ] = await Promise.all([
        fetchSightings(client, userId),
        shouldFetchCatalog
          ? Promise.all([
              fetchOfficialBirds(client),
              client.from("bird_species").select("*").order("common_name"),
            ])
          : Promise.resolve(null),
        client.from("profiles").select("*").order("created_at", { ascending: false }),
        client.from("sightings").select("id", { count: "exact", head: true }),
        fetchOfficialBirdCount(client),
        client.from("bird_species").select("id", { count: "exact", head: true }),
        client.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (sightingsCount.error) throw sightingsCount.error;
      if (legacySpeciesCount.error) throw legacySpeciesCount.error;
      if (profilesCount.error) throw profilesCount.error;

      if (catalogResult) {
        const [officialBirds, legacySpeciesResult] = catalogResult;
        if (legacySpeciesResult.error) throw legacySpeciesResult.error;

        const legacySpecies = (legacySpeciesResult.data ?? []) as BirdSpecies[];
        const catalog = buildCatalog(officialBirds.rows, legacySpecies, sightingsData);
        setSpecies(catalog);
        setCatalogLoaded(true);
      }

      setSightings(sightingsData);
      setProfiles(profilesResult.data ?? []);
      setStats({
        sightings: sightingsCount.count ?? 0,
        species:
          officialBirdCount.available && officialBirdCount.count > 0
            ? officialBirdCount.count
            : legacySpeciesCount.count ?? 0,
        profiles: profilesCount.count ?? 0,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar datos reales.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [catalogEnabled, catalogLoaded, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase) return undefined;
    const client = supabase;

    const channel = client
      .channel("compartero-live-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "sightings" }, () =>
        void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () =>
        void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () =>
        void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "saved_sightings" }, () =>
        void refresh(),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [refresh]);

  const createSpecies = useCallback(async (payload: CreateSpeciesPayload) => {
    if (!supabase) throw new Error("Configura Supabase para crear especies reales.");
    if (!payload.source_url.startsWith("http")) {
      throw new Error("La fuente debe incluir una URL verificable.");
    }

    const cleanPayload = {
      common_name: payload.common_name.trim(),
      scientific_name: payload.scientific_name.trim(),
      family: payload.family.trim(),
      conservation_status: payload.conservation_status,
      source: payload.source.trim(),
      source_url: payload.source_url.trim(),
    };

    if (Object.values(cleanPayload).some((value) => !String(value).trim())) {
      throw new Error("Completa todos los campos de la especie.");
    }

    const officialPayload: Database["public"]["Tables"]["birds"]["Insert"] = {
      source_taxonomy: cleanPayload.source,
      source_version: "manual",
      source_url: cleanPayload.source_url,
      category: "species",
      common_name: cleanPayload.common_name,
      scientific_name: cleanPayload.scientific_name,
      family: cleanPayload.family,
      is_extinct: cleanPayload.conservation_status === "EX",
    };

    const officialInsert = await supabase.from("birds").insert(officialPayload);
    if (!officialInsert.error) {
      await refresh({ forceCatalog: true });
      return;
    }

    if (!isMissingSchemaError(officialInsert.error)) throw officialInsert.error;

    const { error: insertError } = await supabase.from("bird_species").insert(cleanPayload);
    if (insertError) throw insertError;
    await refresh({ forceCatalog: true });
  }, [refresh]);

  const createSighting = useCallback(
    async (payload: CreateSightingPayload) => {
      if (!supabase) throw new Error("Configura Supabase para publicar avistamientos.");
      if (!payload.userId) throw new Error("Inicia sesion para publicar.");
      if (!payload.catalogBirdId) throw new Error("Selecciona una especie del catalogo.");
      if (!payload.photo.type.startsWith("image/")) {
        throw new Error("La foto debe ser una imagen.");
      }

      const path = `${payload.userId}/${crypto.randomUUID()}-${safeFileName(payload.photo.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("sighting-photos")
        .upload(path, payload.photo, {
          cacheControl: "3600",
          contentType: payload.photo.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("sighting-photos").getPublicUrl(path);
      const insertPayload: Database["public"]["Tables"]["sightings"]["Insert"] = {
        user_id: payload.userId,
        species_id: payload.catalog === "bird_species" ? payload.catalogBirdId : null,
        bird_id: payload.catalog === "birds" ? payload.catalogBirdId : null,
        photo_url: data.publicUrl,
        storage_path: path,
        location_name: payload.locationName.trim(),
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        notes: payload.notes?.trim() || null,
        observed_at: new Date(payload.observedAt).toISOString(),
      };

      const { error: insertError } = await supabase.from("sightings").insert(insertPayload);

      if (insertError) {
        await supabase.storage.from("sighting-photos").remove([path]);
        throw insertError;
      }

      await refresh();
    },
    [refresh],
  );

  const toggleLike = useCallback(
    async (sightingId: string) => {
      if (!supabase || !userId) throw new Error("Inicia sesion para dar like.");

      const current = sightings
        .find((item) => item.id === sightingId)
        ?.likes.find((like) => like.user_id === userId);

      const result = current
        ? await supabase.from("likes").delete().eq("id", current.id).eq("user_id", userId)
        : await supabase.from("likes").insert({ sighting_id: sightingId, user_id: userId });

      if (result.error) throw result.error;
      await refresh();
    },
    [refresh, sightings, userId],
  );

  const toggleSave = useCallback(
    async (sightingId: string) => {
      if (!supabase || !userId) throw new Error("Inicia sesion para guardar.");

      const current = sightings
        .find((item) => item.id === sightingId)
        ?.saved_sightings?.find((saved) => saved.user_id === userId);

      const result = current
        ? await supabase
            .from("saved_sightings")
            .delete()
            .eq("id", current.id)
            .eq("user_id", userId)
        : await supabase
            .from("saved_sightings")
            .insert({ sighting_id: sightingId, user_id: userId });

      if (result.error) throw result.error;
      await refresh();
    },
    [refresh, sightings, userId],
  );

  const addComment = useCallback(
    async (sightingId: string, content: string) => {
      if (!supabase || !userId) throw new Error("Inicia sesion para comentar.");
      const clean = sanitizeComment(content);
      if (!clean) throw new Error("El comentario no puede estar vacio.");

      const { error: insertError } = await supabase.from("comments").insert({
        sighting_id: sightingId,
        user_id: userId,
        content: clean,
      });

      if (insertError) throw insertError;
      await refresh();
    },
    [refresh, userId],
  );

  const deleteSighting = useCallback(
    async (sighting: FeedSighting) => {
      if (!supabase || !userId) throw new Error("Inicia sesion para borrar.");
      if (sighting.user_id !== userId) {
        throw new Error("Solo puedes borrar tus propias publicaciones.");
      }

      const { error: deleteError } = await supabase
        .from("sightings")
        .delete()
        .eq("id", sighting.id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      if (sighting.storage_path) {
        await supabase.storage.from("sighting-photos").remove([sighting.storage_path]);
      }

      await refresh();
    },
    [refresh, userId],
  );

  const ranking = useMemo(() => {
    const bySightings = new Map<string, { profile: Profile | null; count: number }>();
    const bySpecies = new Map<string, { profile: Profile | null; species: Set<string> }>();

    sightings.forEach((sighting) => {
      const profile = sighting.profiles;
      const sightingRank = bySightings.get(sighting.user_id) ?? { profile, count: 0 };
      sightingRank.count += 1;
      bySightings.set(sighting.user_id, sightingRank);

      const speciesRank =
        bySpecies.get(sighting.user_id) ?? { profile, species: new Set<string>() };
      const speciesIdentity = sightingSpeciesIdentity(sighting);
      if (speciesIdentity) speciesRank.species.add(speciesIdentity);
      bySpecies.set(sighting.user_id, speciesRank);
    });

    return {
      usersBySightings: Array.from(bySightings.entries())
        .map(([user_id, value]) => ({ user_id, ...value }))
        .sort((a, b) => b.count - a.count),
      usersBySpecies: Array.from(bySpecies.entries())
        .map(([user_id, value]) => ({
          user_id,
          profile: value.profile,
          count: value.species.size,
        }))
        .sort((a, b) => b.count - a.count),
      photosByLikes: sightings
        .map((sighting) => ({ sighting, count: sighting.likes.length }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count),
    };
  }, [sightings]);

  return {
    configured,
    loading,
    error,
    sightings,
    species,
    profiles,
    stats,
    ranking,
    refresh,
    createSpecies,
    createSighting,
    toggleLike,
    toggleSave,
    addComment,
    deleteSighting,
  };
}
