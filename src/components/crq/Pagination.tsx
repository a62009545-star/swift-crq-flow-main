import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function Pagination() {
  return (
    <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-end gap-6 text-xs text-slate-600">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select className="border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <option>10</option><option>25</option><option>50</option>
        </select>
      </div>
      <div>1–10 of 246</div>
      <div className="flex items-center gap-1">
        <button disabled className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-40"><ChevronsLeft className="h-4 w-4" /></button>
        <button disabled className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        <button className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><ChevronRight className="h-4 w-4" /></button>
        <button className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><ChevronsRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
