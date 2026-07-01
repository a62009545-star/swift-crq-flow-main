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
import { PdfModal, ExecuteMopCreation } from "@/components/crq/PdfModal";
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
  Download,
  Zap,
  BarChart3,
  Hand,
  Tag,
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

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  plan:     { bg: "rgba(99,102,241,0.18)",  text: "#a5b4fc", border: "rgba(99,102,241,0.35)",  dot: "#818cf8" },
  impact:   { bg: "rgba(234,179,8,0.15)",   text: "#fcd34d", border: "rgba(234,179,8,0.35)",   dot: "#fbbf24" },
  mop:      { bg: "rgba(59,130,246,0.18)",  text: "#93c5fd", border: "rgba(59,130,246,0.35)",  dot: "#60a5fa" },
  mopv:     { bg: "rgba(139,92,246,0.18)",  text: "#c4b5fd", border: "rgba(139,92,246,0.35)",  dot: "#a78bfa" },
  schedule: { bg: "rgba(16,185,129,0.15)",  text: "#6ee7b7", border: "rgba(16,185,129,0.35)",  dot: "#34d399" },
  exec:     { bg: "rgba(249,115,22,0.15)",  text: "#fdba74", border: "rgba(249,115,22,0.35)",  dot: "#fb923c" },
  closure:  { bg: "rgba(34,197,94,0.15)",   text: "#86efac", border: "rgba(34,197,94,0.35)",   dot: "#4ade80" },
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

// ─── Network Execution reschedule reasons ────────────────────────────────────

type ExecRescheduleReason = "Resource Unavailability" | "Partial Completion" | "Zero Completion";

const EXEC_RESCHEDULE_REASONS: { id: ExecRescheduleReason; desc: string }[] = [
  { id: "Resource Unavailability", desc: "Engineer, tool, or site access not available for the scheduled window." },
  { id: "Partial Completion", desc: "Some tasks under this CRQ are done, the rest are still open." },
  { id: "Zero Completion", desc: "No tasks under this CRQ have been completed yet." },
];

function getExecCompletionState(crqId: string): {
  completed: Task[];
  pending: Task[];
  total: number;
} {
  const tasks = TASKS_BY_CRQ[crqId] ?? TASKS_BY_CRQ.default;
  const completed = tasks.filter((t) => t.status === "Completed" || t.status === "Closed" || t.status === "Done");
  const pending = tasks.filter((t) => !(t.status === "Completed" || t.status === "Closed" || t.status === "Done"));
  return { completed, pending, total: tasks.length };
}

// ─── Per-stage reschedule rules ───────────────────────────────────────────────

type RoleRules = {
  impactedParties: string[];
  circleSPOC: string[];
  noc: string[];
};

const STAGE_RESCHEDULE_RULES: Record<string, RoleRules> = {
  mop: {
    impactedParties: ["Not applicable at this stage."],
    circleSPOC: ["Not applicable at this stage."],
    noc: [
      "Can postpone or prepone the activity.",
      "Prepone only allowed if MOP creation → execution gap is greater than 4 days.",
      "Postponement beyond 48 hours after MOP creation will retrigger MOP Validation.",
      "Reason for rescheduling is mandatory.",
    ],
  },
  schedule: {
    impactedParties: [
      "Can reschedule during the Impacted Party Approval stage only.",
      "Postponement only — prepone is not permitted.",
      "Rescheduling allowed only once per impacted party.",
      "Allowed only within the active approval/rejection action window.",
    ],
    circleSPOC: [
      "Can reschedule during CAB stages only.",
      "Postponement only — prepone is not permitted.",
      "Rescheduling will retrigger impacted party approvals.",
      "Allowed only within the active CAB session.",
    ],
    noc: [
      "Can reschedule at any stage, even within 24 hours before execution.",
      "Postpone and prepone both allowed.",
      "All other impacted approvers must re-approve on the new date.",
      "SLA and escalation timelines recalculated from the new date.",
      "Reason for rescheduling is mandatory.",
    ],
  },
  exec: {
    impactedParties: ["Not allowed — only NOC (Admin) can reschedule once execution is scheduled."],
    circleSPOC: ["Not allowed — only NOC (Admin) can reschedule once execution is scheduled."],
    noc: [
      "Postpone only — prepone is not permitted at this stage.",
      "Resource Unavailability: standard postpone, no fixed time gate.",
      "Partial Completion (some tasks done): postpone allowed within 24 hours; beyond that requires Domain Head approval.",
      "Zero Completion (no tasks done): postpone allowed within 48 hours; beyond that requires Domain Head approval and retriggers MOP Validation.",
      "Requestor and Impacted Parties are notified for every reschedule, regardless of reason.",
      "Reason for rescheduling is mandatory.",
    ],
  },
  closure: {
    impactedParties: ["Not allowed — only NOC (Admin) can reschedule at this stage."],
    circleSPOC: ["Not allowed — only NOC (Admin) can reschedule at this stage."],
    noc: [
      "Partial completion: new activity window must be selected within 48 hours.",
      "Completed and pending task details remain visible during the update.",
      "Scheduled activity date and time will shift to the newly selected slot.",
      "Reason for rescheduling is mandatory.",
    ],
  },
};

const STAGE_RESCHEDULE_FOOTER: Record<string, string> = {
  mop: "Workflow continues from the current stage after rescheduling, unless scope changes — which restarts from CRQ Validation.",
  schedule: "Once rescheduled, all impacted parties must re-approve on the new date. Partially blocked slots remain available for enterprise reschedules.",
  exec: "Workflow continues from the current stage. Completed and pending task status is preserved and shown during the update. Requestor and Impacted Parties are notified once the new slot is confirmed.",
  closure: "Workflow continues from the current stage. The activity window will shift to the newly selected slot.",
};

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

// ─── Reschedule Disclaimer ────────────────────────────────────────────────────

