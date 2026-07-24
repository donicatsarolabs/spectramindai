import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroArt from "../../assets/hero.png";

const readinessItems = [
  ["SOC 2", "78%", "Evidence due in 4 days"],
  ["ISO 27001", "64%", "Risk review active"],
  ["CMMC", "91%", "Policies approved"],
];

const activity = [
  "Password policy evidence approved",
  "Vendor risk review assigned",
  "AI mapped 6 controls to SOC 2",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-10 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_18%_18%,rgba(216,180,109,.24),transparent_26rem),radial-gradient(circle_at_82%_14%,rgba(255,255,255,.9),transparent_25rem)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-blue-600/20 bg-white/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700 shadow-lg shadow-blue-600/10 backdrop-blur">
            <Sparkles size={16} />
            Compliance operations, ready for audit week
          </div>

          <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.04] tracking-normal text-slate-900 md:text-6xl">
            Run compliance, risk, vendors, and trust from one calm workspace.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            SpectraMind gives security teams a live operating system for
            controls, evidence, risk decisions, vendor reviews, and customer
            trust reporting.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-blue-600/35 bg-[linear-gradient(135deg,rgba(255,246,216,.96),rgba(216,180,109,.74)_48%,rgba(168,117,52,.86))] px-6 font-bold text-slate-900 shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/testimonials"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-blue-600/25 bg-white/60 px-6 font-bold text-slate-800 shadow-lg shadow-slate-900/5 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/85 hover:text-blue-700"
            >
              View Product
            </Link>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-3">
            {["Control ownership", "Evidence workflows", "Trust center updates"].map((item) => (
              <div key={item} className="flex min-h-12 items-center gap-2 rounded-lg border border-white/70 bg-white/45 px-3 shadow-lg shadow-slate-900/5 backdrop-blur">
                <CheckCircle2 size={17} className="text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px]">
          <img
            src={heroArt}
            alt=""
            className="pointer-events-none absolute -right-3 top-4 hidden w-24 opacity-30 lg:block"
          />

          <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-[#fffdf8]/90 p-4 shadow-2xl shadow-slate-900/20 backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_16%,rgba(216,180,109,.18),transparent_14rem),linear-gradient(135deg,rgba(255,255,255,.86),rgba(236,231,220,.34))]" />

            <div className="relative rounded-xl border border-slate-200/80 bg-white/72 p-3 shadow-lg shadow-slate-900/10 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-700">Workspace</p>
                  <h2 className="text-lg font-black text-slate-900">Audit cockpit</h2>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  On track
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {readinessItems.map(([name, value, note]) => (
                  <div key={name} className="rounded-lg border border-slate-200 bg-[#fffdf8]/82 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-slate-900">{name}</span>
                      <span className="text-xs font-black text-blue-700">{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,#8eaf99,#d8b46d)]" style={{ width: value }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
                <ArtifactCard label="Evidence sync" value="Live" />
                <ArtifactCard label="Trust score" value="94%" />
                <ArtifactCard label="Coverage" value="Ready" />
            </div>

            <div className="relative mt-4 rounded-xl border border-slate-200/80 bg-white/72 p-3 shadow-lg shadow-slate-900/10 backdrop-blur">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-700" />
                <h3 className="text-sm font-black text-slate-900">Recent Activity</h3>
              </div>
              <div className="grid gap-2">
                {activity.map((item) => (
                  <div key={item} className="flex gap-2 rounded-lg bg-[#fffdf8]/80 px-3 py-2 text-xs text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArtifactCard({ label, value }) {
  return (
    <div className="grid min-h-24 gap-1 rounded-lg border border-blue-600/20 bg-[#fffdf8]/80 p-3 shadow-lg shadow-slate-900/10 backdrop-blur">
      <small className="text-xs font-bold text-slate-500">{label}</small>
      <strong className="text-xl font-black text-blue-700">{value}</strong>
      <span className="block h-1.5 rounded-full bg-[linear-gradient(90deg,#d8b46d,rgba(255,255,255,.9))]" />
    </div>
  );
}
