import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  PLANS,
  TASKS_BY_CRQ,
  WORKFLOW_BY_CRQ,
  DEFAULT_WORKFLOW,
  STATUS_STYLES,
  mopValidationStatus,
  taskClosureStatus,
  MOPV_STATUS_STYLES,
  CLOSURE_STATUS_STYLES,
  TASK_STATUS_STYLES,
  type CRQRecord,
  type Plan,
  type Task,
} from "@/components/crq/data";
import { Sidebar } from "@/components/crq/Sidebar";
import { Header } from "@/components/crq/Header";
import { PdfModal } from "@/components/crq/PdfModal";
import { MopUploadPanel } from "@/components/crq/MopUploadModal";
import { ValidationModal } from "@/components/crq/ValidationModal";
import { ImpactAnalysisPanel } from "@/components/crq/ImpactAnalysisModal";
import { SchedulingApprovalPanel } from "@/components/crq/SchedulingApprovalModal";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Paperclip,
  ArrowLeft,
  Ban,
  Cpu,
  Activity,
  Network,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  Circle,
  Square,
  Play,
  Pause,
  CheckCheck,
  X,
  ListTodo,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/crq/$crqId")({
  validateSearch: (s: Record<string, unknown>) => ({
    stage: typeof s.stage === "string" ? s.stage : undefined,
  }),
  component: CrqDetail,
});

const STAGE_ID_TO_NAME: Record<string, string> = {
  plan: "Plan & Inventory Validation",
  impact: "Impact Analysis",
  mop: "MOP Creation",
  mopv: "MOP Validation",
  schedule: "Scheduling Approval",
  exec: "Network Execution",
  closure: "Task Closure",
};

const MOP_CREATED_AT: Record<string, string> = {
  CRQ000005983527: "20-Feb-2026 01:30",
  CRQ000005983602: "10-Mar-2026 08:00",
  CRQ000005983710: "10-Mar-2026 10:00",
  CRQ000005984120: "08-Jan-2026 12:00",
};

const RESCHEDULE_REASONS = [
  "Resource Unavailability",
  "Infrastructure Dependency",
  "Business Priority Change",
  "Technical Blocker",
  "Client Request",
  "Regulatory / Compliance Hold",
  "Other",
];

const STAGE_GOVERNANCE: Record<string, { bold: string | null; text: string }[]> = {
  mop_postpone: [
    { bold: null, text: "The rescheduling party does not need to re-approve." },
    { bold: "All other impacted approvers", text: "must re-approve on the new date." },
    { bold: "SLA", text: "will be recalculated from the new proposed date." },
    { bold: "Escalation", text: "will be reset / recalculated accordingly." },
    { bold: "Note:", text: "Postponement beyond 48 hours after MOP creation will retrigger MOP Validation." },
  ],
  mop_postpone_no_mop: [
    { bold: null, text: "The rescheduling party does not need to re-approve." },
    { bold: "All other impacted approvers", text: "must re-approve on the new date." },
    { bold: "SLA", text: "will be recalculated from the new proposed date." },
    { bold: "Escalation", text: "will be reset / recalculated accordingly." },
    { bold: "Note:", text: "MOP not yet created — postponement is allowed directly." },
  ],
  mop_prepone: [
    { bold: null, text: "The rescheduling party does not need to re-approve." },
    { bold: "All other impacted approvers", text: "must re-approve on the new date." },
    { bold: "Preponement", text: "is only allowed if the MOP Creation → Execution gap is greater than 4 days." },
    { bold: "Note:", text: "Preponement within the 4-day margin will require a confirmation." },
  ],
  schedule: [
    { bold: null, text: "The rescheduling party does not need to re-approve." },
    { bold: "All other impacted approvers", text: "must re-approve on the new date." },
    { bold: "SLA", text: "will be recalculated from the new proposed date." },
    { bold: "Escalation", text: "will be reset / recalculated accordingly." },
    { bold: "Impacted parties", text: "must agree on the single date proposed by the rescheduling party." },
  ],
  exec: [
    { bold: "Zero completion:", text: "postponement ≤48 hours allowed by Engineers/TLs." },
    { bold: null, text: "Extensions beyond 48 hours require Domain Head & Function Head approval." },
    { bold: null, text: "MOP Validation stage must be retriggered after such extension approval." },
  ],
  closure: [
    { bold: "Partial completion:", text: "new activity window must be selected within 48 hours." },
    { bold: null, text: "Completed and pending task details remain visible while updating task status." },
    { bold: "Scheduled activity", text: "date and time will be updated based on the newly selected slot." },
  ],
};

function parseDate(s: string): Date | null {
  if (!s) return null;
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const m = s.match(/(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[3], months[m[2]], +m[1], +m[4], +m[5]);
}

function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}
function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// ─── Governance Box ───────────────────────────────────────────────────────────

