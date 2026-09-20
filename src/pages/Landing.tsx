import { useState, useEffect, lazy, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
const LightPillar = lazy(() => import("@/components/LightPillar"));
import {
  Rocket,
  Brain,
  Timer,
  Lock,
  TrendingUp,
  Link as LinkIcon,
  Radio,
  Bolt,
  Bot,
  SearchCode,
  Lightbulb,
  User,
} from "lucide-react";
import { loadSettings, THEME_PALETTES, type AppSettings } from "@/lib/settings";

const HEADLINE_TEXT = "Comprehensive AI Ops solutions designed for every digital business";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

function useTypewriter(text: string, speed = 32, startDelay = 150) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayedText(text);
      return;
    }

    let timeoutId: number;
    let currentIndex = 0;

    const startTimeout = window.setTimeout(() => {
      const intervalId = window.setInterval(() => {
        currentIndex++;
        setDisplayedText(text.slice(0, currentIndex));
        if (currentIndex >= text.length) {
          window.clearInterval(intervalId);
        }
      }, speed);

      timeoutId = intervalId;
    }, startDelay);

    return () => {
      window.clearTimeout(startTimeout);
      if (timeoutId) window.clearInterval(timeoutId);
    };
  }, [text, speed, startDelay]);

  return displayedText;
}

const features = [
  {
    icon: Rocket,
    title: "Fast Incident Detection",
    body: "Detect anomalies and incidents instantly with advanced AI algorithms",
  },
  {
    icon: Brain,
    title: "Intelligent Analysis",
    body: "Get AI-powered root cause analysis and insights for every incident",
  },
  {
    icon: Timer,
    title: "Reduce MTTR",
    body: "Slash your mean time to resolution with automated recommendations",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    body: "Bank-grade security with encrypted data and compliance certifications",
  },
  {
    icon: TrendingUp,
    title: "Scalable Infrastructure",
    body: "Handle millions of events with our distributed, scalable platform",
  },
  {
    icon: LinkIcon,
    title: "Easy Integration",
    body: "Integrate with your existing tools and workflows in minutes",
  },
];

