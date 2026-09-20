import { useEffect, useState, useRef } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import SettingsModal from "./components/SettingsModal";
import { applyCompactMode, applyTheme, loadSettings } from "./lib/settings";
import { clearUserCache, clearAllCache, resetSessionRefetchState } from "./lib/cache";

type PageState = "landing" | "auth" | "dashboard";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<PageState>("landing");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isSignOutMenuOpen, setIsSignOutMenuOpen] = useState(false);
  const [isPillarPaused, setIsPillarPaused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthClosing, setIsAuthClosing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [isDashboardExiting, setIsDashboardExiting] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const navTimeoutRef = useRef<number | null>(null);
  const currentPageRef = useRef<PageState>("landing");

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Initialize compact buttons & theme state on mount
    const settings = loadSettings();
    applyCompactMode(settings.compactButtons);
    applyTheme(settings.theme);
  }, []);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Load last visited page from localStorage
    const lastPage = localStorage.getItem("lastPage") as PageState | null;

    // Timeout guard for Supabase auth initialization (e.g. 3.5s max)
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 3500)
    );

    Promise.race([sessionPromise, timeoutPromise])
      .then(({ data }) => {
        setSession(data?.session ?? null);

        // If user is logged in
        if (data?.session) {
          const pageToLoad = lastPage && lastPage !== "auth" ? lastPage : "dashboard";
          setCurrentPage(pageToLoad);
          localStorage.setItem("lastPage", pageToLoad);
        } else {
          setCurrentPage("landing");
          if (lastPage && lastPage !== "auth") {
            localStorage.setItem("lastPage", "landing");
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Supabase auth getSession error:", err);
        setCurrentPage("landing");
        setLoading(false);
      });

    // Listen for auth changes
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const response = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);

        if (newSession) {
          if (currentPageRef.current === "auth") {
            setIsAuthClosing(true);
            setTimeout(() => {
              setCurrentPage("dashboard");
              localStorage.setItem("lastPage", "dashboard");
              setIsAuthClosing(false);
            }, 260);
          } else {
            setCurrentPage("dashboard");
            localStorage.setItem("lastPage", "dashboard");
          }
        } else {
          clearAllCache();
          resetSessionRefetchState();
          setCurrentPage("landing");
          localStorage.setItem("lastPage", "landing");
          setIsSettingsOpen(false);
          setIsSignOutMenuOpen(false);
        }
      });
      authListener = response.data;
    } catch (err) {
      console.warn("Supabase onAuthStateChange error:", err);
    }

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleNavigateToPage = (page: PageState, mode?: "login" | "signup") => {
    setIsAuthClosing(false);
    if (navTimeoutRef.current) {
      clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = null;
    }

    if (currentPage === "landing" && page !== "landing") {
      // First pause the lightpillar animation, then transition to target page
      setIsPillarPaused(true);
      if (mode) setAuthMode(mode);

      navTimeoutRef.current = window.setTimeout(() => {
        setCurrentPage(page);
        localStorage.setItem("lastPage", page);
        setIsPillarPaused(false);
        navTimeoutRef.current = null;
      }, 150);
    } else if (currentPage === "dashboard" && page !== "dashboard") {
      // Smoothly animate bottom nav and dashboard out before switching
      setIsDashboardExiting(true);
      if (mode) setAuthMode(mode);

      navTimeoutRef.current = window.setTimeout(() => {
        setCurrentPage(page);
        localStorage.setItem("lastPage", page);
        setIsDashboardExiting(false);
        navTimeoutRef.current = null;
      }, 200);
    } else {
      setCurrentPage(page);
      if (mode) setAuthMode(mode);
      localStorage.setItem("lastPage", page);
    }
  };

  const handleLogoClick = () => {
    if (currentPage === "landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleNavigateToPage("landing");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleHomeClick = () => {
    if (currentPage === "landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleNavigateToPage("landing");
    }
  };

  const handleLogout = async () => {
    const currentUserId = session?.user?.id;

    // 1. Instantly reset app state so UI immediately navigates to landing
    setSession(null);
    setIsSettingsOpen(false);
    setIsSignOutMenuOpen(false);
    setCurrentPage("landing");
    localStorage.removeItem("lastPage");

    // 2. Synchronously wipe all Supabase auth storage items and all application caches
    try {
      if (currentUserId) {
        clearUserCache(currentUserId);
      }
      clearAllCache();
      resetSessionRefetchState();

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("sb-") ||
            key.includes("supabase.auth") ||
            key.startsWith("aiops_cache_"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage cleanup error on logout:", e);
    }

    // 3. Dispatch sign out to Supabase client & server with local scope guarantee (safely caught for offline)
    try {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      await supabase.auth.signOut().catch(() => {});
    } catch (err) {
      console.warn("Supabase signOut error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-slate-200">
        <p>Loading...</p>
      </div>
    );
  }

  const isModalOpen = (currentPage === "auth" && !isAuthClosing) || (isSettingsOpen && !isSettingsClosing);

  return (
    <div
      className={`relative min-h-screen flex flex-col text-white transition-[background-color] duration-700 ease-in-out ${
        !isOnline ? "bg-[#100303]" : "bg-black"
      }`}
    >
      {/* Offline Ambient Red Glow Overlay (mirrors navbar's red alert aura) */}
      <div
        className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 ease-in-out bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(239,68,68,0.18),rgba(153,27,27,0.08)_45%,transparent_75%)] ${
          !isOnline ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Fixed Header Layer - Permanently fixed to top of viewport */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div
          className={`w-full flex justify-center pointer-events-auto transition-all duration-300 ease-out ${
            isScrolled
              ? "max-w-full sm:max-w-[990px] px-0 sm:px-4 pt-0 sm:pt-4"
              : "max-w-[920px] px-4 pt-4 sm:px-6 sm:pt-6"
          }`}
        >
          <Navbar
            session={session}
            isScrolled={isScrolled}
            onAuthClick={(mode) => handleNavigateToPage("auth", mode)}
            onDashboardClick={() => {
              handleNavigateToPage("dashboard");
            }}
            onHomeClick={handleHomeClick}
            onLogoClick={handleLogoClick}
            onLogout={handleLogout}
            onMenuOpenChange={setIsSignOutMenuOpen}
            currentPage={currentPage === "dashboard" ? "dashboard" : "landing"}
          />
        </div>
      </header>

      {/* Underlying layout and page content */}
      <div
        key={session ? "auth-session" : "guest-session"}
        className={`flex-1 flex flex-col page-blur-transition z-10 ${
          isModalOpen ? "page-blurred" : "page-unblurred"
        }`}
      >
        <main
          className={`flex-1 flex flex-col transition-[background-color] duration-700 ease-in-out pb-6 pt-[94px] sm:pt-[110px] ${
            !isOnline ? "bg-red-950/20" : "bg-transparent"
          }`}
        >
          {/* Page Content Container */}
          <div
            className={`mx-auto w-full px-4 flex flex-col flex-1 gap-6 transition-all duration-300 ${currentPage === "dashboard"
                ? "max-w-[1700px] 2xl:max-w-[1800px] sm:px-6 lg:px-8 xl:px-10"
                : "max-w-[920px]"
              }`}
          >
            {currentPage === "dashboard" ? (
              <div
                key="dashboard-content"
                className={`flex flex-col flex-1 gap-6 animate-fade-swift page-blur-transition ${isSignOutMenuOpen ? "page-blurred" : "page-unblurred"
                  }`}
              >
                <Dashboard
                  onOpenSettings={() => {
                    setIsSettingsClosing(false);
                    setIsSettingsOpen(true);
                  }}
                  isSettingsOpen={isSettingsOpen}
                  isSignOutMenuOpen={isSignOutMenuOpen}
                  isModalOpen={isModalOpen}
                  isExiting={isDashboardExiting}
                  userEmail={session?.user?.email}
                />
              </div>
            ) : (
              <div
                key="landing-content"
                className={`flex flex-col flex-1 gap-6 animate-fade-swift page-blur-transition ${isSignOutMenuOpen ? "page-blurred" : "page-unblurred"
                  }`}
              >
                <Landing
                  session={session}
                  onAuthClick={(mode) => handleNavigateToPage("auth", mode)}
                  onDashboardClick={() => handleNavigateToPage("dashboard")}
                  paused={isSignOutMenuOpen || isModalOpen || isPillarPaused}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Auth card overlay floating above */}
      {currentPage === "auth" && (
        <Auth
          onNavigateHome={() => {
            setIsAuthClosing(false);
            handleNavigateToPage(session ? "dashboard" : "landing");
          }}
          onCloseStart={() => setIsAuthClosing(true)}
          isClosing={isAuthClosing}
          initialMode={authMode}
        />
      )}

      {/* Settings card overlay floating above */}
      {isSettingsOpen && (
        <SettingsModal
          userEmail={session?.user?.email}
          onClose={() => {
            setIsSettingsClosing(false);
            setIsSettingsOpen(false);
          }}
          onLogout={handleLogout}
          isClosing={isSettingsClosing}
        />
      )}
    </div>
  );
}
