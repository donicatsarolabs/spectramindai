import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useFrameworkWorkspace } from "../framework/FrameworkWorkspaceContext";

export default function Frameworks() {
  const {
    selectedFrameworks,
    availableFrameworks,
    activeFrameworkId,
    selectFramework,
    setActiveFramework,
  } = useFrameworkWorkspace();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-300">
            Compliance
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-950 dark:text-white">
            Frameworks
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Monitor progress across active compliance frameworks and prioritize the next control work.
          </p>
        </div>

        <FrameworkSection
          title="Selected Frameworks"
          emptyMessage="Please select a framework first."
          frameworks={selectedFrameworks}
          activeFrameworkId={activeFrameworkId}
          actionLabel="Switch Framework"
          onAction={setActiveFramework}
          selected
        />

        <FrameworkSection
          title="Available Frameworks"
          frameworks={availableFrameworks}
          activeFrameworkId={activeFrameworkId}
          actionLabel="Select Framework"
          onAction={selectFramework}
        />
      </div>
    </AppShell>
  );
}

function FrameworkSection({
  title,
  emptyMessage,
  frameworks,
  activeFrameworkId,
  actionLabel,
  onAction,
  selected = false,
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{title}</h2>
      </div>

      {!frameworks.length && emptyMessage ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {frameworks.map((framework) => (
            <FrameworkCard
              key={framework.id}
              framework={framework}
              isActive={framework.id === activeFrameworkId}
              selected={selected}
              actionLabel={actionLabel}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FrameworkCard({ framework, isActive, selected, actionLabel, onAction }) {
  const implementationPath = framework.slug === "cmmc" ? "/cmmc" : `/implementation?framework=${framework.slug}`;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            <ShieldCheck size={22} />
          </div>
          <h3 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            {framework.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {framework.description}
          </p>
        </div>
        {isActive && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Active
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAction(framework.id)}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        {isActive ? "Active Framework" : actionLabel}
      </button>

      {selected && (
        <Link
          to={implementationPath}
          onClick={() => onAction(framework.id)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          Open Workspace
          <ArrowRight size={18} />
        </Link>
      )}
    </article>
  );
}
