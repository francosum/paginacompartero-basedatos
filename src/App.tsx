import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { AuthDialog } from "./components/shared/AuthDialog";
import { ConfigBanner } from "./components/shared/ConfigBanner";
import { useAuth } from "./hooks/useAuth";
import { useComparteroData } from "./hooks/useComparteroData";
import { useToast } from "./hooks/useToast";
import type { ViewName } from "./types/models";

const FeedPage = lazy(() => import("./pages/FeedPage").then((mod) => ({ default: mod.FeedPage })));
const PublishPage = lazy(() =>
  import("./pages/PublishPage").then((mod) => ({ default: mod.PublishPage })),
);
const SpeciesPage = lazy(() =>
  import("./pages/SpeciesPage").then((mod) => ({ default: mod.SpeciesPage })),
);
const MapPage = lazy(() => import("./pages/MapPage").then((mod) => ({ default: mod.MapPage })));
const RankingPage = lazy(() =>
  import("./pages/RankingPage").then((mod) => ({ default: mod.RankingPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((mod) => ({ default: mod.ProfilePage })),
);

export default function App() {
  const [view, setView] = useState<ViewName>("feed");
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("compartero-theme") === "dark");
  const auth = useAuth();
  const data = useComparteroData(auth.user?.id);
  const { addToast } = useToast();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("compartero-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const selectedProfile = useMemo(() => {
    if (!selectedProfileId) return auth.profile;
    return data.profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  }, [auth.profile, data.profiles, selectedProfileId]);

  async function handleSignOut() {
    try {
      await auth.signOut();
      addToast("Sesion cerrada.", "success");
      setView("feed");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "No se pudo cerrar sesion.", "error");
    }
  }

  function navigate(nextView: ViewName) {
    setView(nextView);
    if (nextView !== "profile") setSelectedProfileId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProfile(profileId: string) {
    setSelectedProfileId(profileId);
    setView("profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSpecies(speciesId: string) {
    setSelectedSpeciesId(speciesId);
    setView("species");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <Header
        activeView={view}
        profile={auth.profile}
        darkMode={darkMode}
        onNavigate={navigate}
        onOpenAuth={() => setAuthOpen(true)}
        onSignOut={handleSignOut}
        onToggleTheme={() => setDarkMode((value) => !value)}
      />

      <main className="app-shell">
        {!data.configured && <ConfigBanner />}
        {data.error && <div className="error-banner">{data.error}</div>}

        <Suspense fallback={<div className="page-loader">Cargando Compartero...</div>}>
          {view === "feed" && (
            <FeedPage
              authProfile={auth.profile}
              userId={auth.user?.id ?? null}
              stats={data.stats}
              configured={data.configured}
              loading={data.loading}
              sightings={data.sightings}
              onPublish={() => navigate("publish")}
              onOpenAuth={() => setAuthOpen(true)}
              onOpenProfile={openProfile}
              onOpenSpecies={openSpecies}
              onLike={data.toggleLike}
              onSave={data.toggleSave}
              onComment={data.addComment}
              onDelete={data.deleteSighting}
            />
          )}

          {view === "publish" && (
            <PublishPage
              user={auth.user}
              configured={data.configured}
              species={data.species}
              onOpenAuth={() => setAuthOpen(true)}
              onOpenSpeciesManager={() => navigate("species")}
              onCreateSighting={data.createSighting}
            />
          )}

          {view === "species" && (
            <SpeciesPage
              configured={data.configured}
              loading={data.loading}
              species={data.species}
              sightings={data.sightings}
              selectedSpeciesId={selectedSpeciesId}
              onSelectSpecies={setSelectedSpeciesId}
              onCreateSpecies={data.createSpecies}
            />
          )}

          {view === "map" && (
            <MapPage
              configured={data.configured}
              sightings={data.sightings}
              species={data.species}
              profiles={data.profiles}
              onOpenSpecies={openSpecies}
              onOpenProfile={openProfile}
            />
          )}

          {view === "ranking" && (
            <RankingPage
              configured={data.configured}
              loading={data.loading}
              ranking={data.ranking}
              onOpenProfile={openProfile}
              onOpenSpecies={openSpecies}
            />
          )}

          {view === "profile" && (
            <ProfilePage
              configured={data.configured}
              profile={selectedProfile}
              currentUserId={auth.user?.id ?? null}
              sightings={data.sightings}
              onOpenAuth={() => setAuthOpen(true)}
              onUpdateProfile={auth.updateProfile}
              onUploadAvatar={auth.uploadAvatar}
              onOpenSpecies={openSpecies}
            />
          )}
        </Suspense>
      </main>

      <Footer />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
