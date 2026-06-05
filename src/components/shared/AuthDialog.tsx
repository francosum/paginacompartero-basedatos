import { FormEvent, useState } from "react";
import { LogIn, Mail, UserPlus } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "login" | "register" | "reset";

function authMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "No se pudo completar la accion.";
  const lower = message.toLowerCase();

  if (lower.includes("email not confirmed")) {
    return "Tenes que confirmar tu correo antes de iniciar sesion. Revisa tu bandeja de entrada o spam.";
  }

  if (lower.includes("invalid login credentials")) {
    return "Correo o contrasena incorrectos.";
  }

  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "Ese correo ya esta registrado. Proba iniciar sesion.";
  }

  return message;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const { addToast } = useToast();

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      if (mode === "login") {
        await signIn(String(form.get("email")), String(form.get("password")));
        addToast("Sesion iniciada.", "success");
        onClose();
      }

      if (mode === "register") {
        await signUp({
          email: String(form.get("email")),
          password: String(form.get("password")),
          fullName: String(form.get("fullName")),
          username: String(form.get("username")),
          country: String(form.get("country") || ""),
        });
        addToast("Cuenta creada. Si Supabase exige confirmacion, revisa tu correo.", "success");
        onClose();
      }

      if (mode === "reset") {
        await resetPassword(String(form.get("email")));
        addToast("Te enviamos el enlace de recuperacion.", "success");
        setMode("login");
      }
    } catch (error) {
      addToast(authMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog-card">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className="dialog-heading">
          {mode === "login" && <LogIn size={22} />}
          {mode === "register" && <UserPlus size={22} />}
          {mode === "reset" && <Mail size={22} />}
          <div>
            <h2>
              {mode === "login" && "Ingresar"}
              {mode === "register" && "Crear cuenta"}
              {mode === "reset" && "Recuperar contrasena"}
            </h2>
            <p>Autenticacion real con Supabase Auth.</p>
          </div>
        </div>

        <div className="segmented-control">
          <button
            className={mode === "login" ? "is-active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            Ingresar
          </button>
          <button
            className={mode === "register" ? "is-active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            Registro
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label>
                Nombre publico
                <input name="fullName" required minLength={2} autoComplete="name" />
              </label>
              <label>
                Usuario
                <input
                  name="username"
                  required
                  minLength={3}
                  pattern="[a-zA-Z0-9_]+"
                  autoComplete="username"
                />
              </label>
              <label>
                Pais
                <input name="country" autoComplete="country-name" />
              </label>
            </>
          )}
          <label>
            Correo
            <input name="email" required type="email" autoComplete="email" />
          </label>
          {mode !== "reset" && (
            <label>
              Contrasena
              <input
                name="password"
                required
                type="password"
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
          )}
          <button className="button button--primary button--full" disabled={submitting}>
            {submitting ? "Procesando..." : mode === "reset" ? "Enviar enlace" : "Continuar"}
          </button>
        </form>

        <button
          className="text-button"
          type="button"
          onClick={() => setMode(mode === "reset" ? "login" : "reset")}
        >
          {mode === "reset" ? "Volver al login" : "Olvide mi contrasena"}
        </button>
      </div>
    </div>
  );
}
