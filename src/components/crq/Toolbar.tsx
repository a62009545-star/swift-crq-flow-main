import { Search, Filter, LayoutGrid, List, Maximize2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function FloatingSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-2.5 px-1 bg-white text-[10px] font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition min-w-[200px]"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  );
}

export type ViewMode = "list" | "grid";

export function Toolbar({
  fn,
  setFn,
  sub,
  setSub,
  view,
  setView,
}: {
  fn: string;
  setFn: (v: string) => void;
  sub: string;
  setSub: (v: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <FloatingSelect
          label="Select Function"
          value={fn}
          onChange={setFn}
          options={["IP Access_CCB", "Core Network", "Transport", "Mobility"]}
        />
        <FloatingSelect
          label="Select-Sub Function"
          value={sub}
          onChange={setSub}
          options={["All", "Card Addition", "Card Removal", "Software Upgrade"]}
        />
      </div>
      <div className="flex items-center gap-1">
        {searchOpen ? (
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 px-2 animate-in fade-in slide-in-from-right-2 duration-200">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              placeholder="Search…"
              className="bg-transparent px-2 py-1.5 text-sm focus:outline-none w-56"
            />
            <button onClick={() => setSearchOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <IconBtn onClick={() => setSearchOpen(true)} title="Search"><Search className="h-4 w-4" /></IconBtn>
        )}
        <IconBtn title="Filter"><Filter className="h-4 w-4" /></IconBtn>
        <IconBtn title="Grid view" active={view === "grid"} onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></IconBtn>
        <IconBtn title="List view" active={view === "list"} onClick={() => setView("list")}><List className="h-4 w-4" /></IconBtn>
        <IconBtn title="Maximize"><Maximize2 className="h-4 w-4" /></IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, title, active, onClick }: { children: React.ReactNode; title: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg transition relative group",
        active ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-100 text-slate-500",
      )}
    >
      {children}
      <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] bg-slate-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition z-50">
        {title}
      </span>
    </button>
  );
}
