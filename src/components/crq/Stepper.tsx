import {
  ClipboardList,
  LayoutGrid,
  BarChart2,
  FilePlus,
  FileCheck,
  CalendarCheck,
  Monitor,
  CheckCircle2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const STEPS = [
  { id: "assignment", label: "CRQ Assignment", icon: ClipboardList },
  { id: "plan", label: "Plan & Inventory Validation", icon: LayoutGrid },
  { id: "impact", label: "Impact Analysis", icon: BarChart2 },
  { id: "mop", label: "Mop Creation", icon: FilePlus },
  { id: "mopv", label: "MOP Validation", icon: FileCheck },
  { id: "schedule", label: "Scheduling & Approvals", icon: CalendarCheck },
  { id: "exec", label: "Network Execution", icon: Monitor },
  { id: "closure", label: "Task Closure", icon: CheckCircle2 },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export function Stepper({ active, onChange }: { active: StepId; onChange: (id: StepId) => void }) {
  const activeIdx = STEPS.findIndex((s) => s.id === active);

  return (
    <div className="bg-white border-b border-slate-100 px-6 py-5">
      <div className="flex items-start gap-0 max-w-full overflow-x-auto scrollbar-thin">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < activeIdx;
          const isActive = idx === activeIdx;
          return (
            <div key={step.id} className="flex items-start flex-1 min-w-[120px]">
              <button
                onClick={() => onChange(step.id)}
                className="flex flex-col items-center gap-2 group flex-1"
              >
                <div className="relative">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full grid place-items-center transition-all duration-200",
                      isCompleted && "bg-indigo-600 text-white",
                      isActive && "bg-indigo-600 text-white ring-4 ring-indigo-200 animate-pulse",
                      !isCompleted && !isActive && "border-2 border-slate-200 text-slate-400 bg-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {isCompleted && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 grid place-items-center ring-2 ring-white">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] text-center leading-tight max-w-[110px] transition-colors",
                    isActive ? "text-slate-900 font-semibold" : "text-slate-500 group-hover:text-slate-700",
                  )}
                >
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-10 grid place-items-center pt-5 min-w-[20px]">
                  <div
                    className={cn(
                      "h-0.5 w-full",
                      isCompleted ? "bg-indigo-500" : "border-t-2 border-dashed border-slate-200",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
