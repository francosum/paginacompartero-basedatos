import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DatabaseZap, MapPinned } from "lucide-react";
import { EmptyState } from "../components/shared/EmptyState";
import type { CatalogBird, FeedSighting, Profile } from "../types/models";
import { catalogBirdKey, sightingCatalogBird, sightingCatalogKey } from "../utils/birds";
import { displayName, formatDate } from "../utils/format";
import { optimizedStorageImageUrl } from "../utils/images";

interface MapPageProps {
  configured: boolean;
  sightings: FeedSighting[];
  species: CatalogBird[];
  profiles: Profile[];
  onOpenSpecies: (speciesId: string) => void;
  onOpenProfile: (profileId: string) => void;
}

export function MapPage({
  configured,
  sightings,
  species,
  profiles,
  onOpenSpecies,
  onOpenProfile,
}: MapPageProps) {
  const [speciesId, setSpeciesId] = useState("all");
  const [profileId, setProfileId] = useState("all");
  const [zone, setZone] = useState("");

  const mappedSightings = useMemo(() => {
    const zoneQuery = zone.toLowerCase().trim();
    return sightings.filter((item) => {
      const hasCoords = typeof item.latitude === "number" && typeof item.longitude === "number";
      const matchesSpecies = speciesId === "all" || sightingCatalogKey(item) === speciesId;
      const matchesProfile = profileId === "all" || item.user_id === profileId;
      const matchesZone =
        !zoneQuery ||
        item.location_name.toLowerCase().includes(zoneQuery) ||
        item.profiles?.country?.toLowerCase().includes(zoneQuery);
      return hasCoords && matchesSpecies && matchesProfile && matchesZone;
    });
  }, [profileId, sightings, speciesId, zone]);

  if (!configured) {
    return (
      <EmptyState
        icon={DatabaseZap}
        title="Configura Supabase para activar el mapa"
        message="El mapa solo muestra avistamientos reales con coordenadas guardadas."
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Atlas real</span>
          <h1>Mapa de avistamientos</h1>
          <p>Los marcadores se crean unicamente si el registro tiene latitud y longitud.</p>
        </div>
      </section>

      <section className="filters-bar">
        <select value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}>
          <option value="all">Todas las especies</option>
          {species.map((item) => (
            <option value={catalogBirdKey(item)} key={catalogBirdKey(item)}>
              {item.common_name}
            </option>
          ))}
        </select>
        <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
          <option value="all">Todos los usuarios</option>
          {profiles.map((item) => (
            <option value={item.id} key={item.id}>
              {displayName(item)}
            </option>
          ))}
        </select>
        <input
          value={zone}
          onChange={(event) => setZone(event.target.value)}
          placeholder="Filtrar por pais o zona"
        />
      </section>

      {mappedSightings.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No hay marcadores disponibles"
          message="Agrega coordenadas reales al publicar un avistamiento para verlo en el mapa."
        />
      ) : (
        <LeafletSightingsMap
          sightings={mappedSightings}
          onOpenProfile={onOpenProfile}
          onOpenSpecies={onOpenSpecies}
        />
      )}
    </div>
  );
}

function LeafletSightingsMap({
  sightings,
  onOpenProfile,
  onOpenSpecies,
}: {
  sightings: FeedSighting[];
  onOpenProfile: (profileId: string) => void;
  onOpenSpecies: (speciesId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        scrollWheelZoom: true,
        worldCopyJump: true,
      }).setView([0, 0], 2);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    const layer = L.layerGroup().addTo(map);
    const points: L.LatLngExpression[] = [];

    sightings.forEach((sighting) => {
      if (typeof sighting.latitude !== "number" || typeof sighting.longitude !== "number") return;
      const point: L.LatLngExpression = [sighting.latitude, sighting.longitude];
      points.push(point);

      const species = sightingCatalogBird(sighting);
      const profile = sighting.profiles;
      const popup = document.createElement("div");
      popup.className = "map-popup";

      const image = document.createElement("img");
      image.src = optimizedStorageImageUrl(sighting.photo_url, {
        width: 360,
        quality: 70,
        resize: "cover",
      });
      image.alt = species?.common_name ?? "Avistamiento";
      image.loading = "lazy";
      image.decoding = "async";

      const title = document.createElement("strong");
      title.textContent = species?.common_name ?? "Especie no disponible";

      const scientific = document.createElement("span");
      scientific.textContent = species?.scientific_name ?? "";

      const meta = document.createElement("p");
      meta.textContent = `${sighting.location_name} · ${formatDate(sighting.observed_at)}`;

      const actions = document.createElement("div");
      actions.className = "map-popup-actions";

      const profileButton = document.createElement("button");
      profileButton.type = "button";
      profileButton.textContent = "Perfil";
      profileButton.addEventListener("click", () => {
        if (profile?.id) onOpenProfile(profile.id);
      });

      const speciesButton = document.createElement("button");
      speciesButton.type = "button";
      speciesButton.textContent = "Especie";
      speciesButton.addEventListener("click", () => {
        if (species) onOpenSpecies(catalogBirdKey(species));
      });

      actions.append(profileButton, speciesButton);
      popup.append(image, title, scientific, meta, actions);

      L.circleMarker(point, {
        radius: 9,
        color: "#143d2a",
        weight: 2,
        fillColor: "#d66b3d",
        fillOpacity: 0.88,
      })
        .bindPopup(popup)
        .addTo(layer);
    });

    if (points.length === 1) {
      map.setView(points[0], 8);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 8 });
    }

    return () => {
      layer.remove();
    };
  }, [onOpenProfile, onOpenSpecies, sightings]);

  return <div className="map-canvas" ref={containerRef} />;
}
