export type Employee = { id: string; name: string };
export const EMPLOYEES: Employee[] = [
  { id: "B0316607", name: "Rahul Sharma" },
  { id: "B0421987", name: "Amit Verma" },
  { id: "B0542190", name: "Neha Singh" },
  { id: "B0612345", name: "Priya Nair" },
  { id: "B0723451", name: "Karan Mehta" },
  { id: "B0834512", name: "Sneha Kapoor" },
  { id: "B0945123", name: "Arjun Rao" },
  { id: "B1056234", name: "Vivek Sinha" },
  { id: "A1D5PXR6", name: "Sanjay R" },
  { id: "B0095276", name: "Sureshkumar P" },
  { id: "B0096168", name: "Sankar Ganesh" },
  { id: "B0277812", name: "Dipali Kadge" },
  { id: "B0318792", name: "Prabhu M" },
];

export const ASSIGNMENT_COLUMNS = [
  "CRQ Review",
  "Impact Analysis",
  "Scheduling",
  "MOP Create",
  "MOP Validate",
  "Activity Implement",
  "CRQ Closer",
] as const;

export type AssignmentRow = {
  crq: string;
  values: (string | null)[];
};

const e = (id: string) => {
  const emp = EMPLOYEES.find((x) => x.id === id);
  return emp ? `${emp.id}` : id;
};

export const ASSIGNMENT_ROWS: AssignmentRow[] = [
  { crq: "CRQ000005178178", values: [e("A1D5PXR6"), null, null, null, null, null, null] },
  { crq: "CRQ000006124927", values: [e("B0095276"), null, null, null, null, null, null] },
  { crq: "CRQ000006124928", values: [e("B0096168"), e("B0277812"), null, null, null, null, null] },
  { crq: "CRQ000006194006", values: [e("B0318792"), null, null, null, null, null, null] },
  { crq: "CRQ000006194014", values: [e("B0095276"), e("B0318792"), null, null, null, null, null] },
  { crq: "CRQ000006194022", values: [e("B0316607"), null, null, null, null, null, null] },
  { crq: "CRQ000006194055", values: [e("B0421987"), e("B0542190"), null, null, null, null, null] },
  { crq: "CRQ000006194099", values: [null, null, null, null, null, null, null] },
  { crq: "CRQ000006194122", values: [e("B0612345"), null, null, null, null, null, null] },
  { crq: "CRQ000006194188", values: [e("B0723451"), e("B0834512"), e("B0945123"), null, null, null, null] },
];

export type ReviewStatus = "Pause" | "Approved" | "Canceled" | "In Review" | "Non Service Affecting";
export type CRQRecord = {
  id: string;
  status: ReviewStatus;
  olmid: string;
  reviewStart: string;
  reviewEnd: string;
  impact: string;
  vendor: string;
  crqStatus?: string;
  location?: string;
};

export type Plan = {
  id: string;
  type: string;
  description: string;
  crqs: CRQRecord[];
};

