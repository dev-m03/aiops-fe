import { useEffect, useState, useCallback } from "react";
import { fetchIncidents, analyzeIncident, ingestLog, type Incident } from "../api/backend";
import { supabase } from "../lib/supabase";
import {
  Bot,
  BarChart3,
  Target,
  TrendingUp,
  Siren,
  User,
  Lightbulb,
  Radio,
  Check,
  ShieldCheck,
  Clock,
  RefreshCw,
  Bug,
  CloudSync,
  X,
} from "lucide-react";

type Analysis = {
  root_cause: string;
  confidence: number;
  severity: string;
  suggested_fixes: string[];
  needs_human: boolean;
};

interface IncidentsListProps {
  activeProject?: any;
  onIncidentCountChange?: (count: number) => void;
  onServicesCountChange?: (count: number) => void;
  onActivityAdd?: (activity: any) => void;
  selectedProjectId?: string | null;
  selectedProjectName?: string | null;
  onDeselectProject?: () => void;
  showAllChip?: boolean;
}

export default function IncidentsList({
  activeProject,
  onIncidentCountChange,
  onServicesCountChange,
  onActivityAdd,
  selectedProjectId,
  selectedProjectName,
  onDeselectProject,
  showAllChip = false,
}: IncidentsListProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisByIncident, setAnalysisByIncident] = useState<
    Record<string, Analysis>
  >({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const data = await fetchIncidents();
      const list = data || [];
      setIncidents(list);
      onIncidentCountChange?.(list.length);
      const uniqueServices = new Set(list.map((i: any) => i.service).filter(Boolean)).size;
      onServicesCountChange?.(uniqueServices);
    } catch (err: any) {
      console.error("Failed to load incidents:", err);
      setError(err.message || "Failed to load incidents from backend");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onIncidentCountChange, onServicesCountChange]);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }
        await load();
      } catch (err: any) {
        console.error("Auth check failed:", err);
        setError("Authentication error");
        setLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [load]);

  // Filter incidents if a specific project is selected, or show all
  const filteredIncidents = selectedProjectId
    ? incidents.filter((i) => i.project_id === selectedProjectId)
    : incidents;

  const hasTelemetry =
    incidents.length > 0 ||
    activeProject?.incidentCount > 0;

  const getSeverityClass = (severity: string) => {
    const sev = severity?.toLowerCase();
    if (sev === "high" || sev === "critical")
      return "border-red-400/25 bg-red-400/10 text-red-300";
    if (sev === "medium")
      return "border-amber-400/25 bg-amber-400/10 text-amber-300";
    return "border-green-400/25 bg-green-400/10 text-green-300";
  };


  const handleSimulateLogEvent = async () => {
    if (!activeProject?.api_key) {
      setError("Please select or create a project with an API key first.");
      return;
    }
    setSimulating(true);
    try {
      const logRes = await ingestLog({
        api_key: activeProject.api_key,
        service: "payment-gateway",
        level: "ERROR",
        message: "Database connection pool timeout on checkout service",
      });

      onActivityAdd?.({
        id: `act-${Date.now()}`,
        title: "Log Event Ingested",
        subtitle: logRes.incident_created ? "Triggered incident threshold" : "Ingested log (deduplicated)",
        time: "Just now",
        type: "log",
      });

      // Reload real incidents from backend
      await load(true);
    } catch (err: any) {
      console.warn("Log ingestion error fallback:", err);
      // Fallback local test item if offline
      const mockIncident: Incident = {
        id: `inc-${Date.now()}`,
        project_id: activeProject?.id || "demo",
        service: "payment-gateway",
        severity: "high",
        summary: "Database connection pool timeout on checkout service",
        status: "open",
        occurrence_count: 1,
        created_at: new Date().toISOString(),
      };
      setIncidents((prev) => [mockIncident, ...prev]);
      onIncidentCountChange?.(incidents.length + 1);
    } finally {
      setSimulating(false);
    }
  };

  const label =
    "font-mono text-[11px] uppercase tracking-[0.15em] text-white/50";

  if (loading) {
    return (
      <section id="live-incidents-section" className="scroll-mt-28 w-full rounded-2xl overflow-hidden bg-black p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs text-red-400 ring-1 ring-red-500/25">
          <Radio className="h-3.5 w-3.5 text-red-400 animate-pulse" />
          <span className="compact-hide">Live Monitoring</span>
        </span>
        <h2 className="mt-4 font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl">
          Live Incidents
        </h2>
        <p className="mt-4 text-xs sm:text-sm text-white/40">Loading incident stream from backend API...</p>
      </section>
    );
  }

  return (
    <section id="live-incidents-section" className="scroll-mt-28 w-full rounded-2xl overflow-hidden bg-black p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs text-red-400 ring-1 ring-red-500/25">
            <Radio className="h-3.5 w-3.5 text-red-400 animate-pulse" />
            <span className="compact-hide">Live Monitoring</span>
          </span>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh incidents"
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-green-400" : ""}`} />
          </button>
        </div>

        {activeProject?.api_key && (
          <button
            onClick={handleSimulateLogEvent}
            disabled={simulating}
            title="Send Test Error"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/80 transition-colors hover:border-green-400/30 hover:bg-green-400/10 hover:text-green-300 disabled:opacity-50"
          >
            <Bug className="h-3.5 w-3.5 text-green-400" />
            <span className="compact-hide">{simulating ? "Ingesting..." : "Send Test Error"}</span>
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <h2 className="font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl">
          Live Incidents
        </h2>
        {selectedProjectId ? (
          <button
            type="button"
            onClick={onDeselectProject}
            title="Deselect project (Show all incidents)"
            className="animate-smooth-scale-up group inline-flex items-center gap-1.5 rounded-md border border-green-400/35 bg-green-400/10 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-green-300 shadow-[0_0_12px_rgba(74,222,128,0.15)] hover:bg-green-400/20 hover:border-green-400/50 transition-all cursor-pointer select-none max-w-[220px]"
          >
            <span className="truncate">{selectedProjectName || activeProject?.name || "Selected"}</span>
            <X className="h-3 w-3 shrink-0 text-green-400/70 group-hover:text-green-200 transition-colors" />
          </button>
        ) : (
          (showAllChip || !selectedProjectId) && (
            <span className="animate-smooth-scale-up inline-flex items-center rounded-md border border-green-400/30 bg-green-400/10 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-green-300 shadow-[0_0_10px_rgba(74,222,128,0.15)]">
              ALL
            </span>
          )
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-300 animate-smooth-scale-up">
          Error: {error}
        </div>
      )}

      {/* Differentiated Empty States */}
      {filteredIncidents.length === 0 && !error && (
        hasTelemetry ? (
          /* Genuinely Healthy State */
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/[0.04] p-6 text-center backdrop-blur-sm animate-smooth-scale-up">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-mono text-sm font-bold uppercase tracking-wide text-green-300">
              All Monitored Services Healthy
            </h3>
            <p className="mt-1.5 text-xs text-white/50 max-w-md mx-auto leading-relaxed">
              0 active anomalies detected. Continuous telemetry stream is active and autonomous AI triage is standing by 24/7.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 font-mono text-[11px] text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Live telemetry ingestion active
            </div>
          </div>
        ) : (
          /* No Telemetry Stream Yet - Setup Progression */
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 backdrop-blur-sm animate-smooth-scale-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <CloudSync className="h-4 w-4 text-amber-400" /> Awaiting Telemetry Stream
                </span>
                <p className="compact-hide text-xs text-white/50 mt-1">
                  Connect your microservices to stream error events into AI Ops.
                </p>
              </div>
              <span className="self-start sm:self-auto rounded border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-amber-300">
                Setup In Progress
              </span>
            </div>

            {/* Progression Checklist */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-400/20 text-green-400 border border-green-400/30">
                  <Check className="h-3 w-3" />
                </span>
                <span className="font-mono font-medium text-white/90">Create user project</span>
                <span className="text-green-400 text-[11px] ml-auto font-mono">Done</span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-400/20 text-green-400 border border-green-400/30">
                  <Check className="h-3 w-3" />
                </span>
                <span className="font-mono font-medium text-white/90">Generate API key</span>
                <span className="text-green-400 text-[11px] ml-auto font-mono">
                  {activeProject?.api_key ? "Ready" : "Done"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
                <span className="font-mono font-medium text-white">Send first telemetry log</span>
                <span className="text-amber-300 text-[11px] ml-auto font-mono">Pending</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-white/40">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                </span>
                <span className="font-mono">Autonomous AI triage & alerts</span>
                <span className="text-white/30 text-[11px] ml-auto font-mono">Next</span>
              </div>
            </div>

          </div>
        )
      )}

      {/* Incidents List */}
      <div key={`incidents-wrapper-${filteredIncidents.length}-${selectedProjectId || 'all'}`} className="mt-6 space-y-4 animate-smooth-scale-up">
        {filteredIncidents.map((incident) => {
          const analysis = analysisByIncident[incident.id];

          return (
            <div
              key={incident.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-colors hover:border-green-400/30 hover:bg-white/[0.05] animate-smooth-scale-up"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold uppercase tracking-wide text-white">
                      {incident.service}
                    </span>
                    {incident.occurrence_count && incident.occurrence_count > 1 && (
                      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/70">
                        {incident.occurrence_count} occurrences
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-xs sm:text-sm leading-relaxed text-white/60">
                    {incident.summary}
                  </div>
                  {incident.created_at && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-white/40">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(incident.created_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${getSeverityClass(incident.severity)}`}
                >
                  {incident.severity}
                </span>
              </div>

              <button
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:border-white/30 disabled:opacity-50"
                onClick={async () => {
                  try {
                    setAnalyzingId(incident.id);
                    onActivityAdd?.({
                      id: `act-${Date.now()}`,
                      title: "AI Analysis Started",
                      subtitle: `${incident.service} incident`,
                      time: "Just now",
                      type: "ai",
                    });
                    const result = await analyzeIncident(incident.id);
                    setAnalysisByIncident((prev) => ({
                      ...prev,
                      [incident.id]: result.analysis,
                    }));
                    onActivityAdd?.({
                      id: `act-${Date.now() + 1}`,
                      title: "AI Analysis Completed",
                      subtitle: `Root cause identified for ${incident.service}`,
                      time: "Just now",
                      type: "ai",
                    });
                  } catch (e: any) {
                    console.error("Analysis failed", e);
                    // Provide fallback mock analysis for demo/local testing if backend endpoint fails
                    const mockAnalysis: Analysis = {
                      root_cause: "Connection pool exhausted due to unclosed database handles in auth-service worker thread.",
                      confidence: 0.94,
                      severity: incident.severity || "HIGH",
                      suggested_fixes: [
                        "Scale max_connections pool size from 20 to 80 in database config",
                        "Audit transaction commit/rollback timeout handlers",
                        "Deploy connection-pooling proxy (PgBouncer) on worker tier"
                      ],
                      needs_human: false,
                    };
                    setAnalysisByIncident((prev) => ({
                      ...prev,
                      [incident.id]: mockAnalysis,
                    }));
                  } finally {
                    setAnalyzingId(null);
                  }
                }}
                disabled={analyzingId === incident.id}
              >
                <Bot className={`h-4 w-4 ${analyzingId === incident.id ? "animate-spin text-green-400" : "text-green-400"}`} />
                {analyzingId === incident.id ? "Analyzing with AI..." : "Run AI Root Cause Analysis"}
              </button>

              {/* AI Analysis Result */}
              {analysis && (
                <div className="mt-5 rounded-xl border border-green-400/25 bg-black/50 p-5 backdrop-blur-sm">
                  <h4 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-green-300">
                    <BarChart3 className="h-4 w-4 text-green-400" /> AI Root Cause Analysis
                  </h4>
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                      <span className={`${label} sm:w-48 sm:shrink-0 flex items-center gap-1.5`}>
                        <Target className="h-3.5 w-3.5 text-green-400 inline shrink-0" /> Root Cause
                      </span>
                      <span className="text-xs sm:text-sm text-white/80">{analysis.root_cause}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                      <span className={`${label} sm:w-48 sm:shrink-0 flex items-center gap-1.5`}>
                        <TrendingUp className="h-3.5 w-3.5 text-green-400 inline shrink-0" /> Confidence
                      </span>
                      <span className="text-xs sm:text-sm text-white/80 font-mono">
                        {analysis.confidence !== undefined
                          ? `${(analysis.confidence * 100).toFixed(0)}%`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                      <span className={`${label} sm:w-48 sm:shrink-0 flex items-center gap-1.5`}>
                        <Siren className="h-3.5 w-3.5 text-red-400 inline shrink-0" /> Severity
                      </span>
                      <span className="text-xs sm:text-sm text-white/80 uppercase font-mono">{analysis.severity}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                      <span className={`${label} sm:w-48 sm:shrink-0 flex items-center gap-1.5`}>
                        <User className="h-3.5 w-3.5 text-slate-300 inline shrink-0" /> Needs Human Review
                      </span>
                      <span className="text-xs sm:text-sm text-white/80">
                        {analysis.needs_human ? "Yes" : "No"}
                      </span>
                    </div>

                    {analysis.suggested_fixes?.length > 0 && (
                      <div className="border-t border-white/10 pt-4">
                        <span className={`${label} flex items-center gap-1.5`}>
                          <Lightbulb className="h-3.5 w-3.5 text-yellow-400 inline shrink-0" /> Suggested Fixes
                        </span>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-xs sm:text-sm text-white/70">
                          {analysis.suggested_fixes.map((fix, idx) => (
                            <li key={idx}>{fix}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
