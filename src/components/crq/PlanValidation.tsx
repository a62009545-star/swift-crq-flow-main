import { useState } from "react";
import { PLANS, Plan, CRQRecord, STATUS_STYLES, TASKS_BY_CRQ, mopValidationStatus, taskClosureStatus, MOPV_STATUS_STYLES, CLOSURE_STATUS_STYLES, TASK_STATUS_STYLES } from "./data";
import { ChevronRight, Eye, ExternalLink, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ValidationModal } from "./ValidationModal";
import { MopUploadModal } from "./MopUploadModal";
import { PdfModal } from "./PdfModal";
import { CrqDrawer } from "./CrqDrawer";
import { SchedulingApprovalModal } from "./SchedulingApprovalModal";
import { ImpactAnalysisModal } from "./ImpactAnalysisModal";
import { PlanValidationModal } from "./Planvalidationmodal";
import { Link } from "@tanstack/react-router";

type ColDef = { key: string; label: string; render: (ctx: { plan: Plan; crq: CRQRecord }) => React.ReactNode };

const idCol = (stage?: string): ColDef => ({
  key: "id",
  label: "CRQ Number  |  Plan ID",
  render: ({ plan, crq }) => (
    <span className="whitespace-nowrap">
      <Link
        to="/crq/$crqId"
        params={{ crqId: crq.id }}
        search={{ stage: stage ?? undefined }}
        className="font-mono text-xs text-indigo-600 font-medium hover:text-indigo-700 hover:underline"
      >
        {crq.id}
      </Link>
      <span className="font-mono text-xs text-slate-300 mx-1.5">|</span>
      <span className="font-mono text-xs text-slate-600">{plan.id}</span>
    </span>
  ),
});

const statusCol = (label = "Review Status"): ColDef => ({
  key: "status",
  label,
  render: ({ crq }) => (
    <span className={cn("text-[11px] px-2 py-0.5 rounded-full inline-block", STATUS_STYLES[crq.status])}>{crq.status}</span>
  ),
});

const txt = (key: string, label: string, get: (c: { plan: Plan; crq: CRQRecord }) => React.ReactNode): ColDef => ({
  key,
  label,
  render: (ctx) => <span className="text-xs text-slate-600 whitespace-nowrap">{get(ctx)}</span>,
});

const mono = (key: string, label: string, get: (c: { plan: Plan; crq: CRQRecord }) => React.ReactNode): ColDef => ({
  key,
  label,
  render: (ctx) => <span className="font-mono text-xs text-slate-600">{get(ctx)}</span>,
});