export const PLANS: Plan[] = [
  { id: "CEN/AC/CRD-A/MOB/06032026/002", type: "Card Addition", description: "test change", crqs: [
    { id: "CRQ000005983410", status: "Approved", olmid: "B0945123", reviewStart: "06-Mar-2026 09:00", reviewEnd: "06-Mar-2026 09:30", impact: "Non Service Affecting", vendor: "NOKIA", location: "GURGAON-GRG" },
    { id: "CRQ000005983411", status: "Pause", olmid: "B1056234", reviewStart: "06-Mar-2026 10:00", reviewEnd: "06-Mar-2026 10:30", impact: "Service Affecting", vendor: "CISCO", location: "DELHI-DEL" },
  ]},
  { id: "CEN/AC/CRD-A/MOB/10032026/001", type: "Card Addition", description: "test change", crqs: [
    { id: "CRQ000005983526", status: "Pause", olmid: "B0096168", reviewStart: "15-May-2026 12:06", reviewEnd: "15-May-2026 12:06", impact: "Non Service Affecting", vendor: "ALCATEL", location: "GURGAON-GRG" },
    { id: "CRQ000005983527", status: "Approved", olmid: "B0316607", reviewStart: "20-Feb-2026 01:00", reviewEnd: "20-Feb-2026 01:30", impact: "Service Affecting", vendor: "NOKIA", location: "MUMBAI-BOM" },
    { id: "CRQ000005983528", status: "Canceled", olmid: "B0542190", reviewStart: "18-Feb-2026 09:00", reviewEnd: "18-Feb-2026 09:30", impact: "Non Service Affecting", vendor: "ERICSSON", location: "DELHI-DEL" },
    { id: "CRQ000005983529", status: "In Review", olmid: "B0612345", reviewStart: "10-Mar-2026 03:00", reviewEnd: "10-Mar-2026 03:45", impact: "Service Affecting", vendor: "NOKIA", location: "BANGALORE-BLR" },
    { id: "CRQ000005983530", status: "Non Service Affecting", olmid: "B0723451", reviewStart: "10-Mar-2026 06:00", reviewEnd: "10-Mar-2026 06:30", impact: "Non Service Affecting", vendor: "CISCO", location: "CHENNAI-MAA" },
  ]},
  { id: "CEN/AC/CRD-A/B2B/12032026/001", type: "Card Addition", description: "test change", crqs: [
    { id: "CRQ000005983601", status: "In Review", olmid: "B0612345", reviewStart: "01-Mar-2026 08:00", reviewEnd: "01-Mar-2026 08:30", impact: "Service Affecting", vendor: "CISCO", location: "PUNE-PNQ" },
    { id: "CRQ000005983602", status: "Approved", olmid: "B0723451", reviewStart: "12-Mar-2026 02:00", reviewEnd: "12-Mar-2026 02:30", impact: "Non Service Affecting", vendor: "NOKIA", location: "PUNE-PNQ" },
    { id: "CRQ000005983603", status: "Pause", olmid: "B0834512", reviewStart: "12-Mar-2026 04:00", reviewEnd: "12-Mar-2026 04:30", impact: "Service Affecting", vendor: "ALCATEL", location: "HYDERABAD-HYD" },
  ]},
  { id: "CEN/AC/CRD-A/MOB/16032026/001", type: "Card Addition", description: "test change", crqs: [
    { id: "CRQ000005983710", status: "Approved", olmid: "B0723451", reviewStart: "16-Mar-2026 11:00", reviewEnd: "16-Mar-2026 11:45", impact: "Non Service Affecting", vendor: "NOKIA", location: "GURGAON-GRG" },
    { id: "CRQ000005983711", status: "In Review", olmid: "B0834512", reviewStart: "16-Mar-2026 12:00", reviewEnd: "16-Mar-2026 12:30", impact: "Service Affecting", vendor: "ALCATEL", location: "GURGAON-GRG" },
    { id: "CRQ000005983712", status: "Canceled", olmid: "B0945123", reviewStart: "16-Mar-2026 14:00", reviewEnd: "16-Mar-2026 14:30", impact: "Non Service Affecting", vendor: "ERICSSON", location: "KOLKATA-CCU" },
    { id: "CRQ000005983713", status: "Approved", olmid: "B1056234", reviewStart: "16-Mar-2026 15:00", reviewEnd: "16-Mar-2026 15:30", impact: "Service Affecting", vendor: "CISCO", location: "AHMEDABAD-AMD" },
  ]},
  { id: "CEN/AC/CRD-A/MOB/16032026/002", type: "Card Addition", description: "Cross-connect provisioning", crqs: [
    { id: "CRQ000005983801", status: "In Review", olmid: "A1D5PXR6", reviewStart: "16-Mar-2026 18:00", reviewEnd: "16-Mar-2026 18:45", impact: "Service Affecting", vendor: "NOKIA", location: "MUMBAI-BOM" },
  ]},
  { id: "CEN/AC/CRD-A/MOB/16032026/003", type: "Card Addition", description: "Backbone uplink upgrade", crqs: [
    { id: "CRQ000005983902", status: "Approved", olmid: "B0095276", reviewStart: "16-Mar-2026 20:00", reviewEnd: "16-Mar-2026 20:30", impact: "Non Service Affecting", vendor: "CISCO", location: "DELHI-DEL" },
    { id: "CRQ000005983903", status: "Pause", olmid: "B0096168", reviewStart: "16-Mar-2026 22:00", reviewEnd: "16-Mar-2026 22:30", impact: "Service Affecting", vendor: "NOKIA", location: "DELHI-DEL" },
  ]},
  { id: "CEN/AC/CRD-A/MOB/16042026/003", type: "Card Addition", description: "Edge router refresh", crqs: [
    { id: "CRQ000005984010", status: "In Review", olmid: "B0277812", reviewStart: "16-Apr-2026 09:00", reviewEnd: "16-Apr-2026 09:30", impact: "Service Affecting", vendor: "ALCATEL", location: "BANGALORE-BLR" },
  ]},
  { id: "MPL/T5/TRIB1/MOB/01132025/002", type: "TR to IP - RING 10G", description: "TR migration to IP ring 10G", crqs: [
    { id: "CRQ000005984120", status: "Approved", olmid: "B0318792", reviewStart: "13-Jan-2026 01:00", reviewEnd: "13-Jan-2026 01:30", impact: "Service Affecting", vendor: "NOKIA", location: "CHENNAI-MAA" },
    { id: "CRQ000005984121", status: "Non Service Affecting", olmid: "B0316607", reviewStart: "13-Jan-2026 02:00", reviewEnd: "13-Jan-2026 02:30", impact: "Non Service Affecting", vendor: "ERICSSON", location: "CHENNAI-MAA" },
    { id: "CRQ000005984122", status: "In Review", olmid: "B0421987", reviewStart: "13-Jan-2026 03:00", reviewEnd: "13-Jan-2026 03:30", impact: "Service Affecting", vendor: "CISCO", location: "CHENNAI-MAA" },
  ]},
];

