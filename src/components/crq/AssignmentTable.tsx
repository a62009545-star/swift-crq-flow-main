import { useState } from "react";
import { ASSIGNMENT_COLUMNS, ASSIGNMENT_ROWS, EMPLOYEES } from "./data";
import { EmployeePicker } from "./EmployeePicker";

export function AssignmentTable() {
  const [rows, setRows] = useState(() =>
    ASSIGNMENT_ROWS.map((r) => ({ ...r, values: [...r.values] })),
  );

  const setCell = (rowIdx: number, colIdx: number, val: string | null) => {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r, values: [...r.values] }));
      next[rowIdx].values[colIdx] = val;
      return next;
    });
  };

  return (
    <div className="px-6 py-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-semibold text-slate-900">CRQ Assignment</h2>
        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
          246
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((row, ri) => (
          <div
            key={row.crq}
            className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 ease-out flex items-stretch"
          >
            <div className="w-[200px] shrink-0 px-4 py-4 border-r border-slate-100 flex items-center">
              <span className="font-mono text-sm font-semibold text-slate-800">{row.crq}</span>
            </div>
            <div className="flex-1 overflow-x-auto scrollbar-thin">
              <div className="flex gap-3 p-3 min-w-max">
                {ASSIGNMENT_COLUMNS.map((col, ci) => {
                  const empId = row.values[ci];
                  return (
                    <div key={col} className="w-[200px]">
                      <EmployeePicker
                        label={col}
                        value={empId}
                        onChange={(v) => setCell(ri, ci, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { EMPLOYEES };
