import { useMemo } from "react";
import { Binoculars, Camera, Compass, DatabaseZap, Images, Plus } from "lucide-react";
import { EmptyState } from "../components/shared/EmptyState";
import { SkeletonCards } from "../components/shared/Skeleton";
import { SightingCard } from "../components/SightingCard";
import type { FeedSighting, PlatformStats, Profile } from "../types/models";
import { sightingCatalogBird, sightingSpeciesIdentity } from "../utils/birds";
import { numberOrDash } from "../utils/format";
import { optimizedStorageImageUrl } from "../utils/images";

interface FeedPageProps {
  authProfile: Profile | null;
  userId: string | null;
  stats: PlatformStats;
  configured: boolean;
  loading: boolean;
  sightings: FeedSighting[];
  onPublish: () => void;
  onOpenAuth: () => void;
  onOpenProfile: (profileId: string) => void;
  onOpenSpecies: (speciesId: string) => void;
  onLike: (sightingId: string) => Promise<void>;
  onSave: (sightingId: string) => Promise<void>;
  onComment: (sightingId: string, content: string) => Promise<void>;
  onDelete: (sighting: FeedSighting) => Promise<void>;
}

export function FeedPage({
  authProfile,
  userId,
  stats,
  configured,
  loading,
  sightings,
  onPublish,
  onOpenAuth,
  onOpenProfile,
  onOpenSpecies,
  onLike,
  onSave,
  onComment,
  onDelete,
}: FeedPageProps) {
  const heroSightings = useMemo(() => sightings.slice(0, 7), [sightings]);
  const observedSpecies = useMemo(() => {
    const unique = new Set<string>();
    sightings.forEach((sighting) => {
      const identity = sightingSpeciesIdentity(sighting);
      if (identity) unique.add(identity);
    });
    return unique.size;
  }, [sightings]);

  return (
    <div className="page-stack">
      <section className="workspace-hero visual-hero">
        <div className="hero-copy">
          <span className="eyebrow">Comunidad mundial de aves</span>
          <h1>Compartero</h1>
          <p>
            Avistamientos reales, usuarios autenticados, fotos subidas a Storage y especies
            con fuente verificable.
          </p>
          <div className="hero-actions">
            <button className="button button--primary" type="button" onClick={onPublish}>
              <Plus size={16} />
              Publicar avistamiento
            </button>
            {!authProfile && (
              <button className="button button--secondary" type="button" onClick={onOpenAuth}>
                Iniciar sesion
              </button>
            )}
          </div>
          <div className="hero-signal-strip" aria-label="Actividad reciente">
            <span>
              <Images size={16} />
              {numberOrDash(sightings.length)} fotos
            </span>
            <span>
              <Binoculars size={16} />
              {numberOrDash(observedSpecies)} especies vistas
            </span>
            <span>
              <Compass size={16} />
              Datos reales
            </span>
          </div>
        </div>

        <div className="hero-photo-board" aria-label="Fotos recientes de aves">
          {heroSightings.length > 0 ? (
            heroSightings.map((sighting, index) => {
              const species = sightingCatalogBird(sighting);
              return (
                <figure className="hero-photo-tile" key={sighting.id}>
                  <img
                    src={optimizedStorageImageUrl(sighting.photo_url, {
                      width: index === 0 ? 960 : 520,
                      quality: 72,
                      resize: "cover",
                    })}
                    alt={species?.common_name ?? "Avistamiento"}
                    loading={index < 2 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  <figcaption>
                    <strong>{species?.common_name ?? "Especie no disponible"}</strong>
                    <span>{sighting.location_name}</span>
                  </figcaption>
                </figure>
              );
            })
          ) : (
            <div className="hero-empty-board">
              <Camera size={28} />
              <strong>El primer mosaico aparece con tus fotos reales.</strong>
            </div>
          )}
        </div>
      </section>

      <section className="stats-grid" aria-label="Metricas reales">
        <div className="stat-card">
          <strong>{numberOrDash(stats.sightings)}</strong>
          <span>Avistamientos reales</span>
        </div>
        <div className="stat-card">
          <strong>{numberOrDash(stats.species)}</strong>
          <span>Especies verificadas</span>
        </div>
        <div className="stat-card">
          <strong>{numberOrDash(stats.profiles)}</strong>
          <span>Perfiles registrados</span>
        </div>
      </section>

      <section className="section-heading">
        <div>
          <span className="eyebrow">Feed</span>
          <h2>Avistamientos recientes</h2>
        </div>
      </section>

      {!configured && (
        <EmptyState
          icon={DatabaseZap}
          title="Configura Supabase para activar esta funcion"
          message="El feed no usa datos inventados. Cuando conectes la base, aca apareceran publicaciones reales."
        />
      )}

      {configured && loading && <SkeletonCards count={6} />}

      {configured && !loading && sightings.length === 0 && (
        <EmptyState
          icon={Camera}
          title="No hay datos disponibles todavia"
          message="El primer avistamiento aparecera cuando un usuario real suba una foto y elija una especie verificada."
          actionLabel="Publicar avistamiento"
          onAction={onPublish}
        />
      )}

      {configured && sightings.length > 0 && (
        <div className="card-grid">
          {sightings.map((sighting) => (
            <SightingCard
              key={sighting.id}
              sighting={sighting}
              userId={userId}
              onLike={onLike}
              onSave={onSave}
              onComment={onComment}
              onDelete={onDelete}
              onOpenAuth={onOpenAuth}
              onOpenProfile={onOpenProfile}
              onOpenSpecies={onOpenSpecies}
            />
          ))}
        </div>
      )}
    </div>
  );
}
