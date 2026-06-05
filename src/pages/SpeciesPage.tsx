import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, DatabaseZap, ExternalLink, Plus, Search } from "lucide-react";
import { EmptyState } from "../components/shared/EmptyState";
import { SkeletonCards } from "../components/shared/Skeleton";
import type { ConservationStatus } from "../types/database";
import type { CatalogBird, CatalogSource, FeedSighting } from "../types/models";
import { catalogBirdKey, sightingCatalogKey } from "../utils/birds";
import { conservationLabel, formatDate } from "../utils/format";
import { useToast } from "../hooks/useToast";

interface SpeciesPageProps {
  configured: boolean;
  loading: boolean;
  species: CatalogBird[];
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

type SourceFilter = "all" | CatalogSource;

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
  const [country, setCountry] = useState("");
  const [habitat, setHabitat] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [pageSize, setPageSize] = useState<20 | 50>(20);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const families = useMemo(
    () =>
      Array.from(new Set(species.map((item) => item.family).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [species],
  );

  const sightingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    sightings.forEach((sighting) => {
      const key = sightingCatalogKey(sighting);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [sightings]);

  const filtered = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();
    const cleanCountry = country.toLowerCase().trim();
    const cleanHabitat = habitat.toLowerCase().trim();

    return species.filter((item) => {
      const searchableName = [
        item.common_name,
        item.scientific_name,
        item.family,
        item.taxonomic_order,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const searchableCountry = [item.country_text, item.range_text]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const searchableHabitat = (item.habitat ?? "").toLowerCase();

      const matchesQuery = !cleanQuery || searchableName.includes(cleanQuery);
      const matchesFamily = family === "all" || item.family === family;
      const matchesCountry = !cleanCountry || searchableCountry.includes(cleanCountry);
      const matchesHabitat = !cleanHabitat || searchableHabitat.includes(cleanHabitat);
      const matchesSource = sourceFilter === "all" || item.catalog === sourceFilter;

      return matchesQuery && matchesFamily && matchesCountry && matchesHabitat && matchesSource;
    });
  }, [country, family, habitat, query, sourceFilter, species]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [country, family, habitat, pageSize, query, sourceFilter]);

  const selectedSpecies =
    species.find(
      (item) => catalogBirdKey(item) === selectedSpeciesId || item.id === selectedSpeciesId,
    ) ??
    pageItems[0] ??
    filtered[0] ??
    null;

  const selectedKey = selectedSpecies ? catalogBirdKey(selectedSpecies) : null;
  const selectedSightings = selectedKey
    ? sightings.filter((sighting) => sightingCatalogKey(sighting) === selectedKey)
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
        message="El catalogo oficial se lee desde la tabla birds y los avistamientos se leen desde sightings."
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="section-heading split-heading">
        <div>
          <span className="eyebrow">Base oficial separada</span>
          <h1>Aves</h1>
          <p>Especies como informacion fija; avistamientos como contenido real de usuarios.</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => setFormOpen(true)}>
          <Plus size={16} />
          Sugerir especie
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
          Buscar
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre comun, cientifico u orden"
          />
        </label>
        <label>
          Familia
          <select value={family} onChange={(event) => setFamily(event.target.value)}>
            <option value="all">Todas las familias</option>
            {families.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pais o rango
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Uruguay, Argentina, costa..."
          />
        </label>
        <label>
          Habitat
          <input
            value={habitat}
            onChange={(event) => setHabitat(event.target.value)}
            placeholder="bosque, humedal, pradera..."
          />
        </label>
        <label>
          Origen
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
          >
            <option value="all">Todo el catalogo</option>
            <option value="birds">Oficial</option>
            <option value="bird_species">Verificadas manuales</option>
          </select>
        </label>
      </section>

      {loading && <SkeletonCards count={6} />}

      {!loading && species.length === 0 && (
        <EmptyState
          icon={Search}
          title="No hay datos disponibles todavia"
          message="Importa el CSV oficial en birds para activar busqueda, filtros, fichas y publicaciones."
          actionLabel="Sugerir especie"
          onAction={() => setFormOpen(true)}
        />
      )}

      {!loading && species.length > 0 && (
        <>
          <section className="catalog-toolbar" aria-label="Paginacion del catalogo">
            <span>
              {filtered.length} especies encontradas de {species.length}
            </span>
            <label>
              Por pagina
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value) as 20 | 50)}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <div className="pagination-controls">
              <button
                className="icon-button"
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage <= 1}
                aria-label="Pagina anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <strong>
                {currentPage} / {pageCount}
              </strong>
              <button
                className="icon-button"
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={currentPage >= pageCount}
                aria-label="Pagina siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </section>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados para esos filtros"
              message="Prueba con otro nombre, familia, pais o habitat."
            />
          ) : (
            <div className="species-layout">
              <div className="species-list">
                {pageItems.map((item) => {
                  const key = catalogBirdKey(item);
                  const count = sightingCounts.get(key) ?? 0;
                  return (
                    <button
                      className={selectedKey === key ? "species-row is-active" : "species-row"}
                      type="button"
                      key={key}
                      onClick={() => onSelectSpecies(key)}
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
                      <span className="status-badge">
                        {selectedSpecies.catalog === "birds" ? "Oficial" : "Verificada"}
                      </span>
                      <h2>{selectedSpecies.common_name}</h2>
                      <p>{selectedSpecies.scientific_name}</p>
                    </div>
                    <dl className="detail-list">
                      <div>
                        <dt>Familia</dt>
                        <dd>{selectedSpecies.family}</dd>
                      </div>
                      <div>
                        <dt>Orden</dt>
                        <dd>{selectedSpecies.taxonomic_order || "Sin orden cargado"}</dd>
                      </div>
                      <div>
                        <dt>Pais / rango</dt>
                        <dd>{selectedSpecies.country_text || "Rango global"}</dd>
                      </div>
                      <div>
                        <dt>Habitat</dt>
                        <dd>{selectedSpecies.habitat || "Sin habitat cargado"}</dd>
                      </div>
                      {selectedSpecies.conservation_status && (
                        <div>
                          <dt>Estado</dt>
                          <dd>{conservationLabel(selectedSpecies.conservation_status)}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Fuente</dt>
                        <dd>
                          <a href={selectedSpecies.source_url} target="_blank" rel="noreferrer">
                            {selectedSpecies.source}
                            <ExternalLink size={13} />
                          </a>
                        </dd>
                      </div>
                      <div className="wide-detail">
                        <dt>Distribucion oficial</dt>
                        <dd>{selectedSpecies.range_text || "Sin descripcion de distribucion"}</dd>
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
                            <img
                              src={sighting.photo_url}
                              alt={selectedSpecies.common_name}
                              loading="lazy"
                            />
                            <figcaption>{formatDate(sighting.observed_at)}</figcaption>
                          </figure>
                        ))
                      ) : (
                        <p className="muted-text">
                          No hay avistamientos publicados para esta especie.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="muted-text">Selecciona una especie.</p>
                )}
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
