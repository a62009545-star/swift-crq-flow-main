import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/crq/Sidebar";
import { Header } from "@/components/crq/Header";
import { Stepper, STEPS, type StepId } from "@/components/crq/Stepper";
import { Toolbar, type ViewMode } from "@/components/crq/Toolbar";
import { AssignmentTable } from "@/components/crq/AssignmentTable";
import { PlanValidation } from "@/components/crq/PlanValidation";
import { Pagination } from "@/components/crq/Pagination";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [nav, setNav] = useState("workflow");
  const [step, setStep] = useState<StepId>("plan");
  const [fn, setFn] = useState("IP Access_CCB");
  const [sub, setSub] = useState("All");
  const [view, setView] = useState<ViewMode>("list");
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setFade(false);
    const t = setTimeout(() => setFade(true), 30);
    return () => clearTimeout(t);
  }, [step]);

  const stepLabel = STEPS.find((s) => s.id === step)?.label ?? "";

  return (
    <div className="min-h-screen bg-slate-50/60">
      <Sidebar active={nav} onChange={setNav} />
      <Header crumb={["CRQ Workflow", stepLabel]} />
      <div className="ml-[220px] pt-14 flex flex-col min-h-screen">
        <div className="sticky top-14 z-10 bg-white">
          <Stepper active={step} onChange={setStep} />
          <Toolbar fn={fn} setFn={setFn} sub={sub} setSub={setSub} view={view} setView={setView} />
        </div>
        <main className={`flex-1 transition-opacity duration-200 ${fade ? "opacity-100" : "opacity-0"}`}>
          {step === "assignment" ? (
            <AssignmentTable />
          ) : (
            <PlanValidation title={stepLabel} stage={step} />
          )}
        </main>
        <Pagination />
      </div>
    </div>
  );
}
