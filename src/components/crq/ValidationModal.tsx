import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CRQRecord, STATUS_STYLES } from "./data";
import { CheckCircle2, XCircle, Ban } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const VALIDATION_TILES = [
  { id: "PASS", label: "PASS", icon: CheckCircle2, color: "text-green-600", border: "border-green-300", bg: "bg-green-50" },
  { id: "FAILED", label: "FAILED", icon: XCircle, color: "text-red-600", border: "border-red-300", bg: "bg-red-50" },
  { id: "CANCELLED", label: "CANCELLED", icon: Ban, color: "text-slate-500", border: "border-slate-300", bg: "bg-slate-100" },
] as const;

export function ValidationModal({ crq, onClose }: { crq: CRQRecord | null; onClose: () => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [remark, setRemark] = useState("");
  
  if (!crq) return null;
  
  return (
    <Dialog open={!!crq} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4">
          <div className="text-sm font-semibold text-slate-800 mb-1">CRQ Validation</div>
          <div className="text-xs text-slate-500 space-y-0.5">
            <div>CRQ No: <span className="font-mono text-slate-700">{crq.id}</span></div>
            <div>CRQ ID: <span className="font-mono text-slate-700">{crq.olmid || crq.id.split("CRQ")[1]}</span></div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Validation Action Section */}
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Validation Action</div>
            <div className="space-y-2">
              {VALIDATION_TILES.map((tile) => {
                const Icon = tile.icon;
                const active = pick === tile.id;
                return (
                  <button
                    key={tile.id}
                    onClick={() => setPick(tile.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200",
                      active ? `${tile.border} ${tile.bg} shadow-sm` : "border-slate-200 hover:border-slate-300 bg-white",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", tile.color)} />
                    <span className="text-sm font-medium text-slate-700">{tile.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remark Section */}
          <div className="relative">
            <label className="absolute -top-2.5 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">
              Remark (Optional)
            </label>
            <textarea
              rows={4}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Provide a reason for the failure or cancellation..."
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40 flex justify-between">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-600 hover:text-slate-800 px-4 py-2 rounded-md"
          >
            CANCEL
          </button>
          <button
            disabled={!pick}
            className={cn(
              "inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition",
              pick
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-slate-200 text-slate-400 cursor-not-allowed",
            )}
          >
            SUBMIT VALIDATION
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
