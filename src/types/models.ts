import type { ConservationStatus, Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Bird = Database["public"]["Tables"]["birds"]["Row"];
export type BirdSpecies = Database["public"]["Tables"]["bird_species"]["Row"];
export type Sighting = Database["public"]["Tables"]["sightings"]["Row"];
export type Like = Database["public"]["Tables"]["likes"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type SavedSighting = Database["public"]["Tables"]["saved_sightings"]["Row"];

export type CatalogSource = "birds" | "bird_species";

export interface CatalogBird {
  id: string;
  catalog: CatalogSource;
  common_name: string;
  scientific_name: string;
  family: string;
  conservation_status?: ConservationStatus;
  source: string;
  source_url: string;
  source_taxonomy?: string | null;
  source_version?: string | null;
  taxonomic_order?: string | null;
  country_text?: string | null;
  range_text?: string | null;
  habitat?: string | null;
  is_extinct?: boolean;
  created_at?: string;
}

export type CommentWithProfile = Comment & {
  profiles: Profile | null;
};

export type FeedSighting = Sighting & {
  profiles: Profile | null;
  birds: Bird | null;
  bird_species: BirdSpecies | null;
  likes: Like[];
  comments: CommentWithProfile[];
  saved_sightings?: SavedSighting[];
};

export interface PlatformStats {
  sightings: number;
  species: number;
  profiles: number;
}

export type ViewName =
  | "feed"
  | "publish"
  | "species"
  | "map"
  | "ranking"
  | "profile";
