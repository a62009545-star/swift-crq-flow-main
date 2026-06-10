import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CRQRecord, STATUS_STYLES, WORKFLOW_BY_CRQ, DEFAULT_WORKFLOW, TASKS_BY_CRQ } from "./data";
import { useState } from "react";
import {
  ChevronDown, Play, CheckCircle2, Circle, User,
  Clock, ShieldAlert, AlertTriangle, RefreshCw, Calendar,
  FileCheck, Shield, Users, CalendarClock, Terminal,
  ClipboardList, Wrench, CheckSquare, FileText, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Stage metadata ───────────────────────────────────────────────────────────

type StageMeta = {
  icon: React.ElementType;
  color: string;       // bg color class (Tailwind)
  iconColor: string;   // icon color class
};

const STAGE_META: Record<string, StageMeta> = {
  "MOP Validation":   { icon: FileCheck,    color: "bg-blue-50",    iconColor: "text-blue-500"   },
  "Risk Assessment":  { icon: Shield,       color: "bg-amber-50",   iconColor: "text-amber-500"  },
  "CAB Approval":     { icon: Users,        color: "bg-green-50",   iconColor: "text-green-600"  },
  "NOC Scheduling":   { icon: CalendarClock,color: "bg-purple-50",  iconColor: "text-purple-500" },
  "Implementation":   { icon: Terminal,     color: "bg-slate-100",  iconColor: "text-slate-500"  },
  "Testing":          { icon: CheckSquare,  color: "bg-teal-50",    iconColor: "text-teal-500"   },
  "Documentation":    { icon: FileText,     color: "bg-orange-50",  iconColor: "text-orange-500" },
  "Configuration":    { icon: Settings,     color: "bg-indigo-50",  iconColor: "text-indigo-500" },
  "Deployment":       { icon: Wrench,       color: "bg-rose-50",    iconColor: "text-rose-500"   },
  "Review":           { icon: ClipboardList,color: "bg-cyan-50",    iconColor: "text-cyan-500"   },
};

// Stage-specific field definitions — maps a stage name to the fields that are
// meaningful to display for that role. Falls back to generic name/ID if unknown.
const STAGE_FIELDS: Record<
  string,
  (w: WorkflowStage) => { label: string; value: string }[]
> = {
  "MOP Validation": (w) => [
    { label: "Validator",    value: w.empName || "Unassigned" },
    { label: "Employee ID",  value: w.empId   || "—" },
    { label: "Validated On", value: (w as any).validatedOn  || "—" },
    { label: "MOP Version",  value: (w as any).mopVersion   || "—" },
  ],
  "Risk Assessment": (w) => [
    { label: "Risk Analyst",  value: w.empName || "Unassigned" },
    { label: "Employee ID",   value: w.empId   || "—" },
    { label: "Risk Level",    value: (w as any).riskLevel   || "—" },
    { label: "Impact Score",  value: (w as any).impactScore || "—" },
  ],
  "CAB Approval": (w) => [
    { label: "CAB Chair",    value: w.empName || "Unassigned" },
    { label: "Employee ID",  value: w.empId   || "—" },
    { label: "Board",        value: (w as any).board    || "—" },
    { label: "Decision",     value: (w as any).decision || "Pending" },
  ],
  "NOC Scheduling": (w) => [
    { label: "NOC Engineer",   value: w.empName || "Unassigned" },
    { label: "Employee ID",    value: w.empId   || "—" },
    { label: "Slot Confirmed", value: (w as any).slotConfirmed || "Pending" },
    { label: "Blackout Check", value: (w as any).blackoutCheck || "Pending" },
  ],
  "Implementation": (w) => [
    { label: "Implementer",  value: w.empName || "Unassigned" },
    { label: "Employee ID",  value: w.empId   || "—" },
    { label: "Team",         value: (w as any).team        || "—" },
    { label: "Environment",  value: (w as any).environment || "—" },
  ],
  "Testing": (w) => [
    { label: "Tester",       value: w.empName || "Unassigned" },
    { label: "Employee ID",  value: w.empId   || "—" },
    { label: "Test Suite",   value: (w as any).testSuite  || "—" },
    { label: "Result",       value: (w as any).testResult || "Pending" },
  ],
  "Deployment": (w) => [
    { label: "Deploy Lead",  value: w.empName || "Unassigned" },
    { label: "Employee ID",  value: w.empId   || "—" },
    { label: "Target Env",   value: (w as any).targetEnv  || "—" },
    { label: "Deploy Time",  value: (w as any).deployTime || "—" },
  ],
};

// Fallback for unknown/custom stages
function getStageFields(w: WorkflowStage) {
  const resolver = STAGE_FIELDS[w.stage];
  if (resolver) return resolver(w);
  // Generic fallback — just show name and ID
  return [
    { label: "Assignee",    value: w.empName || "Unassigned" },
    { label: "Employee ID", value: w.empId   || "—" },
  ];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── shared Section ───────────────────────────────────────────────────────────

function Section({
  title, children, defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition"
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-5 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</div>
      <div className="text-sm text-slate-700 mt-0.5">{value}</div>
    </div>
  );
}

// ─── Stage-aware workflow card ────────────────────────────────────────────────

interface WorkflowStage {
  stage: string;
  empId?: string;
  empName?: string;
  [key: string]: unknown;
}

type WorkflowCardStatus = "completed" | "active" | "future";

function WorkflowCard({
  w,
  index,
  status,
}: {
  w: WorkflowStage;
  index: number;
  status: WorkflowCardStatus;
}) {
  const assigned = !!w.empId;
  const meta = STAGE_META[w.stage] ?? {
    icon: ClipboardList,
    color: "bg-slate-100",
    iconColor: "text-slate-500",
  };
  const StageIcon = meta.icon;
  const fields = getStageFields(w);

  // Visual treatment per status
  const cardBorder =
    status === "active"
      ? "border-indigo-200 ring-1 ring-indigo-100"
      : "border-slate-100";
  const headerBg =
    status === "active" ? "bg-indigo-50/60 border-indigo-100" : "bg-slate-50/80 border-slate-100";
  const stepBg =
    status === "completed"
      ? "bg-green-500 border-green-500 text-white"
      : status === "active"
      ? "bg-indigo-600 border-indigo-600 text-white"
      : "bg-white border-slate-200 text-slate-400";

  return (
    <div className={cn("rounded-xl border bg-white overflow-hidden", cardBorder)}>
      {/* Card header */}
      <div className={cn("flex items-center gap-3 px-3 py-2.5 border-b", headerBg)}>
        {/* Step number — filled green if completed, indigo if active */}
        <div
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold shrink-0 border",
            stepBg
          )}
        >
          {status === "completed" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            index + 1
          )}
        </div>

        {/* Stage icon + name */}
        <div className={cn("flex items-center justify-center h-6 w-6 rounded-md shrink-0", meta.color)}>
          <StageIcon className={cn("h-3.5 w-3.5", meta.iconColor)} />
        </div>
        <span
          className={cn(
            "text-[13px] font-semibold flex-1 truncate",
            status === "active" ? "text-indigo-800" : "text-slate-800"
          )}
        >
          {w.stage}
        </span>

        {/* Status pill */}
        {status === "completed" && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Done
          </span>
        )}
        {status === "active" && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
            <Clock className="h-3 w-3" /> In Progress
          </span>
        )}
      </div>

      {/* Card body — stage-specific fields */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
        {fields.map((f) => {
          const isMuted = !f.value || f.value === "—" || f.value === "Unassigned" || f.value === "Pending";
          const isPersonField =
            f.label.toLowerCase().includes("analyst") ||
            f.label.toLowerCase().includes("engineer") ||
            f.label.toLowerCase().includes("validator") ||
            f.label.toLowerCase().includes("chair") ||
            f.label.toLowerCase().includes("assignee") ||
            f.label.toLowerCase().includes("implementer") ||
            f.label.toLowerCase().includes("tester") ||
            f.label.toLowerCase().includes("lead");

          return (
            <div key={f.label}>
              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">
                {f.label}
              </div>
              <div className={cn("text-sm", isMuted ? "text-slate-400 italic" : "text-slate-700")}>
                {isPersonField ? (
                  <span className="flex items-center gap-1">
                    {!isMuted && <User className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                    {f.value}
                  </span>
                ) : (
                  f.value
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Inline Reschedule Panel ──────────────────────────────────────────────────

const REASONS = [
  "Resource Unavailability",
  "Infrastructure Dependency",
  "Business Priority Change",
  "Technical Blocker",
  "Client Request",
  "Regulatory / Compliance Hold",
  "Other",
];

interface ReschedulePanelProps {
  crq: CRQRecord;
  mopCreatedAt: Date | null;
  onSubmit: (data: { type: "postpone" | "prepone"; startDT: string; endDT: string; reason: string }) => void;
}

function ReschedulePanel({ crq, mopCreatedAt, onSubmit }: ReschedulePanelProps) {
  const hasMop = !!mopCreatedAt;
  const [scheduleType, setScheduleType] = useState<"postpone" | "prepone" | null>(hasMop ? null : "postpone");
  const [startDT, setStartDT]           = useState("");
  const [endDT, setEndDT]               = useState("");
  const [reason, setReason]             = useState("");
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [confirmMsg, setConfirmMsg]     = useState<string | null>(null);
  const [submitted, setSubmitted]       = useState(false);

  const executionDate = parseDate(crq.reviewStart);

  const govRules =
    scheduleType === "postpone"
      ? [
          { bold: null,                          text: "The rescheduling party does not need to re-approve." },
          { bold: "All other impacted approvers", text: "must re-approve on the new date." },
          { bold: "SLA",                         text: "will be recalculated from the new proposed date." },
          { bold: "Escalation",                  text: "will be reset / recalculated accordingly." },
          hasMop
            ? { bold: "Note:", text: "Postponement beyond 48 hours after MOP creation will retrigger MOP Validation." }
            : { bold: "Note:", text: "MOP not yet created — postponement is allowed directly." },
        ]
      : scheduleType === "prepone"
      ? [
          { bold: null,                          text: "The rescheduling party does not need to re-approve." },
          { bold: "All other impacted approvers", text: "must re-approve on the new date." },
          { bold: "Preponement",                  text: "is only allowed if the MOP Creation → Execution gap is greater than 4 days." },
          { bold: "Note:",                        text: "Preponement within the 4-day margin will require confirmation." },
        ]
      : [];

  function validate() {
    const e: Record<string, string> = {};
    if (!startDT) e.startDT = "Required.";
    if (!endDT)   e.endDT   = "Required.";
    if (!reason)  e.reason  = "Please select a reason.";
    if (startDT && endDT && new Date(endDT) <= new Date(startDT))
      e.endDT = "End must be after start.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const newStart = new Date(startDT);

    if (scheduleType === "postpone" && mopCreatedAt) {
      if (hoursBetween(mopCreatedAt, newStart) > 48) {
        setConfirmMsg(
          "The new date is more than 48 hours after MOP creation. The MOP Validation stage will be automatically retriggered. Do you want to continue?"
        );
        return;
      }
    }

    if (scheduleType === "prepone" && mopCreatedAt && executionDate) {
      const gap = daysBetween(mopCreatedAt, executionDate);
      if (gap <= 4) {
        setConfirmMsg(
          `Execution is being scheduled before the defined 4-day timeline (current gap: ${gap.toFixed(1)} days) as per the configured logic. Are you sure you want to prepone?`
        );
        return;
      }
    }

    doSubmit();
  }

  function doSubmit() {
    onSubmit({ type: scheduleType!, startDT, endDT, reason });
    setSubmitted(true);
    setConfirmMsg(null);
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
      {confirmMsg && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">{confirmMsg}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmMsg(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={doSubmit}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 rounded-md transition"
            >
              Proceed Anyway
            </button>
          </div>
        </div>
      )}

      {hasMop && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
            Reschedule Type
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setScheduleType("postpone")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                scheduleType === "postpone"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50/50"
              )}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Postpone
            </button>
            <button
              onClick={() => setScheduleType("prepone")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                scheduleType === "prepone"
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50/50"
              )}
            >
              <RefreshCw className="h-3.5 w-3.5 scale-x-[-1]" /> Prepone
            </button>
          </div>
        </div>
      )}

      {scheduleType && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs mb-2">
            <ShieldAlert className="h-3.5 w-3.5" /> Scheduling Governance
          </div>
          <ul className="space-y-1">
            {govRules.map((r, i) => (
              <li key={i} className="text-[11px] text-blue-800 flex gap-1.5 leading-relaxed">
                <span className="shrink-0">•</span>
                <span>{r.bold && <strong>{r.bold} </strong>}{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {scheduleType && (
        <>
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
                    "w-full text-sm border rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white",
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
                    "w-full text-sm border rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white",
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
                errors.reason ? "border-red-500 ring-1 ring-red-400" : "border-slate-200"
              )}
            >
              <option value="">Select reason...</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.reason && <p className="text-[10px] text-red-500 mt-0.5">{errors.reason}</p>}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm"
          >
            Submit Reschedule
          </button>
        </>
      )}
    </div>
  );
}

// ─── MOP Creation Section ─────────────────────────────────────────────────────

interface MopSectionProps {
  crq: CRQRecord;
  mopCreatedAt: Date | null;
  disabled: boolean;
}

function MopCreationSection({ crq, mopCreatedAt, disabled }: MopSectionProps) {
  const [open, setOpen] = useState(true);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const hasMop = !!mopCreatedAt;

  return (
    <div className="border-b border-slate-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition"
      >
        <span className="text-sm font-semibold text-slate-800">MOP Creation</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          {hasMop ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-xs text-green-800 font-medium">MOP Created</span>
              <span className="ml-auto font-mono text-[11px] text-slate-500">
                {(crq as any).mopCreatedAt}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Circle className="h-4 w-4 text-slate-300" />
              <span>MOP not yet created — direct postponement allowed.</span>
            </div>
          )}

          {!disabled && (
            <button
              onClick={() => setRescheduleOpen(!rescheduleOpen)}
              className={cn(
                "w-full inline-flex items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition",
                rescheduleOpen
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-red-200 bg-red-50/60 text-red-600 hover:bg-red-50 hover:border-red-300"
              )}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {hasMop ? "Reschedule CRQ (Postpone / Prepone)" : "Reschedule CRQ"}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", rescheduleOpen && "rotate-180")} />
            </button>
          )}

          {rescheduleOpen && !disabled && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4">
              <ReschedulePanel
                crq={crq}
                mopCreatedAt={mopCreatedAt}
                onSubmit={(data) => {
                  console.log("Reschedule submitted", data);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function CrqDrawer({ crq, onClose }: { crq: CRQRecord | null; onClose: () => void }) {
  const disabled     = crq?.status === "Canceled";
  const workflow     = crq ? WORKFLOW_BY_CRQ[crq.id] ?? DEFAULT_WORKFLOW     : [];
  const tasks        = crq ? TASKS_BY_CRQ[crq.id]   ?? TASKS_BY_CRQ.default : [];
  const mopCreatedAt = crq ? parseDate((crq as any).mopCreatedAt ?? "")      : null;

  return (
    <Sheet open={!!crq} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        {crq && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-slate-800">{crq.id}</span>
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full", STATUS_STYLES[crq.status])}>
                {crq.status}
              </span>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <Section title="CRQ — Requestor Detail Information">
                <Field label="CRQ Number"    value={crq.id} />
                <Field label="Vendor"         value={crq.vendor} />
                <Field label="Location Code"  value={crq.location || "—"} />
                <Field label="Reviewer OLMID" value={crq.olmid} />
              </Section>

              <Section title="Activity Window">
                <Field label="Start Date" value={crq.reviewStart} />
                <Field label="End Date"   value={crq.reviewEnd} />
                {mopCreatedAt && (
                  <Field label="MOP Created At" value={(crq as any).mopCreatedAt} />
                )}
              </Section>

              <Section title="Change Information">
                <Field label="Impact"        value={crq.impact} />
                <Field label="CRQ Status"    value={crq.status} />
                <Field label="Review Status" value={crq.status} />
              </Section>

              <MopCreationSection
                crq={crq}
                mopCreatedAt={mopCreatedAt}
                disabled={disabled}
              />

              {/* ── Workflow Assignment — stage-aware cards, sliced to current ── */}
              {(() => {
                const activeIdx = workflow.findIndex((w) => !w.empId);
                const currentIdx = activeIdx === -1 ? workflow.length - 1 : activeIdx;
                const visibleWorkflow = workflow.slice(0, currentIdx + 1);
                const hiddenCount = workflow.length - visibleWorkflow.length;
                return (
                  <Section title={"Workflow Assignment (" + visibleWorkflow.length + " of " + workflow.length + ")"}>
                    <div className="space-y-2 -mx-1">
                      {visibleWorkflow.map((w, i) => {
                        const status: WorkflowCardStatus =
                          i < currentIdx ? "completed" : "active";
                        return (
                          <WorkflowCard key={w.stage} w={w} index={i} status={status} />
                        );
                      })}
                      {hiddenCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                          <div className="flex -space-x-1">
                            {Array.from({ length: Math.min(hiddenCount, 3) }).map((_, k) => (
                              <div
                                key={k}
                                className="h-5 w-5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-slate-500"
                              >
                                {currentIdx + 2 + k}
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-400 italic">
                            {hiddenCount} upcoming stage{hiddenCount > 1 ? "s" : ""} not yet reached
                          </span>
                        </div>
                      )}
                    </div>
                  </Section>
                );
              })()}

              <Section title={`Associated Tasks (${tasks.length})`}>
                <div className="space-y-3 -mx-1">
                  {tasks.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Task ID</div>
                        <div className="font-mono text-xs text-slate-800 break-all">{t.id}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="NE Label"      value={t.neLabel} />
                        <Field label="Location"      value={t.locationCode} />
                        <Field label="Plan Activity" value={t.planActivity} />
                        <Field label="Task Activity" value={t.taskActivity} />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-1">Profile Types</div>
                        <div className="flex flex-wrap gap-1">
                          {t.profileTypes.map((p) => (
                            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4">
              <button
                disabled={disabled}
                title={disabled ? "Workflow cannot start for canceled CRQ." : ""}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  disabled
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg",
                )}
              >
                <Play className="h-4 w-4" /> Start Workflow
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}