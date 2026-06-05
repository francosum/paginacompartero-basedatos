import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types/models";
import { safeFileName } from "../utils/format";

interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
  country?: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const usernameFromUser = (authUser: User) => {
    const raw =
      String(authUser.user_metadata?.username ?? "") ||
      String(authUser.email?.split("@")[0] ?? "") ||
      `observador_${authUser.id.slice(0, 8)}`;

    const clean = raw
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase()
      .slice(0, 24);

    return clean.length >= 3 ? clean : `observador_${authUser.id.slice(0, 8)}`;
  };

  const profilePayloadFromUser = (authUser: User, withUniqueSuffix = false) => {
    const baseUsername = usernameFromUser(authUser);
    const suffix = authUser.id.slice(0, 6);
    const username = withUniqueSuffix
      ? `${baseUsername.slice(0, 25)}_${suffix}`
      : baseUsername;

    return {
      id: authUser.id,
      username,
      full_name:
        String(authUser.user_metadata?.full_name ?? "").trim() ||
        String(authUser.email?.split("@")[0] ?? "").trim() ||
        "Observador",
      country: String(authUser.user_metadata?.country ?? "").trim() || null,
    };
  };

  const ensureProfile = useCallback(async (authUser: User) => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      setProfile(data);
      return data;
    }

    const firstAttempt = await supabase
      .from("profiles")
      .insert(profilePayloadFromUser(authUser))
      .select("*")
      .single();

    if (!firstAttempt.error) {
      setProfile(firstAttempt.data);
      return firstAttempt.data;
    }

    const secondAttempt = await supabase
      .from("profiles")
      .insert(profilePayloadFromUser(authUser, true))
      .select("*")
      .single();

    if (secondAttempt.error) throw secondAttempt.error;
    setProfile(secondAttempt.data);
    return secondAttempt.data;
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    setProfile(data);
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [loadProfile, user]);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      try {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          await ensureProfile(data.session.user);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        window.setTimeout(() => void ensureProfile(nextSession.user), 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfile]);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    if (!supabase) throw new Error("Configura Supabase para activar usuarios reales.");

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          username: payload.username.toLowerCase(),
          country: payload.country,
        },
      },
    });

    if (error) throw error;
    if (data.session?.user) {
      await ensureProfile(data.session.user);
    }
  }, [ensureProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Configura Supabase para iniciar sesion.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      await ensureProfile(data.user);
    }
  }, [ensureProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error("Configura Supabase para recuperar contrasenas.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(
    async (payload: Partial<Profile>) => {
      if (!supabase || !user) {
        throw new Error("Inicia sesion para editar tu perfil.");
      }

      const allowedPayload = {
        username: payload.username?.trim().toLowerCase() || null,
        full_name: payload.full_name?.trim() || null,
        country: payload.country?.trim() || null,
        bio: payload.bio?.trim() || null,
        avatar_url: payload.avatar_url || profile?.avatar_url || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(allowedPayload)
        .eq("id", user.id);

      if (error) throw error;
      await loadProfile(user.id);
    },
    [loadProfile, profile?.avatar_url, user],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!supabase || !user) {
        throw new Error("Inicia sesion para subir un avatar.");
      }

      if (!file.type.startsWith("image/")) {
        throw new Error("El avatar debe ser una imagen.");
      }

      const path = `${user.id}/avatar-${Date.now()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ avatar_url: data.publicUrl });
      return data.publicUrl;
    },
    [updateProfile, user],
  );

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
      updateProfile,
      uploadAvatar,
    }),
    [
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
      updateProfile,
      uploadAvatar,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
