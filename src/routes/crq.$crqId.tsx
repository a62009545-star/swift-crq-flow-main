import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/crq/$crqId")({
  validateSearch: (s: Record<string, unknown>) => ({ stage: typeof s.stage === "string" ? s.stage : undefined }),
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

// ─── Demo: MOP creation dates for certain CRQs ───────────────────────────────
const MOP_CREATED_AT: Record<string, string> = {
  CRQ000005983527: "20-Feb-2026 01:30",
  CRQ000005983602: "10-Mar-2026 08:00",
  CRQ000005983710: "10-Mar-2026 10:00",
  CRQ000005984120: "08-Jan-2026 12:00",
};

// ─── Reschedule governance rules ─────────────────────────────────────────────

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

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

// ─── Shared governance box ────────────────────────────────────────────────────

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

// ─── Inline confirm banner ────────────────────────────────────────────────────

function ConfirmBanner({
  message,
  onConfirm,
  onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 rounded-md transition"
        >
          Proceed Anyway
        </button>
      </div>
    </div>
  );
}

// ─── Generic reschedule form (date + reason + submit) ────────────────────────

function RescheduleForm({
  govKey,
  onSubmit,
}: {
  govKey: string;
  onSubmit: (d: { startDT: string; endDT: string; reason: string }) => void;
}) {
  const [startDT, setStartDT] = useState("");
  const [endDT, setEndDT]     = useState("");
  const [reason, setReason]   = useState("");
  const [errors, setErrors]   = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!startDT) e.startDT = "Required.";
    if (!endDT)   e.endDT   = "Required.";
    if (!reason)  e.reason  = "Please select a reason.";
    if (startDT && endDT && new Date(endDT) <= new Date(startDT)) e.endDT = "End must be after start.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-4">
      <GovernanceBox rules={STAGE_GOVERNANCE[govKey] ?? []} />

      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
          New Proposed Date & Time Range
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 font-medium mb-1 block">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startDT}
              onChange={(e) => setStartDT(e.target.value)}
              className={cn(
                "w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300",
                errors.startDT ? "border-red-400" : "border-slate-200"
              )}
            />
            {errors.startDT && <p className="text-[10px] text-red-500 mt-0.5">{errors.startDT}</p>}
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium mb-1 block">
              End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={endDT}
              onChange={(e) => setEndDT(e.target.value)}
              className={cn(
                "w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300",
                errors.endDT ? "border-red-400" : "border-slate-200"
              )}
            />
            {errors.endDT && <p className="text-[10px] text-red-500 mt-0.5">{errors.endDT}</p>}
          </div>
        </div>
        <button className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition">
          <Clock className="h-3 w-3" /> Validate NOC Slot
        </button>
      </div>

      <div>
        <label className="text-[11px] text-slate-500 font-medium mb-1 block">
          Reason for Reschedule <span className="text-red-500">*</span>
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={cn(
            "w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300",
            errors.reason ? "border-red-500" : "border-slate-200"
          )}
        >
          <option value="">Select reason...</option>
          {RESCHEDULE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {errors.reason && <p className="text-[10px] text-red-500 mt-0.5">{errors.reason}</p>}
      </div>

      <button
        onClick={() => { if (validate()) onSubmit({ startDT, endDT, reason }); }}
        className="w-full py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm"
      >
        Submit Reschedule
      </button>
    </div>
  );
}

// ─── MOP Creation Reschedule Panel ───────────────────────────────────────────

