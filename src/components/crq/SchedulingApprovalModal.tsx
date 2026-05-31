import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CRQRecord, STATUS_STYLES } from "./data";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function SchedulingApprovalPanel({ crq }: { crq: CRQRecord }) {
  return (
    <div className="p-12 text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full border-2 border-slate-300 grid place-items-center">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Schedule Found</h2>
        <p className="text-sm text-slate-500">
          There are no phase schedules available for CRQ: <span className="font-mono text-slate-700">{crq.id}</span>.
        </p>
      </div>
    </div>
  );
}

export function SchedulingApprovalModal({ crq, onClose }: { crq: CRQRecord | null; onClose: () => void }) {
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
              <span className="text-xs text-slate-500">CRQ No: <span className="font-mono text-slate-700">{crq.id}</span></span>
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
