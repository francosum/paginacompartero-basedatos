import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type BirdSpecies = Database["public"]["Tables"]["bird_species"]["Row"];
export type Sighting = Database["public"]["Tables"]["sightings"]["Row"];
export type Like = Database["public"]["Tables"]["likes"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type SavedSighting = Database["public"]["Tables"]["saved_sightings"]["Row"];

export type CommentWithProfile = Comment & {
  profiles: Profile | null;
};

export type FeedSighting = Sighting & {
  profiles: Profile | null;
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
