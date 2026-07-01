import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CRQRecord, STATUS_STYLES } from "./data";
import {
  CheckCircle2,
  XCircle,
  Ban,
  BarChart3,
  Layers,
  Folder,
  FolderOpen,
  ArrowRightToLine,
  RefreshCw,
  LineChart,
  Eye,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const DECISION_OPTIONS = [
  { id: "PASS", label: "PASS", icon: CheckCircle2, color: "text-green-600", border: "border-green-300", bg: "bg-green-50" },
  { id: "FAIL", label: "FAIL", icon: XCircle, color: "text-red-600", border: "border-red-300", bg: "bg-red-50" },
  { id: "CANCEL", label: "CANCEL", icon: Ban, color: "text-slate-500", border: "border-slate-300", bg: "bg-slate-100" },
] as const;

// ─── Batch Selection (right-hand panel) ───────────────────────────────────────

type Batch = { id: string; label: string; date: string };

const BATCHES: Batch[] = [
  { id: "batch-1", label: "Batch 1", date: "08/06/2026" },
  { id: "batch-2", label: "Batch 2", date: "08/06/2026" },
];

function BatchSelectionPanel() {
  const [selectedBatch, setSelectedBatch] = useState<string | null>("batch-2");
  const activeBatch = BATCHES.find((b) => b.id === selectedBatch) ?? null;

  return (
    <div className="col-span-12 lg:col-span-8 flex flex-col min-h-[500px] bg-white">
      {/* Top bar — batch cards + Delta / Refetch */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-widest">
            <Layers className="h-4 w-4 text-slate-500" />
            Batch Selection
          </div>
          <div className="flex items-center gap-2">
            {BATCHES.map((b) => {
              const active = selectedBatch === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBatch(b.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2 rounded-xl border-2 transition-all duration-150",
                    active ? "border-indigo-300 bg-indigo-50/70" : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      active ? "bg-indigo-600" : "bg-blue-50"
                    )}
                  >
                    {active ? (
                      <FolderOpen className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </span>
                  <span className="text-left">
                    <span className={cn("block text-xs font-semibold", active ? "text-indigo-700" : "text-slate-700")}>
                      {b.label}
                    </span>
                    <span className={cn("block text-[10px]", active ? "text-indigo-400" : "text-slate-400")}>
                      {b.date}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold uppercase tracking-wide hover:bg-teal-700 transition shadow-sm">
            <ArrowRightToLine className="h-3.5 w-3.5" />
            Delta
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide hover:bg-slate-200 transition">
            <RefreshCw className="h-3.5 w-3.5" />
            Refetch
          </button>
        </div>
      </div>

      {/* Center placeholder / analysis area */}
      <div className="flex-1 flex items-center justify-center bg-slate-50/50">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 flex items-center justify-center">
            <LineChart className="h-6 w-6 text-indigo-300" />
          </div>
          <div className="text-sm font-semibold text-slate-700 mb-1">Select a batch to begin analysis</div>
          <div className="text-xs text-slate-400">Choose a batch from the selector above to view impact data</div>
        </div>
      </div>

      {/* Footer — active batch + Preview / Export Excel */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
        <span className="text-xs text-slate-400">
          Active batch: <span className="text-slate-600 font-medium">{activeBatch?.label ?? "—"}</span>
        </span>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition shadow-sm">
            <Eye className="h-3.5 w-3.5" />
            Preview Excel
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition shadow-sm">
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Impact Analysis Panel ─────────────────────────────────────────────────────

export function ImpactAnalysisPanel({ crq, onPickChange }: { crq: CRQRecord; onPickChange?: (v: "PASS" | "FAIL" | "CANCEL" | null) => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionOwner, setRejectionOwner] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);

  function handlePick(id: string) {
    setPick(id);
    onPickChange?.(id as "PASS" | "FAIL" | "CANCEL");

    if (id === "PASS") {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
      setRejectionReason("");
      setRejectionOwner("");
    }
  }

  return (
    <div className="grid grid-cols-12 gap-0">
      {/* Left side - Decision Console */}
      <div className="col-span-12 lg:col-span-4 border-r border-slate-100 p-6 space-y-4">
        {/* Success Message */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <span className="text-sm font-semibold text-green-800">Validation submitted successfully</span>
          </div>
        )}

        <div>
          <div className="text-sm font-semibold text-slate-800 mb-3">Decision Console</div>
          <div className="space-y-2.5">
            {DECISION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = pick === option.id;
              return (
                <div key={option.id}>
                  <button
                    onClick={() => handlePick(option.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200",
                      active ? `${option.border} ${option.bg} shadow-sm` : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", option.color)} />
                    <span className="text-sm font-semibold text-slate-700">{option.label}</span>
                  </button>

                  {/* Rejection Details for FAIL/CANCEL */}
                  {active && (option.id === "FAIL" || option.id === "CANCEL") && (
                    <div className="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-3">
                      <h4 className="font-semibold text-amber-900 text-xs">Rejection Details</h4>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1 block">
                          Rejection Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Enter rejection reason..."
                          className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1 block">
                          Rejection Owner <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={rejectionOwner}
                          onChange={(e) => setRejectionOwner(e.target.value)}
                          placeholder="Enter owner name or ID..."
                          className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
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
      <BatchSelectionPanel />

      {/* Footer */}
      <div className="col-span-12 px-6 py-3 border-t border-slate-100 bg-white flex justify-end gap-3">
        <button
          disabled={!pick || (pick !== "PASS" && (!rejectionReason || !rejectionOwner))}
          className={cn(
            "inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition",
            pick && (pick === "PASS" || (rejectionReason && rejectionOwner))
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