function GovernanceBox({ rules }: { rules: { bold: string | null; text: string }[] }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
      <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs mb-2">
        <ShieldAlert className="h-3.5 w-3.5" /> Scheduling Governance
      </div>
      <ul className="space-y-1">
        {rules.map((r, i) => (
          <li key={i} className="text-[11px] text-blue-800 flex gap-1.5 leading-relaxed">
            <span className="shrink-0">•</span>
            <span>{r.bold && <strong>{r.bold} </strong>}{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Confirm Banner ───────────────────────────────────────────────────────────

function ConfirmBanner({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 transition">Cancel</button>
        <button onClick={onConfirm} className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 rounded-md transition">Proceed Anyway</button>
      </div>
    </div>
  );
}

// ─── Reschedule Form ──────────────────────────────────────────────────────────

function RescheduleForm({ govKey, onSubmit }: { govKey: string; onSubmit: (d: { startDT: string; endDT: string; reason: string }) => void }) {
  const [startDT, setStartDT] = useState("");
  const [endDT, setEndDT] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!startDT) e.startDT = "Required.";
    if (!endDT) e.endDT = "Required.";
    if (!reason) e.reason = "Please select a reason.";
    if (startDT && endDT && new Date(endDT) <= new Date(startDT)) e.endDT = "End must be after start.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-4">
      <GovernanceBox rules={STAGE_GOVERNANCE[govKey] ?? []} />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">New Proposed Date & Time Range</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 font-medium mb-1 block">Start Date & Time <span className="text-red-500">*</span></label>
            <input type="datetime-local" value={startDT} onChange={(e) => setStartDT(e.target.value)}
              className={cn("w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300", errors.startDT ? "border-red-400" : "border-slate-200")} />
            {errors.startDT && <p className="text-[10px] text-red-500 mt-0.5">{errors.startDT}</p>}
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium mb-1 block">End Date & Time <span className="text-red-500">*</span></label>
            <input type="datetime-local" value={endDT} onChange={(e) => setEndDT(e.target.value)}
              className={cn("w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300", errors.endDT ? "border-red-400" : "border-slate-200")} />
            {errors.endDT && <p className="text-[10px] text-red-500 mt-0.5">{errors.endDT}</p>}
          </div>
        </div>
        <button className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold hover:text-slate-700 transition">
          <Clock className="h-3 w-3" /> Validate NOC Slot
        </button>
      </div>
      <div>
        <label className="text-[11px] text-slate-500 font-medium mb-1 block">Reason for Reschedule <span className="text-red-500">*</span></label>
        <select value={reason} onChange={(e) => setReason(e.target.value)}
          className={cn("w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300", errors.reason ? "border-red-500" : "border-slate-200")}>
          <option value="">Select reason...</option>
          {RESCHEDULE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {errors.reason && <p className="text-[10px] text-red-500 mt-0.5">{errors.reason}</p>}
      </div>
      <button onClick={() => { if (validate()) onSubmit({ startDT, endDT, reason }); }}
        className="w-full py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm">
        Submit Reschedule
      </button>
    </div>
  );
}

// ─── MOP Reschedule Panel ─────────────────────────────────────────────────────

function MopReschedulePanel({ crqId, reviewStart }: { crqId: string; reviewStart: string }) {
  const mopCreatedAt = parseDate(MOP_CREATED_AT[crqId] ?? "");
  const hasMop = !!mopCreatedAt;
  const executionDate = parseDate(reviewStart);
  const [type, setType] = useState<"postpone" | "prepone" | null>(hasMop ? null : "postpone");
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startDT, setStartDT] = useState("");
  const [endDT, setEndDT] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const govKey = type === "postpone" ? (hasMop ? "mop_postpone" : "mop_postpone_no_mop") : "mop_prepone";

  function validate() {
    const e: Record<string, string> = {};
    if (!startDT) e.startDT = "Required.";
    if (!endDT) e.endDT = "Required.";
    if (!reason) e.reason = "Please select a reason.";
    if (startDT && endDT && new Date(endDT) <= new Date(startDT)) e.endDT = "End must be after start.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const newStart = new Date(startDT);
    if (type === "postpone" && mopCreatedAt) {
      if (hoursBetween(mopCreatedAt, newStart) > 48) {
        setConfirmMsg("The new date is more than 48 hours after MOP creation. The MOP Validation stage will be automatically retriggered. Do you want to continue?");
        return;
      }
    }
    if (type === "prepone" && mopCreatedAt && executionDate) {
      const gap = daysBetween(mopCreatedAt, executionDate);
      if (gap <= 4) {
        setConfirmMsg(`Execution is being scheduled before the defined 4-day timeline (current gap: ${gap.toFixed(1)} days). Are you sure you want to prepone?`);
        return;
      }
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        <span className="text-sm text-green-800 font-medium">Reschedule submitted successfully.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasMop ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-xs text-green-800 font-medium">MOP Created</span>
          <span className="ml-auto font-mono text-[11px] text-slate-600 font-semibold">{MOP_CREATED_AT[crqId]}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Circle className="h-4 w-4 text-slate-300" />
          <span>MOP not yet created — direct postponement allowed.</span>
        </div>
      )}
      {confirmMsg && (
        <ConfirmBanner message={confirmMsg} onConfirm={() => { setConfirmMsg(null); setSubmitted(true); }} onCancel={() => setConfirmMsg(null)} />
      )}
      {hasMop && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-700 font-bold mb-2">Reschedule Type <span className="text-red-500">*</span></div>
          <div className="flex gap-6">
            {(["postpone", "prepone"] as const).map((opt) => (
              <label key={opt} className={cn("flex items-center gap-2.5 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition select-none",
                type === opt
                  ? opt === "postpone" ? "border-red-300 bg-red-50 text-red-700" : "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                <input type="radio" name="reschedule-type" value={opt} checked={type === opt} onChange={() => setType(opt)} className="accent-red-600 h-3.5 w-3.5" />
                {opt === "postpone" ? "Postpone" : "Prepone"}
                <span className="text-[10px] text-slate-600 font-semibold">{opt === "postpone" ? "(later date)" : "(earlier date)"}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {type && (
        <>
          <GovernanceBox rules={STAGE_GOVERNANCE[govKey] ?? []} />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-700 font-bold mb-2">New Proposed Date & Time Range</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-700 font-semibold mb-1 block">Start Date & Time <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={startDT} onChange={(e) => setStartDT(e.target.value)}
                  className={cn("w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300", errors.startDT ? "border-red-400" : "border-slate-200")} />
                {errors.startDT && <p className="text-[10px] text-red-500 mt-0.5">{errors.startDT}</p>}
              </div>
              <div>
                <label className="text-[11px] text-slate-700 font-semibold mb-1 block">End Date & Time <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={endDT} onChange={(e) => setEndDT(e.target.value)}
                  className={cn("w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300", errors.endDT ? "border-red-400" : "border-slate-200")} />
                {errors.endDT && <p className="text-[10px] text-red-500 mt-0.5">{errors.endDT}</p>}
              </div>
            </div>
            <button className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold hover:text-slate-700 transition">
              <Clock className="h-3 w-3" /> Validate NOC Slot
            </button>
          </div>
          <div>
            <label className="text-[11px] text-slate-700 font-semibold mb-1 block">Reason for Reschedule <span className="text-red-500">*</span></label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className={cn("w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300", errors.reason ? "border-red-500" : "border-slate-200")}>
              <option value="">Select reason...</option>
              {RESCHEDULE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.reason && <p className="text-[10px] text-red-500 mt-0.5">{errors.reason}</p>}
          </div>
          <button onClick={handleSubmit} className="w-full py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm">
            Submit Reschedule
          </button>
        </>
      )}
    </div>
  );
}

// ─── Reschedule Accordion ─────────────────────────────────────────────────────

function RescheduleAccordion({ label = "Reschedule", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-red-100 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className={cn("w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition", open ? "bg-red-50 text-red-700" : "bg-white text-red-600 hover:bg-red-50/60")}>
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />{label}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform text-red-400", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-red-100 bg-slate-50/60 px-4 py-4">{children}</div>}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ValidationStatus = "Success" | "Pending" | "Failed";
type Checkpoint = {
  name: string;
  status: ValidationStatus;
  by: string;
  ts: string;
  remarks: string;
  attachments: string[];
};

// ─── Rejection details type shared across all stages ─────────────────────────
type RejectionDetails = {
  pick: "PASS" | "FAILED" | "CANCELLED" | null;
  rejectionReason: string;
  rejectionOwner: string;
  rejectionDeviationReason: string;
};

const CHECKPOINTS: Checkpoint[] = [
  { name: "Plan Validation", status: "Success", by: "Rahul Sharma (B0316607)", ts: "12-Mar-2026 09:14", remarks: "Plan reviewed against MOP; activities aligned.", attachments: ["plan_review.pdf"] },
  { name: "Inventory Validation", status: "Success", by: "Amit Verma (B0421987)", ts: "12-Mar-2026 09:48", remarks: "Inventory snapshot verified; spare cards confirmed.", attachments: ["inventory_snapshot.xlsx"] },
  { name: "MOP Validation", status: "Pending", by: "Neha Singh (B0542190)", ts: "—", remarks: "Awaiting peer signoff on rollback steps.", attachments: [] },
  { name: "Risk Validation", status: "Success", by: "Priya Nair (B0612345)", ts: "13-Mar-2026 11:02", remarks: "Risk classified as Low; mitigations attached.", attachments: ["risk_matrix.pdf"] },
  { name: "Schedule Validation", status: "Success", by: "Karan Mehta (B0723451)", ts: "13-Mar-2026 12:30", remarks: "Window approved within CAB calendar.", attachments: [] },
  { name: "Approval Validation", status: "Pending", by: "Sneha Kapoor (B0834512)", ts: "—", remarks: "Final CAB approval queued.", attachments: [] },
  { name: "Execution Validation", status: "Failed", by: "Arjun Rao (B0945123)", ts: "14-Mar-2026 02:11", remarks: "Pre-check failed on uplink port; rework required.", attachments: ["execution_log.txt"] },
  { name: "Closure Validation", status: "Pending", by: "Vivek Sinha (B1056234)", ts: "—", remarks: "Pending post-implementation review.", attachments: [] },
];

function findCrq(crqId: string): { plan: Plan | null; crq: CRQRecord | null } {
  for (const p of PLANS) {
    const c = p.crqs.find((x) => x.id === crqId);
    if (c) return { plan: p, crq: c };
  }
  return { plan: null, crq: null };
}

// ─── Task Status Badge ────────────────────────────────────────────────────────

function TaskStatusBadge({ completed, total }: { completed: number; total: number }) {
  const allDone = completed === total;
  const none = completed === 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
      allDone
        ? "bg-green-50 text-green-700 border-green-200"
        : none
        ? "bg-slate-100 text-slate-500 border-slate-200"
        : "bg-amber-50 text-amber-700 border-amber-200"
    )}>
      {allDone
        ? <CheckCircle2 className="h-3 w-3" />
        : none
        ? <Circle className="h-3 w-3" />
        : <Clock className="h-3 w-3" />
      }
      {completed}/{total} tasks
    </span>
  );
}

// ─── Tasks Modal ──────────────────────────────────────────────────────────────

function TasksModal({ tasks, crqId, onClose }: { tasks: Task[]; crqId: string; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = tasks.filter((t) =>
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = tasks.filter((t) =>
    t.status === "Completed" || t.status === "Closed" || t.status === "Done"
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[80vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ListTodo className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
              <p className="text-[11px] text-slate-700 font-semibold">
                {crqId} — {filtered.length}/{tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
            <input type="text" placeholder="Search by Task ID…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-700 transition">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto p-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Search className="h-8 w-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-600 font-semibold">No tasks match <span className="font-mono text-slate-600">"{search}"</span></p>
            </div>
          ) : (
            filtered.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-150 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="font-mono text-xs text-indigo-600 font-semibold">{task.id}</span>
                  <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-semibold border", TASK_STATUS_STYLES[task.status])}>
                    {task.status}
                  </span>
                </div>
                <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-700 font-bold mb-0.5">NE Label</div>
                    <div className="font-mono text-xs text-slate-700 font-medium">{task.neLabel}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Location Code</div>
                    <div className="text-xs text-slate-600">{task.locationCode}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Profile Types</div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {task.profileTypes.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">{p}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Plan Activity</div>
                    <div className="text-xs text-slate-700 leading-snug">{task.planActivity}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Task Activity</div>
                    <div className="text-xs text-slate-700">{task.taskActivity}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Execution Toast ──────────────────────────────────────────────────────────

function ExecutionToast({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300); }, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={cn("fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border border-indigo-100 bg-white transition-all duration-300",
      visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2")}>
      <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
        <Play className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 leading-tight">Execution Started</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Workflow is now running</p>
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500 rounded-full" style={{ width: "100%", animation: "shrink 2s linear forwards" }} />
      <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
    </div>
  );
}

// ─── Validation Toast ─────────────────────────────────────────────────────────

function ValidationToast({
  pick,
  stageName,
  onDone,
}: {
  pick: "PASS" | "FAILED" | "CANCELLED";
  stageName: string;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const config = {
    PASS: {
      bg: "bg-white",
      border: "border-green-200",
      iconBg: "bg-green-50",
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      title: "Validation Passed",
      sub: stageName,
      bar: "bg-green-500",
    },
    FAILED: {
      bg: "bg-white",
      border: "border-red-200",
      iconBg: "bg-red-50",
      icon: <XCircle className="h-4 w-4 text-red-500" />,
      title: "Validation Failed",
      sub: stageName,
      bar: "bg-red-500",
    },
    CANCELLED: {
      bg: "bg-white",
      border: "border-slate-200",
      iconBg: "bg-slate-100",
      icon: <Ban className="h-4 w-4 text-slate-500" />,
      title: "Validation Cancelled",
      sub: stageName,
      bar: "bg-slate-400",
    },
  }[pick];

  return (
    <div
      className={cn(
        "fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border transition-all duration-300 overflow-hidden",
        config.bg,
        config.border,
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}
    >
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", config.iconBg)}>
        {config.icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 leading-tight">{config.title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{config.sub}</p>
      </div>
      <div
        className={cn("absolute bottom-0 left-0 h-0.5 rounded-full", config.bar)}
        style={{ width: "100%", animation: "shrink 3.5s linear forwards" }}
      />
      <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CrqDetail() {
  const { crqId } = useParams({ from: "/crq/$crqId" });
  const { stage } = useSearch({ from: "/crq/$crqId" });
  const { plan, crq } = findCrq(crqId);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [executionState, setExecutionState] = useState<"idle" | "running" | "paused" | "finished">("idle");
  const [showToast, setShowToast] = useState(false);

  // ── Validation toast state ────────────────────────────────────────────────
  const [validationToast, setValidationToast] = useState<{
    pick: "PASS" | "FAILED" | "CANCELLED";
    stageName: string;
  } | null>(null);

  // ── Unified per-stage rejection state ────────────────────────────────────
  const [stageRejections, setStageRejections] = useState<Record<string, RejectionDetails>>({});

  function handleStageRejectionChange(stageName: string, update: Partial<RejectionDetails>) {
    setStageRejections((prev) => ({
      ...prev,
      [stageName]: {
        ...{ pick: null, rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" },
        ...prev[stageName],
        ...update,
      },
    }));
  }

  // Called when any validation section submits
  function handleValidationSubmit(stageName: string, pick: "PASS" | "FAILED" | "CANCELLED") {
    handleStageRejectionChange(stageName, { pick });
    setValidationToast({ pick, stageName });
  }

  // Legacy adapter used by ValidationSection
  const validationPicks = Object.fromEntries(
    Object.entries(stageRejections).map(([k, v]) => [k, v.pick])
  ) as Record<string, "PASS" | "FAILED" | "CANCELLED" | null>;

  const validationDetails = Object.fromEntries(
    Object.entries(stageRejections).map(([k, v]) => [k, {
      rejectionReason: v.rejectionReason,
      rejectionOwner: v.rejectionOwner,
      rejectionDeviationReason: v.rejectionDeviationReason,
    }])
  ) as Record<string, { rejectionReason: string; rejectionOwner: string; rejectionDeviationReason: string }>;

  const currentStageName = stage ? STAGE_ID_TO_NAME[stage] : undefined;

  function handleStartWorkflow() { setExecutionState("running"); setShowToast(true); }
  function handleFinish() { setExecutionState("finished"); }
  function handlePause() { setExecutionState("paused"); }
  function handleResume() { setExecutionState("running"); setShowToast(true); }

  const isIdle = executionState === "idle";
  const isRunning = executionState === "running";
  const isPaused = executionState === "paused";
  const isFinished = executionState === "finished";

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar active="workflow" onChange={() => {}} />
      <Header crumb={["CRQ Workflow", "CRQ Detail", crqId]} />
      {showToast && <ExecutionToast onDone={() => setShowToast(false)} />}
      {validationToast && (
        <ValidationToast
          pick={validationToast.pick}
          stageName={validationToast.stageName}
          onDone={() => setValidationToast(null)}
        />
      )}

      <div className="ml-[220px] pt-14">
        <div className="px-5 py-5 max-w-[1400px]">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              {isIdle && (
                <button onClick={handleStartWorkflow} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-sm transition">
                  <Play className="h-3.5 w-3.5" /> Start Workflow
                </button>
              )}
              {isRunning && (
                <>
                  <button onClick={handlePause} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 shadow-sm transition">
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                  <button onClick={handleFinish} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 shadow-sm transition">
                    <CheckCheck className="h-3.5 w-3.5" /> Finish
                  </button>
                </>
              )}
              {isPaused && (
                <>
                  <button onClick={handleResume} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-sm transition">
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                  <button onClick={handleFinish} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 shadow-sm transition">
                    <CheckCheck className="h-3.5 w-3.5" /> Finish
                  </button>
                </>
              )}
              {isFinished && <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium" />}
            </div>
          </div>

          {/* ── Dark header card ── */}
          <div className="rounded-xl overflow-hidden mb-4 shadow-sm" style={{ background: "linear-gradient(135deg, #1a1040 0%, #1e2a5e 55%, #1a3a6e 100%)" }}>
            <div className="px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(147, 197, 253, 1)" }}>CRQ Number</div>
                  <h1 className="font-mono text-xl font-semibold text-white tracking-tight">{crqId}</h1>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {crq && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(34,197,94,0.2)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />{crq.status}
                      </span>
                    )}
                    {plan && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(99,179,237,0.2)", color: "#90cdf4", border: "1px solid rgba(99,179,237,0.3)" }}>
                        {plan.type}
                      </span>
                    )}
                    {crq?.location && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(167,139,250,0.2)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.3)" }}>
                        {crq.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(251,191,36,0.15)", color: "#fcd34d", border: "1px solid rgba(251,191,36,0.3)" }}>
                      <span className="text-[9px] opacity-70 uppercase tracking-wide">Priority</span> Medium
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}>
                      <span className="text-[9px] opacity-70 uppercase tracking-wide">Risk</span> Low
                    </span>
                  </div>
                </div>
                {isRunning && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-[11px] font-medium" style={{ color: "rgba(134,239,172,0.9)" }}>Running</span></div>}
                {isPaused && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[11px] font-medium" style={{ color: "rgba(252,211,77,0.9)" }}>Paused</span></div>}
                {isFinished && <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" style={{ color: "rgba(134,239,172,0.9)" }} /><span className="text-[11px] font-medium" style={{ color: "rgba(134,239,172,0.9)" }}>Completed</span></div>}
              </div>
            </div>
            {plan && (
              <div className="grid grid-cols-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                {[
                  { icon: <Square className="h-3 w-3" />, label: "Plan ID", value: plan.id },
                  { icon: <Calendar className="h-3 w-3" />, label: "Execution Window", value: "06-Mar-2026 09:00 — 06-Mar-2026 09:30" },
                  { icon: null, label: "Assigned Team", value: "IP Access — CCB North" },
                  { icon: null, label: "Total Tasks", value: String(plan.crqs.length) },
                ].map((m, i) => (
                  <div key={i} className="px-4 py-3" style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : undefined }}>
                    <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(147, 197, 253, 1)" }}>{m.icon}{m.label}</div>
                    <div className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.85)", fontFamily: i === 0 ? "monospace" : undefined }}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!crq ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-500">
              CRQ <span className="font-mono">{crqId}</span> not found.
            </div>
          ) : (
            <div className="space-y-3">
              <PlanDetailsSectionInner plan={plan!} crqId={crq.id} onPreview={() => setPdfOpen(true)} />
              <CRQAttributesSection
                crq={crq}
                plan={plan!}
                currentStageName={currentStageName}
                stageRejections={stageRejections}
                onStageRejectionChange={handleStageRejectionChange}
              />
              <ValidationSection
                crq={crq}
                stage={stage}
                currentStageName={currentStageName}
                stageRejections={stageRejections}
                onPickChange={(pick) => {
                  const stageName = stage ? STAGE_ID_TO_NAME[stage] : undefined;
                  if (stageName && pick) handleStageRejectionChange(stageName, { pick });
                }}
                onDetailsChange={(details) => {
                  const stageName = stage ? STAGE_ID_TO_NAME[stage] : undefined;
                  if (stageName) handleStageRejectionChange(stageName, details);
                }}
                onSubmit={(pick) => {
                  const stageName = stage ? STAGE_ID_TO_NAME[stage] : "Validation";
                  handleValidationSubmit(stageName, pick);
                }}
              />
            </div>
          )}
        </div>
      </div>
      <PdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, defaultOpen = true, right, children }: {
  title: string; subtitle?: string; defaultOpen?: boolean; right?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left group">
          <Square className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400 transition" />
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {subtitle && <span className="text-xs text-slate-400">— {subtitle}</span>}
        </button>
        <div className="flex items-center gap-2">
          {right}
          <button onClick={() => setOpen((o) => !o)} className="p-1 rounded hover:bg-slate-50 text-slate-300 hover:text-slate-500 transition">
            <Square className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open && <div className="px-5 py-5">{children}</div>}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="group rounded-lg border border-slate-200 px-4 py-3 bg-white hover:border-indigo-300 hover:shadow-sm transition-all duration-150 cursor-default">
      <div className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 leading-none group-hover:text-indigo-600 transition-colors duration-150">
        {label}
      </div>
      <div className={cn("text-[14px] text-slate-900 font-semibold leading-snug", mono && "font-mono text-[12px] text-slate-700")}>
        {value ?? <span className="text-slate-400 font-normal">—</span>}
      </div>
    </div>
  );
}

function FieldGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={cn("grid gap-3", cols === 3 && "grid-cols-3", cols === 2 && "grid-cols-2")}>
      {children}
    </div>
  );
}

// ─── Rejection badge helper ───────────────────────────────────────────────────

function RejectionBadge({ pick }: { pick: "PASS" | "FAILED" | "CANCELLED" | null | undefined }) {
  if (!pick) return <span className="text-slate-400 font-normal">—</span>;
  const map = {
    PASS: "bg-green-50 text-green-700 border-green-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
    CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return <span className={cn("text-[11px] px-2.5 py-1 rounded-md font-semibold border inline-block", map[pick])}>{pick}</span>;
}

// ─── Plan Details ─────────────────────────────────────────────────────────────

function PlanDetailsSectionInner({ plan, onPreview, crqId }: { plan: Plan; onPreview: () => void; crqId?: string }) {
  const [tasksModal, setTasksModal] = useState<{ tasks: Task[]; crqId: string } | null>(null);

  return (
    <>
      <Section
        title="Plan Details"
        subtitle="Tasks for this CRQ"
        right={
          <button onClick={onPreview} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-600 transition">
            <FileText className="h-3.5 w-3.5" /> Preview Plan PDF
          </button>
        }
      >
        <div className="space-y-4">
          {(crqId ? plan.crqs.filter((c) => c.id === crqId) : plan.crqs).map((c) => {
            const tasks = TASKS_BY_CRQ[c.id] ?? TASKS_BY_CRQ.default;
            const completedCount = tasks.filter((t) =>
              t.status === "Completed" || t.status === "Closed" || t.status === "Done"
            ).length;

            return (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <ListTodo className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">CRQ</span>
                      <span className="font-mono text-xs text-indigo-600 font-semibold">{c.id}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <TaskStatusBadge completed={completedCount} total={tasks.length} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setTasksModal({ tasks, crqId: c.id })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-600 text-xs font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition shadow-sm"
                >
                  <ListTodo className="h-3.5 w-3.5" />
                  View Tasks
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      {tasksModal && (
        <TasksModal tasks={tasksModal.tasks} crqId={tasksModal.crqId} onClose={() => setTasksModal(null)} />
      )}
    </>
  );
}

// ─── Validation status icon map ───────────────────────────────────────────────

const STATUS_ICON: Record<ValidationStatus, { icon: React.ElementType; cls: string; pill: string }> = {
  Success: { icon: CheckCircle2, cls: "text-green-600", pill: "bg-green-50 text-green-700 border-green-200" },
  Pending: { icon: Clock, cls: "text-amber-600", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  Failed: { icon: XCircle, cls: "text-red-600", pill: "bg-red-50 text-red-700 border-red-200" },
};

// ─── Stage field builder ──────────────────────────────────────────────────────

type StageDef = { name: string; fields: { label: string; value: React.ReactNode }[] };

function buildRejectionRows(details: RejectionDetails | undefined): { label: string; value: React.ReactNode }[] {
  if (!details || details.pick === "PASS" || details.pick === null) return [];
  return [
    { label: "Validation Result", value: <RejectionBadge pick={details.pick} /> },
    { label: "Rejection Reason", value: details.rejectionReason || "—" },
    { label: "Rejection Owner", value: details.rejectionOwner || "—" },
    { label: "Rejection Deviation Reason", value: details.rejectionDeviationReason || "—" },
  ];
}

function buildStages(crq: CRQRecord, stageRejections: Record<string, RejectionDetails>): StageDef[] {
  return [
    {
      name: "Plan & Inventory Validation",
      fields: [
        { label: "Support Company – Change Coordinator", value: "Bharti Airtel Ltd" },
        { label: "Support Organization – Change Coordinator", value: "Network Operations" },
        { label: "Support Group Name – Change Coordinator", value: "IP-CCB-NORTH-COORD" },
        { label: "Plan Document", value: "PLAN_" + crq.id + ".pdf" },
        { label: "Plan Document Status", value: <span className="text-[11px] px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 font-medium inline-block">Approved</span> },
        { label: "Plan Preview", value: "Available" },
        { label: "Plan Validation", value: "System Validated" },
        { label: "Plan Validation Action", value: "Approve" },
        { label: "Remark", value: "Plan validated successfully against network inventory. All changes documented." },
        ...buildRejectionRows(stageRejections["Plan & Inventory Validation"]),
      ],
    },
    {
      name: "Impact Analysis",
      fields: [
        { label: "Change Impact", value: crq.impact },
        { label: "Actual Impact", value: "Non Service Affecting" },
        { label: "Technology", value: "IP / MPLS" },
        { label: "Impact Analysis Status", value: "Completed" },
        { label: "Impact Analysis Completed By", value: "Amit Verma (B0421987)" },
        { label: "Impact Analysis Completed Time", value: "11-Mar-2026 14:22" },
        { label: "B2B Impacted", value: "No" },
        { label: "Impacted Circles", value: (crq.location ?? "DEL").split("-")[0] },
        { label: "Impacted Parties", value: "Enterprise, Mobility" },
        { label: "Business Justification", value: "Capacity augmentation" },
        { label: "Change ID", value: crq.id },
        { label: "Type of CR", value: "Normal" },
        { label: "Domain", value: "IP / MPLS" },
        { label: "Remark", value: "Impact analysis completed. No dependencies identified. Customer notification sent." },
        ...buildRejectionRows(stageRejections["Impact Analysis"]),
      ],
    },
    {
      name: "MOP Creation",
      fields: [
        { label: "SOP Document Available", value: "Yes" },
        { label: "MOP Created By", value: MOP_CREATED_AT[crq.id] ? "Neha Singh (B0542190)" : "—" },
        { label: "MOP Created Time", value: MOP_CREATED_AT[crq.id] ?? "—" },
        { label: "MOP Creation Method", value: MOP_CREATED_AT[crq.id] ? "Template Based" : "—" },
        { label: "MOP Created Attachment", value: MOP_CREATED_AT[crq.id] ? "MOP_" + crq.id + ".pdf" : "—" },
        { label: "SOP Document", value: "SOP_" + crq.id + ".pdf" },
        { label: "MOP Document", value: "MOP_" + crq.id + ".pdf" },
        { label: "Remark", value: "MOP created from standard template. All rollback procedures documented and verified." },
      ],
    },
    {
      name: "MOP Validation",
      fields: [
        { label: "Validated MOP Attachment", value: "MOP_" + crq.id + "_validated.pdf" },
        { label: "MOP Validation Action", value: "Approve" },
        { label: "MOP Validation Remarks", value: "Rollback steps verified; pre/post checks aligned." },
        { label: "Validator Name", value: "Priya Nair (B0612345)" },
        { label: "Validation Time", value: "12-Mar-2026 18:40" },
        { label: "Status*", value: <span className={cn("text-[11px] px-2.5 py-1 rounded-md font-medium inline-block", MOPV_STATUS_STYLES[mopValidationStatus(crq.status)])}>{mopValidationStatus(crq.status)}</span> },
        { label: "MOP Creation Method", value: "Template Based" },
        { label: "SOP Document", value: "SOP_" + crq.id + ".pdf" },
        { label: "MOP Document", value: "MOP_" + crq.id + ".pdf" },
        { label: "MOP Created By", value: "Neha Singh (B0542190)" },
        { label: "MOP Created By Time", value: "12-Mar-2026 09:15" },
        { label: "Remark", value: "All validation criteria met. Equipment compatibility confirmed. Ready for execution." },
        ...buildRejectionRows(stageRejections["MOP Validation"]),
      ],
    },
    {
      name: "Scheduling Approval",
      fields: [
        { label: "Status*", value: crq.status },
        { label: "Scheduled Start Date+", value: crq.reviewStart },
        { label: "Scheduled End Date+", value: crq.reviewEnd },
        { label: "CRQ Scheduled By", value: "Karan Mehta (B0723451)" },
        { label: "CRQ Scheduled By Time", value: "13-Mar-2026 10:05" },
        { label: "Activity Executed By*", value: "Sneha Kapoor (B0834512)" },
        { label: "Business Justification", value: "Capacity augmentation for Q1 traffic growth." },
        { label: "L3 Approver OLM ID", value: "B0945123" },
        { label: "Remark", value: "Scheduling approved. NOC slot confirmed. All approvers notified." },
        ...buildRejectionRows(stageRejections["Scheduling Approval"]),
      ],
    },
    {
      name: "Network Execution",
      fields: [
        { label: "Customer Type", value: "Enterprise" },
        { label: "Network Type", value: "IP / MPLS" },
        { label: "MOP Preparation Method", value: "Template Based" },
        { label: "Vendor Name", value: crq.vendor },
        { label: "Change Requestor", value: "Rahul Sharma (B0316607)" },
        { label: "Status Reason", value: "Execution in window" },
        { label: "Reason for Rollback", value: "—" },
        { label: "Actual Start Date", value: "16-Mar-2026 22:00" },
        { label: "Actual End Date", value: "16-Mar-2026 23:15" },
        { label: "Support Company – Change Implementer", value: "Nokia Solutions" },
        { label: "Support Organization – Change Implementer", value: "Field Operations" },
        { label: "Support Group Name – Change Implementer", value: "IP-CCB-NORTH-IMPL" },
        { label: "Actual Implementer Name", value: "Sneha Kapoor" },
        { label: "Actual Implementer Phone No", value: "+91-98xxxxxx21" },
        { label: "Exit Criteria Fulfilled", value: "Yes" },
        { label: "MOP Referred During Activity", value: "MOP_" + crq.id + ".pdf" },
        { label: "Pre Check Done", value: "Yes" },
        { label: "Pre-Checks Done By", value: "Arjun Rao (B0945123)" },
        { label: "Pre-Check Done Time", value: "16-Mar-2026 21:30" },
        { label: "Post Check Done", value: "Yes" },
        { label: "Requested Date Deviation Reason", value: "—" },
        { label: "Executer Location", value: crq.location ?? "—" },
        { label: "MOP Execution Method", value: "Manual + CLI Script" },
        { label: "CRQ Approval Status", value: crq.status },
        { label: "Hardware Change", value: "Yes" },
        { label: "Related Alarms", value: "None" },
        { label: "Remark", value: "Execution completed successfully. All post-checks passed. No issues encountered during implementation." },
        ...buildRejectionRows(stageRejections["Network Execution"]),
      ],
    },
    {
      name: "Task Closure",
      fields: [
        { label: "Status", value: <span className={cn("text-[11px] px-2.5 py-1 rounded-md font-medium inline-block", CLOSURE_STATUS_STYLES[taskClosureStatus(crq.status)])}>{taskClosureStatus(crq.status)}</span> },
        { label: "Change Activity Done", value: "Yes" },
        { label: "Change Activity Done Time", value: "16-Mar-2026 23:30" },
        { label: "Completed Date", value: "17-Mar-2026 09:10" },
        { label: "CRQ Closed By", value: "Rahul Sharma (B0316607)" },
        { label: "CRQ Closed By Time", value: "17-Mar-2026 09:12" },
        { label: "Remark", value: "All tasks completed successfully. Documentation updated. Change closure approved." },
        ...buildRejectionRows(stageRejections["Task Closure"]),
      ],
    },
  ];
}

const STAGE_RESCHEDULE: Record<string, { label: string; govKey: string }> = {
  "MOP Creation": { label: "Reschedule CRQ", govKey: "mop" },
  "Scheduling Approval": { label: "Reschedule CRQ", govKey: "schedule" },
  "Network Execution": { label: "Reschedule CRQ", govKey: "exec" },
  "Task Closure": { label: "Reschedule CRQ", govKey: "closure" },
};

// ─── Combined CRQ Attributes Section ─────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700">{label}</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      {children}
    </div>
  );
}

function CRQAttributesSection({
  crq,
  plan,
  currentStageName,
  stageRejections,
  onStageRejectionChange,
}: {
  crq: CRQRecord;
  plan: Plan;
  currentStageName?: string;
  stageRejections: Record<string, RejectionDetails>;
  onStageRejectionChange: (stageName: string, update: Partial<RejectionDetails>) => void;
}) {
  const allStages = buildStages(crq, stageRejections);
  const cutoffIdx = currentStageName ? allStages.findIndex((s) => s.name === currentStageName) : -1;
  const visibleStages = cutoffIdx >= 0 ? allStages.slice(0, cutoffIdx + 1) : allStages;

  const tabs = ["General", ...visibleStages.map((s) => s.name)];
  const [active, setActive] = useState("General");

  const isCanceled = crq.status === "Canceled";
  const reschedCfg = STAGE_RESCHEDULE[active];
  const currentStage = visibleStages.find((s) => s.name === active);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Square className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-sm font-semibold text-slate-800">CRQ Attributes</span>
          <span className="text-xs text-slate-500">— General details & stage-wise fields</span>
        </div>
      </div>

      {/* ── Folder tab bar ── */}
      <div className="flex items-end gap-0 px-5 pt-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab === active;
          const stageObj = visibleStages.find((s) => s.name === tab);
          const rejection = stageObj ? stageRejections[stageObj.name] : undefined;
          const pickDot = rejection?.pick
            ? rejection.pick === "PASS" ? "bg-green-400"
            : rejection.pick === "FAILED" ? "bg-red-400"
            : "bg-slate-400"
            : null;

          return (
            <button key={tab} onClick={() => setActive(tab)}
              className={cn("group relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 border-t border-x rounded-t-lg -mb-px",
                isActive ? "bg-white border-slate-200 text-slate-800 shadow-[0_-2px_6px_rgba(99,102,241,0.08)] z-10"
                : "bg-slate-50 border-transparent text-slate-400 hover:text-slate-700 hover:bg-white hover:border-slate-200 hover:shadow-[0_-2px_4px_rgba(0,0,0,0.04)]")}>
              {tab === "General" && (
                <span className={cn("w-1.5 h-1.5 rounded-full transition-all duration-150", isActive ? "bg-indigo-500" : "bg-slate-300 group-hover:bg-indigo-300")} />
              )}
              {tab}
              {stageObj && (
                <span className={cn("ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-400")}>
                  {stageObj.fields.length}
                </span>
              )}
              {pickDot && (
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", pickDot)} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="px-6 py-5">
        {active === "General" && (
          <div className="space-y-6">
            <FieldGroup label="Requestor Details">
              <FieldGrid cols={3}>
                <Field label="Requestor Name" value="Rahul Sharma" />
                <Field label="Requestor Email" value="rahul.sharma@airtel.com" />
                <Field label="Requestor Phone" value="+91-98765-43210" />
              </FieldGrid>
            </FieldGroup>
            <FieldGroup label="Location Details">
              <FieldGrid cols={3}>
                <Field label="Circle" value={(crq.location ?? "DELHI-DEL").split("-")[0]} />
                <Field label="Region" value="North" />
                <Field label="Site Readiness - Hostname" value={(crq.location ?? "DEL") + "-CORE-01"} mono />
                <Field label="Site Readiness - Layer" value="Access" />
                <Field label="OEM Vendor" value={crq.vendor} />
                <Field label="Vendor Email" value="vendor.support@example.com" />
                <Field label="Vendor Phone Number" value="+1-800-xyz-9999" />
                <Field label="Site Readiness Done Date" value="13-Mar-2026 11:02" mono />
              </FieldGrid>
            </FieldGroup>
          </div>
        )}

        {currentStage && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {currentStage.fields.map((f) => (
                <Field key={f.label} label={f.label} value={f.value}
                  mono={typeof f.value === "string" && (f.label.toLowerCase().includes("time") || f.label.toLowerCase().includes("date") || f.label.toLowerCase().includes("document"))} />
              ))}
            </div>

            {reschedCfg && !isCanceled && (
              active === "MOP Creation" ? (
                <RescheduleAccordion label="Reschedule CRQ">
                  <MopReschedulePanel crqId={crq.id} reviewStart={crq.reviewStart} />
                </RescheduleAccordion>
              ) : (
                <RescheduleAccordion label={reschedCfg.label}>
                  <RescheduleForm govKey={reschedCfg.govKey} onSubmit={(d) => console.log("Reschedule submitted", { stage: active, ...d })} />
                </RescheduleAccordion>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MOP Validation Panel ─────────────────────────────────────────────────────

function MopValidationPanel({
  crq,
  stageRejections,
  onRejectionChange,
  onSubmit,
}: {
  crq: CRQRecord;
  stageRejections: Record<string, RejectionDetails>;
  onRejectionChange: (stageName: string, update: Partial<RejectionDetails>) => void;
  onSubmit?: (pick: "PASS" | "FAILED" | "CANCELLED") => void;
}) {
  const stageName = "MOP Validation";
  const current = stageRejections[stageName] ?? { pick: null, rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" };
  const [remark, setRemark] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const OPTIONS = [
    { id: "PASS" as const, label: "PASS", icon: CheckCircle2, activeColor: "text-green-500", activeBorder: "border-green-400", activeBg: "bg-green-50/60" },
    { id: "FAILED" as const, label: "FAILED", icon: XCircle, activeColor: "text-red-500", activeBorder: "border-red-400", activeBg: "bg-red-50/60" },
    { id: "CANCELLED" as const, label: "CANCELLED", icon: Ban, activeColor: "text-slate-400", activeBorder: "border-slate-300", activeBg: "bg-slate-50" },
  ];

  if (submitted) {
    return (
      <div className="p-6">
        <div className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3",
          current.pick === "PASS" ? "bg-green-50 border-green-100" :
          current.pick === "FAILED" ? "bg-red-50 border-red-100" :
          "bg-slate-50 border-slate-200"
        )}>
          {current.pick === "PASS" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
          {current.pick === "FAILED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
          {current.pick === "CANCELLED" && <Ban className="h-4 w-4 text-slate-400 shrink-0" />}
          <span className={cn("text-sm font-medium",
            current.pick === "PASS" ? "text-green-800" :
            current.pick === "FAILED" ? "text-red-800" :
            "text-slate-700"
          )}>
            Validation submitted —{" "}
            <span className="font-semibold">{current.pick}</span>
          </span>
        </div>
      </div>
    );
  }

  const showRejectionForm = current.pick === "FAILED" || current.pick === "CANCELLED";
  const canSubmit = !!current.pick && (!showRejectionForm || (!!current.rejectionReason && !!current.rejectionOwner));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1.5">CRQ Validation</h2>
        <p className="text-xs text-slate-500">CRQ No: <span className="font-mono text-slate-700">{crq.id}</span></p>
        <p className="text-xs text-slate-500">CRQ ID: <span className="font-mono text-slate-700">{crq.olmid ?? "B0945123"}</span></p>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Validation Action</div>
        <div className="space-y-2.5">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = current.pick === opt.id;
            return (
              <button key={opt.id} onClick={() => onRejectionChange(stageName, { pick: opt.id })}
                className={cn("w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl border-2 transition-all duration-150 text-left",
                  active ? `${opt.activeBorder} ${opt.activeBg} shadow-sm` : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60")}>
                <Icon className={cn("h-5 w-5 shrink-0 transition-colors", active ? opt.activeColor : "text-slate-300")} />
                <span className={cn("text-sm font-semibold tracking-wide transition-colors", active ? "text-slate-800" : "text-slate-400")}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showRejectionForm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <h4 className="font-semibold text-amber-900 text-sm">Rejection Details</h4>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Reason <span className="text-red-500">*</span></label>
            <textarea rows={2} value={current.rejectionReason}
              onChange={(e) => onRejectionChange(stageName, { rejectionReason: e.target.value })}
              placeholder="Enter rejection reason..."
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Owner <span className="text-red-500">*</span></label>
            <input type="text" value={current.rejectionOwner}
              onChange={(e) => onRejectionChange(stageName, { rejectionOwner: e.target.value })}
              placeholder="Enter owner name or ID..."
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Deviation Reason</label>
            <textarea rows={2} value={current.rejectionDeviationReason}
              onChange={(e) => onRejectionChange(stageName, { rejectionDeviationReason: e.target.value })}
              placeholder="Enter deviation reason (optional)..."
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1.5">
          Remark <span className="normal-case font-normal">(Optional)</span>
        </label>
        <textarea rows={4} value={remark} onChange={(e) => setRemark(e.target.value)}
          placeholder="Provide a reason for the failure or cancellation..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none transition" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          onClick={() => {
            onRejectionChange(stageName, { pick: null, rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" });
            setRemark("");
          }}
          className="text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest transition"
        >
          Reset
        </button>
        <button
          disabled={!canSubmit}
          onClick={() => {
            if (current.pick) {
              setSubmitted(true);
              onSubmit?.(current.pick);
            }
          }}
          className={cn(
            "px-6 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-lg transition shadow-sm",
            canSubmit
              ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          Submit Validation
        </button>
      </div>
    </div>
  );
}

// ─── Validation Section ───────────────────────────────────────────────────────

function ValidationSection({
  crq,
  stage,
  currentStageName,
  stageRejections,
  onPickChange,
  onDetailsChange,
  onSubmit,
}: {
  crq: CRQRecord;
  stage?: string;
  currentStageName?: string;
  stageRejections: Record<string, RejectionDetails>;
  onPickChange: (v: "PASS" | "FAILED" | "CANCELLED" | null) => void;
  onDetailsChange?: (details: Partial<RejectionDetails>) => void;
  onSubmit?: (pick: "PASS" | "FAILED" | "CANCELLED") => void;
}) {
  const stageName = stage ? STAGE_ID_TO_NAME[stage] : undefined;
  const current = stageName ? stageRejections[stageName] : undefined;
  const currentPick = current?.pick ?? null;

  // Local submitted state for plan stage
  const [planSubmitted, setPlanSubmitted] = useState(false);

  if (stage === "exec" || stage === "closure") return null;

  if (stage === "mopv") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <MopValidationPanel
          crq={crq}
          stageRejections={stageRejections}
          onRejectionChange={(sn, update) => {
            if (update.pick !== undefined) onPickChange(update.pick);
            onDetailsChange?.(update);
          }}
          onSubmit={(pick) => onSubmit?.(pick)}
        />
      </div>
    );
  }

  if (stage === "mop") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <MopUploadPanel crqId={crq.id} />
      </div>
    );
  }

  if (stage === "impact") {
    return (
      <Section title="Validation" subtitle="Impact Analysis Review">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <ImpactAnalysisPanel crq={crq} onPickChange={(v) => {
            const normalized = v === "FAIL" ? "FAILED" : v === "CANCEL" ? "CANCELLED" : v;
            onPickChange(normalized);
          }} />
        </div>
      </Section>
    );
  }

  if (stage === "schedule") {
    return (
      <Section title="Validation" subtitle="Scheduling Approval">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <SchedulingApprovalPanel crq={crq} />
        </div>
      </Section>
    );
  }

  if (stage === "plan") {
    // ── Submitted state for plan stage ──
    if (planSubmitted) {
      return (
        <Section title="Validation" subtitle="CRQ Validation">
          <div className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-3",
            currentPick === "PASS" ? "bg-green-50 border-green-100" :
            currentPick === "FAILED" ? "bg-red-50 border-red-100" :
            "bg-slate-50 border-slate-200"
          )}>
            {currentPick === "PASS" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
            {currentPick === "FAILED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
            {currentPick === "CANCELLED" && <Ban className="h-4 w-4 text-slate-400 shrink-0" />}
            <span className={cn("text-sm font-medium",
              currentPick === "PASS" ? "text-green-800" :
              currentPick === "FAILED" ? "text-red-800" :
              "text-slate-700"
            )}>
              Validation submitted —{" "}
              <span className="font-semibold">{currentPick}</span>
            </span>
          </div>
        </Section>
      );
    }

    const showRejectionForm = currentPick === "FAILED" || currentPick === "CANCELLED";
    const canSubmit = !!currentPick && (!showRejectionForm || (!!current?.rejectionReason && !!current?.rejectionOwner));

    return (
      <Section title="Validation" subtitle="CRQ Validation">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-5 p-6">
            <div className="col-span-12 md:col-span-5 space-y-3">
              {VALIDATION_TILES.map((t) => {
                const Icon = t.icon;
                const isSelected = currentPick === t.id;
                return (
                  <div key={t.id}>
                    <button
                      onClick={() => {
                        onPickChange(t.id as "PASS" | "FAILED" | "CANCELLED");
                        if (t.id === "PASS") {
                          onDetailsChange?.({ rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" });
                        }
                      }}
                      className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                        isSelected ? `${t.border} ${t.bg} scale-[1.02] shadow-sm` : "border-slate-200 hover:border-slate-300")}>
                      <Icon className={cn("h-6 w-6", t.color)} />
                      <span className="font-semibold text-slate-800">{t.label}</span>
                    </button>

                    {isSelected && (t.id === "FAILED" || t.id === "CANCELLED") && (
                      <div className="mt-3 p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-3">
                        <h4 className="font-semibold text-amber-900 text-sm">Rejection Details</h4>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Reason <span className="text-red-500">*</span></label>
                          <textarea rows={2} value={current?.rejectionReason ?? ""}
                            onChange={(e) => onDetailsChange?.({ rejectionReason: e.target.value })}
                            placeholder="Enter rejection reason..."
                            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Owner <span className="text-red-500">*</span></label>
                          <input type="text" value={current?.rejectionOwner ?? ""}
                            onChange={(e) => onDetailsChange?.({ rejectionOwner: e.target.value })}
                            placeholder="Enter owner name or ID..."
                            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Deviation Reason</label>
                          <textarea rows={2} value={current?.rejectionDeviationReason ?? ""}
                            onChange={(e) => onDetailsChange?.({ rejectionDeviationReason: e.target.value })}
                            placeholder="Enter deviation reason (optional)..."
                            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="relative pt-3">
                <label className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">CHM Remark</label>
                <textarea rows={4} placeholder="Add your remarks…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-none" />
              </div>
              {/* ── Submit button for plan stage ── */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    onPickChange(null);
                    onDetailsChange?.({ rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" });
                  }}
                  className="text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest transition"
                >
                  Reset
                </button>
                <button
                  disabled={!canSubmit}
                  onClick={() => {
                    if (currentPick) {
                      setPlanSubmitted(true);
                      onSubmit?.(currentPick);
                    }
                  }}
                  className={cn(
                    "px-6 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-lg transition shadow-sm",
                    canSubmit
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  Submit Validation
                </button>
              </div>
            </div>
            <div className="col-span-12 md:col-span-7 space-y-4 max-h-70 overflow-y-auto scrollbar-thin">
              <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
                {VALIDATION_CHECKPOINTS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.title} className="min-w-50 rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="h-4 w-4 text-indigo-500" />
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">{c.count}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 mb-2">{c.title}</div>
                      <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-50 px-4 py-2 text-[11px] uppercase tracking-wide font-medium text-slate-500">
                  <div>NiamReachable</div><div>AdrsReachable</div><div>LastDiscoveryTime</div>
                </div>
                <div className="grid grid-cols-3 px-4 py-3 text-xs text-slate-700">
                  <div>Node NotAvailable in NIAM via IPPMS</div>
                  <div>Inventory available in UIG</div>
                  <div className="font-mono">2026-05-15 00:35:35</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  // ── Fallback: generic checkpoint validation ──
  return (
    <Section title="Validation" subtitle="Checkpoint-wise validation status">
      <ValidationPanel
        onPickChange={onPickChange}
        onSubmit={(pick) => onSubmit?.(pick)}
      />
    </Section>
  );
}

// ─── Validation tiles / checkpoints / panel ───────────────────────────────────

const VALIDATION_TILES = [
  { id: "PASS", label: "PASS", icon: CheckCircle2, color: "text-green-600", border: "border-green-300", bg: "bg-green-50" },
  { id: "FAILED", label: "FAILED", icon: XCircle, color: "text-red-600", border: "border-red-300", bg: "bg-red-50" },
  { id: "CANCELLED", label: "CANCELLED", icon: Ban, color: "text-slate-500", border: "border-slate-300", bg: "bg-slate-100" },
] as const;

const VALIDATION_CHECKPOINTS = [
  { title: "Node Details", icon: Cpu, count: 12, progress: 80 },
  { title: "Interface / Traffic / Power", icon: Activity, count: 8, progress: 55 },
  { title: "IS-IS Adjacency", icon: Network, count: 4, progress: 30 },
];

function ValidationPanel({
  onPickChange,
  onSubmit,
}: {
  onPickChange?: (v: "PASS" | "FAILED" | "CANCELLED" | null) => void;
  onSubmit?: (pick: "PASS" | "FAILED" | "CANCELLED") => void;
}) {
  const [pick, setPick] = useState<"PASS" | "FAILED" | "CANCELLED" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handlePick(v: "PASS" | "FAILED" | "CANCELLED") {
    setPick(v);
    onPickChange?.(v);
  }

  function handleSubmit() {
    if (!pick) return;
    setSubmitted(true);
    onSubmit?.(pick);
  }

  if (submitted) {
    return (
      <div className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3",
        pick === "PASS" ? "bg-green-50 border-green-100" :
        pick === "FAILED" ? "bg-red-50 border-red-100" :
        "bg-slate-50 border-slate-200"
      )}>
        {pick === "PASS" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
        {pick === "FAILED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
        {pick === "CANCELLED" && <Ban className="h-4 w-4 text-slate-400 shrink-0" />}
        <span className={cn("text-sm font-medium",
          pick === "PASS" ? "text-green-800" :
          pick === "FAILED" ? "text-red-800" :
          "text-slate-700"
        )}>
          Validation submitted —{" "}
          <span className="font-semibold">{pick}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 md:col-span-5 space-y-3">
        {VALIDATION_TILES.map((t) => {
          const Icon = t.icon;
          const active = pick === t.id;
          return (
            <button key={t.id} onClick={() => handlePick(t.id)}
              className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                active ? `${t.border} ${t.bg} scale-[1.02] shadow-sm` : "border-slate-200 hover:border-slate-300")}>
              <Icon className={cn("h-6 w-6", t.color)} />
              <span className="font-semibold text-slate-800">{t.label}</span>
            </button>
          );
        })}
        <div className="relative pt-3">
          <label className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">CHM Remark</label>
          <textarea rows={4} placeholder="Add your remarks…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-none" />
        </div>
        {/* ── Submit / Reset row ── */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={() => { setPick(null); onPickChange?.(null); }}
            className="text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest transition"
          >
            Reset
          </button>
          <button
            disabled={!pick}
            onClick={handleSubmit}
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
      <div className="col-span-12 md:col-span-7 space-y-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
          {VALIDATION_CHECKPOINTS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="min-w-[200px] rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">{c.count}</span>
                </div>
                <div className="text-xs font-medium text-slate-700 mb-2">{c.title}</div>
                <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-50 px-4 py-2 text-[11px] uppercase tracking-wide font-medium text-slate-500">
            <div>NiamReachable</div><div>AdrsReachable</div><div>LastDiscoveryTime</div>
          </div>
          <div className="grid grid-cols-3 px-4 py-3 text-xs text-slate-700">
            <div>Node NotAvailable in NIAM via IPPMS</div>
            <div>Inventory available in UIG</div>
            <div className="font-mono">2026-05-15 00:35:35</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckpointCard({ cp }: { cp: Checkpoint }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_ICON[cp.status];
  const Icon = cfg.icon;
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left">
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <Icon className={cn("h-4 w-4", cfg.cls)} />
        <span className="text-sm font-medium text-slate-800 flex-1">{cp.name}</span>
        <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", cfg.pill)}>{cp.status}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Validated By" value={cp.by} />
            <Field label="Validation Timestamp" value={cp.ts} />
            <Field label="Validation Status" value={<span className={cn("px-2 py-0.5 rounded-full border text-[11px]", cfg.pill)}>{cp.status}</span>} />
          </div>
          <div className="mt-4"><Field label="Validation Remarks" value={cp.remarks} /></div>
          {cp.attachments.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">Supporting Attachments</div>
              <div className="flex flex-wrap gap-2">
                {cp.attachments.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 text-xs text-slate-700 px-2 py-1 rounded-md border border-slate-200 bg-white">
                    <Paperclip className="h-3 w-3 text-slate-400" />{a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}