import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedSimulation } from "@/lib/history-storage";
import { SplitMethod } from "@/lib/types";
import { compareSimulations, ComparisonRow } from "@/lib/compare";
import { formatCurrency, formatPercent } from "@/lib/utils";

const METHODS: { method: SplitMethod; label: string }[] = [
  { method: "strict_individual", label: "Le plus modeste paie son impôt « solo »" },
  { method: "equal_gain", label: "Économie partagée 50 / 50" },
  { method: "income_prorata", label: "Au prorata des revenus" },
  { method: "isolated_tax_prorata", label: "Au prorata de l’impôt « solo »" },
];

const GROUP_TITLES = { foyer: "Foyer", partner0: "Déclarant 1", partner1: "Déclarant 2" } as const;

interface Props {
  older: SavedSimulation;
  newer: SavedSimulation;
  onBack: () => void;
}

function formatValue(row: ComparisonRow, value: number) {
  return row.kind === "percent" ? formatPercent(value) : formatCurrency(value);
}

function formatDelta(row: ComparisonRow) {
  if (Math.abs(row.delta) < (row.kind === "percent" ? 0.05 : 0.5)) return "=";
  const sign = row.delta > 0 ? "+" : "−";
  return `${sign}${row.kind === "percent" ? formatPercent(Math.abs(row.delta)) : formatCurrency(Math.abs(row.delta))}`;
}

/** Compare deux simulations enregistrées (ex. deux années) ligne à ligne, pour une méthode de partage au choix. */
export function SimulationComparisonTable({ older, newer, onBack }: Props) {
  const [method, setMethod] = React.useState<SplitMethod>("equal_gain");
  const { rows } = compareSimulations(older, newer, method);
  const year = (s: SavedSimulation) => (s.simulationData.together.simulatorYear ? `revenus ${s.simulationData.together.simulatorYear - 1}` : "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 h-8 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à l’historique
        </Button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Méthode de partage
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as SplitMethod)}
            className="h-8 rounded-lg border border-input bg-card px-2 text-xs"
          >
            {METHODS.map((m) => (
              <option key={m.method} value={m.method}>{m.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-xs border-collapse tabular-nums">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="text-left font-semibold py-2.5 px-3"></th>
              <th className="text-right font-semibold py-2.5 px-3">
                {older.name}
                <div className="text-[10px] font-normal">{year(older)}</div>
              </th>
              <th className="text-right font-semibold py-2.5 px-3">
                {newer.name}
                <div className="text-[10px] font-normal">{year(newer)}</div>
              </th>
              <th className="text-right font-semibold py-2.5 px-3">Évolution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(["foyer", "partner0", "partner1"] as const).map((group) => (
              <React.Fragment key={group}>
                <tr className="bg-muted/20">
                  <td colSpan={4} className="py-1.5 px-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    {group === "foyer" ? GROUP_TITLES.foyer : `${GROUP_TITLES[group]} · ${group === "partner0" ? newer.partner0Name : newer.partner1Name}`}
                  </td>
                </tr>
                {rows.filter((r) => r.group === group).map((r) => (
                  <tr key={r.key}>
                    <td className="py-2 px-3">{r.label}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatValue(r, r.a)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatValue(r, r.b)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">{formatDelta(r)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Chaque simulation conserve les montants calculés au moment de son enregistrement (simulateur officiel de son millésime).
      </p>
    </div>
  );
}
