import type { Profile } from "../../types/models";
import { displayName, initialsFor } from "../../utils/format";

interface AvatarProps {
  profile?: Profile | null;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ profile, size = "md" }: AvatarProps) {
  return profile?.avatar_url ? (
    <img
      className={`avatar avatar--${size}`}
      src={profile.avatar_url}
      alt={displayName(profile)}
      loading="lazy"
    />
  ) : (
    <span className={`avatar avatar--${size}`} aria-label={displayName(profile)}>
      {initialsFor(profile)}
    </span>
  );
}
