import React, { useState } from "react";
import {
  Edit3,
  History,
  BookmarkPlus,
  Landmark,
  Cpu,
  Check,
  Printer,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PartnerResult, SettlementSummary, SimulationResult, SplitMethod, ValuedBox } from "@/lib/types";
import { SettlementCard } from "@/features/results/SettlementCard";
import { ChildrenSplitSlider } from "@/features/results/ChildrenSplitSlider";
import { TaxBreakdownOfficialTable } from "@/features/results/TaxBreakdownOfficialTable";
import { PrintableReport } from "@/features/results/PrintableReport";
import { WithholdingAdvisor } from "@/features/results/WithholdingAdvisor";
import { formatCurrency, formatPercent, grossTaxShare } from "@/lib/utils";
import { TONES, partnerTone } from "@/lib/tones";

/** Libellés courts des méthodes pour les cartes de choix (le détail vient du moteur). */
const METHOD_CARDS: { method: SplitMethod; title: string; hint: string }[] = [
  { method: "strict_individual", title: "Le plus modeste paie son impôt « solo »", hint: "L’autre garde l’économie" },
  { method: "equal_gain", title: "Économie partagée 50 / 50", hint: "Chacun profite de la moitié" },
  { method: "income_prorata", title: "Au prorata des revenus", hint: "Même taux pour les deux" },
  { method: "isolated_tax_prorata", title: "Au prorata de l’impôt « solo »", hint: "Économie proportionnelle" },
];

const grossShare = grossTaxShare;