export default function Landing({
  session,
  onAuthClick,
  onDashboardClick,
  paused,
}: {
  session?: Session | null;
  onAuthClick: (mode: "login" | "signup") => void;
  onDashboardClick?: () => void;
  paused?: boolean;
}) {
  const isDesktop = useIsDesktop();
  const displayedHeadline = useTypewriter(HEADLINE_TEXT, 32, 150);
  const [pillarVisible, setPillarVisible] = useState(false);

  useEffect(() => {
    // Light pillar visible only after transition from dashboard animation finishes (~280ms)
    const timer = setTimeout(() => {
      setPillarVisible(true);
    }, 280);

    return () => clearTimeout(timer);
  }, []);

  const [themePalette, setThemePalette] = useState(() => {
    const currentTheme = loadSettings().theme || "emerald";
    return THEME_PALETTES.find((p) => p.id === currentTheme) || THEME_PALETTES[0];
  });

  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<AppSettings>;
      if (customEvent.detail?.theme) {
        const palette = THEME_PALETTES.find((p) => p.id === customEvent.detail.theme);
        if (palette) setThemePalette(palette);
      }
    };

    window.addEventListener("aiops-settings-changed", handleSettingsChange);
    return () => window.removeEventListener("aiops-settings-changed", handleSettingsChange);
  }, []);

  const handlePrimaryCta = () => {
    if (session) {
      onDashboardClick?.();
    } else {
      onAuthClick("signup");
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-swift">
      {/* Hero */}
      <section className="relative w-full rounded-2xl overflow-hidden bg-black flex flex-col lg:flex-row min-h-[380px] lg:min-h-[460px]">
        <div className="flex-1 p-6 sm:p-8 lg:p-10 flex flex-col justify-center z-10">
          <span className="inline-flex items-center gap-2 self-start rounded-lg bg-green-400/15 py-1.5 px-3 text-xs text-green-300 ring-1 ring-green-400/25">
            The #1 AI-driven platform for intelligent operations
          </span>

          <h1
            aria-label={HEADLINE_TEXT}
            className="mt-4 grid grid-cols-1 grid-rows-1 font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            <span className="invisible select-none pointer-events-none col-start-1 row-start-1" aria-hidden="true">
              {HEADLINE_TEXT}_
            </span>
            <span className="col-start-1 row-start-1">
              <span>{displayedHeadline}</span>
              <span className="inline-block text-green-400 animate-cursor-blink ml-0.5" aria-hidden="true">
                _
              </span>
            </span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-white/50 sm:text-base">
            Detect incidents instantly, isolate root causes in real time, and eliminate downtime 24/7.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handlePrimaryCta}
              className="rounded-lg border border-transparent bg-green-400 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-green-300"
            >
              {session ? "Dashboard" : "Get a demo"}
            </button>

            <button
              onClick={() => document.getElementById("learn-more")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:border-white/30"
            >
              Learn more
            </button>
          </div>
        </div>

        <div
          className={`hidden lg:block relative lg:w-[46%] overflow-hidden pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] transition-opacity duration-1000 ease-out ${
            pillarVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {isDesktop && (
            <Suspense fallback={null}>
              <LightPillar
                topColor={themePalette.accent}
                bottomColor="#d5bdd4"
                intensity={0.9}
                rotationSpeed={0.3}
                glowAmount={0.0014}
                pillarWidth={1.8}
                pillarHeight={0.4}
                noiseIntensity={0.4}
                pillarRotation={25}
                interactive={false}
                mixBlendMode="screen"
                quality="high"
                paused={paused || !pillarVisible}
                className="filter blur-[0.5px]"
              />
            </Suspense>
          )}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black via-transparent to-transparent opacity-70" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/30" />
        </div>
      </section>

      {/* Features */}
      <section className="w-full flex flex-col pt-6 sm:pt-10">
        <span className="inline-flex items-center gap-2 self-start rounded-lg bg-green-400/15 px-3 py-1.5 text-xs text-green-300 ring-1 ring-green-400/25">
          Built for operations teams
        </span>

        <h2 className="mt-4 font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl">
          Why choose AI Ops?
        </h2>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 transition-all duration-300 ease-out hover:z-20 hover:scale-[1.025] hover:border-green-400/30 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(39,208,54,0.1)] flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-mono text-sm sm:text-base font-bold uppercase tracking-tight text-white">
                    {f.title}
                  </h3>
                  <div className="mt-4 sm:mt-5 flex items-center gap-4">
                    <div className="text-green-400 shrink-0">
                      <Icon className="h-8 w-8 sm:h-9 sm:w-9 text-green-400 group-hover:scale-105 transition-transform duration-300" strokeWidth={1.75} />
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-white/50">
                      {f.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works & Operational Deep Dive */}
      <section id="learn-more" className="scroll-mt-24 w-full flex flex-col pt-10 sm:pt-16">
        <span className="inline-flex items-center self-start rounded-lg bg-green-400/15 px-3 py-1.5 text-xs text-green-300 ring-1 ring-green-400/25">
          Intelligent Operations Workflow
        </span>

        <h2 className="mt-4 font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl">
          From Incident Signal to Resolution
        </h2>

        <p className="mt-2.5 max-w-xl text-xs sm:text-sm leading-relaxed text-white/50">
          Automate triage and accelerate root cause resolution with autonomous AI agents.
        </p>

        {/* 3-Step Lifecycle Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {/* Step 1 */}
          <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 transition-all duration-300 ease-out hover:z-20 hover:scale-[1.025] hover:border-green-400/30 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(39,208,54,0.1)] flex flex-col justify-between min-h-[140px]">
            <div className="relative z-10">
              <span className="font-mono text-xs font-bold text-green-400 tracking-wider block">01. INGESTION</span>
              <h3 className="mt-1.5 font-mono text-sm sm:text-base font-bold uppercase tracking-tight text-white">Project Setup</h3>
              <p className="mt-2 text-xs leading-relaxed text-white/60 max-w-[78%]">
                Stream service events and metrics in real time with secure API keys.
              </p>
            </div>
            <Bolt
              strokeWidth={1.5}
              className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-24 text-green-400/25 group-hover:text-green-400/40 group-hover:scale-105 transition-all duration-300"
            />
          </div>

          {/* Step 2 */}
          <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 transition-all duration-300 ease-out hover:z-20 hover:scale-[1.025] hover:border-green-400/30 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(39,208,54,0.1)] flex flex-col justify-between min-h-[140px]">
            <div className="relative z-10">
              <span className="font-mono text-xs font-bold text-green-400 tracking-wider block">02. LIVE TRIAGE</span>
              <h3 className="mt-1.5 font-mono text-sm sm:text-base font-bold uppercase tracking-tight text-white">Live Monitoring</h3>
              <p className="mt-2 text-xs leading-relaxed text-white/60 max-w-[78%]">
                Track health metrics and automatically classify incident severity.
              </p>
            </div>
            <Radio
              strokeWidth={1.5}
              className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-24 text-green-400/25 group-hover:text-green-400/40 group-hover:scale-105 transition-all duration-300"
            />
          </div>

          {/* Step 3 */}
          <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 transition-all duration-300 ease-out hover:z-20 hover:scale-[1.025] hover:border-green-400/30 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(39,208,54,0.1)] flex flex-col justify-between min-h-[140px]">
            <div className="relative z-10">
              <span className="font-mono text-xs font-bold text-green-400 tracking-wider block">03. AI ANALYSIS</span>
              <h3 className="mt-1.5 font-mono text-sm sm:text-base font-bold uppercase tracking-tight text-white">Remediation</h3>
              <p className="mt-2 text-xs leading-relaxed text-white/60 max-w-[78%]">
                Pinpoint root causes, score confidence, and receive ordered fixes.
              </p>
            </div>
            <Bot
              strokeWidth={1.5}
              className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-24 text-green-400/25 group-hover:text-green-400/40 group-hover:scale-105 transition-all duration-300"
            />
          </div>
        </div>

        {/* Deep Dive Breakdown Cards */}
        <div className="mt-6 rounded-2xl border border-green-500/20 bg-[#060907]/90 p-6 sm:p-8 w-full shadow-[0_0_50px_-15px_rgba(34,197,94,0.12)]">
          <div className="flex items-center justify-center gap-4 text-center">
            <div className="h-px flex-1 max-w-[60px] sm:max-w-[100px] bg-gradient-to-r from-transparent to-white/20" />
            <h3 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-white/70">
              What the <span className="text-green-400">AI Ops Engine</span> Provides
            </h3>
            <div className="h-px flex-1 max-w-[60px] sm:max-w-[100px] bg-gradient-to-l from-transparent to-white/20" />
          </div>

          <div className="mt-6 sm:mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-4 hover:border-green-400/25 transition-all duration-300">
              <div className="h-14 w-14 rounded-full bg-gradient-to-b from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                <SearchCode className="h-6 w-6 text-green-400" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold uppercase text-white tracking-wide">Root Cause Analysis</h4>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  Pinpoints the exact failure mechanism across logs, traces, and metrics.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-4 hover:border-green-400/25 transition-all duration-300">
              <div className="h-14 w-14 rounded-full bg-gradient-to-b from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                <TrendingUp className="h-6 w-6 text-green-400" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold uppercase text-white tracking-wide">Confidence Scoring</h4>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  Probabilistic ratings to validate diagnostic certainty before taking action.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-4 hover:border-green-400/25 transition-all duration-300">
              <div className="h-14 w-14 rounded-full bg-gradient-to-b from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                <Lightbulb className="h-6 w-6 text-green-400" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold uppercase text-white tracking-wide">Suggested Fixes</h4>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  Ordered, step-by-step remediation procedures to reduce MTTR.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-4 hover:border-green-400/25 transition-all duration-300">
              <div className="h-14 w-14 rounded-full bg-gradient-to-b from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                <User className="h-6 w-6 text-green-400" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold uppercase text-white tracking-wide">Human Safeguards</h4>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  Flags high-impact actions that require human review and sign-off.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full rounded-2xl border border-white/20 bg-gradient-to-br from-green-400/10 to-transparent p-8 sm:p-12 text-center mt-10 sm:mt-16">
        <h2 className="mx-auto max-w-2xl font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl">
          Ready to transform your operations?
        </h2>

        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/50 sm:text-base">
          Join thousands of teams using AI Ops to manage their infrastructure
        </p>

        <button
          onClick={handlePrimaryCta}
          className="mt-6 rounded-lg border border-transparent bg-green-400 px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-green-300"
        >
          {session ? "Dashboard" : "Start your free trial"}
        </button>
      </section>

      {/* Footer */}
      <footer className="mt-32 sm:mt-48 w-full py-8 text-center text-xs sm:text-sm text-white/40 border-t border-white/5">
        <p>&copy; 2026 AI Ops. All rights reserved.</p>
      </footer>
    </div>
  );
}
