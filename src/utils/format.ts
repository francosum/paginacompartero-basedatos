import type { Profile } from "../types/models";

export const displayName = (profile?: Profile | null) =>
  profile?.full_name?.trim() ||
  profile?.username?.trim() ||
  "Observador";

export const initialsFor = (profile?: Profile | null) => {
  const name = displayName(profile);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export const formatDate = (date?: string | null) => {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export const formatDateTime = (date?: string | null) => {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const sanitizeComment = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 1000);

export const safeFileName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);

export const conservationLabel = (status?: string | null) => {
  const labels: Record<string, string> = {
    LC: "Preocupacion menor",
    NT: "Casi amenazada",
    VU: "Vulnerable",
    EN: "En peligro",
    CR: "En peligro critico",
    EW: "Extinta en estado silvestre",
    EX: "Extinta",
    DD: "Datos insuficientes",
    NE: "No evaluada",
  };
  return status ? labels[status] ?? status : "Sin estado";
};

export const numberOrDash = (value?: number | null) =>
  typeof value === "number" ? value.toLocaleString("es-UY") : "0";
