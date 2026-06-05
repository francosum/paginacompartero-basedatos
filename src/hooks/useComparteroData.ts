import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ConservationStatus } from "../types/database";
import type {
  BirdSpecies,
  FeedSighting,
  PlatformStats,
  Profile,
} from "../types/models";
import { safeFileName, sanitizeComment } from "../utils/format";

interface CreateSightingPayload {
  userId: string;
  speciesId: string;
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

const emptyStats: PlatformStats = {
  sightings: 0,
  species: 0,
  profiles: 0,
};

export function useComparteroData(userId?: string | null) {
  const [sightings, setSightings] = useState<FeedSighting[]>([]);
  const [species, setSpecies] = useState<BirdSpecies[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<PlatformStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const configured = Boolean(supabase);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setSightings([]);
      setSpecies([]);
      setProfiles([]);
      setStats(emptyStats);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sightingsSelect = userId
        ? `
            *,
            profiles(*),
            bird_species(*),
            likes(*),
            comments(*, profiles(*)),
            saved_sightings(*)
          `
        : `
            *,
            profiles(*),
            bird_species(*),
            likes(*),
            comments(*, profiles(*))
          `;

      const [
        sightingsResult,
        speciesResult,
        profilesResult,
        sightingsCount,
        speciesCount,
        profilesCount,
      ] = await Promise.all([
        supabase
          .from("sightings")
          .select(sightingsSelect)
          .order("created_at", { ascending: false })
          .limit(150),
        supabase.from("bird_species").select("*").order("common_name"),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("sightings").select("id", { count: "exact", head: true }),
        supabase.from("bird_species").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      if (sightingsResult.error) throw sightingsResult.error;
      if (speciesResult.error) throw speciesResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (sightingsCount.error) throw sightingsCount.error;
      if (speciesCount.error) throw speciesCount.error;
      if (profilesCount.error) throw profilesCount.error;

      setSightings(
        ((sightingsResult.data ?? []) as unknown as FeedSighting[]).map((item) => ({
          ...item,
          saved_sightings: item.saved_sightings ?? [],
        })),
      );
      setSpecies(speciesResult.data ?? []);
      setProfiles(profilesResult.data ?? []);
      setStats({
        sightings: sightingsCount.count ?? 0,
        species: speciesCount.count ?? 0,
        profiles: profilesCount.count ?? 0,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar datos reales.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

    const { error: insertError } = await supabase.from("bird_species").insert(cleanPayload);
    if (insertError) throw insertError;
    await refresh();
  }, [refresh]);

  const createSighting = useCallback(
    async (payload: CreateSightingPayload) => {
      if (!supabase) throw new Error("Configura Supabase para publicar avistamientos.");
      if (!payload.userId) throw new Error("Inicia sesion para publicar.");
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

      const { error: insertError } = await supabase.from("sightings").insert({
        user_id: payload.userId,
        species_id: payload.speciesId,
        photo_url: data.publicUrl,
        storage_path: path,
        location_name: payload.locationName.trim(),
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        notes: payload.notes?.trim() || null,
        observed_at: new Date(payload.observedAt).toISOString(),
      });

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
      speciesRank.species.add(sighting.species_id);
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
