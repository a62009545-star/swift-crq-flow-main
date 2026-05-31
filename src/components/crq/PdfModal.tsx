import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Printer, Maximize2 } from "lucide-react";
import { useState } from "react";

export function PdfModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [page, setPage] = useState(1);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs text-slate-600 px-2">{page} / 3</span>
            <button onClick={() => setPage((p) => Math.min(3, p + 1))} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-1">
            {[ZoomIn, ZoomOut, Download, Printer, Maximize2].map((I, i) => (
              <button key={i} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><I className="h-4 w-4" /></button>
            ))}
          </div>
        </div>
        <div className="bg-slate-200 h-[70vh] grid place-items-center">
          <div className="bg-white shadow-lg w-[60%] h-[90%] rounded-sm grid place-items-center text-slate-300 text-sm">
            PDF Page {page} Preview
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
