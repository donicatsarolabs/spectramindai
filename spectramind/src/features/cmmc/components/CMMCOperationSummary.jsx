import { Link } from "react-router-dom";
import { useCMMCOperations } from "../hooks/useCMMCOperations";
import { operationModules } from "../data/operations";

export default function CMMCOperationSummary() {
  const { records, loading, error } = useCMMCOperations();
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-black text-[#071a33]">Operational workstreams</h2><Link to="/cmmc/reports" className="text-sm font-bold text-emerald-700">Combined report →</Link></div>{loading ? <p>Loading operational records…</p> : error ? <p role="alert" className="text-rose-700">{error}</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(operationModules).map(([id, config]) => <Link key={id} to={`/cmmc/operations/${id}`} className="rounded-lg border border-slate-100 p-3 hover:bg-emerald-50"><p className="text-2xl font-black text-[#071a33]">{records.filter(record => record.module === id && !record.archived).length}</p><p className="mt-1 text-xs font-semibold text-slate-500">{config.title}</p></Link>)}</div>}</section>;
}
