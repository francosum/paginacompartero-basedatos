import { Logo } from "../shared/Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Logo />
        <p>
          Datos reales desde Supabase. Las especies deben incluir fuente verificable y las
          publicaciones provienen de usuarios autenticados.
        </p>
        <span>Compartero © 2026</span>
      </div>
    </footer>
  );
}
