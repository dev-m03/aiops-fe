import { useState } from "react";
import {
  RotateCcwClock,
  Radio,
  Settings,
  Plus,
  ShieldCheck,
  Layers,
} from "lucide-react";

export interface DashboardProject {
  id: string;
  name: string;
  incidentCount: number;
  status: "healthy" | "active" | "degraded";
  api_key?: string;
  created_at?: string;
}

interface LeftRailProps {
  projects: DashboardProject[];
  activeProjectId: string | null;
  onSelectProject: (project: DashboardProject) => void;
  onNewProjectClick: () => void;
  onSelectQuickAccess: (key: string) => void;
  incidentCount: number;
  isSettingsOpen?: boolean;
}

function AnimatedClock({
  className = "",
  strokeWidth = 1.5,
  isSpinning = false,
}: {
  className?: string;
  strokeWidth?: number;
  isSpinning?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${isSpinning ? "animate-spin-cw-once" : ""}`}
    >
      {/* Outer clock ring */}
      <circle cx="12" cy="12" r="10" />

      {/* Clock Hands (Dials) - rotates 360° clockwise on hover */}
      <g
        className="transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]"
        style={{ transformOrigin: "12px 12px" }}
      >
        {/* Hour Hand */}
        <line x1="12" y1="12" x2="16" y2="14" />
        {/* Minute Hand */}
        <line x1="12" y1="12" x2="12" y2="6.5" />
      </g>
    </svg>
  );
}

export default function LeftRail({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProjectClick,
  onSelectQuickAccess,
  incidentCount,
  isSettingsOpen = false,
}: LeftRailProps) {
  const [isSettingsSpinning, setIsSettingsSpinning] = useState(false);
  const [isActivitySpinning, setIsActivitySpinning] = useState(false);

  const isSettingsRotated = isSettingsOpen || isSettingsSpinning;

  const handleSettingsClick = () => {
    setIsSettingsSpinning(true);
    setTimeout(() => {
      setIsSettingsSpinning(false);
      onSelectQuickAccess("settings");
    }, 300);
  };

  const handleActivityClick = () => {
    setIsActivitySpinning(true);
    setTimeout(() => {
      setIsActivitySpinning(false);
      onSelectQuickAccess("activity");
    }, 550);
  };

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Recent Projects Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <RotateCcwClock className="h-4 w-4 text-green-400" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              Recent Projects
            </h3>
          </div>
          <button
            onClick={onNewProjectClick}
            className="lg:hidden inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-white/70 transition-colors hover:border-green-400/30 hover:bg-green-400/10 hover:text-green-300"
            title="Create new project"
          >
            <Plus className="h-3 w-3" />
            <span className="compact-hide">New</span>
          </button>
        </div>

        {/* Project List with scrollable affordance if > 5 projects */}
        <div
          key={`projects-list-${projects.length}`}
          className={`mt-3 flex flex-col gap-2 animate-smooth-scale-up ${
            projects.length > 5
              ? "max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20"
              : ""
          }`}
        >
          {projects.length === 0 ? (
            <p className="py-4 text-center font-mono text-xs text-white/40 animate-smooth-scale-up">
              No projects created yet
            </p>
          ) : (
            projects.map((proj) => {
              const isSelected = Boolean(activeProjectId && proj.id === activeProjectId);
              const isHealthy = proj.status === "healthy" || proj.incidentCount === 0;

              return (
                <button
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className={`group relative flex items-center justify-between rounded-xl border p-3.5 sm:p-3 text-left transition-all duration-200 shrink-0 animate-smooth-scale-up ${
                    isSelected
                      ? "border-green-400/40 bg-green-400/[0.08] shadow-[0_0_20px_rgba(34,197,94,0.08)]"
                      : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        isHealthy
                          ? "bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                          : "bg-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                      }`}
                    />
                    <div className="min-w-0">
                      <div
                        className={`font-mono text-sm sm:text-[13.5px] font-semibold truncate transition-colors ${
                          isSelected ? "text-green-300 font-bold" : "text-white group-hover:text-green-300"
                        }`}
                      >
                        {proj.name}
                      </div>
                      <div className="text-xs text-white/45 flex items-center gap-1.5 mt-0.5 font-mono">
                        <span>{isHealthy ? "Healthy" : "Active alerts"}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[11px] uppercase shrink-0 font-medium ${
                      proj.incidentCount > 0
                        ? "border border-red-400/30 bg-red-400/10 text-red-300"
                        : "border border-green-400/20 bg-green-400/10 text-green-300"
                    }`}
                  >
                    {proj.incidentCount} <span className="compact-hide">{proj.incidentCount === 1 ? "inc" : "incs"}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Access Navigation */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Layers className="h-4 w-4 text-green-400" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            Quick Access
          </h3>
        </div>

        {/* Mobile View: 3-Column Grid with Direct Icons & Text Below */}
        <nav className="mt-3.5 grid grid-cols-3 gap-2 lg:hidden">
          {/* Tile 1: All Incidents */}
          <button
            onClick={() => onSelectQuickAccess("incidents")}
            className="group flex flex-col items-center justify-center text-center transition-transform active:scale-95 py-2 rounded-xl hover:bg-white/[0.02]"
          >
            <div className="relative flex items-center justify-center">
              <Radio
                className="h-8 w-8 text-red-400 animate-pulse transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]"
                strokeWidth={1.5}
              />
              <span className="absolute -top-1 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-[5px] bg-[#1f1f1f] border border-white/20 text-white font-mono text-[11px] font-semibold flex items-center justify-center leading-none shadow-md">
                {incidentCount}
              </span>
            </div>
            <span className="mt-2 font-mono text-[11px] uppercase tracking-wide text-white/70 group-hover:text-white transition-colors">
              Incidents
            </span>
          </button>

          {/* Tile 2: Recent Activity */}
          <button
            onClick={handleActivityClick}
            className="group flex flex-col items-center justify-center text-center transition-transform active:scale-95 py-2 rounded-xl hover:bg-white/[0.02]"
          >
            <AnimatedClock
              className="h-8 w-8 text-green-400 opacity-70 group-hover:opacity-100 transition-opacity duration-200"
              strokeWidth={1.5}
              isSpinning={isActivitySpinning}
            />
            <span className="mt-2 font-mono text-[11px] uppercase tracking-wide text-white/70 group-hover:text-white transition-colors">
              Activity
            </span>
          </button>

          {/* Tile 3: Settings */}
          <button
            onClick={handleSettingsClick}
            className="group flex flex-col items-center justify-center text-center transition-transform active:scale-95 py-2 rounded-xl hover:bg-white/[0.02]"
          >
            <Settings
              className={`h-8 w-8 text-green-400 transition-all duration-300 ease-out ${
                isSettingsRotated
                  ? "rotate-90 opacity-100"
                  : "opacity-60 group-hover:opacity-100 group-hover:rotate-45"
              }`}
              strokeWidth={1.5}
            />
            <span className="mt-2 font-mono text-[11px] uppercase tracking-wide text-green-300 group-hover:text-green-200 transition-colors">
              Settings
            </span>
          </button>
        </nav>

        {/* Desktop View: Vertical List */}
        <nav className="mt-3 hidden lg:flex lg:flex-col lg:gap-1.5">
          <button
            onClick={() => onSelectQuickAccess("incidents")}
            className="group flex items-center justify-between rounded-lg px-3.5 py-2 text-xs font-mono uppercase font-medium text-white/70 hover:bg-white/5 hover:text-white border border-transparent transition-all"
          >
            <span className="flex items-center gap-2.5">
              <Radio className="h-3.5 w-3.5 text-red-400 animate-pulse transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]" />
              All Incidents
            </span>
            <span className="min-w-[18px] h-[18px] px-1.5 rounded-[5px] bg-[#1f1f1f] border border-white/20 font-mono text-[10.5px] text-white font-medium flex items-center justify-center">
              {incidentCount}
            </span>
          </button>

          <button
            onClick={handleActivityClick}
            className="group flex items-center justify-between rounded-lg px-3.5 py-2 text-xs font-mono uppercase font-medium text-white/70 hover:bg-white/5 hover:text-white border border-transparent transition-all"
          >
            <span className="flex items-center gap-2.5">
              <AnimatedClock
                className="h-3.5 w-3.5 text-green-400 opacity-70 group-hover:opacity-100 transition-opacity"
                strokeWidth={1.75}
                isSpinning={isActivitySpinning}
              />
              Recent Activity
            </span>
          </button>

          <button
            onClick={handleSettingsClick}
            className={`group flex items-center justify-between rounded-lg px-3.5 py-2 text-xs font-mono uppercase font-medium border transition-all shadow-[0_0_12px_rgba(34,197,94,0.04)] ${
              isSettingsSpinning
                ? "text-green-200 bg-green-500/20 border-green-400/50"
                : "text-green-300 bg-green-500/[0.07] border border-green-500/20 hover:bg-green-500/15 hover:border-green-400/35 hover:text-green-200"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Settings
                className={`h-3.5 w-3.5 text-green-400 transition-all duration-300 ease-out ${
                  isSettingsRotated
                    ? "rotate-90 opacity-100"
                    : "opacity-70 group-hover:opacity-100 group-hover:rotate-45"
                }`}
              />
              Settings
            </span>
          </button>
        </nav>
      </div>

      {/* Security Status Mini-card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2 text-green-400">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-white">
            Security Guard
          </span>
        </div>
        <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
          AI Ops Autonomous monitoring active with bank-grade API token encryption.
        </p>
      </div>
    </div>
  );
}
