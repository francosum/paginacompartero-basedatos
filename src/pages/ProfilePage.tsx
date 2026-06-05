import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { CalendarDays, DatabaseZap, Image, UserRound } from "lucide-react";
import { EmptyState } from "../components/shared/EmptyState";
import { Avatar } from "../components/shared/Avatar";
import type { FeedSighting, Profile } from "../types/models";
import { displayName, formatDate } from "../utils/format";
import { useToast } from "../hooks/useToast";

interface ProfilePageProps {
  configured: boolean;
  profile: Profile | null;
  currentUserId: string | null;
  sightings: FeedSighting[];
  onOpenAuth: () => void;
  onUpdateProfile: (payload: Partial<Profile>) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<string>;
  onOpenSpecies: (speciesId: string) => void;
}

export function ProfilePage({
  configured,
  profile,
  currentUserId,
  sightings,
  onOpenAuth,
  onUpdateProfile,
  onUploadAvatar,
  onOpenSpecies,
}: ProfilePageProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const userSightings = useMemo(
    () => (profile ? sightings.filter((sighting) => sighting.user_id === profile.id) : []),
    [profile, sightings],
  );

  const speciesObserved = useMemo(() => {
    const map = new Map<string, FeedSighting>();
    userSightings.forEach((sighting) => {
      if (!map.has(sighting.species_id)) map.set(sighting.species_id, sighting);
    });
    return Array.from(map.values());
  }, [userSightings]);

  const canEdit = Boolean(profile && currentUserId === profile.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);

    try {
      await onUpdateProfile({
        full_name: String(form.get("full_name") || ""),
        username: String(form.get("username") || ""),
        country: String(form.get("country") || ""),
        bio: String(form.get("bio") || ""),
      });
      addToast("Perfil actualizado.", "success");
      setEditing(false);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "No se pudo actualizar.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      await onUploadAvatar(file);
      addToast("Avatar actualizado.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "No se pudo subir el avatar.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!configured) {
    return (
      <EmptyState
        icon={DatabaseZap}
        title="Configura Supabase para activar perfiles"
        message="Los perfiles reales viven en la tabla profiles y se vinculan a Supabase Auth."
      />
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={UserRound}
        title="Perfil no disponible"
        message="Inicia sesion o abre un perfil de usuario real desde el feed."
        actionLabel="Ingresar"
        onAction={onOpenAuth}
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="profile-hero">
        <div className="profile-avatar-wrap">
          <Avatar profile={profile} size="lg" />
          {canEdit && (
            <label className="avatar-upload">
              <Image size={15} />
              <input type="file" accept="image/*" onChange={handleAvatar} disabled={saving} />
            </label>
          )}
        </div>
        <div>
          <span className="eyebrow">Perfil publico</span>
          <h1>{displayName(profile)}</h1>
          <p>{profile.bio || "Sin biografia todavia."}</p>
          <div className="profile-meta">
            {profile.country && <span>{profile.country}</span>}
            <span>
              <CalendarDays size={14} />
              Desde {formatDate(profile.created_at)}
            </span>
          </div>
        </div>
        {canEdit && (
          <button className="button button--secondary" type="button" onClick={() => setEditing(true)}>
            Editar perfil
          </button>
        )}
      </section>

      {editing && (
        <section className="inline-panel">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Nombre
              <input name="full_name" defaultValue={profile.full_name ?? ""} />
            </label>
            <label>
              Usuario
              <input name="username" defaultValue={profile.username ?? ""} pattern="[a-zA-Z0-9_]+" />
            </label>
            <label>
              Pais
              <input name="country" defaultValue={profile.country ?? ""} />
            </label>
            <label className="full-field">
              Bio
              <textarea name="bio" defaultValue={profile.bio ?? ""} maxLength={500} rows={4} />
            </label>
            <div className="form-actions">
              <button className="button button--secondary" type="button" onClick={() => setEditing(false)}>
                Cancelar
              </button>
              <button className="button button--primary" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="stats-grid">
        <div className="stat-card">
          <strong>{userSightings.length}</strong>
          <span>Avistamientos</span>
        </div>
        <div className="stat-card">
          <strong>{speciesObserved.length}</strong>
          <span>Especies observadas</span>
        </div>
        <div className="stat-card">
          <strong>{userSightings.filter((item) => item.likes.length > 0).length}</strong>
          <span>Fotos con likes</span>
        </div>
      </section>

      <section className="profile-grid">
        <div className="inline-panel">
          <h2>Fotos publicadas</h2>
          {userSightings.length === 0 ? (
            <p className="muted-text">No hay fotos publicadas todavia.</p>
          ) : (
            <div className="mini-gallery">
              {userSightings.map((sighting) => (
                <figure key={sighting.id}>
                  <img src={sighting.photo_url} alt={sighting.bird_species?.common_name ?? "Foto"} />
                  <figcaption>{sighting.bird_species?.common_name ?? "Especie no disponible"}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>

        <div className="inline-panel">
          <h2>Especies observadas</h2>
          {speciesObserved.length === 0 ? (
            <p className="muted-text">No hay especies observadas todavia.</p>
          ) : (
            <div className="species-chip-list">
              {speciesObserved.map((sighting) => (
                <button
                  className="species-chip"
                  key={sighting.species_id}
                  type="button"
                  onClick={() => onOpenSpecies(sighting.species_id)}
                >
                  {sighting.bird_species?.common_name ?? "Especie no disponible"}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