function MopReschedulePanel({ crqId, reviewStart }: { crqId: string; reviewStart: string }) {
  const mopCreatedAt     = parseDate(MOP_CREATED_AT[crqId] ?? "");
  const hasMop           = !!mopCreatedAt;
  const executionDate    = parseDate(reviewStart);

  const [type, setType]             = useState<"postpone" | "prepone" | null>(hasMop ? null : "postpone");
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);
  const [startDT, setStartDT]       = useState("");
  const [endDT, setEndDT]           = useState("");
  const [reason, setReason]         = useState("");
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const govKey =
    type === "postpone"
      ? hasMop ? "mop_postpone" : "mop_postpone_no_mop"
      : "mop_prepone";

  function validate() {
    const e: Record<string, string> = {};
    if (!startDT) e.startDT = "Required.";
    if (!endDT)   e.endDT   = "Required.";
    if (!reason)  e.reason  = "Please select a reason.";
    if (startDT && endDT && new Date(endDT) <= new Date(startDT)) e.endDT = "End must be after start.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const newStart = new Date(startDT);

    if (type === "postpone" && mopCreatedAt) {
      if (hoursBetween(mopCreatedAt, newStart) > 48) {
        setConfirmMsg(
          "The new date is more than 48 hours after MOP creation. The MOP Validation stage will be automatically retriggered. Do you want to continue?"
        );
        return;
      }
    }
    if (type === "prepone" && mopCreatedAt && executionDate) {
      const gap = daysBetween(mopCreatedAt, executionDate);
      if (gap <= 4) {
        setConfirmMsg(
          `Execution is being scheduled before the defined 4-day timeline (current gap: ${gap.toFixed(1)} days) as per the configured logic. Are you sure you want to prepone?`
        );
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
          <span className="ml-auto font-mono text-[11px] text-slate-500">{MOP_CREATED_AT[crqId]}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Circle className="h-4 w-4 text-slate-300" />
          <span>MOP not yet created — direct postponement allowed.</span>
        </div>
      )}

      {confirmMsg && (
        <ConfirmBanner
          message={confirmMsg}
          onConfirm={() => { setConfirmMsg(null); setSubmitted(true); }}
          onCancel={() => setConfirmMsg(null)}
        />
      )}

      {hasMop && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Reschedule Type <span className="text-red-500">*</span></div>
          <div className="flex gap-6">
            {(["postpone", "prepone"] as const).map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-2.5 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition select-none",
                  type === opt
                    ? opt === "postpone"
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name="reschedule-type"
                  value={opt}
                  checked={type === opt}
                  onChange={() => setType(opt)}
                  className="accent-red-600 h-3.5 w-3.5"
                />
                {opt === "postpone" ? "Postpone" : "Prepone"}
                <span className="text-[10px] text-slate-400 font-normal">
                  {opt === "postpone" ? "(later date)" : "(earlier date)"}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {type && (
        <>
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
            <button className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition">
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

          <button onClick={handleSubmit} className="w-full py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm">
            Submit Reschedule
          </button>
        </>
      )}
    </div>
  );
}

// ─── Reusable expandable reschedule accordion ─────────────────────────────────

function RescheduleAccordion({
  label = "Reschedule",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-red-100 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition",
          open ? "bg-red-50 text-red-700" : "bg-white text-red-600 hover:bg-red-50/60"
        )}
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {label}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform text-red-400", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-red-100 bg-slate-50/60 px-4 py-4">
          {children}
        </div>
      )}
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

const MOCK_TASKS = [
  { name: "Pre-check NE health", owner: "Rahul Sharma", status: "Done", timeline: "12-Mar 09:00 → 09:30" },
  { name: "Backup current config", owner: "Amit Verma", status: "Done", timeline: "12-Mar 10:00 → 10:20" },
  { name: "Card insertion", owner: "Neha Singh", status: "In Progress", timeline: "16-Mar 22:00 → 22:45" },
  { name: "Port-up & verify", owner: "Priya Nair", status: "Pending", timeline: "16-Mar 22:45 → 23:15" },
  { name: "Closure report", owner: "Karan Mehta", status: "Pending", timeline: "17-Mar 09:00 → 09:30" },
];