function columnsForStage(stage: string | undefined): ColDef[] {
  switch (stage) {
    case "impact":
      return [
        idCol(stage),
        txt("loc", "Location Code", ({ crq }) => crq.location ?? "-"),
        txt("sd", "Start Date", ({ crq }) => crq.reviewStart),
        txt("ed", "End Date", ({ crq }) => crq.reviewEnd),
        statusCol("CRQ Status"),
        txt("iss", "Impact Status", ({ crq }) => crq.impact),
        txt("istart", "Impact Start", ({ crq }) => crq.reviewStart),
        txt("iend", "Impact End", ({ crq }) => crq.reviewEnd),
        mono("olm", "OLM ID Impact Analysis", ({ crq }) => crq.olmid),
        txt("vendor", "Vendor", ({ crq }) => crq.vendor),
      ];
    case "mop":
      return [
        idCol(stage),
        txt("desc", "Description", ({ plan }) => plan.description),
        txt("mct", "MOP Created Time", ({ crq }) => crq.reviewStart),
        statusCol("CRQ Status"),
        txt("mcs", "MOP Creation Status", ({ crq }) => (crq.status === "Approved" ? "Created" : "Pending")),
        mono("mcb", "MOP Created By", ({ crq }) => crq.olmid),
        txt("mcm", "MOP Creation Method", () => "Manual"),
      ];
    case "mopv":
      return [
        idCol(stage),
        txt("desc", "Description", ({ plan }) => plan.description),
        txt("mvt", "MOP Validation Time", ({ crq }) => crq.reviewEnd),
        {
          key: "mvs",
          label: "MOP Validation Status",
          render: ({ crq }) => {
            const s = mopValidationStatus(crq.status);
            return (
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full inline-block", MOPV_STATUS_STYLES[s])}>{s}</span>
            );
          },
        },
        {
          key: "crs",
          label: "CRQ Status",
          render: ({ crq }) => {
            const s = mopValidationStatus(crq.status);
            return (
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full inline-block", MOPV_STATUS_STYLES[s])}>{s}</span>
            );
          },
        },
      ];
    case "schedule":
      return [
        idCol(stage),
        statusCol("Status"),
        txt("ssd", "Scheduled Start Date", ({ crq }) => crq.reviewStart),
        txt("sed", "Scheduled End Date", ({ crq }) => crq.reviewEnd),
        mono("csb", "CRQ Scheduled By", ({ crq }) => crq.olmid),
        txt("csbt", "CRQ Scheduled By Time", ({ crq }) => crq.reviewStart),
        mono("aex", "Activity Executed By", ({ crq }) => crq.olmid),
        txt("bj", "Business Justification", () => "Approved network change"),
        mono("l3", "L3 Approver OLM ID", ({ crq }) => crq.olmid),
      ];
    case "closure":
      return [
        idCol(stage),
        {
          key: "st",
          label: "Status",
          render: ({ crq }) => {
            const s = taskClosureStatus(crq.status);
            return (
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full inline-block", CLOSURE_STATUS_STYLES[s])}>{s}</span>
            );
          },
        },
        txt("cad", "Change Activity Done", ({ crq }) => (crq.status === "Approved" ? "Yes" : "No")),
        txt("cd", "Completed Date", ({ crq }) => crq.reviewEnd),
        mono("ccb", "CRQ Closed By", ({ crq }) => crq.olmid),
        txt("ccbt", "CRQ Closed By Time", ({ crq }) => crq.reviewEnd),
      ];
    case "exec":
    case "plan":
    default:
      return [
        idCol(stage),
        statusCol("Review Status"),
        mono("olm", "OLMID Review", ({ crq }) => crq.olmid),
        txt("rs", "Review Start", ({ crq }) => crq.reviewStart),
        txt("re", "Review End", ({ crq }) => crq.reviewEnd),
        txt("imp", "Remedy Change Impact", ({ crq }) => crq.impact),
        txt("vendor", "Vendor", ({ crq }) => crq.vendor),
      ];
  }
}

