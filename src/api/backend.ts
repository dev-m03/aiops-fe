import { supabase } from "../lib/supabase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://aiops-api.onrender.com";
const DEFAULT_TIMEOUT_MS = 8000; // 8s timeout for normal API requests to handle dormant sockets & mobile wakeups
const AI_TIMEOUT_MS = 25000; // 25s timeout for intensive AI root-cause analysis

export interface Project {
  id: string;
  name: string;
  api_key: string;
  created_at: string;
}

export interface Incident {
  id: string;
  project_id: string;
  service: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  status: "open" | "investigating" | "resolved" | string;
  occurrence_count: number;
  created_at: string;
}

export interface RCAAnalysis {
  root_cause: string;
  confidence: number;
  severity: string;
  suggested_fixes: string[];
  needs_human: boolean;
}

export interface AgentDecision {
  incident_id: string;
  action: string;
  executed: boolean;
  message: string | null;
}

export interface AnalyzeIncidentResponse {
  incident_id: string;
  analysis: RCAAnalysis;
  decision?: AgentDecision;
}

export interface LogPayload {
  api_key: string;
  service: string;
  level: "ERROR" | "WARN" | "INFO" | "DEBUG" | string;
  message: string;
  idempotency_key?: string | null;
}

export interface LogIngestResponse {
  id: string;
  project_id: string;
  incident_created: boolean;
  incident_id: string | null;
  deduplicated: boolean;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  externalSignal?: AbortSignal;
}

/**
 * Resilient fetch wrapper with strict timeout enforcement via AbortController.
 * Prevents browser tabs waking from sleep/RAM from hanging indefinitely on dead TCP sockets.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, externalSignal, ...fetchOptions } = options;
  const controller = new AbortController();

  let isTimedOut = false;
  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);

  // Link external cancellation signal if provided
  const handleExternalAbort = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", handleExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (isTimedOut || err?.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", handleExternalAbort);
    }
  }
}

/**
 * Safely extract sanitized error text from response
 */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return fallback;
    // Sanitize and limit error message length to prevent DOM overflow or raw stack trace leaks
    const clean = text.replace(/<[^>]*>/g, "").trim();
    return clean.length > 200 ? `${clean.slice(0, 200)}...` : clean || fallback;
  } catch {
    return fallback;
  }
}

async function getAuthHeader(timeoutMs = 4000) {
  // Enforce quick timeout on auth session retrieval in case of stale Supabase token lock
  const sessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
    setTimeout(() => resolve({ data: { session: null } }), timeoutMs)
  );

  const { data } = await Promise.race([sessionPromise, timeoutPromise]);
  const token = data?.session?.access_token;

  if (!token) {
    throw new Error("User session expired or not authenticated");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function checkHealth(signal?: AbortSignal): Promise<{ status: string; service: string }> {
  const res = await fetchWithTimeout(`${BACKEND_URL}/health`, {
    timeoutMs: 4000,
    externalSignal: signal,
  });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchProjects(signal?: AbortSignal): Promise<Project[]> {
  const headers = await getAuthHeader();

  const res = await fetchWithTimeout(`${BACKEND_URL}/projects`, {
    method: "GET",
    headers,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    externalSignal: signal,
  });

  if (!res.ok) {
    const errorMsg = await extractErrorMessage(res, `Failed to fetch projects: ${res.status}`);
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function createProject(name: string, signal?: AbortSignal): Promise<Project> {
  const headers = await getAuthHeader();

  const res = await fetchWithTimeout(`${BACKEND_URL}/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: name.trim().slice(0, 100) }),
    timeoutMs: DEFAULT_TIMEOUT_MS,
    externalSignal: signal,
  });

  if (!res.ok) {
    const errorMsg = await extractErrorMessage(res, `Failed to create project: ${res.status}`);
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function fetchIncidents(signal?: AbortSignal): Promise<Incident[]> {
  const headers = await getAuthHeader();

  const res = await fetchWithTimeout(`${BACKEND_URL}/incidents`, {
    method: "GET",
    headers,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    externalSignal: signal,
  });

  if (!res.ok) {
    const errorMsg = await extractErrorMessage(res, `Failed to fetch incidents: ${res.status}`);
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function analyzeIncident(incidentId: string, signal?: AbortSignal): Promise<AnalyzeIncidentResponse> {
  const headers = await getAuthHeader();

  const res = await fetchWithTimeout(`${BACKEND_URL}/agents/analyze/${incidentId}`, {
    method: "POST",
    headers,
    timeoutMs: AI_TIMEOUT_MS,
    externalSignal: signal,
  });

  if (!res.ok) {
    const errorMsg = await extractErrorMessage(res, `Analysis failed: ${res.status}`);
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function ingestLog(payload: LogPayload, signal?: AbortSignal): Promise<LogIngestResponse> {
  const res = await fetchWithTimeout(`${BACKEND_URL}/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    timeoutMs: DEFAULT_TIMEOUT_MS,
    externalSignal: signal,
  });

  if (!res.ok) {
    const errorMsg = await extractErrorMessage(res, `Log ingestion failed: ${res.status}`);
    throw new Error(errorMsg);
  }

  return res.json();
}

