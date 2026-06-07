import { Camera, DatabaseZap, Trophy } from "lucide-react";
import { EmptyState } from "../components/shared/EmptyState";
import { SkeletonCards } from "../components/shared/Skeleton";
import { Avatar } from "../components/shared/Avatar";
import type { FeedSighting, Profile } from "../types/models";
import { catalogBirdKey, sightingCatalogBird } from "../utils/birds";
import { displayName } from "../utils/format";
import { optimizedStorageImageUrl } from "../utils/images";

interface RankingPageProps {
  configured: boolean;
  loading: boolean;
  ranking: {
    usersBySightings: Array<{ user_id: string; profile: Profile | null; count: number }>;
    usersBySpecies: Array<{ user_id: string; profile: Profile | null; count: number }>;
    photosByLikes: Array<{ sighting: FeedSighting; count: number }>;
  };
  onOpenProfile: (profileId: string) => void;
  onOpenSpecies: (speciesId: string) => void;
}

export function RankingPage({
  configured,
  loading,
  ranking,
  onOpenProfile,
  onOpenSpecies,
}: RankingPageProps) {
  if (!configured) {
    return (
      <EmptyState
        icon={DatabaseZap}
        title="Configura Supabase para activar rankings"
        message="Los rankings se calculan solo con datos reales de la base."
      />
    );
  }

  if (loading) return <SkeletonCards count={3} />;

  const hasData =
    ranking.usersBySightings.length > 0 ||
    ranking.usersBySpecies.length > 0 ||
    ranking.photosByLikes.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={Trophy}
        title="No hay datos disponibles todavia"
        message="Los rankings apareceran cuando existan avistamientos, especies observadas y likes reales."
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Ranking real</span>
          <h1>Comunidad destacada</h1>
          <p>Sin numeros simulados: todo sale de publicaciones y likes reales.</p>
        </div>
      </section>

      <div className="ranking-grid">
        <RankingList
          title="Mas avistamientos"
          rows={ranking.usersBySightings}
          label="avistamientos"
          onOpenProfile={onOpenProfile}
        />
        <RankingList
          title="Mas especies distintas"
          rows={ranking.usersBySpecies}
          label="especies"
          onOpenProfile={onOpenProfile}
        />
        <section className="ranking-panel">
          <h2>Fotos con mas likes</h2>
          {ranking.photosByLikes.length === 0 ? (
            <p className="muted-text">Todavia no hay fotos con likes.</p>
          ) : (
            ranking.photosByLikes.slice(0, 8).map(({ sighting, count }, index) => {
              const bird = sightingCatalogBird(sighting);
              return (
                <button
                  className="photo-rank-row"
                  key={sighting.id}
                  type="button"
                  onClick={() => bird && onOpenSpecies(catalogBirdKey(bird))}
                >
                  <span>{index + 1}</span>
                  <img
                    src={optimizedStorageImageUrl(sighting.photo_url, {
                      width: 160,
                      height: 160,
                      quality: 70,
                      resize: "cover",
                    })}
                    alt={bird?.common_name ?? "Foto"}
                    loading="lazy"
                    decoding="async"
                  />
                  <strong>{bird?.common_name ?? "Especie no disponible"}</strong>
                  <small>{count} likes</small>
                </button>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

function RankingList({
  title,
  rows,
  label,
  onOpenProfile,
}: {
  title: string;
  rows: Array<{ user_id: string; profile: Profile | null; count: number }>;
  label: string;
  onOpenProfile: (profileId: string) => void;
}) {
  return (
    <section className="ranking-panel">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="muted-text">No hay datos disponibles.</p>
      ) : (
        rows.slice(0, 8).map((row, index) => (
          <button
            className="rank-row"
            key={row.user_id}
            type="button"
            onClick={() => onOpenProfile(row.user_id)}
          >
            <span className="rank-number">{index + 1}</span>
            <Avatar profile={row.profile} size="sm" />
            <strong>{displayName(row.profile)}</strong>
            <small>
              {row.count} {label}
            </small>
          </button>
        ))
      )}
      {rows.length === 0 && (
        <div className="empty-mini">
          <Camera size={18} />
        </div>
      )}
    </section>
  );
}
