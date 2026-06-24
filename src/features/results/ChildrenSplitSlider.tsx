import React from "react";
import { Baby, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";

interface ChildrenSplitSliderProps {
  totalChildren: number;
  partner0Fraction: number; // 0 à 1 (part attribuée à D1)
  onFractionChange: (fraction: number) => void;
  partner0Name: string;
  partner1Name: string;
}

const formatCount = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export function ChildrenSplitSlider({
  totalChildren,
  partner0Fraction,
  onFractionChange,
  partner0Name,
  partner1Name,
}: ChildrenSplitSliderProps) {
  if (totalChildren <= 0) {
    return null;
  }

  const p0Percent = Math.round(partner0Fraction * 100);
  const p1Percent = 100 - p0Percent;

  const p0ChildrenCount = Math.round(totalChildren * partner0Fraction * 10) / 10;
  const p1ChildrenCount = Math.round(totalChildren * (1 - partner0Fraction) * 10) / 10;

  const presets = [
    { value: 1, label: `Tout pour ${partner0Name}`, active: p0Percent === 100 },
    { value: 0.5, label: "50 / 50", active: p0Percent === 50 },
    { value: 0, label: `Tout pour ${partner1Name}`, active: p0Percent === 0 },
  ];

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-household/10 text-household flex items-center justify-center shrink-0">
              <Baby className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Rattachement des enfants dans les calculs « solo »
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  {formatCount(totalChildren)} enfant{totalChildren > 1 ? "s" : ""}
                </span>
              </h3>
              <p className="body-sm text-muted-foreground text-pretty">
                Pour savoir ce que chacun paierait seul, il faut décider qui compte les enfants à charge.
                L’impôt du foyer, lui, ne change pas.
              </p>
            </div>
          </div>

          <div role="group" aria-label="Répartition rapide des enfants" className="flex flex-wrap items-center gap-1.5 shrink-0">
            {presets.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={o.active}
                onClick={() => onFractionChange(o.value)}
                className={`h-8 px-3 rounded-lg text-xs font-medium border truncate max-w-[160px] transition-colors cursor-pointer ${
                  o.active
                    ? "bg-household/10 border-household/40 text-household"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-input"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm font-semibold tabular-nums">
            <span className="text-p0">
              {partner0Name} · {formatCount(p0ChildrenCount)} enfant{p0ChildrenCount > 1 ? "s" : ""}{" "}
              <span className="text-xs font-normal text-muted-foreground">({p0Percent} %)</span>
            </span>
            <span className="text-p1 text-right">
              {partner1Name} · {formatCount(p1ChildrenCount)} enfant{p1ChildrenCount > 1 ? "s" : ""}{" "}
              <span className="text-xs font-normal text-muted-foreground">({p1Percent} %)</span>
            </span>
          </div>

          <Slider
            value={[p0Percent]}
            min={0}
            max={100}
            step={totalChildren > 0 ? Math.round(100 / (totalChildren * 2)) : 5}
            onValueChange={(vals) => onFractionChange(vals[0] / 100)}
            trackClassName="bg-p1"
            rangeClassName="bg-p0"
            thumbClassName="border-foreground"
            thumbLabel={`Part des enfants rattachée à ${partner0Name}`}
          />

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
            <Info className="h-3.5 w-3.5 shrink-0 mt-px text-primary" />
            <span>
              Un enfant partagé à 50 / 50 est compté comme un enfant en résidence alternée dans chaque calcul « solo ».
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
