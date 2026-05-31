import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CRQRecord } from "./data";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, UploadCloud, ThumbsUp, ThumbsDown, XCircle, CheckCircle2, MessageSquare } from "lucide-react";

const OUTCOMES = [
  { id: "PASS", label: "PASS (SUCCESS)", icon: ThumbsUp, color: "text-green-600", border: "border-green-300", bg: "bg-green-50" },
  { id: "FAILED", label: "FAILED", icon: ThumbsDown, color: "text-red-600", border: "border-red-300", bg: "bg-red-50" },
  { id: "CANCELED", label: "CANCELED", icon: XCircle, color: "text-slate-500", border: "border-slate-300", bg: "bg-slate-100" },
] as const;

export function MopUploadPanel({ crqId, onCancel, onSubmit }: { crqId: string; onCancel?: () => void; onSubmit?: () => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [remark, setRemark] = useState("");
  const canSubmit = !!pick && !!file;
  return (
    <div className="bg-white">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-rose-50 grid place-items-center text-rose-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">Upload and Finalize MOP</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500">CRQ No: <span className="font-mono text-slate-700">{crqId}</span></span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-0">
        <div className="col-span-12 md:col-span-6 border-r border-slate-100 p-5">
          <label className="block h-[360px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/40 grid place-items-center cursor-pointer hover:bg-slate-50 transition">
            <div className="text-center px-6">
              <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <div className="text-sm font-medium text-slate-700">
                {file ? file.name : "Click to upload or drag & drop"}
              </div>
              <div className="text-xs text-slate-400 mt-1">PDF only (Max 50MB)</div>
            </div>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="col-span-12 md:col-span-6 p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">Execution Status</div>
            <div className="text-xs text-slate-500 mt-1">Select the final outcome of the MOP execution.</div>
          </div>
          <div className="h-px bg-slate-100" />
          <div className="space-y-2.5">
            {OUTCOMES.map((o) => {
              const Icon = o.icon;
              const active = pick === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setPick(o.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200",
                    active ? `${o.border} ${o.bg} shadow-sm` : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <Icon className={cn("h-5 w-5", o.color)} />
                  <span className="text-sm font-semibold text-slate-700">{o.label}</span>
                </button>
              );
            })}
          </div>
          <div className="relative pt-3">
            <label className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">Remark (Optional)</label>
            <div className="flex gap-2 border border-slate-200 rounded-lg p-2 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-400 transition">
              <MessageSquare className="h-4 w-4 text-slate-400 mt-1" />
              <textarea
                rows={4}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Add any relevant notes…"
                className="flex-1 text-sm focus:outline-none resize-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-100 bg-slate-50/40">
        <button
          onClick={onCancel}
          className="text-xs font-medium text-slate-600 hover:text-slate-800 px-4 py-2 rounded-md"
        >
          CANCEL
        </button>
        <button
          onClick={() => canSubmit && onSubmit?.()}
          disabled={!canSubmit}
          className={cn(
            "inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition",
            canSubmit ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-200 text-slate-400 cursor-not-allowed",
          )}
        >
          <CheckCircle2 className="h-4 w-4" /> UPLOAD & SUBMIT STATUS
        </button>
      </div>
    </div>
  );
}

export function MopUploadModal({ crq, onClose }: { crq: CRQRecord | null; onClose: () => void }) {
  if (!crq) return null;
  return (
    <Dialog open={!!crq} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden">
        <MopUploadPanel crqId={crq.id} onCancel={onClose} onSubmit={onClose} />
      </DialogContent>
    </Dialog>
  );
}