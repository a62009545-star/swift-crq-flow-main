import { Bell, Search, ChevronRight } from "lucide-react";

export function Header({ crumb }: { crumb: string[] }) {
  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 bg-white border-b border-slate-100 z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        {crumb.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
            <span className={i === crumb.length - 1 ? "text-slate-900 font-medium" : ""}>{c}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <Search className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 grid place-items-center text-white text-xs font-semibold">
          AT
        </div>
      </div>
    </header>
  );
}
