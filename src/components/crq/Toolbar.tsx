import { Search, LayoutGrid, List, Maximize2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewMode = "list" | "grid";
export type CRQStatusFilter = "All" | "Approved" | "Pending for Approval" | "Rejected";
export type OwnershipFilter = "All" | "CCB" | "SE";

// ─── FloatingSelect ───────────────────────────────────────────────────────────

function FloatingSelect({
  label,
  value,
  options,
  onChange,
  highlight,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  highlight?: boolean;
}) {
  const isFiltered = highlight && value !== options[0];
  return (
    <div className="relative">
      <label
        className={cn(
          "absolute -top-2 left-2.5 px-1 bg-white text-[10px] font-medium uppercase tracking-wide z-10",
          isFiltered ? "text-indigo-600" : "text-slate-500",
        )}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none border rounded-lg px-3 py-2 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition min-w-[160px]",
          isFiltered
            ? "border-indigo-300 bg-indigo-50/50 text-indigo-700 font-medium"
            : "border-slate-200 text-slate-700",
        )}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <svg
        className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
      {/* Active indicator dot */}
      {isFiltered && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500 border-2 border-white" />
      )}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-8 w-px bg-slate-200 shrink-0" />;
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

export function Toolbar({
  fn, setFn,
  sub, setSub,
  crqStatus, setCrqStatus,
  ownership, setOwnership,
  view, setView,
}: {
  fn: string;             setFn: (v: string) => void;
  sub: string;            setSub: (v: string) => void;
  crqStatus: CRQStatusFilter; setCrqStatus: (v: CRQStatusFilter) => void;
  ownership: OwnershipFilter; setOwnership: (v: OwnershipFilter) => void;
  view: ViewMode;         setView: (v: ViewMode) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  const activeCount =
    (crqStatus !== "All" ? 1 : 0) + (ownership !== "All" ? 1 : 0);

  function clearAll() {
    setCrqStatus("All");
    setOwnership("All");
  }

  return (
    <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">

      {/* ── Left: all four filters in one row ── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Existing filters */}
        <FloatingSelect
          label="Function"
          value={fn}
          onChange={setFn}
          options={["IP Access_CCB", "Core Network", "Transport", "Mobility"]}
        />
        <FloatingSelect
          label="Sub Function"
          value={sub}
          onChange={setSub}
          options={["All", "Card Addition", "Card Removal", "Software Upgrade"]}
        />

        <Divider />

        {/* New filters */}
        <FloatingSelect
          label="CRQ Status"
          value={crqStatus}
          onChange={(v) => setCrqStatus(v as CRQStatusFilter)}
          options={["All", "Approved", "Pending for Approval", "Rejected"]}
          highlight
        />
        <FloatingSelect
          label="Ownership"
          value={ownership}
          onChange={(v) => setOwnership(v as OwnershipFilter)}
          options={["All", "CCB", "SE"]}
          highlight
        />

        {/* Clear button — only visible when filters are active */}
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-red-500 border border-indigo-200 hover:border-red-300 bg-indigo-50 hover:bg-red-50 rounded-lg px-2.5 py-1.5 transition"
          >
            <X className="h-3 w-3" />
            Clear ({activeCount})
          </button>
        )}
      </div>

      {/* ── Right: action icons ── */}
      <div className="flex items-center gap-1">
        {searchOpen ? (
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 px-2 animate-in fade-in slide-in-from-right-2 duration-200">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              autoFocus
              placeholder="Search…"
              className="bg-transparent px-2 py-1.5 text-sm focus:outline-none w-48"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <IconBtn onClick={() => setSearchOpen(true)} title="Search">
            <Search className="h-4 w-4" />
          </IconBtn>
        )}
        <IconBtn title="Grid view" active={view === "grid"} onClick={() => setView("grid")}>
          <LayoutGrid className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="List view" active={view === "list"} onClick={() => setView("list")}>
          <List className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Maximize">
          <Maximize2 className="h-4 w-4" />
        </IconBtn>
      </div>
    </div>
  );
}

// ─── Icon button ──────────────────────────────────────────────────────────────

function IconBtn({
  children, title, active, onClick,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
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