function PartnerResultCard({ p, label }: { p: PartnerResult; label: string }) {
  const t = TONES[partnerTone(p.partnerIndex)];
  const owes = p.remainsToPay > 0;
  const refund = p.remainsToPay < 0;
  return (
    <Card className={`flex flex-col overflow-hidden border-t-4 ${p.partnerIndex === 0 ? "border-t-p0" : "border-t-p1"}`}>
      <div className="p-5 pb-4 flex items-center justify-between gap-3 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-10 w-10 rounded-full ${t.solid} flex items-center justify-center font-display text-lg font-semibold shrink-0`}>
            {(p.name.trim()[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{p.name}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">Sa part de l’impôt</div>
          <div className={`stat-md ${t.text}`}>{formatCurrency(grossShare(p))}</div>
        </div>
      </div>

      <dl className="p-5 space-y-2.5 text-sm flex-1">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">S’il déclarait seul</dt>
          <dd className="font-mono tabular-nums text-muted-foreground">{formatCurrency(p.taxIfSingle)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Économie grâce au couple</dt>
          <dd className={`font-mono tabular-nums font-semibold ${p.taxGain > 0 ? "text-gain" : "text-muted-foreground"}`}>
            {p.taxGain > 0 ? `−${formatCurrency(p.taxGain)}` : formatCurrency(0)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Taux effectif</dt>
          <dd className="font-mono tabular-nums">{formatPercent(p.effectiveTaxRate)}</dd>
        </div>
        {(p.outreMerPaid ?? 0) > 0 && (
          <div className="flex justify-between gap-3 pt-2.5 border-t border-dashed">
            <dt className="text-muted-foreground">Girardin déjà payé</dt>
            <dd className="font-mono tabular-nums">−{formatCurrency(p.outreMerPaid ?? 0)}</dd>
          </div>
        )}
        <div className={`flex justify-between gap-3 pt-2.5 ${(p.outreMerPaid ?? 0) > 0 ? "" : "border-t border-dashed"}`}>
          <dt className="text-muted-foreground">Déjà prélevé à la source</dt>
          <dd className="font-mono tabular-nums">−{formatCurrency(p.alreadyPaid)}</dd>
        </div>
        {p.socialLevies !== undefined && p.socialLevies > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Prélèvements sociaux</dt>
            <dd className="font-mono tabular-nums text-owe">+{formatCurrency(p.socialLevies)}</dd>
          </div>
        )}
      </dl>

      <div className="px-5 pb-5">
        <div
          className={`px-4 py-3 rounded-xl flex items-center justify-between gap-3 ${
            owes ? "bg-owe/10 text-owe" : refund ? "bg-gain/10 text-gain" : "bg-muted text-muted-foreground"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wide">
            {owes ? "Reste à payer" : refund ? "Trop prélevé" : "Solde à zéro"}
          </span>
          <span className="stat-md">{formatCurrency(Math.abs(p.remainsToPay))}</span>
        </div>
      </div>
    </Card>
  );
}

interface ComparisonResultsProps {
  together: SimulationResult;
  partner0: SimulationResult;
  partner1: SimulationResult;
  splits: Record<SplitMethod, SettlementSummary>;
  partner0Name: string;
  partner1Name: string;
  totalChildren: number;
  partner0ChildrenFraction: number;
  onChildrenFractionChange: (fraction: number) => void;
  totalCommonAmount?: number;
  commonBoxesCount?: number;
  partner0CommonFraction?: number;
  onCommonFractionChange?: (fraction: number) => void;
  onEditBoxes: () => void;
  activeSimulationName?: string;
  onSaveAsNew?: () => void;
  onOpenHistory?: () => void;
  boxes?: ValuedBox[];
}

export function ComparisonResults({
  together,
  partner0,
  partner1,
  splits,
  partner0Name,
  partner1Name,
  totalChildren,
  partner0ChildrenFraction,
  onChildrenFractionChange,
  totalCommonAmount,
  commonBoxesCount,
  partner0CommonFraction,
  onCommonFractionChange,
  onEditBoxes,
  activeSimulationName,
  onSaveAsNew,
  onOpenHistory,
  boxes,
}: ComparisonResultsProps) {
  const [activeMethod, setActiveMethod] = useState<SplitMethod>("strict_individual");

  const currentSummary = splits[activeMethod] || splits["strict_individual"] || splits["equal_gain"];
  const [p0, p1] = currentSummary.partners;

  // Le Girardin industriel est de l'impôt déjà payé par son porteur : on le réintègre à l'impôt du foyer
  const girardinTogether = together.outreMerReductions ?? 0;
  const totalSingle =
    partner0.totalTax + (partner0.outreMerReductions ?? 0) + partner1.totalTax + (partner1.outreMerReductions ?? 0);
  const totalTogether = together.totalTax + girardinTogether;
  const coupleGain = Math.max(0, totalSingle - totalTogether);
  const gainPercent = totalSingle > 0 ? (coupleGain / totalSingle) * 100 : 0;
  const fromDgfip = together.source === "dgfip";

  const shareOf = (summary: SettlementSummary) =>
    totalTogether > 0
      ? Math.min(100, Math.max(0, Math.round((grossShare(summary.partners[0]) / totalTogether) * 100)))
      : 50;

  return (
    <div className="w-full max-w-[1140px] mx-auto space-y-8">
      {/* Synthèse du foyer */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <p
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                fromDgfip ? "bg-gain/10 text-gain" : "bg-owe/10 text-owe"
              }`}
              title={
                fromDgfip
                  ? undefined
                  : "Simulation enregistrée avant la suppression du calcul de secours : l’impôt avait été calculé localement. Relancez le calcul pour obtenir le résultat officiel."
              }
            >
              {fromDgfip ? <Landmark className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
              {fromDgfip
                ? `Simulateur officiel DGFiP${together.simulatorYear ? ` · revenus ${together.simulatorYear - 1}` : ""}`
                : "Ancien calcul local (non officiel)"}
            </p>
            <h2 className="headline-lg text-foreground">
              {activeSimulationName || `Répartition de ${partner0Name} et ${partner1Name}`}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEditBoxes} className="gap-1.5 h-9">
              <Edit3 className="h-3.5 w-3.5" />
              Modifier les cases
            </Button>
            {onSaveAsNew && (
              <Button variant="ghost" size="sm" onClick={onSaveAsNew} className="gap-1.5 h-9">
                <BookmarkPlus className="h-3.5 w-3.5" />
                Enregistrer une copie
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => window.print()} className="gap-1.5 h-9" aria-label="Imprimer ou enregistrer en PDF">
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Imprimer / PDF</span>
            </Button>
            {onOpenHistory && (
              <Button variant="ghost" size="sm" onClick={onOpenHistory} className="gap-1.5 h-9" aria-label="Historique">
                <History className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Historique</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-5 rounded-2xl bg-primary text-primary-foreground shadow-layer-2">
            <div className="text-xs font-medium opacity-80">Impôt sur le revenu du foyer</div>
            <div className="stat-lg mt-1">{formatCurrency(totalTogether)}</div>
            <div className="text-xs opacity-80 mt-1">
              {girardinTogether > 0
                ? `${formatCurrency(together.totalTax)} à régler + ${formatCurrency(girardinTogether)} de Girardin déjà payés`
                : "en déclaration commune"}
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-card border shadow-layer-1">
            <div className="text-xs font-medium text-muted-foreground">Si vous déclariez séparément</div>
            <div className="stat-lg mt-1 text-muted-foreground">{formatCurrency(totalSingle)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(partner0.totalTax + (partner0.outreMerReductions ?? 0))} +{" "}
              {formatCurrency(partner1.totalTax + (partner1.outreMerReductions ?? 0))}
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-gain/10 border border-gain/20">
            <div className="text-xs font-medium text-gain">Économie de la déclaration commune</div>
            <div className="stat-lg mt-1 text-gain">{formatCurrency(coupleGain)}</div>
            <div className="text-xs text-gain/80 mt-1">
              {coupleGain > 0 ? `soit ${gainPercent.toFixed(1).replace(".", ",")} % d’impôt en moins` : "aucun avantage cette année"}
            </div>
          </div>
        </div>
      </section>

      {/* Choix de la méthode de partage */}
      <section className="space-y-4" aria-labelledby="method-title">
        <div>
          <h3 id="method-title" className="headline-md text-foreground">Comment partager cet impôt ?</h3>
          <p className="body-sm text-muted-foreground">
            Quatre façons courantes de répartir l’impôt commun. Aucune n’est imposée par la loi : choisissez celle qui vous paraît juste.
          </p>
        </div>

        <div role="radiogroup" aria-labelledby="method-title" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {METHOD_CARDS.filter((m) => splits[m.method]).map((m) => {
            const summary = splits[m.method];
            const active = m.method === activeMethod;
            const pct = shareOf(summary);
            return (
              <button
                key={m.method}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setActiveMethod(m.method)}
                className={`relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 ${
                  active
                    ? "border-primary bg-card shadow-layer-2"
                    : "border-transparent bg-card shadow-layer-1 ring-1 ring-border hover:ring-input"
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
                <span className="pr-6">
                  <span className="block text-sm font-semibold text-foreground leading-snug">{m.title}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{m.hint}</span>
                </span>
                <span className="block space-y-1.5 mt-auto">
                  <span className="flex h-2 rounded-full overflow-hidden bg-muted" aria-hidden>
                    <span className="bg-p0 transition-all duration-300" style={{ width: `${pct}%` }} />
                    <span className="bg-p1 flex-1" />
                  </span>
                  <span className="flex justify-between text-[11px] font-mono font-semibold tabular-nums">
                    <span className="text-p0">{formatCurrency(grossShare(summary.partners[0]))}</span>
                    <span className="text-p1">{formatCurrency(grossShare(summary.partners[1]))}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 rounded-2xl bg-secondary/60 border border-primary/10 text-sm">
          <div className="font-semibold text-foreground">{currentSummary.methodLabel}</div>
          <p className="text-muted-foreground mt-0.5 text-pretty">{currentSummary.methodDescription}</p>
        </div>
      </section>

      {/* Curseur d'attribution des enfants pour les calculs « solo » */}
      {totalChildren > 0 && (
        <ChildrenSplitSlider
          totalChildren={totalChildren}
          partner0Fraction={partner0ChildrenFraction}
          onFractionChange={onChildrenFractionChange}
          partner0Name={partner0Name}
          partner1Name={partner1Name}
        />
      )}

      {/* Résultat par conjoint */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5" aria-label="Résultat par conjoint">
        <PartnerResultCard p={p0} label="Déclarant 1" />
        <PartnerResultCard p={p1} label="Déclarant 2" />
      </section>

      {/* Virement d'équilibrage entre conjoints */}
      <SettlementCard summary={currentSummary} />

      {/* Réglage du prélèvement à la source */}
      <WithholdingAdvisor together={together} summary={currentSummary} />

      {/* Décomposition détaillée du calcul d'impôt */}
      <TaxBreakdownOfficialTable
        together={together}
        partner0={partner0}
        partner1={partner1}
        partner0Name={partner0Name}
        partner1Name={partner1Name}
        summary={currentSummary}
      />

      <PrintableReport
        together={together}
        partner0={partner0}
        partner1={partner1}
        splits={splits}
        activeMethod={activeMethod}
        title={activeSimulationName}
      />
    </div>
  );
}
