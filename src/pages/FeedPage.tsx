import { Camera, DatabaseZap, Plus } from "lucide-react";
import { EmptyState } from "../components/shared/EmptyState";
import { SkeletonCards } from "../components/shared/Skeleton";
import { SightingCard } from "../components/SightingCard";
import type { FeedSighting, PlatformStats, Profile } from "../types/models";
import { numberOrDash } from "../utils/format";

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
  return (
    <div className="page-stack">
      <section className="workspace-hero">
        <div>
          <span className="eyebrow">Comunidad mundial de aves</span>
          <h1>Compartero</h1>
          <p>
            Avistamientos reales, usuarios autenticados, fotos subidas a Storage y especies
            con fuente verificable.
          </p>
        </div>
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
