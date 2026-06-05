import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Camera, DatabaseZap, ImagePlus, Search } from "lucide-react";
import { EmptyState } from "../components/shared/EmptyState";
import type { BirdSpecies } from "../types/models";
import { useToast } from "../hooks/useToast";

interface PublishPageProps {
  user: User | null;
  configured: boolean;
  species: BirdSpecies[];
  onOpenAuth: () => void;
  onOpenSpeciesManager: () => void;
  onCreateSighting: (payload: {
    userId: string;
    speciesId: string;
    photo: File;
    locationName: string;
    observedAt: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => Promise<void>;
}

export function PublishPage({
  user,
  configured,
  species,
  onOpenAuth,
  onOpenSpeciesManager,
  onCreateSighting,
}: PublishPageProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [speciesQuery, setSpeciesQuery] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const filteredSpecies = useMemo(() => {
    const query = speciesQuery.toLowerCase().trim();
    if (!query) return species.slice(0, 40);
    return species
      .filter(
        (item) =>
          item.common_name.toLowerCase().includes(query) ||
          item.scientific_name.toLowerCase().includes(query),
      )
      .slice(0, 40);
  }, [species, speciesQuery]);

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      onOpenAuth();
      return;
    }

    if (!photo) {
      addToast("Selecciona una foto real.", "error");
      return;
    }

    const form = new FormData(event.currentTarget);
    const latitude = String(form.get("latitude") || "").trim();
    const longitude = String(form.get("longitude") || "").trim();

    setSubmitting(true);
    try {
      await onCreateSighting({
        userId: user.id,
        speciesId: selectedSpecies,
        photo,
        locationName: String(form.get("locationName")),
        observedAt: String(form.get("observedAt")),
        notes: String(form.get("notes") || ""),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      });

      addToast("Avistamiento publicado.", "success");
      event.currentTarget.reset();
      setPhoto(null);
      setPreview(null);
      setSelectedSpecies("");
      setSpeciesQuery("");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "No se pudo publicar.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <EmptyState
        icon={DatabaseZap}
        title="Configura Supabase para publicar"
        message="La publicacion requiere Auth, PostgreSQL y Storage. No se guardan avistamientos locales ni simulados."
      />
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={Camera}
        title="Inicia sesion para publicar"
        message="Solo usuarios reales pueden subir fotos y crear avistamientos."
        actionLabel="Ingresar"
        onAction={onOpenAuth}
      />
    );
  }

  if (species.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No hay especies verificadas todavia"
        message="Carga especies reales con fuente y URL antes de publicar avistamientos."
        actionLabel="Gestionar especies"
        onAction={onOpenSpeciesManager}
      />
    );
  }

  return (
    <div className="form-page">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Nuevo registro</span>
          <h1>Publicar avistamiento</h1>
          <p>La foto se sube a Supabase Storage y el registro queda asociado a tu usuario.</p>
        </div>
      </section>

      <form className="publish-form" onSubmit={handleSubmit}>
        <label className="upload-tile">
          {preview ? (
            <img src={preview} alt="Previsualizacion" />
          ) : (
            <span>
              <ImagePlus size={28} />
              Subir foto
            </span>
          )}
          <input type="file" accept="image/*" required onChange={handlePhoto} />
        </label>

        <div className="form-panel">
          <label>
            Buscar especie
            <input
              value={speciesQuery}
              onChange={(event) => setSpeciesQuery(event.target.value)}
              placeholder="Nombre comun o cientifico"
            />
          </label>
          <label>
            Especie
            <select
              required
              value={selectedSpecies}
              onChange={(event) => setSelectedSpecies(event.target.value)}
            >
              <option value="">Seleccionar especie verificada</option>
              {filteredSpecies.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.common_name} - {item.scientific_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ubicacion
            <input name="locationName" required minLength={2} placeholder="Reserva, ciudad, pais" />
          </label>
          <label>
            Fecha de observacion
            <input name="observedAt" required type="datetime-local" />
          </label>
          <div className="two-columns">
            <label>
              Latitud opcional
              <input name="latitude" type="number" min="-90" max="90" step="0.000001" />
            </label>
            <label>
              Longitud opcional
              <input name="longitude" type="number" min="-180" max="180" step="0.000001" />
            </label>
          </div>
          <label>
            Nota
            <textarea name="notes" maxLength={1000} rows={4} />
          </label>
          <button className="button button--primary button--full" disabled={submitting}>
            {submitting ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
