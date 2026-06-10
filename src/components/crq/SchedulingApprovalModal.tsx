import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CRQRecord } from "./data";
import { CheckCircle2, XCircle, Ban, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const DECISION_OPTIONS = [
  { id: "PASS", label: "PASS", icon: CheckCircle2, color: "text-green-600", border: "border-green-300", bg: "bg-green-50" },
  { id: "FAIL", label: "FAIL", icon: XCircle, color: "text-red-600", border: "border-red-300", bg: "bg-red-50" },
  { id: "CANCEL", label: "CANCEL", icon: Ban, color: "text-slate-500", border: "border-slate-300", bg: "bg-slate-100" },
] as const;

export function SchedulingApprovalPanel({ crq }: { crq: CRQRecord }) {
  const [pick, setPick] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionOwner, setRejectionOwner] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);

  function handlePick(id: string) {
    setPick(id);
    if (id === "PASS") {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
      setRejectionReason("");
      setRejectionOwner("");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Success Message */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <span className="text-sm font-semibold text-green-800">Scheduling approval submitted successfully</span>
        </div>
      )}

      <div>
        <div className="text-sm font-semibold text-slate-800 mb-3">Schedule Approval Decision</div>
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
    </div>
  );
}

export function SchedulingApprovalModal({
  crq,
  onClose,
}: {
  crq: CRQRecord | null;
  onClose: () => void;
}) {
  if (!crq) return null;

  return (
    <Dialog open={!!crq} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-100 grid place-items-center text-slate-600">
              <span className="text-sm font-semibold">≡</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800">CRQ Scheduling</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500">
                CRQ No: <span className="font-mono text-slate-700">{crq.id}</span>
              </span>
            </div>
          </div>
          <span className="w-8" />
        </div>

        <SchedulingApprovalPanel crq={crq} />

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-md"
          >
            CLOSE
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


