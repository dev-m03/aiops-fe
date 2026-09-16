import LightPillar from "@/components/LightPillar";
import Navbar from "../components/Navbar";
import {
  Rocket,
  Brain,
  Timer,
  Lock,
  TrendingUp,
  Link as LinkIcon,
} from "lucide-react";

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
}: {
  session: any;
  onAuthClick: (mode: "login" | "signup") => void;
  onDashboardClick: () => void;
}) {
  return (
    <main className="relative min-h-screen bg-black text-white py-6 overflow-hidden">
      {/* Background LightPillar Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
        <LightPillar
          topColor="#27d036"
          bottomColor="#d5bdd4"
          intensity={1}
          rotationSpeed={0.7}
          glowAmount={0.0035}
          pillarWidth={3.5}
          pillarHeight={0.4}
          noiseIntensity={0.2}
          pillarRotation={40}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[920px] px-4 flex flex-col gap-6">
        <Navbar
          session={session}
          onAuthClick={onAuthClick}
          onDashboardClick={onDashboardClick}
        />

        {/* Hero */}
        <section className="relative w-full rounded-2xl border border-white/20 overflow-hidden bg-black/75 backdrop-blur-md p-6 sm:p-10 lg:p-12">
          <div className="max-w-2xl flex flex-col justify-center">
            <span className="inline-flex items-center gap-2 self-start rounded-lg bg-green-400/15 py-1.5 px-3 text-xs text-green-300 ring-1 ring-green-400/25">
              The NO.1 AI-driven platform for intelligent operations
            </span>

            <h1 className="mt-4 font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl lg:text-4xl">
              Comprehensive AI Ops solutions designed for every digital business
            </h1>

            <p className="mt-5 text-sm leading-relaxed text-white/60 sm:text-base">
              We combine advanced technology with expert guidance to detect
              incidents early, analyze root causes instantly, and keep your
              operations running securely around the clock.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => onAuthClick("signup")}
                className="rounded-lg bg-green-400 px-6 py-3 font-mono text-sm font-medium uppercase tracking-wide text-black transition-colors hover:bg-green-300"
              >
                Get a demo
              </button>

              <button className="rounded-lg border border-white/25 px-6 py-3 font-mono text-sm font-medium uppercase tracking-wide text-white transition-colors hover:bg-white/10">
                Learn more
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="w-full rounded-2xl border border-white/20 overflow-hidden bg-black/75 backdrop-blur-md p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-lg bg-green-400/15 px-3 py-1.5 text-xs text-green-300 ring-1 ring-green-400/25">
            Built for operations teams
          </span>

          <h2 className="mt-4 font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl">
            Why choose AI Ops?
          </h2>

          <div className="mt-8 grid gap-px bg-white/15 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-lg overflow-hidden border border-white/15">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-black/80 backdrop-blur-sm p-6 transition-colors hover:bg-green-400/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-green-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-mono text-sm sm:text-base font-bold uppercase tracking-tight text-white">
                      {f.title}
                    </h3>
                    <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-white/50">
                      {f.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="w-full rounded-2xl border border-white/20 bg-black/70 backdrop-blur-md bg-gradient-to-br from-green-400/15 to-transparent p-8 sm:p-12 text-center">
          <h2 className="mx-auto max-w-2xl font-mono text-2xl font-bold uppercase leading-[1.15] tracking-tight text-white sm:text-3xl">
            Ready to transform your operations?
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/50 sm:text-base">
            Join thousands of teams using AI Ops to manage their infrastructure
          </p>

          <button
            onClick={() => onAuthClick("signup")}
            className="mt-6 rounded-lg bg-green-400 px-8 py-3.5 font-mono text-sm font-medium uppercase tracking-wide text-black transition-colors hover:bg-green-300"
          >
            Start your free trial
          </button>
        </section>

        {/* Footer */}
        <footer className="w-full rounded-2xl border border-white/15 bg-black/60 backdrop-blur-sm py-6 text-center text-xs sm:text-sm text-white/60 mb-6">
          <p>&copy; 2026 AI Ops. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
