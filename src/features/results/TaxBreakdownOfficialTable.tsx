import React, { useState } from "react";
import { ReceiptText, ChevronDown, ChevronUp, ShieldCheck, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SimulationResult, SettlementSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface TaxBreakdownOfficialTableProps {
  together: SimulationResult;
  partner0: SimulationResult;
  partner1: SimulationResult;
  partner0Name: string;
  partner1Name: string;
  summary?: SettlementSummary;
}

type Cells = [number | undefined, number | undefined, number | undefined];

/** Ligne du tableau : colonnes Déclarant 1 seul, Déclarant 2 seul, foyer. Une valeur absente ou nulle s'affiche « — ». */
function Row({
  label,
  hint,
  cells,
  sign = "",
  tone = "",
  strong = false,
}: {
  label: string;
  hint?: string;
  cells: Cells;
  sign?: "" | "+" | "−";
  tone?: string;
  strong?: boolean;
}) {
  const show = (v: number | undefined) => (v ? `${sign}${formatCurrency(Math.abs(v))}` : "—");
  return (
    <tr>
      <td className={`py-2.5 px-4 ${strong ? "font-semibold text-foreground" : "font-medium"}`}>
        {label}
        {hint && <div className="text-[11px] font-normal text-muted-foreground">{hint}</div>}
      </td>
      <td className={`py-2.5 px-3 text-right font-mono ${tone}`}>{show(cells[0])}</td>
      <td className={`py-2.5 px-3 text-right font-mono ${tone}`}>{show(cells[1])}</td>
      <td className={`py-2.5 px-4 text-right font-mono font-medium bg-muted/20 ${tone}`}>{show(cells[2])}</td>
    </tr>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <tr className="bg-muted/15 font-semibold text-foreground">
      <td colSpan={4} className="py-2 px-4 text-[11px] uppercase tracking-wider text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

/**
 * Décomposition de l'impôt : chaque montant est lu tel quel dans la réponse du simulateur officiel de la DGFiP
 * (déclaration commune et déclarations « solo »). Les seuls calculs faits ici sont des différences entre deux
 * montants officiels (crédits d'impôt) et la part attribuée par la méthode de répartition choisie.
 */
export function TaxBreakdownOfficialTable({
  together,
  partner0,
  partner1,
  partner0Name,
  partner1Name,
  summary,
}: TaxBreakdownOfficialTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const all = (pick: (r: SimulationResult) => number | undefined): Cells => [pick(partner0), pick(partner1), pick(together)];
  const credits = (r: SimulationResult) =>
    r.taxBeforeCredits !== undefined ? Math.max(0, r.taxBeforeCredits - r.totalTax) : undefined;

  const fromDgfip = together.source === "dgfip";
  const maritalGain = Math.max(0, partner0.totalTax + partner1.totalTax - together.totalTax);

  const assignedP0 = summary ? summary.partners[0].taxAssigned : Math.round(together.totalTax / 2);
  const assignedP1 = summary ? summary.partners[1].taxAssigned : together.totalTax - assignedP0;
  const pasP0 = summary ? summary.partners[0].alreadyPaid : partner0.alreadyPaid;
  const pasP1 = summary ? summary.partners[1].alreadyPaid : partner1.alreadyPaid;
  const levyP0 = summary?.partners[0].socialLevies ?? partner0.socialLevies ?? 0;
  const levyP1 = summary?.partners[1].socialLevies ?? partner1.socialLevies ?? 0;
  const remainsP0 = summary ? summary.partners[0].remainsToPay : assignedP0 + levyP0 - pasP0;
  const remainsP1 = summary ? summary.partners[1].remainsToPay : assignedP1 + levyP1 - pasP1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="tax-breakdown"
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0">
              <ReceiptText className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <CardTitle className="headline-md">Détail du calcul</CardTitle>
              <span className="block text-sm text-muted-foreground mt-0.5">
                Des revenus déclarés au solde de chacun, étape par étape.
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2 shrink-0 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{isExpanded ? "Masquer" : "Afficher"}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent id="tax-breakdown" className="p-0 border-t">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse tabular-nums">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <th className="py-3 px-4 w-2/5 min-w-[220px]">Étape du calcul</th>
                  <th className="py-3 px-3 w-1/5 text-right text-p0 font-bold">
                    {partner0Name}
                    <div className="text-[10px] font-normal text-muted-foreground">seul(e)</div>
                  </th>
                  <th className="py-3 px-3 w-1/5 text-right text-p1 font-bold">
                    {partner1Name}
                    <div className="text-[10px] font-normal text-muted-foreground">seul(e)</div>
                  </th>
                  <th className="py-3 px-4 w-1/5 text-right text-foreground font-bold bg-muted/70">
                    Foyer
                    <div className="text-[10px] font-normal text-muted-foreground">déclaration commune</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <SectionTitle>Revenu imposable</SectionTitle>
                <Row label="Revenu brut global" cells={all((r) => r.grossIncome)} />
                <Row
                  label="Charges déductibles"
                  hint="Épargne retraite (PER), pensions versées, etc."
                  cells={all((r) => r.deductions)}
                  sign="−"
                />
                <tr className="bg-muted/30 font-bold border-y">
                  <td className="py-2.5 px-4 text-foreground">Revenu net imposable</td>
                  <td className="py-2.5 px-3 text-right font-mono text-p0">{formatCurrency(partner0.taxableIncome ?? 0)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-p1">{formatCurrency(partner1.taxableIncome ?? 0)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-foreground font-black bg-muted/60">
                    {formatCurrency(together.taxableIncome ?? 0)}
                  </td>
                </tr>

                <SectionTitle>Impôt</SectionTitle>
                <Row
                  label="Impôt au barème progressif"
                  hint="Après quotient familial, avant décote, réductions et crédits"
                  cells={all((r) => r.netTaxBeforeCredits)}
                  strong
                />
                <Row label="Décote" cells={all((r) => r.decote)} sign="−" tone="text-gain" />
                <Row
                  label="Réductions d’impôt"
                  hint="Dons, cotisations syndicales… Le Girardin industriel est compté comme déjà payé par son porteur."
                  cells={all((r) => r.totalReductions)}
                  sign="−"
                  tone="text-gain"
                />
                <Row
                  label="Imposition forfaitaire des revenus du capital"
                  cells={all((r) => r.proportionalTax)}
                  sign="+"
                  tone="text-muted-foreground"
                />
                <Row
                  label="Crédits d’impôt"
                  hint="Frais de garde, emploi à domicile, prélèvement forfaitaire déjà versé (2CK)…"
                  cells={all(credits)}
                  sign="−"
                  tone="text-gain"
                />

                <tr className="bg-secondary font-bold border-y-2 border-primary/20">
                  <td className="py-3 px-4 text-sm text-foreground">
                    Impôt net sur le revenu
                    <div className="text-[11px] font-normal text-muted-foreground">
                      Colonnes {partner0Name} / {partner1Name} : part attribuée selon la méthode choisie
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-p0 text-sm">
                    {formatCurrency(assignedP0)}
                    {(summary?.partners[0].outreMerPaid ?? 0) > 0 && (
                      <div className="text-[10px] font-normal text-muted-foreground">
                        après Girardin déjà payé : −{formatCurrency(summary?.partners[0].outreMerPaid ?? 0)}
                      </div>
                    )}
                    <div className="text-[10px] font-normal text-muted-foreground">seul(e) : {formatCurrency(partner0.totalTax)}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-p1 text-sm">
                    {formatCurrency(assignedP1)}
                    {(summary?.partners[1].outreMerPaid ?? 0) > 0 && (
                      <div className="text-[10px] font-normal text-muted-foreground">
                        après Girardin déjà payé : −{formatCurrency(summary?.partners[1].outreMerPaid ?? 0)}
                      </div>
                    )}
                    <div className="text-[10px] font-normal text-muted-foreground">seul(e) : {formatCurrency(partner1.totalTax)}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-primary text-base bg-primary/10">
                    {formatCurrency(together.totalTax)}
                    {maritalGain > 0 && (
                      <div className="text-[10px] font-semibold text-gain">économie : {formatCurrency(maritalGain)}</div>
                    )}
                  </td>
                </tr>

                <SectionTitle>Règlement</SectionTitle>
                {(together.socialLevies ?? 0) > 0 && (
                  <Row
                    label="Prélèvements sociaux sur les revenus du patrimoine (CSG, CRDS…)"
                    hint="Calculés par le simulateur sur les revenus attribués à chacun"
                    cells={[levyP0, levyP1, together.socialLevies]}
                    sign="+"
                    tone="text-owe"
                  />
                )}
                <Row
                  label="Déjà payé (prélèvement à la source, acomptes)"
                  hint="Déduit par le simulateur à partir des cases 8HV à 8IZ"
                  cells={[pasP0, pasP1, pasP0 + pasP1]}
                  sign="−"
                  tone="text-muted-foreground"
                />
                <tr className="bg-muted/40 font-bold">
                  <td className="py-3 px-4 text-foreground">
                    Solde : reste à payer (+) ou trop prélevé (−)
                    <div className="text-[11px] font-normal text-muted-foreground">
                      Impôt attribué et prélèvements sociaux, moins ce qui est déjà payé
                    </div>
                  </td>
                  {[remainsP0, remainsP1].map((value, index) => (
                    <td key={index} className={`py-3 px-3 text-right font-mono font-bold ${value > 0 ? "text-owe" : "text-gain"}`}>
                      {value > 0 ? `+${formatCurrency(value)}` : formatCurrency(value)}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right font-mono font-black text-foreground bg-muted/70">
                    {together.remainsToPay > 0 ? `+${formatCurrency(together.remainsToPay)}` : formatCurrency(together.remainsToPay)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-muted/20 border-t flex items-start gap-2 text-xs text-muted-foreground">
            {fromDgfip ? (
              <ShieldCheck className="h-4 w-4 text-gain shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-owe shrink-0" />
            )}
            <span>
              {fromDgfip
                ? `Montants issus du simulateur officiel de la DGFiP (simulateur ${together.simulatorYear}). Les colonnes individuelles correspondent à une déclaration fictive de chacun, seul.`
                : "Simulation enregistrée avant la suppression du calcul de secours : montants calculés localement, non officiels. Relancez le calcul pour obtenir le résultat de la DGFiP."}
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
