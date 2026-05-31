import { LayoutGrid, Workflow, Settings2, Activity, CalendarRange, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "workflow", label: "CRQ Workflow", icon: Workflow },
  { id: "setup", label: "Activity Setup", icon: Settings2 },
  { id: "progress", label: "CRQ Progress", icon: Activity },
  { id: "scheduler", label: "Scheduler Reports", icon: CalendarRange },
];

export function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#0F172A] text-slate-300 flex flex-col z-30">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/5">
        <div className="h-8 w-8 rounded-lg bg-indigo-500/20 grid place-items-center">
          <LayoutGrid className="h-4 w-4 text-indigo-300" />
        </div>
        <span className="font-semibold text-white tracking-tight">CRQ Portal</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV.map((n) => {
          const Icon = n.icon;
          const isActive = active === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ease-out relative",
                isActive
                  ? "bg-indigo-500/10 text-indigo-300"
                  : "hover:bg-white/5 text-slate-400 hover:text-slate-200",
              )}
            >
              {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-indigo-400" />}
              <Icon className="h-4 w-4" />
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/5 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 grid place-items-center text-white text-sm font-semibold">
          AT
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">Ayush Thakur</div>
          <div className="text-[11px] text-slate-500">Workflow Admin</div>
        </div>
        <button className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition" title="Logout">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