function RescheduleDisclaimer({ govKey }: { govKey: string }) {
  const rules = STAGE_RESCHEDULE_RULES[govKey];
  const footer = STAGE_RESCHEDULE_FOOTER[govKey];
  if (!rules) return null;

  const roles: { key: keyof RoleRules; label: string; restricted: boolean }[] = [
    {
      key: "impactedParties",
      label: "Impacted parties",
      restricted: rules.impactedParties[0].startsWith("Not allowed") || rules.impactedParties[0].startsWith("Not applicable"),
    },
    {
      key: "circleSPOC",
      label: "Circle SPOC",
      restricted: rules.circleSPOC[0].startsWith("Not allowed") || rules.circleSPOC[0].startsWith("Not applicable"),
    },
    { key: "noc", label: "NOC (admin)", restricted: false },
  ];

  return (
    <div className="rounded-lg border border-blue-100 overflow-hidden text-[11px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100">
        <ShieldAlert className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <span className="font-semibold text-blue-800">Rescheduling rules for this stage</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
        {roles.map((role) => (
          <div key={role.key} className={cn("p-3", role.restricted ? "bg-red-50/40" : "bg-green-50/30")}>
            <div className={cn("flex items-center gap-1.5 font-semibold text-[10px] uppercase tracking-widest mb-2", role.restricted ? "text-red-700" : "text-green-700")}>
              <span className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0", role.restricted ? "bg-red-100" : "bg-green-100")}>
                {role.restricted ? <XCircle className="h-2.5 w-2.5 text-red-500" /> : <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />}
              </span>
              {role.label}
            </div>
            <ul className="space-y-1">
              {rules[role.key].map((rule, i) => (
                <li key={i} className={cn("flex gap-1.5 leading-relaxed", role.restricted ? "text-red-800" : "text-green-900")}>
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {footer && (
        <div className="px-3 py-2 bg-blue-50/60 border-t border-blue-100 flex items-start gap-1.5">
          <AlertTriangle className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
          <span className="text-[10px] text-blue-800 leading-relaxed">{footer}</span>
        </div>
      )}
    </div>
  );
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
      <RescheduleDisclaimer govKey={govKey} />
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
      <RescheduleDisclaimer govKey="mop" />
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

// ─── Partial Completion Task Selector ─────────────────────────────────────────

function PartialTaskSelector({
  crqId,
  selectedIds,
  onChange,
}: {
  crqId: string;
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}) {
  const { pending } = getExecCompletionState(crqId);

  if (pending.length === 0) {
    return (
      <div className="text-[11px] text-slate-400 italic px-1">No pending tasks found for this CRQ.</div>
    );
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function toggleAll() {
    if (selectedIds.size === pending.length) onChange(new Set());
    else onChange(new Set(pending.map((t) => t.id)));
  }

  const allSelected = selectedIds.size === pending.length;

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            Select Tasks to Reschedule Forward
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-600">
            {selectedIds.size}/{pending.length} selected
          </span>
          <button
            onClick={toggleAll}
            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 transition px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
        {pending.map((task) => {
          const checked = selectedIds.has(task.id);
          return (
            <label
              key={task.id}
              className={cn(
                "flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none",
                checked ? "bg-indigo-50/60" : "bg-white hover:bg-slate-50"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(task.id)}
                className="mt-0.5 accent-indigo-600 h-3.5 w-3.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("font-mono text-[11px] font-semibold", checked ? "text-indigo-700" : "text-slate-700")}>
                    {task.id}
                  </span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                    TASK_STATUS_STYLES[task.status]
                  )}>
                    {task.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-mono truncate">{task.neLabel}</span>
                  <span className="text-[10px] text-slate-400">{task.locationCode}</span>
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {task.profileTypes.map((p) => (
                    <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Summary footer */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-t border-indigo-100">
          <CheckCircle2 className="h-3 w-3 text-indigo-500 shrink-0" />
          <span className="text-[11px] text-indigo-800 font-medium">
            {selectedIds.size} task{selectedIds.size !== 1 ? "s" : ""} will be carried forward to the rescheduled window.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Network Execution Reschedule Panel ──────────────────────────────────────

function ExecReschedulePanel({ crqId }: { crqId: string }) {
  const { completed, pending, total } = getExecCompletionState(crqId);
  const actualCompletionReason: ExecRescheduleReason =
    completed.length === 0 ? "Zero Completion" : pending.length === 0 ? "Resource Unavailability" : "Partial Completion";

  const [reason, setReason] = useState<ExecRescheduleReason | null>(null);
  const [startDT, setStartDT] = useState("");
  const [endDT, setEndDT] = useState("");
  const [domainHeadApproval, setDomainHeadApproval] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  // ── Task selection for Partial Completion ──
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const reasonMismatch =
    reason &&
    (reason === "Partial Completion" || reason === "Zero Completion") &&
    reason !== actualCompletionReason &&
    actualCompletionReason !== "Resource Unavailability";

  const thresholdHours = reason === "Partial Completion" ? 24 : reason === "Zero Completion" ? 48 : null;

  function hoursFromNow(d: Date) { return hoursBetween(new Date(), d); }

  function needsDomainHeadApproval(): boolean {
    if (!thresholdHours || !startDT) return false;
    return hoursFromNow(new Date(startDT)) > thresholdHours;
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!reason) e.reason = "Please select a reason.";
    if (!startDT) e.startDT = "Required.";
    if (!endDT) e.endDT = "Required.";
    if (startDT && endDT && new Date(endDT) <= new Date(startDT)) e.endDT = "End must be after start.";
    if (needsDomainHeadApproval() && !domainHeadApproval) e.domainHeadApproval = "Domain Head approval is required for this delay.";
    if (reason === "Partial Completion" && selectedTaskIds.size === 0) e.tasks = "Please select at least one task to reschedule forward.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (reason === "Zero Completion") {
      setConfirmMsg("This reschedule will retrigger the MOP Validation stage, since no tasks have been completed yet. Requestor and Impacted Parties will be notified of the new schedule. Do you want to continue?");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-800 font-medium">Reschedule submitted successfully.</span>
        </div>
        {reason === "Partial Completion" && selectedTaskIds.size > 0 && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="text-[11px] font-semibold text-indigo-800">
                {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? "s" : ""} carried forward to new window
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...selectedTaskIds].map((id) => (
                <span key={id} className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700">
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5">
          <ShieldAlert className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-[11px] text-blue-800">Requestor and Impacted Parties have been notified of the updated schedule.</span>
        </div>
        {reason === "Zero Completion" && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-800">MOP Validation has been retriggered for this CRQ.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RescheduleDisclaimer govKey="exec" />

      {confirmMsg && (
        <ConfirmBanner
          message={confirmMsg}
          onConfirm={() => { setConfirmMsg(null); setSubmitted(true); }}
          onCancel={() => setConfirmMsg(null)}
        />
      )}

      {/* Reason selection */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-700 font-bold mb-2">
          Reason for Reschedule <span className="text-red-500">*</span>
        </div>
        <div className="space-y-2">
          {EXEC_RESCHEDULE_REASONS.map((r) => {
            const active = reason === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setReason(r.id);
                  setDomainHeadApproval(false);
                  setErrors({});
                  if (r.id !== "Partial Completion") setSelectedTaskIds(new Set());
                }}
                className={cn(
                  "w-full text-left flex items-start gap-3 px-4 py-2.5 rounded-lg border-2 transition select-none",
                  active ? "border-red-300 bg-red-50" : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <span className={cn("mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0", active ? "border-red-500 bg-red-500" : "border-slate-300")} />
                <span>
                  <span className={cn("block text-sm font-semibold", active ? "text-red-700" : "text-slate-700")}>{r.id}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">{r.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {errors.reason && <p className="text-[10px] text-red-500 mt-1">{errors.reason}</p>}
      </div>

      {/* ── Task snapshot (Zero Completion) ── */}
      {reason === "Zero Completion" && (
        <ExecTaskCompletionTable crqId={crqId} />
      )}

      {/* ── Task selector (Partial Completion) ── */}
      {reason === "Partial Completion" && (
        <div className="space-y-1.5">
          <ExecTaskCompletionTable crqId={crqId} />
          <PartialTaskSelector
            crqId={crqId}
            selectedIds={selectedTaskIds}
            onChange={setSelectedTaskIds}
          />
          {errors.tasks && <p className="text-[10px] text-red-500">{errors.tasks}</p>}
        </div>
      )}

      {reasonMismatch && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <span className="text-[11px] text-amber-800 leading-relaxed">
            Task data for this CRQ shows <strong>{completed.length}/{total}</strong> tasks completed, which looks more like{" "}
            <strong>{actualCompletionReason}</strong>. You can still proceed, but double-check the reason matches the task board.
          </span>
        </div>
      )}

      {reason && (
        <>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs mb-2">
              <ShieldAlert className="h-3.5 w-3.5" /> Postponement Window
            </div>
            <ul className="space-y-1 text-[11px] text-blue-800">
              {reason === "Resource Unavailability" && (
                <li className="flex gap-1.5"><span>•</span><span>No fixed time gate — standard postpone applies. Requestor and Impacted Parties will still be notified.</span></li>
              )}
              {reason === "Partial Completion" && (
                <>
                  <li className="flex gap-1.5"><span>•</span><span>Postpone allowed within <strong>24 hours</strong> of now without extra approval.</span></li>
                  <li className="flex gap-1.5"><span>•</span><span>Beyond 24 hours, <strong>Domain Head approval</strong> is required before submitting.</span></li>
                  <li className="flex gap-1.5"><span>•</span><span>Only the tasks you select above will be carried forward to the new window.</span></li>
                </>
              )}
              {reason === "Zero Completion" && (
                <>
                  <li className="flex gap-1.5"><span>•</span><span>Postpone allowed within <strong>48 hours</strong> of now without extra approval.</span></li>
                  <li className="flex gap-1.5"><span>•</span><span>Beyond 48 hours, <strong>Domain Head approval</strong> is required before submitting.</span></li>
                  <li className="flex gap-1.5"><span>•</span><span><strong>MOP Validation will be retriggered</strong> for this CRQ once the reschedule is submitted.</span></li>
                </>
              )}
            </ul>
          </div>

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
          </div>

          {needsDomainHeadApproval() && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-[11px] text-amber-800 leading-relaxed">
                  The proposed slot exceeds the {thresholdHours}-hour window for <strong>{reason}</strong>. Domain Head approval is required to proceed.
                </span>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-amber-900 font-medium cursor-pointer">
                <input type="checkbox" checked={domainHeadApproval} onChange={(e) => setDomainHeadApproval(e.target.checked)} className="accent-amber-600 h-3.5 w-3.5" />
                Domain Head has approved this extension
              </label>
              {errors.domainHeadApproval && <p className="text-[10px] text-red-500">{errors.domainHeadApproval}</p>}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
            <span className="text-[11px] text-slate-600 leading-relaxed">
              Requestor and Impacted Parties will be notified automatically once this reschedule is submitted.
            </span>
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
        <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{label}</span>
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
      allDone ? "bg-green-50 text-green-700 border-green-200" : none ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-amber-50 text-amber-700 border-amber-200"
    )}>
      {allDone ? <CheckCircle2 className="h-3 w-3" /> : none ? <Circle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {completed}/{total} tasks
    </span>
  );
}

// ─── Exec Task Completion Table ───────────────────────────────────────────────

function ExecTaskCompletionTable({ crqId }: { crqId: string }) {
  const { completed, pending, total } = getExecCompletionState(crqId);
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Task Status Snapshot</span>
        <span className="text-[11px] font-semibold text-slate-600">{completed.length}/{total} completed</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-green-700 mb-2">
            <CheckCircle2 className="h-3 w-3" /> Completed ({completed.length})
          </div>
          {completed.length === 0 ? <p className="text-[11px] text-slate-400">None yet.</p> : (
            <ul className="space-y-1">
              {completed.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-600">{t.id}</span>
                  <span className="text-slate-400">{t.neLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-amber-700 mb-2">
            <Clock className="h-3 w-3" /> Pending ({pending.length})
          </div>
          {pending.length === 0 ? <p className="text-[11px] text-slate-400">None — all tasks complete.</p> : (
            <ul className="space-y-1">
              {pending.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-600">{t.id}</span>
                  <span className="text-slate-400">{t.neLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tasks Modal ──────────────────────────────────────────────────────────────

function TasksModal({ tasks, crqId, onClose }: { tasks: Task[]; crqId: string; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = tasks.filter((t) => t.id.toLowerCase().includes(search.toLowerCase()));

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
              <p className="text-sm text-slate-600 font-semibold">No tasks match <span className="font-mono">"{search}"</span></p>
            </div>
          ) : filtered.map((task) => (
            <div key={task.id} className="rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-150 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <span className="font-mono text-xs text-indigo-600 font-semibold">{task.id}</span>
                <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-semibold border", TASK_STATUS_STYLES[task.status])}>{task.status}</span>
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
          ))}
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

function ValidationToast({ pick, stageName, onDone }: { pick: "PASS" | "FAILED" | "CANCELLED"; stageName: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300); }, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const config = {
    PASS: { bg: "bg-white", border: "border-green-200", iconBg: "bg-green-50", icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, title: "Validation Passed", bar: "bg-green-500" },
    FAILED: { bg: "bg-white", border: "border-red-200", iconBg: "bg-red-50", icon: <XCircle className="h-4 w-4 text-red-500" />, title: "Validation Failed", bar: "bg-red-500" },
    CANCELLED: { bg: "bg-white", border: "border-slate-200", iconBg: "bg-slate-100", icon: <Ban className="h-4 w-4 text-slate-500" />, title: "Validation Cancelled", bar: "bg-slate-400" },
  }[pick];

  return (
    <div className={cn("fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border transition-all duration-300 overflow-hidden", config.bg, config.border, visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2")}>
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", config.iconBg)}>{config.icon}</div>
      <div>
        <p className="text-sm font-semibold text-slate-800 leading-tight">{config.title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{stageName}</p>
      </div>
      <div className={cn("absolute bottom-0 left-0 h-0.5 rounded-full", config.bar)} style={{ width: "100%", animation: "shrink 3.5s linear forwards" }} />
      <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
    </div>
  );
}

// ─── Network Execution Panel ──────────────────────────────────────────────────

type ExecTool = "infrasol" | "grasp" | "manual";
type ExecState = "idle" | "running" | "Paused" | "finished";
type ComparisonResult = "Pass" | "Fail" | null;
type ManualStage = "precheck" | "execution" | "postcheck" | "comparison";
type ManualPick = "PASS" | "FAILED" | "CANCELLED";

function toolLabel(tool: ExecTool) {
  return tool === "infrasol" ? "InfraSol" : tool === "grasp" ? "GRASP" : "Manual";
}

const MANUAL_STAGE_LABEL: Record<ManualStage, string> = {
  precheck: "Pre-Check",
  execution: "Execution",
  postcheck: "Post-Check",
  comparison: "Comparison",
};

function ReportActions({ label, filename }: { label: string; filename: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition shadow-sm">
        <FileText className="h-3 w-3" /> Preview
      </button>
      <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition shadow-sm">
        <Download className="h-3 w-3" /> Download
      </button>
    </div>
  );
}

function ExecToolPickerModal({ onSelect, onCancel }: { onSelect: (tool: ExecTool) => void; onCancel: () => void }) {
  const tools: { id: ExecTool; label: string; desc: string; icon: React.ElementType }[] = [
    { id: "infrasol", label: "InfraSol", desc: "Automated infrastructure orchestration & push-based execution", icon: Zap },
    { id: "grasp", label: "GRASP", desc: "Guided real-time activity and script push framework", icon: Activity },
    { id: "manual", label: "Manual", desc: "Manually validate each step (Pre-Check, Execution, Post-Check, Comparison) with a Pass / Fail / Cancel review at every stage", icon: Hand },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Select Execution Approach</h3>
          <p className="text-xs text-slate-500 mt-0.5">Choose how Pre-Check, Execution, Post-Check and Comparison will be carried out for this CRQ.</p>
        </div>
        <div className="space-y-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => onSelect(t.id)} className="w-full flex items-start gap-4 px-4 py-3.5 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition text-left group">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition">
                  <Icon className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition">{t.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition shrink-0 ml-auto self-center" />
              </button>
            );
          })}
        </div>
        <button onClick={onCancel} className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition">Cancel</button>
      </div>
    </div>
  );
}

function ManualValidationModal({ stage, onSelect, onCancel }: { stage: ManualStage; onSelect: (pick: ManualPick) => void; onCancel: () => void }) {
  const options: { id: ManualPick; label: string; icon: React.ElementType; color: string; border: string; bg: string }[] = [
    { id: "PASS", label: "PASS", icon: CheckCircle2, color: "text-green-600", border: "hover:border-green-300", bg: "hover:bg-green-50" },
    { id: "FAILED", label: "FAILED", icon: XCircle, color: "text-red-600", border: "hover:border-red-300", bg: "hover:bg-red-50" },
    { id: "CANCELLED", label: "CANCELLED", icon: Ban, color: "text-slate-500", border: "hover:border-slate-300", bg: "hover:bg-slate-100" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Hand className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Manual Validation — {MANUAL_STAGE_LABEL[stage]}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Select the outcome for this step.</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button key={opt.id} onClick={() => onSelect(opt.id)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 transition-all duration-150 text-left", opt.border, opt.bg)}>
                <Icon className={cn("h-5 w-5 shrink-0", opt.color)} />
                <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={onCancel} className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition">Cancel</button>
      </div>
    </div>
  );
}

function ExecStartToast({ tool, label = "Execution Started Successfully", onDone }: { tool: ExecTool; label?: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300); }, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={cn("fixed top-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border border-indigo-100 bg-white transition-all duration-300 overflow-hidden", visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2")}>
      <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
        <Play className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Tool: {toolLabel(tool)}</p>
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500 rounded-full" style={{ width: "100%", animation: "shrink 2.5s linear forwards" }} />
      <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
    </div>
  );
}

function ManualPickBadge({ pick }: { pick: ManualPick | null }) {
  if (!pick || pick === "PASS") return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", pick === "FAILED" ? "bg-red-100 text-red-700 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200")}>
      {pick === "FAILED" ? <XCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />} {pick}
    </span>
  );
}

function NetworkExecutionPanel({ crqId }: { crqId: string }) {
  const [selectedTool, setSelectedTool] = useState<ExecTool | null>(null);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [manualStage, setManualStage] = useState<ManualStage | null>(null);
  const [validationToast, setValidationToast] = useState<{ pick: ManualPick; stageName: string } | null>(null);
  const [precheckPick, setPrecheckPick] = useState<ManualPick | null>(null);
  const [executionPick, setExecutionPick] = useState<ManualPick | null>(null);
  const [postcheckPick, setPostcheckPick] = useState<ManualPick | null>(null);
  const [comparisonPick, setComparisonPick] = useState<ManualPick | null>(null);
  const [execState, setExecState] = useState<ExecState>("idle");
  const [showToolToast, setShowToolToast] = useState(false);
  const [showExecToast, setShowExecToast] = useState(false);
  const [preCheckDone, setPreCheckDone] = useState(false);
  const [postCheckDone, setPostCheckDone] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult>(null);

  const isManual = selectedTool === "manual";
  const isAutomated = !!selectedTool && !isManual;
  const executionFinished = isManual ? executionPick === "PASS" : execState === "finished";
  const isRunning = isAutomated && execState === "running";
  const isPaused = isAutomated && execState === "Paused";
  const allComplete = preCheckDone && executionFinished && postCheckDone && comparison === "Pass";

  function handleToolSelect(tool: ExecTool) {
    setSelectedTool(tool);
    setShowToolPicker(false);
    if (tool === "manual") { setManualStage("precheck"); }
    else { setPreCheckDone(true); setPrecheckPick("PASS"); setShowToolToast(true); }
  }

  function handleManualSubmit(stage: ManualStage, pick: ManualPick) {
    setManualStage(null);
    setValidationToast({ pick, stageName: MANUAL_STAGE_LABEL[stage] });
    if (stage === "precheck") { setPrecheckPick(pick); if (pick === "PASS") setPreCheckDone(true); }
    else if (stage === "execution") { setExecutionPick(pick); }
    else if (stage === "postcheck") { setPostcheckPick(pick); if (pick === "PASS") setPostCheckDone(true); }
    else if (stage === "comparison") { setComparisonPick(pick); if (pick === "PASS") setComparison("Pass"); else if (pick === "FAILED") setComparison("Fail"); }
  }

  const steps = [
    { label: "Pre-Check", done: preCheckDone },
    { label: "Execution", done: executionFinished },
    { label: "Post-Check", done: postCheckDone },
    { label: "Comparison", done: comparison === "Pass" },
  ];
  const activeStep = steps.findIndex((s) => !s.done);

  return (
    <>
      {showToolPicker && <ExecToolPickerModal onSelect={handleToolSelect} onCancel={() => setShowToolPicker(false)} />}
      {manualStage && <ManualValidationModal stage={manualStage} onSelect={(pick) => handleManualSubmit(manualStage, pick)} onCancel={() => setManualStage(null)} />}
      {showToolToast && selectedTool && isAutomated && <ExecStartToast tool={selectedTool} label="Pre-Check Completed Successfully" onDone={() => setShowToolToast(false)} />}
      {showExecToast && selectedTool && isAutomated && <ExecStartToast tool={selectedTool} label="Execution Started Successfully" onDone={() => setShowExecToast(false)} />}
      {validationToast && <ValidationToast pick={validationToast.pick} stageName={validationToast.stageName} onDone={() => setValidationToast(null)} />}

      <div className="space-y-3">
        {/* Stepper */}
        <div className="flex items-center gap-0 mb-1">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-300",
                  step.done ? "bg-green-500 border-green-500 text-white" : i === activeStep ? "bg-white border-indigo-500 text-indigo-600" : "bg-white border-slate-200 text-slate-400")}>
                  {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn("text-[9px] uppercase tracking-wide font-semibold mt-1 text-center",
                  step.done ? "text-green-600" : i === activeStep ? "text-indigo-600" : "text-slate-400")}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("h-0.5 w-full mx-1 rounded-full transition-all duration-500", steps[i].done ? "bg-green-400" : "bg-slate-200")} />
              )}
            </div>
          ))}
        </div>

        {selectedTool && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium px-1">
            <ShieldAlert className="h-3 w-3 text-slate-400" />
            Execution approach: <span className="font-semibold text-slate-700">{toolLabel(selectedTool)}</span>
            {isManual && <span className="text-slate-400">— each step requires manual Pass / Fail / Cancel validation</span>}
          </div>
        )}

        {/* Pre-Check */}
        <div className={cn("rounded-xl border px-4 py-3 transition-all duration-200", preCheckDone ? "border-green-200 bg-green-50/40" : precheckPick && precheckPick !== "PASS" ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white")}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", preCheckDone ? "bg-green-400" : "bg-slate-300")} />
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Pre-Check Status</span>
              {preCheckDone && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="h-3 w-3" /> Yes</span>}
              {!preCheckDone && <ManualPickBadge pick={precheckPick} />}
            </div>
            <div className="flex items-center gap-2">
              {!selectedTool && (
                <button onClick={() => setShowToolPicker(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm">
                  <Play className="h-3.5 w-3.5 fill-white" /> Start Pre-Check
                </button>
              )}
              {isManual && !preCheckDone && (
                <button onClick={() => setManualStage("precheck")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition shadow-sm">
                  <Hand className="h-3.5 w-3.5" /> {precheckPick ? "Retry Pre-Check Validation" : "Run Pre-Check Validation"}
                </button>
              )}
              {preCheckDone && <ReportActions label="Pre-Check Report" filename={`PRECHECK_${crqId}.pdf`} />}
            </div>
          </div>
        </div>

        {/* Execution (automated) */}
        {preCheckDone && isAutomated && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", executionFinished ? "bg-green-400" : isRunning ? "bg-indigo-400 animate-pulse" : "bg-slate-300")} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Execution</span>
                {executionFinished && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200"><CheckCheck className="h-3 w-3" /> Finished</span>}
                {isRunning && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Running <span className="opacity-60 font-normal ml-0.5">· {toolLabel(selectedTool!)}</span></span>}
                {isPaused && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"><Pause className="h-3 w-3" /> Paused</span>}
              </div>
              <div className="flex items-center gap-2">
                {execState === "idle" && <button onClick={() => { setExecState("running"); setShowExecToast(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"><Play className="h-3.5 w-3.5 fill-white" /> Start Execution</button>}
                {isRunning && <>
                  <button onClick={() => setExecState("Paused")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition shadow-sm"><Pause className="h-3.5 w-3.5" /> Pause</button>
                  <button onClick={() => setExecState("finished")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition shadow-sm"><CheckCheck className="h-3.5 w-3.5" /> Finish</button>
                </>}
                {isPaused && <>
                  <button onClick={() => { setExecState("running"); setShowExecToast(true); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm"><Play className="h-3.5 w-3.5" /> Resume</button>
                  <button onClick={() => setExecState("finished")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition shadow-sm"><CheckCheck className="h-3.5 w-3.5" /> Finish</button>
                </>}
                {executionFinished && <ReportActions label="Execution Report" filename={`EXEC_${crqId}.pdf`} />}
              </div>
            </div>
          </div>
        )}

        {/* Execution (manual) */}
        {preCheckDone && isManual && (
          <div className={cn("rounded-xl border px-4 py-3 transition-all duration-200", executionFinished ? "border-green-200 bg-green-50/40" : executionPick && executionPick !== "PASS" ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white")}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", executionFinished ? "bg-green-400" : "bg-slate-300")} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Execution</span>
                {executionFinished && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200"><CheckCheck className="h-3 w-3" /> Finished</span>}
                {!executionFinished && <ManualPickBadge pick={executionPick} />}
              </div>
              <div className="flex items-center gap-2">
                {!executionFinished && <button onClick={() => setManualStage("execution")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition shadow-sm"><Hand className="h-3.5 w-3.5" /> {executionPick ? "Retry Execution Validation" : "Run Execution Validation"}</button>}
                {executionFinished && <ReportActions label="Execution Report" filename={`EXEC_${crqId}.pdf`} />}
              </div>
            </div>
          </div>
        )}

        {/* Post-Check (automated) */}
        {executionFinished && isAutomated && (
          <div className={cn("rounded-xl border px-4 py-3 transition-all duration-200", postCheckDone ? "border-green-200 bg-green-50/40" : "border-slate-200 bg-white")}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", postCheckDone ? "bg-green-400" : "bg-slate-300")} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Post-Check Status</span>
                {postCheckDone && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="h-3 w-3" /> Yes</span>}
              </div>
              <div className="flex items-center gap-2">
                {!postCheckDone ? <button onClick={() => setPostCheckDone(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition shadow-sm"><CheckCircle2 className="h-3.5 w-3.5" /> Mark Post-Check Done</button>
                : <ReportActions label="Post-Check Report" filename={`POSTCHECK_${crqId}.pdf`} />}
              </div>
            </div>
          </div>
        )}

        {/* Post-Check (manual) */}
        {executionFinished && isManual && (
          <div className={cn("rounded-xl border px-4 py-3 transition-all duration-200", postCheckDone ? "border-green-200 bg-green-50/40" : postcheckPick && postcheckPick !== "PASS" ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white")}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", postCheckDone ? "bg-green-400" : "bg-slate-300")} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Post-Check Status</span>
                {postCheckDone && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="h-3 w-3" /> Yes</span>}
                {!postCheckDone && <ManualPickBadge pick={postcheckPick} />}
              </div>
              <div className="flex items-center gap-2">
                {!postCheckDone && <button onClick={() => setManualStage("postcheck")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition shadow-sm"><Hand className="h-3.5 w-3.5" /> {postcheckPick ? "Retry Post-Check Validation" : "Run Post-Check Validation"}</button>}
                {postCheckDone && <ReportActions label="Post-Check Report" filename={`POSTCHECK_${crqId}.pdf`} />}
              </div>
            </div>
          </div>
        )}

        {/* Comparison (automated) */}
        {postCheckDone && isAutomated && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Pre &amp; Post Check Comparison</span>
              <span className="text-red-500 text-xs">*</span>
              <span className="ml-auto text-[10px] text-slate-400 font-medium">Mandatory</span>
            </div>
            <div className="flex gap-3">
              {(["Pass", "Fail"] as const).map((opt) => (
                <button key={opt} onClick={() => setComparison(opt)} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all duration-150",
                  comparison === opt ? opt === "Pass" ? "border-green-400 bg-green-50 text-green-700 shadow-sm scale-[1.02]" : "border-red-400 bg-red-50 text-red-700 shadow-sm scale-[1.02]" : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600")}>
                  {opt === "Pass" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {opt}
                </button>
              ))}
            </div>
            {comparison && <ReportActions label="Comparison Report" filename={`COMPARE_${crqId}.pdf`} />}
          </div>
        )}

        {/* Comparison (manual) */}
        {postCheckDone && isManual && (
          <div className={cn("rounded-xl border px-4 py-4 space-y-3 transition-all duration-200", comparison === "Pass" ? "border-green-200 bg-green-50/40" : comparisonPick && comparisonPick !== "PASS" ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white")}>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Pre &amp; Post Check Comparison</span>
              <span className="text-red-500 text-xs">*</span>
              {comparison === "Pass" ? <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="h-3 w-3" /> Pass</span>
              : comparison === "Fail" ? <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200"><XCircle className="h-3 w-3" /> Fail</span>
              : <span className="ml-auto text-[10px] text-slate-400 font-medium">Mandatory</span>}
            </div>
            <div className="flex items-center gap-2">
              {comparison !== "Pass" && <button onClick={() => setManualStage("comparison")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition shadow-sm"><Hand className="h-3.5 w-3.5" /> {comparisonPick ? "Retry Comparison Validation" : "Run Comparison Validation"}</button>}
              {comparison && <ReportActions label="Comparison Report" filename={`COMPARE_${crqId}.pdf`} />}
            </div>
          </div>
        )}

        {/* Completion banner */}
        {allComplete && (
          <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-900">Network Execution Complete</p>
              <p className="text-[11px] text-green-700 mt-0.5 leading-relaxed">All checks passed. Pre-check, execution, post-check, and comparison are verified. This stage is ready for Task Closure.</p>
            </div>
          </div>
        )}

        {/* Checklist */}
        {!allComplete && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">Stage Completion Checklist</div>
            <div className="space-y-1.5">
              {[
                { label: "Pre-Check Status = Yes", done: preCheckDone },
                { label: "Execution Status = Finished", done: executionFinished },
                { label: "Post-Check Status = Yes", done: postCheckDone },
                { label: "Pre & Post Check Comparison = Pass", done: comparison === "Pass" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  <span className={cn("text-[11px] font-medium", item.done ? "text-green-700 line-through decoration-green-400/60" : "text-slate-500")}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CrqDetail() {
  const { crqId } = useParams({ from: "/crq/$crqId" });
  const { stage } = useSearch({ from: "/crq/$crqId" });
  const { plan, crq } = findCrq(crqId);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [executionState, setExecutionState] = useState<"idle" | "running" | "Paused" | "finished">("idle");
  const [showToast, setShowToast] = useState(false);
  const [mopAutoFilename, setMopAutoFilename] = useState<string | undefined>(undefined);
  const [validationToast, setValidationToast] = useState<{ pick: "PASS" | "FAILED" | "CANCELLED"; stageName: string } | null>(null);
  const [stageRejections, setStageRejections] = useState<Record<string, RejectionDetails>>({});

  function handleStageRejectionChange(stageName: string, update: Partial<RejectionDetails>) {
    setStageRejections((prev) => ({
      ...prev,
      [stageName]: { ...{ pick: null, rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" }, ...prev[stageName], ...update },
    }));
  }

  function handleValidationSubmit(stageName: string, pick: "PASS" | "FAILED" | "CANCELLED") {
    handleStageRejectionChange(stageName, { pick });
    setValidationToast({ pick, stageName });
  }

  const currentStageName = stage ? STAGE_ID_TO_NAME[stage] : undefined;
  const stageColor = stage ? STAGE_COLORS[stage] : null;

  function handleStartWorkflow() { setExecutionState("running"); setShowToast(true); }
  function handleFinish() { setExecutionState("finished"); }
  function handlePause() { setExecutionState("Paused"); }
  function handleResume() { setExecutionState("running"); setShowToast(true); }

  const isIdle = executionState === "idle";
  const isRunning = executionState === "running";
  const isPaused = executionState === "Paused";
  const isFinished = executionState === "finished";

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar active="workflow" onChange={() => {}} />
      <Header crumb={["CRQ Workflow", "CRQ Detail", crqId]} />
      {showToast && <ExecutionToast onDone={() => setShowToast(false)} />}
      {validationToast && <ValidationToast pick={validationToast.pick} stageName={validationToast.stageName} onDone={() => setValidationToast(null)} />}

      <PdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} crqId={crq?.id} showMopCreation={stage === "mop"}
        onMopReady={(_toolId, filename) => { setMopAutoFilename(filename); setPdfOpen(false); }} />

      <div className="ml-[220px] pt-14">
        <div className="px-5 py-5 max-w-[1400px]">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              {isIdle && <button onClick={handleStartWorkflow} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-sm transition"><Play className="h-3.5 w-3.5" /> Start Workflow</button>}
              {isRunning && <>
                <button onClick={handlePause} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 shadow-sm transition"><Pause className="h-3.5 w-3.5" /> Pause</button>
                <button onClick={handleFinish} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 shadow-sm transition"><CheckCheck className="h-3.5 w-3.5" /> Finish</button>
              </>}
              {isPaused && <>
                <button onClick={handleResume} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-sm transition"><Play className="h-3.5 w-3.5" /> Resume</button>
                <button onClick={handleFinish} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 shadow-sm transition"><CheckCheck className="h-3.5 w-3.5" /> Finish</button>
              </>}
              {isFinished && <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium" />}
            </div>
          </div>

          {/* ── Dark header card ── */}
          <div className="rounded-xl overflow-hidden mb-4 shadow-sm" style={{ background: "linear-gradient(135deg, #1a1040 0%, #1e2a5e 55%, #1a3a6e 100%)" }}>
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
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

                {/* ── Top-right: stage + workflow state ── */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Current stage badge */}
                  {currentStageName && stageColor && (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "rgba(147,197,253,0.7)" }}>Current Stage</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ background: stageColor.bg, color: stageColor.text, border: `1px solid ${stageColor.border}` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stageColor.dot }} />
                        {currentStageName}
                      </span>
                    </div>
                  )}
                  {/* Workflow run state */}
                  {isRunning && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[11px] font-medium" style={{ color: "rgba(134,239,172,0.9)" }}>Running</span>
                    </div>
                  )}
                  {isPaused && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-[11px] font-medium" style={{ color: "rgba(252,211,77,0.9)" }}>Paused</span>
                    </div>
                  )}
                  {isFinished && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: "rgba(134,239,172,0.9)" }} />
                      <span className="text-[11px] font-medium" style={{ color: "rgba(134,239,172,0.9)" }}>Completed</span>
                    </div>
                  )}
                </div>
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
              <CRQAttributesSection crq={crq} plan={plan!} currentStageName={currentStageName} stageRejections={stageRejections} onStageRejectionChange={handleStageRejectionChange} />
              <ValidationSection
                crq={crq} stage={stage} currentStageName={currentStageName} stageRejections={stageRejections}
                mopAutoFilename={mopAutoFilename} onMopReady={(_toolId, filename) => setMopAutoFilename(filename)}
                onPickChange={(pick) => { const sn = stage ? STAGE_ID_TO_NAME[stage] : undefined; if (sn && pick) handleStageRejectionChange(sn, { pick }); }}
                onDetailsChange={(details) => { const sn = stage ? STAGE_ID_TO_NAME[stage] : undefined; if (sn) handleStageRejectionChange(sn, details); }}
                onSubmit={(pick) => { const sn = stage ? STAGE_ID_TO_NAME[stage] : "Validation"; handleValidationSubmit(sn, pick); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, defaultOpen = true, right, children }: { title: string; subtitle?: string; defaultOpen?: boolean; right?: React.ReactNode; children: React.ReactNode }) {
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
      <div className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 leading-none group-hover:text-indigo-600 transition-colors duration-150">{label}</div>
      <div className={cn("text-[14px] text-slate-900 font-semibold leading-snug", mono && "font-mono text-[12px] text-slate-700")}>
        {value ?? <span className="text-slate-400 font-normal">—</span>}
      </div>
    </div>
  );
}

function FieldGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={cn("grid gap-3", cols === 3 && "grid-cols-3", cols === 2 && "grid-cols-2")}>{children}</div>
  );
}

function RejectionBadge({ pick }: { pick: "PASS" | "FAILED" | "CANCELLED" | null | undefined }) {
  if (!pick) return <span className="text-slate-400 font-normal">—</span>;
  const map = { PASS: "bg-green-50 text-green-700 border-green-200", FAILED: "bg-red-50 text-red-700 border-red-200", CANCELLED: "bg-slate-100 text-slate-600 border-slate-200" };
  return <span className={cn("text-[11px] px-2.5 py-1 rounded-md font-semibold border inline-block", map[pick])}>{pick}</span>;
}

// ─── Plan Details ─────────────────────────────────────────────────────────────

function PlanDetailsSectionInner({ plan, onPreview, crqId }: { plan: Plan; onPreview: () => void; crqId?: string }) {
  const [tasksModal, setTasksModal] = useState<{ tasks: Task[]; crqId: string } | null>(null);
  return (
    <>
      <Section title="Plan Details" subtitle="Tasks for this CRQ" right={
        <button onClick={onPreview} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-600 transition">
          <FileText className="h-3.5 w-3.5" /> Preview Plan PDF
        </button>
      }>
        <div className="space-y-4">
          {(crqId ? plan.crqs.filter((c) => c.id === crqId) : plan.crqs).map((c) => {
            const tasks = TASKS_BY_CRQ[c.id] ?? TASKS_BY_CRQ.default;
            const completedCount = tasks.filter((t) => t.status === "Completed" || t.status === "Closed" || t.status === "Done").length;
            return (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0"><ListTodo className="h-4 w-4 text-indigo-500" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">CRQ</span>
                      <span className="font-mono text-xs text-indigo-600 font-semibold">{c.id}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1"><TaskStatusBadge completed={completedCount} total={tasks.length} /></div>
                  </div>
                </div>
                <button onClick={() => setTasksModal({ tasks, crqId: c.id })} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-600 text-xs font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition shadow-sm">
                  <ListTodo className="h-3.5 w-3.5" /> View Tasks
                </button>
              </div>
            );
          })}
        </div>
      </Section>
      {tasksModal && <TasksModal tasks={tasksModal.tasks} crqId={tasksModal.crqId} onClose={() => setTasksModal(null)} />}
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
        { label: "MSAN Count", value: 6 },
        { label: "Customer Count", value: 1240 },
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
        { label: "MSAN Count", value: 6 },
        { label: "Customer Count", value: 1240 },
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
  // "Task Closure": { label: "Reschedule CRQ", govKey: "closure" },
};

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

function CRQAttributesSection({ crq, plan, currentStageName, stageRejections, onStageRejectionChange }: {
  crq: CRQRecord; plan: Plan; currentStageName?: string;
  stageRejections: Record<string, RejectionDetails>;
  onStageRejectionChange: (stageName: string, update: Partial<RejectionDetails>) => void;
}) {
  const allStages = buildStages(crq, stageRejections);
  const cutoffIdx = currentStageName ? allStages.findIndex((s) => s.name === currentStageName) : -1;
  const visibleStages = cutoffIdx >= 0 ? allStages.slice(0, cutoffIdx + 1) : allStages;
  const tabs = ["General", ...visibleStages.map((s) => s.name)];
  const [active, setActive] = useState("General");

  const isRejected = crq.status === "Rejected";
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
      <div className="flex items-end gap-0 px-5 pt-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab === active;
          const stageObj = visibleStages.find((s) => s.name === tab);
          const rejection = stageObj ? stageRejections[stageObj.name] : undefined;
          const pickDot = rejection?.pick ? rejection.pick === "PASS" ? "bg-green-400" : rejection.pick === "FAILED" ? "bg-red-400" : "bg-slate-400" : null;
          return (
            <button key={tab} onClick={() => setActive(tab)}
              className={cn("group relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 border-t border-x rounded-t-lg -mb-px",
                isActive ? "bg-white border-slate-200 text-slate-800 shadow-[0_-2px_6px_rgba(99,102,241,0.08)] z-10" : "bg-slate-50 border-transparent text-slate-400 hover:text-slate-700 hover:bg-white hover:border-slate-200 hover:shadow-[0_-2px_4px_rgba(0,0,0,0.04)]")}>
              {tab === "General" && <span className={cn("w-1.5 h-1.5 rounded-full transition-all duration-150", isActive ? "bg-indigo-500" : "bg-slate-300 group-hover:bg-indigo-300")} />}
              {tab}
              {stageObj && <span className={cn("ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold", isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-400")}>{stageObj.fields.length}</span>}
              {pickDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", pickDot)} />}
            </button>
          );
        })}
      </div>
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
            {reschedCfg && !isRejected && (
              active === "MOP Creation" ? (
                <RescheduleAccordion label="Reschedule CRQ"><MopReschedulePanel crqId={crq.id} reviewStart={crq.reviewStart} /></RescheduleAccordion>
              ) : active === "Network Execution" ? (
                <RescheduleAccordion label="Reschedule CRQ"><ExecReschedulePanel crqId={crq.id} /></RescheduleAccordion>
              ) : (
                <RescheduleAccordion label={reschedCfg.label}><RescheduleForm govKey={reschedCfg.govKey} onSubmit={(d) => console.log("Reschedule submitted", { stage: active, ...d })} /></RescheduleAccordion>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MOP Validation Panel ─────────────────────────────────────────────────────

function MopValidationPanel({ crq, stageRejections, onRejectionChange, onSubmit }: {
  crq: CRQRecord; stageRejections: Record<string, RejectionDetails>;
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
        <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", current.pick === "PASS" ? "bg-green-50 border-green-100" : current.pick === "FAILED" ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200")}>
          {current.pick === "PASS" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
          {current.pick === "FAILED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
          {current.pick === "CANCELLED" && <Ban className="h-4 w-4 text-slate-400 shrink-0" />}
          <span className={cn("text-sm font-medium", current.pick === "PASS" ? "text-green-800" : current.pick === "FAILED" ? "text-red-800" : "text-slate-700")}>
            Validation submitted — <span className="font-semibold">{current.pick}</span>
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
            <textarea rows={2} value={current.rejectionReason} onChange={(e) => onRejectionChange(stageName, { rejectionReason: e.target.value })} placeholder="Enter rejection reason..." className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Owner <span className="text-red-500">*</span></label>
            <input type="text" value={current.rejectionOwner} onChange={(e) => onRejectionChange(stageName, { rejectionOwner: e.target.value })} placeholder="Enter owner name or ID..." className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Deviation Reason</label>
            <textarea rows={2} value={current.rejectionDeviationReason} onChange={(e) => onRejectionChange(stageName, { rejectionDeviationReason: e.target.value })} placeholder="Enter deviation reason (optional)..." className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white" />
          </div>
        </div>
      )}
      <div>
        <label className="block text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1.5">Remark <span className="normal-case font-normal">(Optional)</span></label>
        <textarea rows={4} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Provide a reason for the failure or cancellation..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none transition" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button onClick={() => { onRejectionChange(stageName, { pick: null, rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" }); setRemark(""); }} className="text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest transition">Reset</button>
        <button disabled={!canSubmit} onClick={() => { if (current.pick) { setSubmitted(true); onSubmit?.(current.pick); } }}
          className={cn("px-6 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-lg transition shadow-sm", canSubmit ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed")}>
          Submit Validation
        </button>
      </div>
    </div>
  );
}

// ─── Validation Section ───────────────────────────────────────────────────────

function ValidationSection({ crq, stage, currentStageName, stageRejections, mopAutoFilename, onMopReady, onPickChange, onDetailsChange, onSubmit }: {
  crq: CRQRecord; stage?: string; currentStageName?: string; stageRejections: Record<string, RejectionDetails>;
  mopAutoFilename?: string; onMopReady?: (toolId: "infrasol" | "grasp", filename: string) => void;
  onPickChange: (v: "PASS" | "FAILED" | "CANCELLED" | null) => void;
  onDetailsChange?: (details: Partial<RejectionDetails>) => void;
  onSubmit?: (pick: "PASS" | "FAILED" | "CANCELLED") => void;
}) {
  const stageName = stage ? STAGE_ID_TO_NAME[stage] : undefined;
  const current = stageName ? stageRejections[stageName] : undefined;
  const currentPick = current?.pick ?? null;
  const [planSubmitted, setPlanSubmitted] = useState(false);

  if (stage === "closure") return null;

  if (stage === "exec") {
    return <Section title="Validation" subtitle="Network Execution"><NetworkExecutionPanel crqId={crq.id} /></Section>;
  }

  if (stage === "mopv") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <MopValidationPanel crq={crq} stageRejections={stageRejections}
          onRejectionChange={(sn, update) => { if (update.pick !== undefined) onPickChange(update.pick); onDetailsChange?.(update); }}
          onSubmit={(pick) => onSubmit?.(pick)} />
      </div>
    );
  }

  if (stage === "mop") {
    return (
      <div className="space-y-3">
        <ExecuteMopCreation crqId={crq.id} onMopReady={(toolId, filename) => onMopReady?.(toolId, filename)} />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <MopUploadPanel crqId={crq.id} prefilledFilename={mopAutoFilename} />
        </div>
      </div>
    );
  }

  if (stage === "impact") {
    return (
      <Section title="Validation" subtitle="Impact Analysis Review">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <ImpactAnalysisPanel crq={crq} onPickChange={(v) => { const normalized = v === "FAIL" ? "FAILED" : v === "CANCEL" ? "CANCELLED" : v; onPickChange(normalized); }} />
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
    if (planSubmitted) {
      return (
        <Section title="Validation" subtitle="CRQ Validation">
          <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", currentPick === "PASS" ? "bg-green-50 border-green-100" : currentPick === "FAILED" ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200")}>
            {currentPick === "PASS" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
            {currentPick === "FAILED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
            {currentPick === "CANCELLED" && <Ban className="h-4 w-4 text-slate-400 shrink-0" />}
            <span className={cn("text-sm font-medium", currentPick === "PASS" ? "text-green-800" : currentPick === "FAILED" ? "text-red-800" : "text-slate-700")}>
              Validation submitted — <span className="font-semibold">{currentPick}</span>
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
                    <button onClick={() => { onPickChange(t.id as "PASS" | "FAILED" | "CANCELLED"); if (t.id === "PASS") onDetailsChange?.({ rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" }); }}
                      className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200", isSelected ? `${t.border} ${t.bg} scale-[1.02] shadow-sm` : "border-slate-200 hover:border-slate-300")}>
                      <Icon className={cn("h-6 w-6", t.color)} />
                      <span className="font-semibold text-slate-800">{t.label}</span>
                    </button>
                    {isSelected && (t.id === "FAILED" || t.id === "CANCELLED") && (
                      <div className="mt-3 p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-3">
                        <h4 className="font-semibold text-amber-900 text-sm">Rejection Details</h4>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Reason <span className="text-red-500">*</span></label>
                          <textarea rows={2} value={current?.rejectionReason ?? ""} onChange={(e) => onDetailsChange?.({ rejectionReason: e.target.value })} placeholder="Enter rejection reason..." className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Owner <span className="text-red-500">*</span></label>
                          <input type="text" value={current?.rejectionOwner ?? ""} onChange={(e) => onDetailsChange?.({ rejectionOwner: e.target.value })} placeholder="Enter owner name or ID..." className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Rejection Deviation Reason</label>
                          <textarea rows={2} value={current?.rejectionDeviationReason ?? ""} onChange={(e) => onDetailsChange?.({ rejectionDeviationReason: e.target.value })} placeholder="Enter deviation reason (optional)..." className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="relative pt-3">
                <label className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">CHM Remark</label>
                <textarea rows={4} placeholder="Add your remarks…" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-none" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button onClick={() => { onPickChange(null); onDetailsChange?.({ rejectionReason: "", rejectionOwner: "", rejectionDeviationReason: "" }); }} className="text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest transition">Reset</button>
                <button disabled={!canSubmit} onClick={() => { if (currentPick) { setPlanSubmitted(true); onSubmit?.(currentPick); } }}
                  className={cn("px-6 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-lg transition shadow-sm", canSubmit ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed")}>
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

  return (
    <Section title="Validation" subtitle="Checkpoint-wise validation status">
      <ValidationPanel onPickChange={onPickChange} onSubmit={(pick) => onSubmit?.(pick)} />
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

function ValidationPanel({ onPickChange, onSubmit }: { onPickChange?: (v: "PASS" | "FAILED" | "CANCELLED" | null) => void; onSubmit?: (pick: "PASS" | "FAILED" | "CANCELLED") => void }) {
  const [pick, setPick] = useState<"PASS" | "FAILED" | "CANCELLED" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handlePick(v: "PASS" | "FAILED" | "CANCELLED") { setPick(v); onPickChange?.(v); }
  function handleSubmit() { if (!pick) return; setSubmitted(true); onSubmit?.(pick); }

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", pick === "PASS" ? "bg-green-50 border-green-100" : pick === "FAILED" ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200")}>
        {pick === "PASS" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
        {pick === "FAILED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
        {pick === "CANCELLED" && <Ban className="h-4 w-4 text-slate-400 shrink-0" />}
        <span className={cn("text-sm font-medium", pick === "PASS" ? "text-green-800" : pick === "FAILED" ? "text-red-800" : "text-slate-700")}>
          Validation submitted — <span className="font-semibold">{pick}</span>
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
              className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200", active ? `${t.border} ${t.bg} scale-[1.02] shadow-sm` : "border-slate-200 hover:border-slate-300")}>
              <Icon className={cn("h-6 w-6", t.color)} />
              <span className="font-semibold text-slate-800">{t.label}</span>
            </button>
          );
        })}
        <div className="relative pt-3">
          <label className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] uppercase tracking-wide font-medium text-slate-500">CHM Remark</label>
          <textarea rows={4} placeholder="Add your remarks…" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-none" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button onClick={() => { setPick(null); onPickChange?.(null); }} className="text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest transition">Reset</button>
          <button disabled={!pick} onClick={handleSubmit} className={cn("px-6 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-lg transition shadow-sm", pick ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed")}>Submit Validation</button>
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