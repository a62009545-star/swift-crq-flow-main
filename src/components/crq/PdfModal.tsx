import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Printer, Maximize2, Zap, CheckCircle2, FileText, Cpu, Globe, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FetchState = "idle" | "fetching" | "done";

type MopTool = {
  id: "infrasol" | "grasp";
  name: string;
  tagline: string;
  icon: React.ElementType;
  accent: string;
  accentText: string;
  accentBorder: string;
  steps: string[];
};

const MOP_TOOLS: MopTool[] = [
  {
    id: "infrasol",
    name: "Infrasol",
    tagline: " MOP synthesis",
    icon: Cpu,
    accent: "bg-violet-50",
    accentText: "text-violet-700",
    accentBorder: "border-violet-200",
    steps: [
      "Sending Technology & Layer Details",
      "Sending Vendors Details",
      "Sending Domain Details",
      "Sending Sub-Domain Details",
      "Sending NE Label & Model Details",
      "Sending Card Details",
      "Sending Activity Type Details",
    ],
  },
  {
    id: "grasp",
    name: "GRASP",
    tagline: "Migrating Services",
    icon: Globe,
    accent: "bg-sky-50",
    accentText: "text-sky-700",
    accentBorder: "border-sky-200",
    steps: [
      "Sending CRQ-Number",
      "Sending Source IP-Address",
      "Sending Destination IP-Address",
      "Sending VLAN Detail",
    ],
  },
];

// ─── Pulse ring animation (CSS-in-JS via style tag) ──────────────────────────

const ANIM_STYLES = `
@keyframes mop-spin { to { transform: rotate(360deg); } }
@keyframes mop-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
@keyframes mop-bar {
  0%   { width: 0% }
  15%  { width: 22% }
  40%  { width: 55% }
  70%  { width: 78% }
  90%  { width: 91% }
  100% { width: 100% }
}
@keyframes mop-pop {
  0%   { opacity:0; transform:scale(0.92) translateY(4px) }
  60%  { transform:scale(1.02) translateY(-1px) }
  100% { opacity:1; transform:scale(1) translateY(0) }
}
.mop-spin  { animation: mop-spin  1.1s linear infinite; }
.mop-pulse { animation: mop-pulse 1.4s ease-in-out infinite; }
.mop-bar   { animation: mop-bar   3.2s cubic-bezier(0.4,0,0.2,1) forwards; }
.mop-pop   { animation: mop-pop   0.35s ease-out forwards; }
`;

// ─── Fetching overlay ─────────────────────────────────────────────────────────

function FetchingOverlay({
  tool,
  stepIndex,
}: {
  tool: MopTool;
  stepIndex: number;
}) {
  const Icon = tool.icon;
  return (
    <div className={cn("rounded-2xl border-2 p-6 space-y-5 transition-all", tool.accentBorder, tool.accent)}>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", tool.accentBorder, "bg-white")}>
          <Icon className={cn("h-5 w-5 mop-pulse", tool.accentText)} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{tool.name}</p>
          <p className={cn("text-[11px] font-medium", tool.accentText)}>Generating MOP…</p>
        </div>
        <Loader2 className={cn("h-4 w-4 ml-auto mop-spin", tool.accentText)} />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/70 overflow-hidden border border-white">
        <div className={cn("h-full rounded-full mop-bar", tool.id === "infrasol" ? "bg-violet-400" : "bg-sky-400")} />
      </div>

      {/* Step log */}
      <div className="space-y-1.5">
        {tool.steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-2 text-[11px] transition-all duration-300",
              i < stepIndex
                ? "text-slate-400 line-through"
                : i === stepIndex
                ? cn("font-semibold", tool.accentText)
                : "text-slate-300"
            )}
          >
            {i < stepIndex ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-slate-300" />
            ) : i === stepIndex ? (
              <span className={cn("w-3 h-3 rounded-full shrink-0 border-2 mop-pulse", tool.id === "infrasol" ? "border-violet-400 bg-violet-100" : "border-sky-400 bg-sky-100")} />
            ) : (
              <span className="w-3 h-3 rounded-full shrink-0 border border-slate-200 bg-white" />
            )}
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Generated MOP Preview card ───────────────────────────────────────────────