export function PlanValidation({ title = "Plan & Inventory Validation", stage }: { title?: string; stage?: string } = {}) {
  const [taskOpen, setTaskOpen]       = useState<Set<string>>(new Set());
  const [valCrq, setValCrq]           = useState<CRQRecord | null>(null);
  const [mopCrq, setMopCrq]           = useState<CRQRecord | null>(null);
  const [impactCrq, setImpactCrq]     = useState<CRQRecord | null>(null);
  const [scheduleCrq, setScheduleCrq] = useState<CRQRecord | null>(null);
  // ── NEW: plan-stage validation modal ──────────────────────────────────────
  const [planValCrq, setPlanValCrq]   = useState<CRQRecord | null>(null);
  const [pdfOpen, setPdfOpen]         = useState(false);
  const [drawerCrq, setDrawerCrq]     = useState<CRQRecord | null>(null);
  const [search, setSearch]           = useState("");

  const toggleTask = (id: string) => {
    setTaskOpen((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const rows: { plan: Plan; crq: CRQRecord }[] = PLANS.flatMap((p) =>
    p.crqs.map((c) => ({ plan: p, crq: c })),
  ).filter(({ plan, crq }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return plan.id.toLowerCase().includes(q) || crq.id.toLowerCase().includes(q);
  });

  const cols    = columnsForStage(stage);
  const colSpan = cols.length + 3; // +3: expander, checkbox, actions

  const handleEyeClick = (crq: CRQRecord) => {
    if (stage === "impact") {
      setImpactCrq(crq);
    } else if (stage === "schedule") {
      setScheduleCrq(crq);
    } else if (stage === "mop") {
      setMopCrq(crq);
    } else if (stage === "plan") {
      // ── Plan & Inventory Validation → open the checkpoint popup ──────────
      setPlanValCrq(crq);
    } else {
      setValCrq(crq);
    }
  };

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">{rows.length}</span>
        </div>
        <div className="flex items-center bg-white rounded-lg border border-slate-200 px-3 py-2 w-72 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-400 transition">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Plans / CRQs / Tasks..."
            className="flex-1 bg-transparent text-sm focus:outline-none px-2"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50/60">
                <th className="text-left font-medium py-2.5 pl-4 pr-3 w-8"></th>
                <th className="text-left font-medium py-2.5 pr-3 w-8"></th>
                {cols.map((c) => (
                  <th key={c.key} className="text-left font-medium py-2.5 pr-3 whitespace-nowrap">{c.label}</th>
                ))}
                <th className="text-left font-medium py-2.5 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={colSpan} className="text-center py-8 text-xs text-slate-400">No matching records.</td></tr>
              ) : rows.map(({ plan, crq }) => (
                <CrqFlatRow
                  key={crq.id}
                  plan={plan}
                  crq={crq}
                  cols={cols}
                  colSpan={colSpan}
                  open={taskOpen.has(crq.id)}
                  onToggle={() => toggleTask(crq.id)}
                  onEye={() => handleEyeClick(crq)}
                  onPdf={() => setPdfOpen(true)}
                  onDrawer={() => setDrawerCrq(crq)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ValidationModal        crq={valCrq}      onClose={() => setValCrq(null)} />
      <MopUploadModal         crq={mopCrq}      onClose={() => setMopCrq(null)} />
      <ImpactAnalysisModal    crq={impactCrq}   onClose={() => setImpactCrq(null)} />
      <SchedulingApprovalModal crq={scheduleCrq} onClose={() => setScheduleCrq(null)} />

      {/* Plan & Inventory Validation popup */}
      <PlanValidationModal    crq={planValCrq}  onClose={() => setPlanValCrq(null)} />

      <PdfModal               open={pdfOpen}    onClose={() => setPdfOpen(false)} />
      <CrqDrawer              crq={drawerCrq}   onClose={() => setDrawerCrq(null)} />
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function CrqFlatRow({
  plan,
  crq,
  cols,
  colSpan,
  open,
  onToggle,
  onEye,
  onPdf,
  onDrawer,
}: {
  plan: Plan;
  crq: CRQRecord;
  cols: ColDef[];
  colSpan: number;
  open: boolean;
  onToggle: () => void;
  onEye: () => void;
  onPdf: () => void;
  onDrawer: () => void;
}) {
  const tasks = TASKS_BY_CRQ.default;
  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50/60 transition">
        <td className="py-2.5 pl-4 pr-3">
          <button onClick={onToggle} className="p-1 rounded hover:bg-slate-100 text-slate-400">
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
        </td>
        <td className="py-2.5 pr-3"></td>
        {cols.map((c) => (
          <td key={c.key} className="py-2.5 pr-3">{c.render({ plan, crq })}</td>
        ))}
        <td className="py-2.5 pr-4">
          <div className="flex items-center gap-1">
            <ActionBtn title="View Validation" onClick={onEye}><Eye className="h-3.5 w-3.5" /></ActionBtn>
            <ActionBtn title="Open details (double-click)" onClick={onDrawer} onDouble={onDrawer}><ExternalLink className="h-3.5 w-3.5" /></ActionBtn>
            <ActionBtn title="View PDF" onClick={onPdf}><FileText className="h-3.5 w-3.5" /></ActionBtn>
          </div>
        </td>
      </tr>
      {open && tasks.map((t) => (
        <tr key={t.id} className="bg-indigo-50/30">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="text-xs font-semibold text-indigo-600 mb-2">
              Tasks Associated with CRQ{" "}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{tasks.length}</span>
            </div>
            <div className="grid grid-cols-7 gap-3 text-xs">
              <div><div className="text-[10px] uppercase text-slate-400">Task ID</div><div className="font-mono text-slate-700 break-all">{t.id}</div></div>
              <div><div className="text-[10px] uppercase text-slate-400">NE Label</div><div className="font-mono text-slate-700 break-all">{t.neLabel}</div></div>
              <div><div className="text-[10px] uppercase text-slate-400">Plan Activity Details</div><div className="text-slate-700">{t.planActivity}</div></div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 mb-1">Task Profile Type</div>
                <div className="flex flex-wrap gap-1">
                  {t.profileTypes.map((p) => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">{p}</span>
                  ))}
                </div>
              </div>
              <div><div className="text-[10px] uppercase text-slate-400">Location Code</div><div className="text-slate-700">{t.locationCode}</div></div>
              <div><div className="text-[10px] uppercase text-slate-400">Task Activity</div><div className="text-slate-700">{t.taskActivity}</div></div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 mb-1">Task Status</div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full inline-block", TASK_STATUS_STYLES[t.status])}>{t.status}</span>
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  children,
  title,
  onClick,
  onDouble,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  onDouble?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      onDoubleClick={onDouble}
      className="p-1.5 rounded-md hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition"
    >
      {children}
    </button>
  );
}