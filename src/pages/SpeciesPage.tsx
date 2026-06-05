import { FormEvent, useMemo, useState } from "react";
import { DatabaseZap, ExternalLink, Plus, Search } from "lucide-react";
import { EmptyState } from "../components/shared/EmptyState";
import { SkeletonCards } from "../components/shared/Skeleton";
import type { ConservationStatus } from "../types/database";
import type { BirdSpecies, FeedSighting } from "../types/models";
import { conservationLabel, formatDate } from "../utils/format";
import { useToast } from "../hooks/useToast";

interface SpeciesPageProps {
  configured: boolean;
  loading: boolean;
  species: BirdSpecies[];
  sightings: FeedSighting[];
  selectedSpeciesId: string | null;
  onSelectSpecies: (speciesId: string | null) => void;
  onCreateSpecies: (payload: {
    common_name: string;
    scientific_name: string;
    family: string;
    conservation_status: ConservationStatus;
    source: string;
    source_url: string;
  }) => Promise<void>;
}

const statuses: ConservationStatus[] = ["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD", "NE"];

export function SpeciesPage({
  configured,
  loading,
  species,
  sightings,
  selectedSpeciesId,
  onSelectSpecies,
  onCreateSpecies,
}: SpeciesPageProps) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const families = useMemo(
    () => Array.from(new Set(species.map((item) => item.family))).sort(),
    [species],
  );

  const filtered = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();
    return species.filter((item) => {
      const matchesQuery =
        !cleanQuery ||
        item.common_name.toLowerCase().includes(cleanQuery) ||
        item.scientific_name.toLowerCase().includes(cleanQuery);
      const matchesFamily = family === "all" || item.family === family;
      const matchesStatus = status === "all" || item.conservation_status === status;
      return matchesQuery && matchesFamily && matchesStatus;
    });
  }, [family, query, species, status]);

  const selectedSpecies =
    species.find((item) => item.id === selectedSpeciesId) ?? filtered[0] ?? null;

  const selectedSightings = selectedSpecies
    ? sightings.filter((sighting) => sighting.species_id === selectedSpecies.id)
    : [];

  async function handleCreateSpecies(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      await onCreateSpecies({
        common_name: String(form.get("common_name")),
        scientific_name: String(form.get("scientific_name")),
        family: String(form.get("family")),
        conservation_status: String(form.get("conservation_status")) as ConservationStatus,
        source: String(form.get("source")),
        source_url: String(form.get("source_url")),
      });
      addToast("Especie verificada creada.", "success");
      event.currentTarget.reset();
      setFormOpen(false);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "No se pudo crear la especie.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <EmptyState
        icon={DatabaseZap}
        title="Configura Supabase para activar especies"
        message="El catalogo no muestra datos locales. Las especies se leen desde la tabla bird_species."
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="section-heading split-heading">
        <div>
          <span className="eyebrow">Base verificable</span>
          <h1>Especies</h1>
          <p>Sin descripciones inventadas: cada ficha muestra solo campos con fuente.</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => setFormOpen(true)}>
          <Plus size={16} />
          Registrar especie
        </button>
      </section>

      {formOpen && (
        <section className="inline-panel">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Fuente requerida</span>
              <h2>Nueva especie verificada</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleCreateSpecies}>
            <label>
              Nombre comun
              <input name="common_name" required />
            </label>
            <label>
              Nombre cientifico
              <input name="scientific_name" required />
            </label>
            <label>
              Familia
              <input name="family" required />
            </label>
            <label>
              Estado
              <select name="conservation_status" required defaultValue="NE">
                {statuses.map((item) => (
                  <option value={item} key={item}>
                    {item} - {conservationLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fuente
              <input name="source" required placeholder="IUCN, IOC, eBird, fuente oficial" />
            </label>
            <label>
              URL de fuente
              <input name="source_url" required type="url" placeholder="https://..." />
            </label>
            <div className="form-actions">
              <button className="button button--secondary" type="button" onClick={() => setFormOpen(false)}>
                Cancelar
              </button>
              <button className="button button--primary" disabled={submitting}>
                {submitting ? "Guardando..." : "Guardar especie"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="filters-bar">
        <label className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre comun o cientifico"
          />
        </label>
        <select value={family} onChange={(event) => setFamily(event.target.value)}>
          <option value="all">Todas las familias</option>
          {families.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Todos los estados</option>
          {statuses.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
      </section>

      {loading && <SkeletonCards count={6} />}

      {!loading && species.length === 0 && (
        <EmptyState
          icon={Search}
          title="No hay datos disponibles todavia"
          message="Agrega especies reales con fuente verificable para activar busqueda, fichas y publicaciones."
          actionLabel="Registrar especie"
          onAction={() => setFormOpen(true)}
        />
      )}

      {!loading && species.length > 0 && (
        <div className="species-layout">
          <div className="species-list">
            {filtered.map((item) => {
              const count = sightings.filter((sighting) => sighting.species_id === item.id).length;
              return (
                <button
                  className={selectedSpecies?.id === item.id ? "species-row is-active" : "species-row"}
                  type="button"
                  key={item.id}
                  onClick={() => onSelectSpecies(item.id)}
                >
                  <span>
                    <strong>{item.common_name}</strong>
                    <em>{item.scientific_name}</em>
                  </span>
                  <small>{count}</small>
                </button>
              );
            })}
          </div>

          <aside className="detail-panel">
            {selectedSpecies ? (
              <>
                <div className="detail-heading">
                  <span className="status-badge">{selectedSpecies.conservation_status}</span>
                  <h2>{selectedSpecies.common_name}</h2>
                  <p>{selectedSpecies.scientific_name}</p>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Familia</dt>
                    <dd>{selectedSpecies.family}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{conservationLabel(selectedSpecies.conservation_status)}</dd>
                  </div>
                  <div>
                    <dt>Fuente</dt>
                    <dd>
                      <a href={selectedSpecies.source_url} target="_blank" rel="noreferrer">
                        {selectedSpecies.source}
                        <ExternalLink size={13} />
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Avistamientos reales</dt>
                    <dd>{selectedSightings.length}</dd>
                  </div>
                </dl>
                <div className="mini-gallery">
                  {selectedSightings.length > 0 ? (
                    selectedSightings.slice(0, 6).map((sighting) => (
                      <figure key={sighting.id}>
                        <img src={sighting.photo_url} alt={selectedSpecies.common_name} loading="lazy" />
                        <figcaption>{formatDate(sighting.observed_at)}</figcaption>
                      </figure>
                    ))
                  ) : (
                    <p className="muted-text">No hay avistamientos publicados para esta especie.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="muted-text">Selecciona una especie.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
