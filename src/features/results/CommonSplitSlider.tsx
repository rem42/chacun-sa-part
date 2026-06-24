import React from "react";
import { Building2, SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface CommonSplitSliderProps {
  totalCommonAmount: number;
  commonBoxesCount: number;
  partner0Fraction: number; // 0 à 1 (part attribuée à D1)
  onFractionChange: (fraction: number) => void;
  partner0Name: string;
  partner1Name: string;
}

export function CommonSplitSlider({
  totalCommonAmount,
  commonBoxesCount,
  partner0Fraction,
  onFractionChange,
  partner0Name,
  partner1Name,
}: CommonSplitSliderProps) {
  if (commonBoxesCount <= 0) {
    return null;
  }

  const p0Percent = Math.round(partner0Fraction * 100);
  const p1Percent = 100 - p0Percent;

  const p0Amount = Math.round(totalCommonAmount * partner0Fraction);
  const p1Amount = totalCommonAmount - p0Amount;

  const handleP0AmountChange = (newAmount: number) => {
    if (totalCommonAmount <= 0) return;
    const clamped = Math.max(0, Math.min(totalCommonAmount, newAmount));
    onFractionChange(clamped / totalCommonAmount);
  };

  const handleP1AmountChange = (newAmount: number) => {
    if (totalCommonAmount <= 0) return;
    const clamped = Math.max(0, Math.min(totalCommonAmount, newAmount));
    onFractionChange((totalCommonAmount - clamped) / totalCommonAmount);
  };

  return (
    <Card className="border border-border shadow-layer-1 bg-card rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm sm:text-base text-foreground">
                  Répartition des revenus et charges du foyer
                </span>
                <Badge variant="outline" className="text-xs">
                  {commonBoxesCount} case{commonBoxesCount > 1 ? "s" : ""} ({formatCurrency(totalCommonAmount)})
                </Badge>
              </div>
              <p className="body-sm text-muted-foreground">
                Saisissez les montants en euros (€) ou ajustez la quote-part attribuée à chacun.
              </p>
            </div>
          </div>

          {/* Presets rapides */}
          <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant={p0Percent === 50 ? "default" : "outline"}
              size="sm"
              onClick={() => onFractionChange(0.5)}
              className="h-7 text-xs px-2.5"
            >
              50 / 50
            </Button>
            <Button
              variant={p0Percent === 70 ? "default" : "outline"}
              size="sm"
              onClick={() => onFractionChange(0.7)}
              className="h-7 text-xs px-2.5"
            >
              70 / 30
            </Button>
            <Button
              variant={p0Percent === 100 ? "default" : "outline"}
              size="sm"
              onClick={() => onFractionChange(1)}
              className="h-7 text-xs px-2.5"
            >
              100% {partner0Name}
            </Button>
            <Button
              variant={p0Percent === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => onFractionChange(0)}
              className="h-7 text-xs px-2.5"
            >
              100% {partner1Name}
            </Button>
          </div>
        </div>

        {/* Saisie numéraire directe en euros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-2.5 rounded-lg bg-p0/5 border border-p0/20 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-p0">
              <span>Montant pour {partner0Name} :</span>
              <span className="font-mono text-muted-foreground font-normal tabular-nums">{p0Percent}%</span>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={p0Amount}
                onChange={(e) => handleP0AmountChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono font-bold tabular-nums text-right pr-6 bg-background border-p0/30"
                placeholder="0"
              />
              <span className="absolute right-2 top-2 text-xs text-muted-foreground">€</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-p1/5 border border-p1/20 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-p1">
              <span>Montant pour {partner1Name} :</span>
              <span className="font-mono text-muted-foreground font-normal tabular-nums">{p1Percent}%</span>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={p1Amount}
                onChange={(e) => handleP1AmountChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono font-bold tabular-nums text-right pr-6 bg-background border-p1/30"
                placeholder="0"
              />
              <span className="absolute right-2 top-2 text-xs text-muted-foreground">€</span>
            </div>
          </div>
        </div>

        {/* Jauge Slider */}
        <div className="space-y-2 pt-1">
          <Slider
            value={[p0Percent]}
            min={0}
            max={100}
            step={1}
            onValueChange={(vals) => onFractionChange(vals[0] / 100)}
            className="w-full"
          />

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>100% {partner0Name}</span>
            <span className="flex items-center gap-1 text-xs">
              <SlidersHorizontal className="h-3 w-3" />
              Glissez ou saisissez les montants pour ajuster
            </span>
            <span>100% {partner1Name}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