export type Task = {
  id: string;
  neLabel: string;
  planActivity: string;
  profileTypes: string[];
  locationCode: string;
  taskActivity: string;
  status: TaskStatus;
};

export type TaskStatus = "Open" | "In Progress" | "Completed" | "Pending" | "Failed";

export const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  Open: "bg-sky-50 text-sky-700 border border-sky-200",
  "In Progress": "bg-blue-50 text-blue-700 border border-blue-200",
  Completed: "bg-green-50 text-green-700 border border-green-200",
  Pending: "bg-amber-50 text-amber-700 border border-amber-200",
  Failed: "bg-red-50 text-red-700 border border-red-200",
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "CEN/AC/CRD-A/MOB/16032026/001_TASK_002",
    neLabel: "GRG_GBT_909_1AC_M_IXREXXR233",
    planActivity: "ip_new_equipment_activity",
    profileTypes: ["OPERATIONS", "IMPLEMENTATION"],
    locationCode: "GURGAON-GRG",
    taskActivity: "ip_new_equipment_activity",
    status: "Open",
  },
  {
    id: "CEN/AC/CRD-A/MOB/16032026/001_TASK_003",
    neLabel: "MUM_BKC_412_2AC_M_IXREXXR512",
    planActivity: "ip_card_addition",
    profileTypes: ["PLANNING", "IMPLEMENTATION"],
    locationCode: "MUMBAI-BOM",
    taskActivity: "ip_card_addition_activity",
    status: "In Progress",
  },
];

