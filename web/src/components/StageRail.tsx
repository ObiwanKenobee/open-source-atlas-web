import type { DecisionStatus } from "@shared/types";
import { STATUS_META } from "../lib/format";

const ORDER: DecisionStatus[] = [
  "draft",
  "understanding",
  "evaluated",
  "authorized",
  "executing",
  "verified",
  "learned",
];

export function StageRail({ current }: { current: DecisionStatus }) {
  const index = ORDER.indexOf(current);
  return (
    <nav className="stage-rail" aria-label="Decision cycle">
      {ORDER.map((status, position) => {
        const state = position < index ? "done" : position === index ? "current" : "future";
        return (
          <div key={status} className={`stage stage-${state}`} aria-current={position === index ? "step" : undefined}>
            <span className="stage-dot">{position < index ? "✓" : position + 1}</span>
            <span className="stage-name">{STATUS_META[status].label}</span>
          </div>
        );
      })}
    </nav>
  );
}
