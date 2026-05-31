import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CRQRecord, STATUS_STYLES } from "./data";
import { CheckCircle2, XCircle, Ban, BarChart3 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const DECISION_OPTIONS = [
  { id: "PASS", label: "PASS", icon: CheckCircle2, color: "text-green-600", border: "border-green-300", bg: "bg-green-50" },
  { id: "FAIL", label: "FAIL", icon: XCircle, color: "text-red-600", border: "border-red-300", bg: "bg-red-50" },
  { id: "CANCEL", label: "CANCEL", icon: Ban, color: "text-slate-500", border: "border-slate-300", bg: "bg-slate-100" },
] as const;

export function ImpactAnalysisPanel({ crq }: { crq: CRQRecord }) {
  const [pick, setPick] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  return (
    <div className="grid grid-cols-12 gap-0">
      {/* Left side - Decision Console */}
      <div className="col-span-12 lg:col-span-4 border-r border-slate-100 p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-slate-800 mb-3">Decision Console</div>
          <div className="space-y-2.5">
            {DECISION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = pick === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setPick(option.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200",
                    active ? `${option.border} ${option.bg} shadow-sm` : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <Icon className={cn("h-5 w-5", option.color)} />
                  <span className="text-sm font-semibold text-slate-700">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments Section */}
        <div className="relative pt-2">
          <label className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">Reviewer Comments</label>
          <textarea
            rows={6}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter your review comments…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-none"
          />
        </div>
      </div>

      {/* Right side - Batch Selection */}
      <div className="col-span-12 lg:col-span-8 p-6 bg-slate-50/50 min-h-75 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-600 mb-2">Batch Selection</div>
          <div className="text-xs text-slate-400">Additional batch processing details available here</div>
        </div>
      </div>

      {/* Footer */}
      <div className="col-span-12 px-6 py-3 border-t border-slate-100 bg-white flex justify-end gap-3">
        <button
          disabled={!pick}
          className={cn(
            "inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition",
            pick
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed",
          )}
        >
          SUBMIT DECISION
        </button>
      </div>
    </div>
  );
}

export function ImpactAnalysisModal({ crq, onClose }: { crq: CRQRecord | null; onClose: () => void }) {
  if (!crq) return null;
  
  return (
    <Dialog open={!!crq} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 grid place-items-center text-white">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800">Impact Analysis Review</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500">
                CRQ Number: <span className="font-mono text-slate-700">{crq.id}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500">
                Current Status: <span className={cn("font-medium", STATUS_STYLES[crq.status])}>{crq.status}</span>
              </span>
            </div>
          </div>
          <span className="w-8" />
        </div>
        
        <ImpactAnalysisPanel crq={crq} />
      </DialogContent>
    </Dialog>
  );
}
