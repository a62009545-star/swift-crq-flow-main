import { useState } from "react";
import { CheckCircle2, XCircle, Ban, Cpu, Activity, Network, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CRQRecord } from "./data";

// ─── Checkpoint card data ────────────────────────────────────────────────────

const CHECKPOINTS = [
  { title: "Node Details",                icon: Cpu,      count: 12, progress: 80 },
  { title: "Interface / Traffic / Power", icon: Activity, count: 8,  progress: 55 },
  { title: "IS-IS Adjacency",             icon: Network,  count: 4,  progress: 30 },
] as const;

// ──ccc─ Validation options ──────────────────────────────────────────────────────

const OPTIONS = [
  {
    id: "PASS" as const,
    label: "PASS",
    icon: CheckCircle2,
    activeColor:  "text-green-500",
    activeBorder: "border-green-400",
    activeBg:     "bg-green-50",
  },
  {
    id: "FAILED" as const,
    label: "FAILED",
    icon: XCircle,
    activeColor:  "text-red-500",
    activeBorder: "border-red-400",
    activeBg:     "bg-red-50",
  },
  {
    id: "CANCELLED" as const,
    label: "CANCELLED",
    icon: Ban,
    activeColor:  "text-slate-400",
    activeBorder: "border-slate-300",
    activeBg:     "bg-slate-50",
  },
] as const;

// ─── Modal ───────────────────────────────────────────────────────────────────

export function PlanValidationModal({
  crq,
  onClose,
}: {
  crq: CRQRecord | null;
  onClose: () => void;
}) {
  const [pick, setPick]     = useState<"PASS" | "FAILED" | "CANCELLED" | null>("PASS");
  const [remark, setRemark] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!crq) return null;

  function handleClose() {
    setPick("PASS");
    setRemark("");
    setSubmitted(false);
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              Validation
              <span className="text-slate-400 font-normal">— Checkpoint-wise validation status</span>
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {submitted ? (
          <div className="p-8 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-6 py-4">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <span className="text-sm text-green-800 font-medium">Validation submitted successfully.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-0 divide-x divide-slate-100">

            {/* ── Left: actions ── */}
            <div className="col-span-5 p-6 space-y-3">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = pick === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPick(opt.id)}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-150 text-left",
                      active
                        ? `${opt.activeBorder} ${opt.activeBg} shadow-sm`
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        active ? opt.activeColor : "text-slate-300"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-semibold tracking-wide transition-colors",
                        active ? "text-slate-800" : "text-slate-500"
                      )}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}

              {/* CHM Remark */}
              <div className="pt-1">
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1.5">
                  CHM Remark
                </label>
                <textarea
                  rows={5}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add your remarks..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none transition"
                />
              </div>
            </div>

            {/* ── Right: checkpoints + table ── */}
            <div className="col-span-7 p-6 space-y-4 bg-slate-50/30">

              {/* Checkpoint cards */}
              <div className="grid grid-cols-3 gap-3">
                {CHECKPOINTS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div
                      key={c.title}
                      className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="h-5 w-5 text-indigo-500" />
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                          {c.count}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700 mb-3 leading-tight">
                        {c.title}
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollbar indicator (decorative, matches screenshot) */}
              <div className="flex items-center gap-2">
                <span className="text-slate-300 text-xs">‹</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full w-4/5 bg-slate-400 rounded-full" />
                </div>
                <span className="text-slate-300 text-xs">›</span>
              </div>

              {/* NIAM / ADRS table */}
              <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                <div className="grid grid-cols-3 bg-slate-50 px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold text-slate-500 border-b border-slate-100">
                  <div>NiamReachable</div>
                  <div>AdrsReachable</div>
                  <div>LastDiscoveryTime</div>
                </div>
                <div className="grid grid-cols-3 px-4 py-3.5 text-xs text-slate-700 leading-relaxed">
                  <div>Node NotAvailable in NIAM via IPPMS</div>
                  <div>Inventory available in UIG</div>
                  <div className="font-mono">2026-05-15 00:35:35</div>
                </div>
              </div>

              {/* Submit row */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 transition px-2"
                >
                  Cancel
                </button>
                <button
                  disabled={!pick}
                  onClick={() => pick && setSubmitted(true)}
                  className={cn(
                    "px-6 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-lg transition shadow-sm",
                    pick
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  Submit Validation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}