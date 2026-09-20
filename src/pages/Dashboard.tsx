import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { fetchProjects, createProject, fetchIncidents, type Project, type Incident } from "../api/backend";
import { supabase } from "../lib/supabase";
import IncidentsList from "../components/IncidentsList";
import LeftRail, { type DashboardProject } from "../components/dashboard/LeftRail";
import RightRail, { type ActivityItem } from "../components/dashboard/RightRail";
import { getCachedData, setCachedData, markSessionRefetched } from "../lib/cache";
import { Check, Bolt, Sparkles, Eye, EyeOff, Copy, ShieldCheck, KeyRound, Loader2, Folder, PanelsTopLeft, Info } from "lucide-react";

export default function Dashboard({
  onOpenSettings,
  isSettingsOpen = false,
  isSignOutMenuOpen = false,
  isModalOpen = false,
  isExiting = false,
  userEmail: initialUserEmail,
}: {
  onOpenSettings?: () => void;
  isSettingsOpen?: boolean;
  isSignOutMenuOpen?: boolean;
  isModalOpen?: boolean;
  isExiting?: boolean;
  userEmail?: string;
} = {}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [projectName, setProjectName] = useState("");
  const [userEmail, setUserEmail] = useState<string>(initialUserEmail || "");
  const [isSyncing, setIsSyncing] = useState(true);
  const [isSyncFading, setIsSyncFading] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedProjectIdFilter, setSelectedProjectIdFilter] = useState<string | null>(null);
  const [showAllChip, setShowAllChip] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

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
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  // Helper to sort projects newest first (created_at descending)
  const sortProjectsNewestFirst = (list: Project[]): Project[] => {
    return [...list].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  };

  const [mobileSlide, setMobileSlide] = useState<number>(1);
  const createInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const watchdogTimerRef = useRef<number | null>(null);

  const addActivity = useCallback((act: ActivityItem) => {
    setActivities((prev) => [act, ...prev.slice(0, 8)]);
  }, []);

  // Fetch projects and incidents directly from backend API (per authenticated user) with offline caching
  const loadData = useCallback(async (forceRefresh = false, isSilent = false) => {
    // Abort previous in-flight sync if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setError(null);

      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      const userId = sessionUser?.id;
      const email = sessionUser?.email;
      if (email) setUserEmail(email);

      if (!data.session || !userId) {
        setError("User session not found. Please log in.");
        setIsSyncing(false);
        return;
      }

      // Store/refresh cached user details while session is active
      if (email) {
        setCachedData(userId, "user_profile", { id: userId, email });
      }

      // 1. Immediately read cached project details and incidents if present (Stale-While-Revalidate)
      const cachedProjects = getCachedData<Project[]>(userId, "projects");
      const cachedIncidents = getCachedData<Incident[]>(userId, "incidents");

      const hasUsableCache = Boolean(cachedProjects && cachedProjects.length > 0);

      if (cachedProjects && cachedProjects.length > 0) {
        const sortedCached = sortProjectsNewestFirst(cachedProjects);
        setProjects(sortedCached);
        setActiveProject((current) => {
          if (current) {
            const found = sortedCached.find((p) => p.id === current.id);
            if (found) return found;
          }
          return sortedCached[0];
        });
      }

      if (cachedIncidents) {
        setIncidents(cachedIncidents);
      }

      // If we have cached data, immediately dismiss the sync screen so the UI is 100% responsive
      if (hasUsableCache && !forceRefresh) {
        setIsSyncing(false);
        setIsSyncFading(false);
      } else if (!isSilent) {
        setIsSyncing(true);
        setIsSyncFading(false);
      }

      // Failsafe Watchdog: Ensure sync screen NEVER stays visible longer than 4.5s under any condition
      if (watchdogTimerRef.current) {
        window.clearTimeout(watchdogTimerRef.current);
      }
      watchdogTimerRef.current = window.setTimeout(() => {
        setIsSyncFading(true);
        setTimeout(() => {
          setIsSyncing(false);
          setIsSyncFading(false);
        }, 160);
      }, 4500);

      // 2. Fetch user-scoped projects and incidents from backend with timeout/signal protection
      try {
        const [fetchedProjects, fetchedIncidents] = await Promise.all([
          fetchProjects(controller.signal),
          fetchIncidents(controller.signal),
        ]);

        const sortedProjects = sortProjectsNewestFirst(fetchedProjects || []);
        setProjects(sortedProjects);

        if (sortedProjects && sortedProjects.length > 0) {
          setActiveProject((current) => {
            if (current) {
              const found = sortedProjects.find((p) => p.id === current.id);
              if (found) return found;
            }
            return sortedProjects[0];
          });
        } else {
          setActiveProject(null);
        }

        setIncidents(fetchedIncidents || []);

        // Store in isolated user cache for offline availability
        setCachedData(userId, "projects", sortedProjects || []);
        setCachedData(userId, "incidents", fetchedIncidents || []);
        markSessionRefetched();

        if (forceRefresh || !hasUsableCache) {
          addActivity({
            id: `act-${Date.now()}`,
            title: "Session Synchronized",
            subtitle: `Loaded ${sortedProjects.length} project(s) & ${fetchedIncidents?.length || 0} incident(s)`,
            time: "Just now",
            type: "health",
          });
        }
      } catch (networkErr: any) {
        // If aborted by a new request or visibility change, ignore gracefully
        if (controller.signal.aborted) return;

        console.warn("Backend fetch failed or timed out (using cache fallback):", networkErr);
        if (cachedProjects || cachedIncidents) {
          markSessionRefetched();
          addActivity({
            id: `act-${Date.now()}`,
            title: "Offline Cache Active",
            subtitle: `Displaying stored workspace & telemetry`,
            time: "Just now",
            type: "health",
          });
        } else {
          setError(networkErr.message || "Failed to load projects from backend API");
        }
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      console.error("Failed to load dashboard data:", err);
      setError(err.message || "Failed to load projects from backend API");
    } finally {
      if (watchdogTimerRef.current) {
        window.clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      // Smooth fade-out of sync screen
      setIsSyncFading(true);
      setTimeout(() => {
        setIsSyncing(false);
        setIsSyncFading(false);
      }, 160);
    }
  }, [addActivity]);

  useEffect(() => {
    loadData();

    // Lifecycle listener: when waking from RAM/background or returning to tab, perform a silent background re-sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadData(false, true);
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        loadData(false, true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (watchdogTimerRef.current) {
        window.clearTimeout(watchdogTimerRef.current);
      }
    };
  }, [loadData]);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError("Please enter a project name");
      return;
    }
    setCreatingProject(true);
    setError(null);
    try {
      const created = await createProject(projectName.trim());
      setProjects((prev) => {
        const next = sortProjectsNewestFirst([created, ...prev]);
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session?.user?.id) {
            setCachedData(data.session.user.id, "projects", next);
          }
        });
        return next;
      });
      setActiveProject(created);
      setSelectedProjectIdFilter(created.id);
      setShowAllChip(false);
      setProjectName("");

      addActivity({
        id: `act-${Date.now()}`,
        title: "Project Created",
        subtitle: `${created.name} registered with API credentials`,
        time: "Just now",
        type: "project",
      });
    } catch (e: any) {
      console.error("Project creation failed", e);
      setError(e?.message || "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  };

  const handleCopyApiKey = () => {
    if (activeProject?.api_key) {
      navigator.clipboard.writeText(activeProject.api_key);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleNewProjectClick = () => {
    setMobileSlide(1);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      createInputRef.current?.focus({ preventScroll: true });
    }, 100);
  };

  // Convert Project to DashboardProject with computed incident counts & status (sorted newest first)
  const sortedProjects = sortProjectsNewestFirst(projects);
  const dashboardProjects: DashboardProject[] = sortedProjects.map((p) => {
    const projectIncidents = incidents.filter((inc) => inc.project_id === p.id);
    const incCount = projectIncidents.length;
    const isDegraded = projectIncidents.some(
      (inc) => inc.status !== "resolved" && (inc.severity === "high" || inc.severity === "critical")
    );

    return {
      id: p.id,
      name: p.name,
      incidentCount: incCount,
      status: incCount === 0 ? "healthy" : isDegraded ? "degraded" : "active",
      api_key: p.api_key,
      created_at: p.created_at,
    };
  });

  // Calculate metrics
  const totalProjectsCount = projects.length;
  const activeIncidentsCount = incidents.filter((i) => i.status !== "resolved").length;
  const eventsTodayCount = incidents.length > 0
    ? incidents.reduce((sum, inc) => sum + (Number(inc.occurrence_count) || 1), 0)
    : null;
  const monitoredServicesCount = new Set(incidents.map((i) => i.service).filter(Boolean)).size;

  const maskedKey = activeProject?.api_key
    ? activeProject.api_key.slice(0, 4) + "•".repeat(Math.max(16, activeProject.api_key.length - 8)) + activeProject.api_key.slice(-4)
    : "••••••••••••••••••••••••••••••••";



  const scrollToTargetSection = (target: "incidents" | "activity") => {
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    const sectionId = target === "incidents" ? "live-incidents-section" : "recent-activity-section";

    const performScroll = () => {
      // Find all elements with this section ID
      const elements = Array.from(document.querySelectorAll<HTMLElement>(`[id="${sectionId}"]`));

      // Select the element that is actually inside the active visible layout
      let targetEl: HTMLElement | null = null;
      for (const el of elements) {
        const isInsideDesktop = !!el.closest(".desktop-layout-container");
        const isInsideMobile = !!el.closest(".mobile-layout-container");

        if (isDesktop && isInsideDesktop) {
          targetEl = el;
          break;
        } else if (!isDesktop && isInsideMobile) {
          targetEl = el;
          break;
        }
      }

      // Fallback: pick any visible element
      if (!targetEl) {
        targetEl = elements.find((el) => el.offsetParent !== null || el.getBoundingClientRect().height > 0) || elements[0] || null;
      }

      if (targetEl) {
        const navOffset = 90; // Fixed navbar clearance
        const elementRect = targetEl.getBoundingClientRect();
        const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = elementRect.top + currentScrollY - navOffset;

        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: "smooth",
        });
      }
    };

    if (isDesktop) {
      // On desktop, execute immediately
      performScroll();
    } else {
      // On mobile, switch to the proper slide first (1 = Workspace, 2 = System)
      const targetSlide = target === "incidents" ? 1 : 2;
      setMobileSlide(targetSlide);
      // Wait for slide translation animation to start and complete before settling scroll
      setTimeout(performScroll, 50);
      setTimeout(performScroll, 360);
    }
  };

  // Left Rail Component
  const renderLeftRail = () => (
    <LeftRail
      projects={dashboardProjects}
      activeProjectId={selectedProjectIdFilter}
      onSelectProject={(proj) => {
        const matched = projects.find((p) => p.id === proj.id) || null;
        setActiveProject(matched);
        setSelectedProjectIdFilter(proj.id);
        setShowAllChip(false);
        // On mobile, selecting a project takes you to the center view and scrolls to top!
        setMobileSlide(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
        addActivity({
          id: `act-${Date.now()}`,
          title: "Switched Context",
          subtitle: `Switched to project ${proj.name}`,
          time: "Just now",
          type: "project",
        });
      }}
      onNewProjectClick={handleNewProjectClick}
      onSelectQuickAccess={(key) => {
        if (key === "projects") {
          handleNewProjectClick();
        } else if (key === "incidents") {
          setSelectedProjectIdFilter(null);
          setShowAllChip(true);
          scrollToTargetSection("incidents");
        } else if (key === "activity") {
          scrollToTargetSection("activity");
        } else if (key === "settings") {
          onOpenSettings?.();
        }
      }}
      incidentCount={activeIncidentsCount}
      isSettingsOpen={isSettingsOpen}
    />
  );

  // Center Main Workspace Component
  const renderCenterStage = () => (
    <main className="w-full max-w-[920px] flex flex-col gap-6 shrink-1 min-w-0 animate-dashboard-fade">
      {/* Create Project Section */}
      <section className="w-full rounded-2xl overflow-hidden bg-black p-5 sm:p-8 border border-white/10">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-green-400/15 px-3 py-1.5 text-xs text-green-300 ring-1 ring-green-400/25">
            <Bolt className="h-3.5 w-3.5 text-green-400" />
            <span className="compact-hide">Project Setup</span>
          </span>

          {userEmail && (
            <span
              className="lg:hidden font-mono text-xs text-white/50 truncate max-w-[160px] sm:max-w-[240px]"
              title={userEmail}
            >
              {userEmail}
            </span>
          )}
        </div>

        <h2 className="mt-4 font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl">
          Create Project
        </h2>

        <p className="compact-hide mt-2.5 max-w-xl text-xs sm:text-sm leading-relaxed text-white/50">
          Spin up an isolated project to generate a secure write key and start streaming microservice logs into AI Ops.
        </p>

        {error && (
          <div className="mt-5 rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 create-project-form">
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">
            Project Name
          </label>
          <div className="create-input-container">
            <input
              ref={createInputRef}
              type="text"
              placeholder="e.g. Production Payment Gateway"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreateProject()}
              className="create-project-input rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm transition-colors placeholder:text-white/30 focus:border-green-400/50 focus:bg-white/10 focus:outline-none"
            />
            <button
              onClick={handleCreateProject}
              disabled={creatingProject}
              className="create-project-btn rounded-lg border border-green-300 bg-green-400 px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-green-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {creatingProject ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0" />
              )}
              <span className="compact-hide">
                {creatingProject ? "Creating..." : "Create"}
              </span>
            </button>
          </div>
        </div>

        {/* SENSITIVE API Key Card with MASKING and Security Notice */}
        {activeProject?.api_key && (
          <div
            key={activeProject.id}
            className="mt-6 rounded-xl border border-green-400/20 bg-green-400/[0.06] p-4 backdrop-blur-xl sm:p-6 animate-smooth-scale-up"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-wide text-green-300">
                <ShieldCheck className="h-4 w-4 text-green-400 shrink-0" />
                API Credentials
              </h3>
              <span className="flex items-center gap-1 rounded bg-green-400/10 px-2 py-0.5 font-mono text-[10px] uppercase text-green-300 border border-green-400/20">
                <KeyRound className="h-3 w-3" /> <span className="compact-hide">Encrypted</span>
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">
                Active Context
              </span>
              <span className="text-sm font-medium text-white font-mono">
                {activeProject.name}
              </span>
            </div>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">
                  API Write Key
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    title={showApiKey ? "Hide API key" : "Reveal API key"}
                  >
                    {showApiKey ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-white/60" /> <span className="compact-hide">Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 text-white/60" /> <span className="compact-hide">Reveal</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyApiKey}
                    className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    title="Copy API Key"
                  >
                    {copyFeedback ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" /> <span className="compact-hide">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-white/60" /> <span className="compact-hide">Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/60 p-2.5 font-mono text-xs text-green-400 tracking-wider">
                {showApiKey ? activeProject.api_key : maskedKey}
              </div>

              <p className="compact-hide mt-2 text-[11px] leading-relaxed text-white/40">
                Confidential write-only token. Never share your credential in public repositories.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Incidents Section */}
      <IncidentsList
        activeProject={activeProject}
        selectedProjectId={selectedProjectIdFilter}
        selectedProjectName={
          selectedProjectIdFilter
            ? projects.find((p) => p.id === selectedProjectIdFilter)?.name || activeProject?.name
            : null
        }
        onDeselectProject={() => {
          setSelectedProjectIdFilter(null);
          setShowAllChip(true);
        }}
        onActivityAdd={addActivity}
        showAllChip={showAllChip}
      />
    </main>
  );

  // Right Rail Component
  const renderRightRail = () => (
    <RightRail
      totalProjects={totalProjectsCount}
      activeIncidents={activeIncidentsCount}
      eventsToday={eventsTodayCount}
      monitoredServices={monitoredServicesCount}
      systemHealth={activeIncidentsCount > 0 ? "degraded" : "healthy"}
      activities={activities}
      hasActiveApiKey={Boolean(activeProject?.api_key || projects.some((p) => Boolean(p.api_key)))}
    />
  );

  return (
    <div className="w-full flex flex-col gap-6 animate-dashboard-fade">
      {isSyncing ? (
        <div
          key="sync-loading-screen"
          className={`w-full flex min-h-[450px] items-center justify-center transition-all duration-200 ease-out ${
            isSyncFading ? "opacity-0 scale-95 filter blur-xs" : "opacity-100 scale-100 filter blur-none"
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-green-400" />
            <p className="font-mono text-xs uppercase tracking-wider text-white/50">
              Synchronizing Projects
            </p>
          </div>
        </div>
      ) : (
        <div key="dashboard-main-content" className="w-full flex flex-col gap-6 animate-dashboard-fade">
          {/* 1. Desktop 3-Column Layout (Hidden on Mobile) */}
          <div className="hidden lg:flex desktop-layout-container w-full flex-row justify-center items-start gap-6 xl:gap-8 mx-auto">
            {/* Left Rail: Navigation / Project Context */}
            <aside className="w-[280px] xl:w-[310px] 2xl:w-[320px] shrink-0 sticky top-[106px] lg:top-[110px] space-y-4">
              {renderLeftRail()}
            </aside>

            {/* Center: Main Visual Focus */}
            {renderCenterStage()}

            {/* Right Rail: System Context & Monitoring */}
            <aside className="w-[280px] xl:w-[310px] 2xl:w-[320px] shrink-0 sticky top-[106px] lg:top-[110px] space-y-4">
              {renderRightRail()}
            </aside>
          </div>

          {/* 2. Mobile Full-Width Rail Carousel View (Hidden on Desktop) */}
          <div className="block lg:hidden mobile-layout-container w-full pb-28">
            {/* Carousel Track with Full-Width Translation Animation (Driven purely by buttons, swiping disabled) */}
            <div className="w-full min-w-0 max-w-full overflow-hidden">
              <div
                className="flex items-start w-full"
                style={{
                  transform: `translate3d(-${mobileSlide * 100}%, 0, 0)`,
                  transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Slide 0: Left Rail (Projects) */}
                <div className="w-full min-w-full shrink-0">
                  {renderLeftRail()}
                </div>

                {/* Slide 1: Center Stage (Workspace - Default on Mobile) */}
                <div className="w-full min-w-full shrink-0">
                  {renderCenterStage()}
                </div>

                {/* Slide 2: Right Rail (System) */}
                <div className="w-full min-w-full shrink-0">
                  {renderRightRail()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating Bottom Nav Overlay (Portaled directly to document.body for true viewport anchoring) */}
      {typeof document !== "undefined" &&
        (() => {
          const isBottomNavHidden = Boolean(!isMounted || isSyncing || isExiting || isSettingsOpen || isModalOpen || isSignOutMenuOpen);
          return createPortal(
            <nav
              id="bottom-nav"
              aria-label="Mobile stage navigation"
              className={`fixed bottom-5 sm:bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 lg:hidden transition-all duration-300 ease-out ${
                isBottomNavHidden
                  ? "opacity-0 translate-y-10 scale-95 pointer-events-none"
                  : "opacity-100 translate-y-0 scale-100"
              }`}
            >
              <div
                className={`pointer-events-auto backdrop-blur-2xl bottom-nav-blur border rounded-full p-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-700 ease-in-out ${
                  !isOnline
                    ? "bg-red-950/40 border-red-500/40 shadow-[0_4px_25px_rgba(239,68,68,0.2)]"
                    : "bg-black/60 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                } ${isSignOutMenuOpen ? "page-blurred" : "page-unblurred"}`}
              >
                <button
                  onClick={() => {
                    setMobileSlide(0);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                    mobileSlide === 0
                      ? "bg-green-400/20 text-green-300 border border-green-400/40 shadow-[0_0_12px_rgba(34,197,94,0.15)] font-bold"
                      : "text-white/40 hover:text-white/70 border border-transparent"
                  }`}
                >
                  <Folder className="h-3.5 w-3.5" />
                  <span className="compact-hide">Projects</span>
                </button>

                <button
                  onClick={() => {
                    setMobileSlide(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                    mobileSlide === 1
                      ? "bg-green-400/20 text-green-300 border border-green-400/40 shadow-[0_0_12px_rgba(34,197,94,0.15)] font-bold"
                      : "text-white/40 hover:text-white/70 border border-transparent"
                  }`}
                >
                  <PanelsTopLeft className="h-3.5 w-3.5" />
                  <span className="compact-hide">Workspace</span>
                </button>

                <button
                  onClick={() => {
                    setMobileSlide(2);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                    mobileSlide === 2
                      ? "bg-green-400/20 text-green-300 border border-green-400/40 shadow-[0_0_12px_rgba(34,197,94,0.15)] font-bold"
                      : "text-white/40 hover:text-white/70 border border-transparent"
                  }`}
                >
                  <Info className="h-3.5 w-3.5" />
                  <span className="compact-hide">System</span>
                </button>
              </div>
            </nav>,
            document.body
          );
        })()}

      {/* Footer */}
      {!isSyncing && (
        <footer className="mt-32 sm:mt-48 w-full py-8 text-center text-xs sm:text-sm text-white/40 border-t border-white/5">
          <p>&copy; 2026 AI Ops Copilot. End-to-end user isolation & bank-grade token encryption.</p>
        </footer>
      )}
    </div>
  );
}