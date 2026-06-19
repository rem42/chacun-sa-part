import React from "react";
import { Check } from "lucide-react";

type Step = 1 | 2 | 3;

const STEPS: { id: Step; title: string; hint: string }[] = [
  { id: 1, title: "Vos données", hint: "Import PDF ou saisie" },
  { id: 2, title: "Vérification", hint: "Qui a déclaré quoi" },
  { id: 3, title: "Répartition", hint: "Parts et virement" },
];

interface StepperProps {
  step: Step;
  onStepChange: (step: Step) => void;
}

export function Stepper({ step, onStepChange }: StepperProps) {
  return (
    <nav aria-label="Étapes de la simulation" className="border-b border-border bg-card/50">
      <ol className="max-w-[1140px] mx-auto px-4 sm:px-6 py-3 flex items-center">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const current = step === s.id;
          const clickable = done;
          return (
            <React.Fragment key={s.id}>
              {i > 0 && (
                <li aria-hidden className="flex-1 mx-2 sm:mx-5 h-px bg-border relative overflow-hidden">
                  <span
                    className={`absolute inset-y-0 left-0 bg-primary transition-all duration-500 ${
                      step >= s.id ? "w-full" : "w-0"
                    }`}
                  />
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => clickable && onStepChange(s.id)}
                  disabled={!clickable}
                  aria-current={current ? "step" : undefined}
                  className={`group flex items-center gap-2.5 rounded-lg text-left ${
                    clickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span
                    className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done
                        ? "bg-primary text-primary-foreground group-hover:bg-primary-hover"
                        : current
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4 stroke-[2.5]" /> : s.id}
                  </span>
                  <span className={`flex-col ${current ? "flex" : "hidden sm:flex"}`}>
                    <span
                      className={`text-[13px] font-semibold leading-4 ${
                        current ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground hidden md:inline">{s.hint}</span>
                  </span>
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
