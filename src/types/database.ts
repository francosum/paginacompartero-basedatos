export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ConservationStatus =
  | "LC"
  | "NT"
  | "VU"
  | "EN"
  | "CR"
  | "EW"
  | "EX"
  | "DD"
  | "NE";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          country: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          country?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          country?: string | null;
          bio?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bird_species: {
        Row: {
          id: string;
          common_name: string;
          scientific_name: string;
          family: string;
          conservation_status: ConservationStatus;
          source: string;
          source_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          common_name: string;
          scientific_name: string;
          family: string;
          conservation_status: ConservationStatus;
          source: string;
          source_url: string;
          created_at?: string;
        };
        Update: {
          common_name?: string;
          scientific_name?: string;
          family?: string;
          conservation_status?: ConservationStatus;
          source?: string;
          source_url?: string;
        };
        Relationships: [];
      };
      birds: {
        Row: {
          id: string;
          source_taxonomy: string;
          source_version: string;
          source_url: string;
          taxon_concept_id: string | null;
          species_code: string | null;
          sort_order: number | null;
          category: string;
          common_name: string;
          scientific_name: string;
          authority: string | null;
          taxonomic_order: string | null;
          family: string | null;
          country_text: string | null;
          range_text: string | null;
          habitat: string | null;
          image_url: string | null;
          image_attribution: string | null;
          image_source_url: string | null;
          is_extinct: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_taxonomy: string;
          source_version: string;
          source_url: string;
          taxon_concept_id?: string | null;
          species_code?: string | null;
          sort_order?: number | null;
          category?: string;
          common_name: string;
          scientific_name: string;
          authority?: string | null;
          taxonomic_order?: string | null;
          family?: string | null;
          country_text?: string | null;
          range_text?: string | null;
          habitat?: string | null;
          image_url?: string | null;
          image_attribution?: string | null;
          image_source_url?: string | null;
          is_extinct?: boolean;
          created_at?: string;
        };
        Update: {
          source_taxonomy?: string;
          source_version?: string;
          source_url?: string;
          taxon_concept_id?: string | null;
          species_code?: string | null;
          sort_order?: number | null;
          category?: string;
          common_name?: string;
          scientific_name?: string;
          authority?: string | null;
          taxonomic_order?: string | null;
          family?: string | null;
          country_text?: string | null;
          range_text?: string | null;
          habitat?: string | null;
          image_url?: string | null;
          image_attribution?: string | null;
          image_source_url?: string | null;
          is_extinct?: boolean;
        };
        Relationships: [];
      };
      sightings: {
        Row: {
          id: string;
          user_id: string;
          species_id: string | null;
          bird_id: string | null;
          photo_url: string;
          storage_path: string;
          location_name: string;
          latitude: number | null;
          longitude: number | null;
          notes: string | null;
          observed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          species_id?: string | null;
          bird_id?: string | null;
          photo_url: string;
          storage_path: string;
          location_name: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          observed_at: string;
          created_at?: string;
        };
        Update: {
          species_id?: string | null;
          bird_id?: string | null;
          photo_url?: string;
          storage_path?: string;
          location_name?: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          observed_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          sighting_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sighting_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          sighting_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sighting_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [];
      };
      saved_sightings: {
        Row: {
          id: string;
          user_id: string;
          sighting_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sighting_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      profile_public_stats: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          country: string | null;
          bio: string | null;
          created_at: string;
          sightings_count: number;
          species_count: number;
        };
        Relationships: [];
      };
      ranking_users_by_sightings: {
        Row: {
          user_id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          country: string | null;
          sightings_count: number;
        };
        Relationships: [];
      };
      ranking_users_by_species: {
        Row: {
          user_id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          country: string | null;
          species_count: number;
        };
        Relationships: [];
      };
      ranking_photos_by_likes: {
        Row: {
          sighting_id: string;
          photo_url: string;
          user_id: string;
          common_name: string;
          scientific_name: string;
          likes_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