function findCrq(crqId: string): { plan: Plan | null; crq: CRQRecord | null } {
  for (const p of PLANS) {
    const c = p.crqs.find((x) => x.id === crqId);
    if (c) return { plan: p, crq: c };
  }
  return { plan: null, crq: null };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CrqDetail() {
  const { crqId } = useParams({ from: "/crq/$crqId" });
  const { stage } = useSearch({ from: "/crq/$crqId" });
  const { plan, crq } = findCrq(crqId);
  const [pdfOpen, setPdfOpen] = useState(false);
  const currentStageName = stage ? STAGE_ID_TO_NAME[stage] : undefined;

  return (
    <div className="min-h-screen bg-slate-50/60">
      <Sidebar active="workflow" onChange={() => {}} />
      <Header crumb={["CRQ Workflow", "CRQ Detail", crqId]} />
      <div className="ml-[220px] pt-14">
        <div className="px-6 py-5 max-w-[1400px]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">CRQ Number</div>
                <h1 className="font-mono text-base font-semibold text-slate-900">{crqId}</h1>
              </div>
              {crq && (
                <span className={cn("text-[11px] px-2 py-0.5 rounded-full ml-2", STATUS_STYLES[crq.status])}>{crq.status}</span>
              )}
            </div>
            <button
              onClick={() => setPdfOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 shadow-sm transition"
            >
              <FileText className="h-3.5 w-3.5" /> Start Workflow
            </button>
          </div>

          {!crq ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-500">
              CRQ <span className="font-mono">{crqId}</span> not found.
            </div>
          ) : (
            <div className="space-y-4">
              <PlanDetailsSectionInner plan={plan!} crqId={crq.id} onPreview={() => setPdfOpen(true)} />
              <CrqDetailsSection crq={crq} plan={plan!} currentStageName={currentStageName} />
              <StageDetailsSection crq={crq} currentStageName={currentStageName} />
              <ValidationSection crq={crq} stage={stage} />
            </div>
          )}
        </div>
      </div>
      <PdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Shared Section wrapper
───────────────────────────────────────────────────────────────────────────── */

function Section({
  title,
  subtitle,
  defaultOpen = true,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left group">
          {open
            ? <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            : <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />}
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {subtitle && <span className="text-xs text-slate-400">— {subtitle}</span>}
        </button>
        {right}
      </div>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">{label}</div>
      <div className={cn("text-sm text-slate-800", mono && "font-mono text-xs")}>{value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   A. Plan Details
───────────────────────────────────────────────────────────────────────────── */

function PlanDetailsSectionInner({ plan, onPreview, crqId }: { plan: Plan; onPreview: () => void; crqId?: string }) {
  return (
    <Section
      title="Plan Details"
      subtitle="Plan attributes, execution window, team & tasks"
      right={
        <button
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700"
        >
          <FileText className="h-3.5 w-3.5" /> Preview Plan PDF
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <Field label="Plan ID" value={plan.id} mono />
        <Field label="Plan Name" value={plan.description || "Plan"} />
        <Field label="Planned Activity" value={plan.type} />
        <Field label="Execution Window" value="16-Mar-2026 22:00 → 23:30 IST" />
        <Field label="Assigned Team" value="IP Access — CCB North" />
        <Field label="Total CRQs" value={String(plan.crqs.length)} />
      </div>
      <div className="text-xs font-semibold text-indigo-600 mb-3">
        {crqId ? `Tasks for ${crqId}` : "Tasks per CRQ"}
      </div>
      <div className="space-y-4">
        {(crqId ? plan.crqs.filter((c) => c.id === crqId) : plan.crqs).map((c) => {
          const tasks = TASKS_BY_CRQ[c.id] ?? TASKS_BY_CRQ.default;
          return (
            <div key={c.id} className="border border-slate-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50/70 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">CRQ</span>
                  <span className="font-mono text-xs text-slate-800">{c.id}</span>
                </div>
                <span className="text-[11px] text-slate-500">{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {tasks.map((t) => <TaskDetailCard key={t.id} task={t} />)}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function TaskDetailCard({ task }: { task: Task }) {
  return (
    <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 bg-white">
      <Field label="Task ID" value={task.id} mono />
      <Field label="NE Label" value={task.neLabel} mono />
      <Field label="Plan Activity Details" value={task.planActivity} />
      <div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Task Profile Type</div>
        <div className="flex flex-wrap gap-1">
          {task.profileTypes.map((p) => (
            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{p}</span>
          ))}
        </div>
      </div>
      <Field label="Location Code" value={task.locationCode} />
      <Field label="Task Activity" value={task.taskActivity} />
      <Field
        label="Task Status"
        value={<span className={cn("text-[11px] px-2 py-0.5 rounded-full inline-block", TASK_STATUS_STYLES[task.status])}>{task.status}</span>}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   B. CRQ Details
───────────────────────────────────────────────────────────────────────────── */

function CrqDetailsSection({ crq, plan, currentStageName }: { crq: CRQRecord; plan: Plan; currentStageName?: string }) {
  const wf = WORKFLOW_BY_CRQ[crq.id] ?? DEFAULT_WORKFLOW;
  const currentStage = wf.find((w) => w.empId)?.stage ?? "Not started";
  const stageFields = currentStageName
    ? buildStages(crq).find((s) => s.name === currentStageName)?.fields ?? []
    : [];
  return (
    <Section title="CRQ Details" subtitle="Full change request attributes">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <Field label="CRQ Number" value={crq.id} mono />
        <Field label="Plan Reference" value={plan.id} mono />
        <Field label="Change Type" value={plan.type} />
        <Field label="Change Reason" value="Capacity augmentation & card addition" />
        <Field label="Impacted Circle" value={(crq.location ?? "DELHI-DEL").split("-")[0]} />
        <Field label="Impacted Party" value="Enterprise & Mobility customers" />
        <Field label="Priority" value={<span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">Medium</span>} />
        <Field label="Risk" value={<span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[11px]">Low</span>} />
        <Field label="Schedule" value={`${crq.reviewStart} → ${crq.reviewEnd}`} />
        <Field label="Current Workflow Stage" value={currentStage} />
        <Field label="Approval Status" value={<span className={cn("px-2 py-0.5 rounded-full text-[11px]", STATUS_STYLES[crq.status])}>{crq.status}</span>} />
        <Field label="Vendor" value={crq.vendor} />
        <Field label="Status" value={<span className={cn("px-2 py-0.5 rounded-full text-[11px]", STATUS_STYLES[crq.status])}>{crq.status}</span>} />
        <Field label="Support Company - Change Coordinator" value="Bharti Airtel Ltd" />
        <Field label="Support Organization - Change Coordinator" value="Network Operations" />
        <Field label="Support Group Name+ - Change Coordinator" value="IP-CCB-NORTH-COORD" />
        <Field label="Support Company - Change Implementer" value="Nokia Solutions" />
        <Field label="Support Organization - Change Implementer" value="Field Operations" />
        <Field label="Support Group Name+ - Change Implementer" value="IP-CCB-NORTH-IMPL" />
        <Field label="Scheduled Implementar" value={`${crq.olmid} — Karan Mehta`} />
        <Field label="CRQ Validated By" value="Amit Verma (B0421987)" />
        <Field label="CRQ Validated Time" value="13-Mar-2026 11:02" />
        <Field label="Node IP Address" value="10.142.88.21" mono />
        <Field label="Reason for Cancellation Rejection" value="—" />
        <Field label="Cancellation Rejection Rollback Owner" value="—" />
        <Field label="Reason for Cancellation Rejection Deviation" value="—" />
        <Field label="Host Name" value={(crq.location ?? "DEL") + "-CORE-01"} mono />
        <Field label="Layer" value="Access" />
        <div className="md:col-span-2">
          <Field label="Remarks / Comments" value="Card addition validated against latest MOP. Rollback documented. Field team briefed for the execution window." />
        </div>
      </div>
      {stageFields.length > 0 && (
        <>
          <div className="mt-6 mb-3 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-indigo-600">{currentStageName} — Stage Details</span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {stageFields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} mono={f.label.toLowerCase().includes("time") || f.label.toLowerCase().includes("date")} />
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   C. Validation status icon map
───────────────────────────────────────────────────────────────────────────── */

const STATUS_ICON: Record<ValidationStatus, { icon: React.ElementType; cls: string; pill: string }> = {
  Success: { icon: CheckCircle2, cls: "text-green-600", pill: "bg-green-50 text-green-700 border-green-200" },
  Pending: { icon: Clock,        cls: "text-amber-600", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  Failed:  { icon: XCircle,      cls: "text-red-600",   pill: "bg-red-50 text-red-700 border-red-200" },
};

/* ─────────────────────────────────────────────────────────────────────────────
   B2. Stage-wise CRQ Details  +  Reschedule accordion per stage
───────────────────────────────────────────────────────────────────────────── */

type StageDef = { name: string; fields: { label: string; value: React.ReactNode }[] };

function buildStages(crq: CRQRecord): StageDef[] {
  const commonCancel = [
    { label: "Reason for Cancellation Rejection", value: "—" },
    { label: "Cancellation Rejection Rollback Owner", value: "—" },
    { label: "Reason for Cancellation Rejection Deviation", value: "—" },
  ];
  return [
    {
      name: "Plan & Inventory Validation",
      fields: [
        { label: "Support Company – Change Coordinator", value: "Bharti Airtel Ltd" },
        { label: "Support Organization – Change Coordinator", value: "Network Operations" },
        { label: "Support Group Name – Change Coordinator", value: "IP-CCB-NORTH-COORD" },
        { label: "Plan Document", value: "PLAN_" + crq.id + ".pdf" },
        { label: "Plan Document Status", value: "Approved" },
        { label: "Plan Preview", value: "Available" },
        { label: "Plan Validation", value: "System Validated" },
        { label: "Plan Validation Action", value: "Approve" },
        { label: "Rejection Reason", value: "—" },
        { label: "Rejection Owner", value: "—" },
        { label: "Rejection Deviation Reason", value: "—" },
        ...commonCancel,
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
        { label: "Status*", value: <span className={cn("text-[11px] px-2 py-0.5 rounded-full inline-block", MOPV_STATUS_STYLES[mopValidationStatus(crq.status)])}>{mopValidationStatus(crq.status)}</span> },
        ...commonCancel,
        { label: "MOP Creation Method", value: "Template Based" },
        { label: "SOP Document", value: "SOP_" + crq.id + ".pdf" },
        { label: "MOP Document", value: "MOP_" + crq.id + ".pdf" },
        { label: "MOP Created By", value: "Neha Singh (B0542190)" },
        { label: "MOP Created By Time", value: "12-Mar-2026 09:15" },
      ],
    },
    {
      name: "Scheduling Approval",
      fields: [
        { label: "Status*", value: crq.status },
        ...commonCancel,
        { label: "Scheduled Start Date+", value: crq.reviewStart },
        { label: "Scheduled End Date+", value: crq.reviewEnd },
        { label: "CRQ Scheduled By", value: "Karan Mehta (B0723451)" },
        { label: "CRQ Scheduled By Time", value: "13-Mar-2026 10:05" },
        { label: "Activity Executed By*", value: "Sneha Kapoor (B0834512)" },
        { label: "Business Justification", value: "Capacity augmentation for Q1 traffic growth." },
        { label: "L3 Approver OLM ID", value: "B0945123" },
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
        ...commonCancel,
        { label: "Reason for Rollback", value: "—" },
        { label: "Actual Start Date", value: "16-Mar-2026 22:00" },
        { label: "Actual End Date", value: "16-Mar-2026 23:15" },
        { label: "Support Company - Change Implementer", value: "Nokia Solutions" },
        { label: "Support Organization - Change Implementer", value: "Field Operations" },
        { label: "Support Group Name+ - Change Implementer", value: "IP-CCB-NORTH-IMPL" },
        { label: "Actual Implementer Name", value: "Sneha Kapoor" },
        { label: "Actual Implementer Phone No", value: "+91-98xxxxxx21" },
        { label: "Exit Criteria Fulfilled", value: "Yes" },
        { label: "MOP Referred During Activity", value: "MOP_" + crq.id + ".pdf" },
        { label: "Pre Check Done", value: "Yes" },
        { label: "Pre - Checks Done By", value: "Arjun Rao (B0945123)" },
        { label: "Pre-Check Done Time", value: "16-Mar-2026 21:30" },
        { label: "Post Check Done", value: "Yes" },
        { label: "Requested Date Deviation Reason", value: "—" },
        { label: "Executer Location", value: crq.location ?? "—" },
        { label: "MOP Execution Method", value: "Manual + CLI Script" },
        { label: "CRQ approval status", value: crq.status },
        { label: "Hardware Change", value: "Yes" },
        { label: "Related Alarms", value: "None" },
      ],
    },
    {
      name: "Task Closure",
      fields: [
        { label: "Status", value: <span className={cn("text-[11px] px-2 py-0.5 rounded-full inline-block", CLOSURE_STATUS_STYLES[taskClosureStatus(crq.status)])}>{taskClosureStatus(crq.status)}</span> },
        ...commonCancel,
        { label: "Change Activity Done", value: "Yes" },
        { label: "Change Activity Done Time", value: "16-Mar-2026 23:30" },
        { label: "Completed Date", value: "17-Mar-2026 09:10" },
        { label: "CRQ Closed By", value: "Rahul Sharma (B0316607)" },
        { label: "CRQ Closed By Time", value: "17-Mar-2026 09:12" },
      ],
    },
  ];
}

const STAGE_RESCHEDULE: Record<string, { label: string; govKey: string }> = {
  "MOP Creation":        { label: "Reschedule CRQ", govKey: "mop" },
  "Scheduling Approval": { label: "Reschedule CRQ", govKey: "schedule" },
  "Network Execution":   { label: "Reschedule CRQ", govKey: "exec" },
  "Task Closure":        { label: "Reschedule CRQ", govKey: "closure" },
};

function StageDetailsSection({ crq, currentStageName }: { crq: CRQRecord; currentStageName?: string }) {
  const all = buildStages(crq);
  const cutoffIdx = currentStageName ? all.findIndex((s) => s.name === currentStageName) : -1;
  const stages = cutoffIdx >= 0 ? all.slice(0, cutoffIdx + 1) : all;
  const [active, setActive] = useState(stages[stages.length - 1]?.name ?? all[0].name);
  const current = stages.find((s) => s.name === active) ?? stages[stages.length - 1];
  if (!current) return null;

  const reschedCfg = STAGE_RESCHEDULE[active];
  const isCanceled = crq.status === "Canceled";

  return (
    <Section
      title="Stage-wise CRQ Details"
      subtitle={currentStageName ? `Current & previous stages up to ${currentStageName}` : "Field-level details captured at each workflow stage"}
    >
      {/* Stage tabs */}
      <div className="flex flex-wrap gap-2 mb-5 border-b border-slate-100 pb-3">
        {stages.map((s) => {
          const isActive = s.name === active;
          return (
            <button
              key={s.name}
              onClick={() => setActive(s.name)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition",
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600",
              )}
            >
              {s.name}
              <span className={cn("ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full", isActive ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
                {s.fields.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stage fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 mb-6">
        {current.fields.map((f) => (
          <Field key={f.label} label={f.label} value={f.value} mono={f.label.toLowerCase().includes("time") || f.label.toLowerCase().includes("date")} />
        ))}
      </div>

      {/* Reschedule accordion — per stage */}
      {reschedCfg && !isCanceled && (
        active === "MOP Creation" ? (
          <RescheduleAccordion label="Reschedule CRQ">
            <MopReschedulePanel crqId={crq.id} reviewStart={crq.reviewStart} />
          </RescheduleAccordion>
        ) : (
          <RescheduleAccordion label={reschedCfg.label}>
            <RescheduleForm
              govKey={reschedCfg.govKey}
              onSubmit={(d) => console.log("Reschedule submitted", { stage: active, ...d })}
            />
          </RescheduleAccordion>
        )
      )}
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOP Validation Panel — matches screenshot design
───────────────────────────────────────────────────────────────────────────── */

function MopValidationPanel({ crq }: { crq: CRQRecord }) {
  const [pick, setPick] = useState<"PASS" | "FAILED" | "CANCELLED" | null>(null);
  const [remark, setRemark] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const OPTIONS = [
    {
      id: "PASS" as const,
      label: "PASS",
      icon: CheckCircle2,
      activeColor: "text-green-500",
      activeBorder: "border-green-400",
      activeBg: "bg-green-50/60",
    },
    {
      id: "FAILED" as const,
      label: "FAILED",
      icon: XCircle,
      activeColor: "text-red-500",
      activeBorder: "border-red-400",
      activeBg: "bg-red-50/60",
    },
    {
      id: "CANCELLED" as const,
      label: "CANCELLED",
      icon: Ban,
      activeColor: "text-slate-400",
      activeBorder: "border-slate-300",
      activeBg: "bg-slate-50",
    },
  ];

  if (submitted) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-800 font-medium">Validation submitted successfully.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1.5">CRQ Validation</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          CRQ No: <span className="font-mono text-slate-700">{crq.id}</span>
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          CRQ ID: <span className="font-mono text-slate-700">{crq.olmid ?? "B0945123"}</span>
        </p>
      </div>

      {/* Validation Action */}
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Validation Action
        </div>
        <div className="space-y-2.5">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = pick === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setPick(opt.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl border-2 transition-all duration-150 text-left",
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
                    active ? "text-slate-800" : "text-slate-400"
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Remark */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1.5">
          Remark{" "}
          <span className="normal-case font-normal text-slate-400">(Optional)</span>
        </label>
        <textarea
          rows={4}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Provide a reason for the failure or cancellation..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none transition"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          onClick={() => { setPick(null); setRemark(""); }}
          className="text-sm font-semibold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition"
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
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   D. Validation Section
   - Hidden for stage === "exec" and stage === "closure"
   - MopValidationPanel for stage === "mopv"
   - All other stages remain unchanged
───────────────────────────────────────────────────────────────────────────── */

function ValidationSection({ crq, stage }: { crq: CRQRecord; stage?: string }) {
  // ── Hidden stages — no validation card rendered ────────────────────────────
  if (stage === "exec" || stage === "closure") return null;

  // ── MOP Validation — custom panel matching screenshot ─────────────────────
  if (stage === "mopv") {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <MopValidationPanel crq={crq} />
      </div>
    );
  }

  // ── MOP Creation upload panel ──────────────────────────────────────────────
  if (stage === "mop") {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <MopUploadPanel crqId={crq.id} />
      </div>
    );
  }

  // ── Impact Analysis ────────────────────────────────────────────────────────
  if (stage === "impact") {
    return (
      <Section title="Validation" subtitle="Impact Analysis Review">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <ImpactAnalysisPanel crq={crq} />
        </div>
      </Section>
    );
  }

  // ── Scheduling Approval ────────────────────────────────────────────────────
  if (stage === "schedule") {
    return (
      <Section title="Validation" subtitle="Scheduling Approval">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <SchedulingApprovalPanel crq={crq} />
        </div>
      </Section>
    );
  }

  // ── Plan & Inventory Validation ────────────────────────────────────────────
  if (stage === "plan") {
    return (
      <Section title="Validation" subtitle="CRQ Validation">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-5 p-6">
            <div className="col-span-12 md:col-span-5 space-y-3">
              {VALIDATION_TILES.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-200">
                    <Icon className={cn("h-6 w-6", t.color)} />
                    <span className="font-semibold text-slate-800">{t.label}</span>
                  </button>
                );
              })}
              <div className="relative pt-3">
                <label className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">CHM Remark</label>
                <textarea rows={4} placeholder="Add your remarks…" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-none" />
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

  // ── Default checkpoint panel ───────────────────────────────────────────────
  return (
    <Section title="Validation" subtitle="Checkpoint-wise validation status">
      <ValidationPanel />
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Validation tiles / checkpoints / panel (unchanged)
───────────────────────────────────────────────────────────────────────────── */

const VALIDATION_TILES = [
  { id: "PASS",      label: "PASS",      icon: CheckCircle2, color: "text-green-600", border: "border-green-300", bg: "bg-green-50" },
  { id: "FAILED",    label: "FAILED",    icon: XCircle,      color: "text-red-600",   border: "border-red-300",   bg: "bg-red-50" },
  { id: "CANCELLED", label: "CANCELLED", icon: Ban,          color: "text-slate-500", border: "border-slate-300", bg: "bg-slate-100" },
] as const;

const VALIDATION_CHECKPOINTS = [
  { title: "Node Details",                icon: Cpu,      count: 12, progress: 80 },
  { title: "Interface / Traffic / Power", icon: Activity, count: 8,  progress: 55 },
  { title: "IS-IS Adjacency",             icon: Network,  count: 4,  progress: 30 },
];

function ValidationPanel() {
  const [pick, setPick] = useState<string | null>("PASS");
  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 md:col-span-5 space-y-3">
        {VALIDATION_TILES.map((t) => {
          const Icon = t.icon;
          const active = pick === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPick(t.id)}
              className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200", active ? `${t.border} ${t.bg} scale-[1.02] shadow-sm` : "border-slate-200 hover:border-slate-300")}
            >
              <Icon className={cn("h-6 w-6", t.color)} />
              <span className="font-semibold text-slate-800">{t.label}</span>
            </button>
          );
        })}
        <div className="relative pt-3">
          <label className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">CHM Remark</label>
          <textarea rows={4} placeholder="Add your remarks…" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-none" />
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
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left">
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
          <div className="mt-4">
            <Field label="Validation Remarks" value={cp.remarks} />
          </div>
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