export const TASKS_BY_CRQ: Record<string, Task[]> = {
  default: DEFAULT_TASKS,
  CRQ000005983526: [
    {
      id: "CRQ000005983526_TASK_001",
      neLabel: "GRG_GBT_909_1AC_M_IXREXXR233",
      planActivity: "ip_new_equipment_activity",
      profileTypes: ["OPERATIONS"],
      locationCode: "GURGAON-GRG",
      taskActivity: "ip_new_equipment_activity",
      status: "Open",
    },
  ],
  CRQ000005983527: [
    {
      id: "CRQ000005983527_TASK_001",
      neLabel: "BOM_LBS_220_1AC_M_NKMSPR101",
      planActivity: "ip_card_swap",
      profileTypes: ["IMPLEMENTATION", "QA"],
      locationCode: "MUMBAI-BOM",
      taskActivity: "ip_card_swap_activity",
      status: "Completed",
    },
    {
      id: "CRQ000005983527_TASK_002",
      neLabel: "BOM_LBS_220_1AC_M_NKMSPR102",
      planActivity: "ip_card_validation",
      profileTypes: ["VALIDATION"],
      locationCode: "MUMBAI-BOM",
      taskActivity: "ip_validation_activity",
      status: "Pending",
    },
  ],
  CRQ000005983601: [
    {
      id: "CRQ000005983601_TASK_001",
      neLabel: "PNQ_HJM_777_2AC_M_CSCASR512",
      planActivity: "ip_b2b_provisioning",
      profileTypes: ["PLANNING", "IMPLEMENTATION"],
      locationCode: "PUNE-PNQ",
      taskActivity: "ip_b2b_provisioning_activity",
      status: "In Progress",
    },
  ],
};

export type WorkflowAssignment = {
  stage: string;
  empId: string | null;
  empName: string | null;
};

const wf = (ids: (string | null)[]): WorkflowAssignment[] =>
  ASSIGNMENT_COLUMNS.map((stage, i) => {
    const id = ids[i] ?? null;
    const emp = id ? EMPLOYEES.find((e) => e.id === id) : null;
    return { stage, empId: id, empName: emp?.name ?? null };
  });

export const WORKFLOW_BY_CRQ: Record<string, WorkflowAssignment[]> = {
  CRQ000005983526: wf(["B0096168", "B0277812", "B0318792", "B0095276", "B0316607", "B0421987", "B0542190"]),
  CRQ000005983527: wf(["B0316607", "B0421987", "B0542190", "B0612345", "B0723451", "B0834512", "B0945123"]),
  CRQ000005983528: wf(["B0542190", "B0612345", null, null, null, null, null]),
  CRQ000005983601: wf(["B0612345", "B0723451", "B0834512", "B0945123", "B1056234", "A1D5PXR6", "B0095276"]),
  CRQ000005983710: wf(["B0723451", "B0834512", "B0945123", "B1056234", "A1D5PXR6", null, null]),
  CRQ000005983711: wf(["B0834512", "B0945123", "B1056234", null, null, null, null]),
};

export const DEFAULT_WORKFLOW: WorkflowAssignment[] = wf([
  "B0316607",
  "B0421987",
  "B0542190",
  "B0612345",
  "B0723451",
  "B0834512",
  "B0945123",
]);

export const STATUS_STYLES: Record<ReviewStatus, string> = {
  Pause: "bg-slate-50 text-slate-600 border border-slate-200",
  Approved: "bg-green-50 text-green-700 border border-green-200",
  Canceled: "bg-red-50 text-red-700 border border-red-200",
  "In Review": "bg-blue-50 text-blue-700 border border-blue-200",
  "Non Service Affecting": "bg-slate-100 text-slate-600 border border-slate-200",
};

export function mopValidationStatus(status: ReviewStatus): string {
  switch (status) {
    case "Approved":
      return "completed";
    case "In Review":
      return "in progress";
    case "Pause":
      return "pending";
    case "Canceled":
      return "failed";
    case "Non Service Affecting":
      return "completed";
  }
}

export function taskClosureStatus(status: ReviewStatus): string {
  switch (status) {
    case "Approved":
      return "completed";
    case "In Review":
      return "in progress";
    case "Pause":
      return "pending";
    case "Canceled":
      return "pending";
    case "Non Service Affecting":
      return "completed";
  }
}

export const MOPV_STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border border-green-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  "in progress": "bg-blue-50 text-blue-700 border border-blue-200",
  failed: "bg-red-50 text-red-700 border border-red-200",
};

export const CLOSURE_STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border border-green-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  "in progress": "bg-blue-50 text-blue-700 border border-blue-200",
};
