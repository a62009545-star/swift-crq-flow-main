import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EMPLOYEES } from "./data";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmployeePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = EMPLOYEES.filter(
    (e) =>
      e.id.toLowerCase().includes(q.toLowerCase()) ||
      e.name.toLowerCase().includes(q.toLowerCase()),
  );
  const sel = EMPLOYEES.find((e) => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative w-full text-left rounded-lg border px-3 pt-4 pb-2 transition-all duration-200 hover:border-slate-300 min-w-[180px]",
            sel
              ? "border-indigo-200 bg-indigo-50/30"
              : "border-slate-200 bg-white",
          )}
        >
          <span className="absolute top-1 left-3 text-[10px] uppercase tracking-wide font-medium text-slate-400">
            {label}
          </span>
          {sel ? (
            <span className="text-sm text-slate-800 font-mono truncate block">
              {sel.id}, {sel.name}
            </span>
          ) : (
            <span className="text-sm text-slate-400">Select…</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ID or name…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {value && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              Clear selection
            </button>
          )}
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => { onChange(e.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-mono text-slate-800">{e.id}</div>
                <div className="text-xs text-slate-500">{e.name}</div>
              </div>
              {value === e.id && <Check className="h-4 w-4 text-indigo-600" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-slate-400">No matches</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
