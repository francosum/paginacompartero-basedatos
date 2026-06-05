import { useState } from "react";
import {
  Compass,
  LogIn,
  LogOut,
  Map,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  Trophy,
  User,
  X,
} from "lucide-react";
import { Logo } from "../shared/Logo";
import { Avatar } from "../shared/Avatar";
import type { Profile, ViewName } from "../../types/models";
import { displayName } from "../../utils/format";

interface HeaderProps {
  activeView: ViewName;
  profile: Profile | null;
  darkMode: boolean;
  onNavigate: (view: ViewName) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
}

const navItems: Array<{ view: ViewName; label: string; icon: typeof Compass }> = [
  { view: "feed", label: "Feed", icon: Compass },
  { view: "publish", label: "Publicar", icon: Plus },
  { view: "species", label: "Especies", icon: Search },
  { view: "map", label: "Mapa", icon: Map },
  { view: "ranking", label: "Ranking", icon: Trophy },
];

export function Header({
  activeView,
  profile,
  darkMode,
  onNavigate,
  onOpenAuth,
  onSignOut,
  onToggleTheme,
}: HeaderProps) {
  const [open, setOpen] = useState(false);

  const goTo = (view: ViewName) => {
    onNavigate(view);
    setOpen(false);
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <button className="brand-button" onClick={() => goTo("feed")} type="button">
          <Logo />
        </button>

        <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.view ? "nav-pill is-active" : "nav-pill"}
                key={item.view}
                type="button"
                onClick={() => goTo(item.view)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            onClick={onToggleTheme}
            aria-label={darkMode ? "Usar modo claro" : "Usar modo oscuro"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {profile ? (
            <>
              <button
                className="profile-chip"
                type="button"
                onClick={() => goTo("profile")}
                title="Ver perfil"
              >
                <Avatar profile={profile} size="sm" />
                <span>{displayName(profile)}</span>
              </button>
              <button className="icon-button" type="button" onClick={onSignOut} aria-label="Salir">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="button button--primary" type="button" onClick={onOpenAuth}>
              <LogIn size={16} />
              Ingresar
            </button>
          )}

          <button
            className="icon-button mobile-menu-button"
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Cerrar menu" : "Abrir menu"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
