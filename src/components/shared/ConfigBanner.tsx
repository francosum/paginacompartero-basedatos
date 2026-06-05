import { DatabaseZap } from "lucide-react";

export function ConfigBanner() {
  return (
    <aside className="config-banner">
      <DatabaseZap size={20} />
      <div>
        <strong>Configura Supabase para activar datos reales.</strong>
        <span>
          Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env`, ejecuta la
          migracion SQL y crea los buckets de Storage.
        </span>
      </div>
    </aside>
  );
}
