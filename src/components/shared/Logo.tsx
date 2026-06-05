import { Bird } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo" aria-label="Compartero">
      <span className="logo-mark">
        <Bird size={compact ? 18 : 22} strokeWidth={2.2} />
      </span>
      {!compact && <span className="logo-text">Compartero</span>}
    </span>
  );
}
