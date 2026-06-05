import { FormEvent, useState } from "react";
import {
  Bookmark,
  Calendar,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { Avatar } from "./shared/Avatar";
import type { FeedSighting } from "../types/models";
import { catalogBirdKey, sightingCatalogBird } from "../utils/birds";
import { conservationLabel, displayName, formatDate } from "../utils/format";
import { useToast } from "../hooks/useToast";

interface SightingCardProps {
  sighting: FeedSighting;
  userId: string | null;
  onLike: (sightingId: string) => Promise<void>;
  onSave: (sightingId: string) => Promise<void>;
  onComment: (sightingId: string, content: string) => Promise<void>;
  onDelete: (sighting: FeedSighting) => Promise<void>;
  onOpenAuth: () => void;
  onOpenProfile: (profileId: string) => void;
  onOpenSpecies: (speciesId: string) => void;
}

export function SightingCard({
  sighting,
  userId,
  onLike,
  onSave,
  onComment,
  onDelete,
  onOpenAuth,
  onOpenProfile,
  onOpenSpecies,
}: SightingCardProps) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  const liked = Boolean(userId && sighting.likes.some((like) => like.user_id === userId));
  const saved = Boolean(
    userId && sighting.saved_sightings?.some((item) => item.user_id === userId),
  );
  const ownPost = Boolean(userId && sighting.user_id === userId);
  const species = sightingCatalogBird(sighting);
  const profile = sighting.profiles;

  async function guarded(action: () => Promise<void>) {
    if (!userId) {
      onOpenAuth();
      return;
    }
    setBusy(true);
    try {
      await action();
    } catch (error) {
      addToast(error instanceof Error ? error.message : "No se pudo completar.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}${window.location.pathname}#sighting-${sighting.id}`;
    const title = species
      ? `${species.common_name} en Compartero`
      : "Avistamiento en Compartero";

    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    addToast("Enlace copiado.", "success");
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await guarded(async () => {
      await onComment(sighting.id, comment);
      setComment("");
      setCommentOpen(true);
    });
  }

  return (
    <article className="sighting-card" id={`sighting-${sighting.id}`}>
      <div className="sighting-media">
        <img src={sighting.photo_url} alt={species?.common_name ?? "Avistamiento"} loading="lazy" />
      </div>

      <div className="sighting-body">
        <div className="sighting-author">
          <button
            className="author-button"
            type="button"
            onClick={() => profile && onOpenProfile(profile.id)}
          >
            <Avatar profile={profile} size="sm" />
            <span>
              <strong>{displayName(profile)}</strong>
              {profile?.country && <small>{profile.country}</small>}
            </span>
          </button>
          {ownPost && (
            <button
              className="icon-button icon-button--small danger"
              type="button"
              onClick={() => guarded(() => onDelete(sighting))}
              disabled={busy}
              aria-label="Borrar publicacion"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {species ? (
          <button
            className="species-link"
            type="button"
            onClick={() => onOpenSpecies(catalogBirdKey(species))}
          >
            <span>{species.common_name}</span>
            <em>{species.scientific_name}</em>
          </button>
        ) : (
          <div className="species-link species-link--missing">
            <span>Especie no disponible</span>
            <em>Registro incompleto</em>
          </div>
        )}

        <div className="sighting-meta">
          <span>
            <MapPin size={14} />
            {sighting.location_name}
          </span>
          <span>
            <Calendar size={14} />
            {formatDate(sighting.observed_at)}
          </span>
        </div>

        {species && (
          <div className="source-row">
            <span>
              {species.conservation_status
                ? conservationLabel(species.conservation_status)
                : species.catalog === "birds"
                  ? "Catalogo oficial"
                  : "Especie verificada"}
            </span>
            <a href={species.source_url} target="_blank" rel="noreferrer">
              {species.source}
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {sighting.notes && <p className="sighting-note">{sighting.notes}</p>}

        <div className="card-actions">
          <button
            className={liked ? "metric-button is-active" : "metric-button"}
            type="button"
            onClick={() => guarded(() => onLike(sighting.id))}
            disabled={busy}
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} />
            {sighting.likes.length}
          </button>
          <button
            className="metric-button"
            type="button"
            onClick={() => setCommentOpen((value) => !value)}
          >
            <MessageCircle size={16} />
            {sighting.comments.length}
          </button>
          <button
            className={saved ? "metric-button is-active" : "metric-button"}
            type="button"
            onClick={() => guarded(() => onSave(sighting.id))}
            disabled={busy}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
          <button className="metric-button" type="button" onClick={handleShare}>
            <Share2 size={16} />
          </button>
        </div>

        {commentOpen && (
          <div className="comment-panel">
            {sighting.comments.length > 0 ? (
              <div className="comment-list">
                {sighting.comments.map((item) => (
                  <div className="comment-item" key={item.id}>
                    <Avatar profile={item.profiles} size="sm" />
                    <div>
                      <strong>{displayName(item.profiles)}</strong>
                      <p>{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">No hay comentarios todavia.</p>
            )}

            <form className="comment-form" onSubmit={submitComment}>
              <input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Escribe un comentario real"
                maxLength={1000}
              />
              <button className="icon-button" type="submit" disabled={busy || !comment.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