function GeneratedMopCard({
  tool,
  crqId,
  onPreview,
  onUseThisMop,
}: {
  tool: MopTool;
  crqId: string;
  onPreview: () => void;
  onUseThisMop: () => void;
}) {
  const Icon = tool.icon;
  const filename = `MOP_${crqId}_${tool.id.toUpperCase()}.pdf`;
  const pages = tool.id === "infrasol" ? 14 : 11;
  const sections = tool.id === "infrasol"
    ? ["Pre-checks", "Activity steps", "Rollback plan", "Post-checks" , "Execution steps"]
    : ["Topology analysis", "Change scope", "Execution steps","Pre-checks","Rollback plan", "Post-checks"];

  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden mop-pop", tool.accentBorder)}>
      {/* Header */}
      <div className={cn("px-4 py-3 flex items-center gap-3", tool.accent)}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-white border", tool.accentBorder)}>
          <Icon className={cn("h-4 w-4", tool.accentText)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">{filename}</p>
          <p className={cn("text-[10px] font-medium", tool.accentText)}>{tool.name} · {pages} pages</p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      </div>

      {/* Dummy PDF preview */}
      <div className="bg-slate-50 px-4 py-3 border-t border-slate-100">
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Doc header row */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono text-[10px] text-slate-500 font-semibold">{filename}</span>
            <span className="ml-auto text-[10px] text-slate-400 font-mono">Page 1/{pages}</span>
          </div>
          {/* Fake PDF content */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-36 rounded bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-slate-100" />
                <div className="h-2 w-4/5 rounded bg-slate-100" />
                <div className="h-2 w-3/5 rounded bg-slate-100" />
              </div>
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-slate-100" />
                <div className="h-2 w-3/4 rounded bg-slate-100" />
                <div className="h-2 w-full rounded bg-slate-100" />
              </div>
            </div>
            <div className="pt-1 space-y-1">
              <div className="h-2 w-full rounded bg-slate-100" />
              <div className="h-2 w-11/12 rounded bg-slate-100" />
              <div className="h-2 w-2/3 rounded bg-slate-100" />
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {sections.map((s) => (
                <span key={s} className={cn("text-[9px] px-2 py-0.5 rounded-full border font-medium", tool.accentBorder, tool.accentText, tool.accent)}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-2 border-t border-slate-100 bg-white">
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
        >
          <FileText className="h-3 w-3" /> Preview
        </button>
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
        >
          <Download className="h-3 w-3" /> Download
        </button>
        <button
          onClick={onUseThisMop}
          className={cn(
            "ml-auto flex items-center gap-1.5 text-[11px] font-bold rounded-lg px-4 py-1.5 transition shadow-sm",
            tool.id === "infrasol"
              ? "bg-violet-600 hover:bg-violet-700 text-white"
              : "bg-sky-600 hover:bg-sky-700 text-white"
          )}
        >
          Use this MOP <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Execute MOP Creation Section ────────────────────────────────────────────

export function ExecuteMopCreation({
  crqId,
  onMopReady,
}: {
  crqId: string;
  onMopReady?: (toolId: "infrasol" | "grasp", filename: string) => void;
}) {
  const [fetchState, setFetchState] = useState<Record<"infrasol" | "grasp", FetchState>>({
    infrasol: "idle",
    grasp: "idle",
  });
  const [stepIndex, setStepIndex] = useState<Record<"infrasol" | "grasp", number>>({
    infrasol: 0,
    grasp: 0,
  });
  const [usedMop, setUsedMop] = useState<"infrasol" | "grasp" | null>(null);
  const intervalRef = useRef<Record<"infrasol" | "grasp", ReturnType<typeof setInterval> | null>>({
    infrasol: null,
    grasp: null,
  });

  function startFetch(toolId: "infrasol" | "grasp") {
    if (fetchState[toolId] !== "idle") return;

    setFetchState((s) => ({ ...s, [toolId]: "fetching" }));
    setStepIndex((s) => ({ ...s, [toolId]: 0 }));

    let step = 0;
    const tool = MOP_TOOLS.find((t) => t.id === toolId)!;
    const totalSteps = tool.steps.length;

    intervalRef.current[toolId] = setInterval(() => {
      step += 1;
      if (step < totalSteps) {
        setStepIndex((s) => ({ ...s, [toolId]: step }));
      } else {
        clearInterval(intervalRef.current[toolId]!);
        intervalRef.current[toolId] = null;
        setFetchState((s) => ({ ...s, [toolId]: "done" }));
      }
    }, 800);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current.infrasol) clearInterval(intervalRef.current.infrasol);
      if (intervalRef.current.grasp) clearInterval(intervalRef.current.grasp);
    };
  }, []);

  function handleUseThisMop(toolId: "infrasol" | "grasp") {
    setUsedMop(toolId);
    const filename = `MOP_${crqId}_${toolId.toUpperCase()}.pdf`;
    onMopReady?.(toolId, filename);
  }

  return (
    <>
      <style>{ANIM_STYLES}</style>
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        {/* Section header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Execute MOP Creation</p>
            <p className="text-[11px] text-slate-500">Select a tool to auto-generate the MOP document</p>
          </div>
          {usedMop && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
              <CheckCircle2 className="h-3 w-3" /> MOP auto-uploaded
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Tool cards grid */}
          <div className="grid grid-cols-2 gap-4">
            {MOP_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const state = fetchState[tool.id];

              if (state === "fetching") {
                return (
                  <FetchingOverlay key={tool.id} tool={tool} stepIndex={stepIndex[tool.id]} />
                );
              }

              if (state === "done") {
                return (
                  <GeneratedMopCard
                    key={tool.id}
                    tool={tool}
                    crqId={crqId}
                    onPreview={() => {}}
                    onUseThisMop={() => handleUseThisMop(tool.id)}
                  />
                );
              }

              // idle
              return (
                <button
                  key={tool.id}
                  onClick={() => startFetch(tool.id)}
                  disabled={fetchState[tool.id === "infrasol" ? "grasp" : "infrasol"] === "fetching"}
                  className={cn(
                    "group relative rounded-2xl border-2 p-5 text-left transition-all duration-200 hover:shadow-md active:scale-[0.98]",
                    tool.accentBorder,
                    tool.accent,
                    "disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  {/* Tool icon */}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 border bg-white transition-transform group-hover:scale-105", tool.accentBorder)}>
                    <Icon className={cn("h-5 w-5", tool.accentText)} />
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-0.5">{tool.name}</p>
                  <p className={cn("text-[11px] font-medium", tool.accentText)}>{tool.tagline}</p>

                  {/* Hover cue */}
                  <div className={cn(
                    "mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity",
                    tool.accentText
                  )}>
                    <Sparkles className="h-3 w-3" /> Generate MOP
                  </div>
                </button>
              );
            })}
          </div>

          {/* Auto-upload notice */}
          {!usedMop && (
            <p className="text-[10px] text-slate-400 text-center">
              Generated MOP will be automatically attached to the MOP Validation upload section.
            </p>
          )}

          {/* Uploaded confirmation banner */}
          {usedMop && (
            <div className="mop-pop rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">MOP auto-uploaded successfully</p>
                <p className="text-[11px] text-green-700 mt-0.5">
                  <span className="font-mono font-bold">MOP_{crqId}_{usedMop.toUpperCase()}.pdf</span>
                  {" "}has been pre-filled in the MOP Validation upload section.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── PDF Modal ────────────────────────────────────────────────────────────────

export function PdfModal({
  open,
  onClose,
  crqId,
  showMopCreation,
  onMopReady,
}: {
  open: boolean;
  onClose: () => void;
  crqId?: string;
  showMopCreation?: boolean;
  onMopReady?: (toolId: "infrasol" | "grasp", filename: string) => void;
}) {
  const [page, setPage] = useState(1);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn("p-0 gap-0 overflow-hidden", showMopCreation ? "max-w-5xl" : "max-w-4xl")}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-600 px-2">{page} / 3</span>
            <button
              onClick={() => setPage((p) => Math.min(3, p + 1))}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {[ZoomIn, ZoomOut, Download, Printer, Maximize2].map((I, i) => (
              <button key={i} className="p-1.5 rounded hover:bg-slate-200 text-slate-600">
                <I className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div className={cn("flex gap-0", showMopCreation ? "flex-row" : "flex-col")}>
          {/* PDF viewer pane */}
          <div className={cn("bg-slate-200 grid place-items-center", showMopCreation ? "w-1/2 h-[70vh]" : "h-[70vh] w-full")}>
            <div className="bg-white shadow-lg w-[60%] h-[90%] rounded-sm grid place-items-center text-slate-300 text-sm">
              PDF Page {page} Preview
            </div>
          </div>

          {/* MOP Creation panel */}
          {showMopCreation && crqId && (
            <div className="w-1/2 h-[70vh] overflow-y-auto border-l border-slate-200 p-4 bg-white">
              <ExecuteMopCreation crqId={crqId} onMopReady={onMopReady} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}