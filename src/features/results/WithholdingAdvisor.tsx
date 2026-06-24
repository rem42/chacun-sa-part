import React, { useState } from "react";
import { Percent, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SettlementSummary, SimulationResult } from "@/lib/types";
import { computeWithholdingAdvice, withheldAmount } from "@/lib/withholding";
import { formatCurrency } from "@/lib/utils";
import { TONES } from "@/lib/tones";

interface WithholdingAdvisorProps {
  together: SimulationResult;
  summary: SettlementSummary;
}

const formatRate = (rate: number | undefined) =>
  rate === undefined ? "—" : `${rate.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

/**
 * Aide à régler le prélèvement à la source : taux individualisé à demander sur impots.gouv.fr pour que
 * le PAS de chacun couvre sa part d'impôt, afin d'éviter les virements entre conjoints l'an prochain.
 */
export function WithholdingAdvisor({ together, summary }: WithholdingAdvisorProps) {
  const advice = computeWithholdingAdvice(together, summary);
  const [planned, setPlanned] = useState<[string, string]>(["", ""]);
  if (!advice) return null;

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-household/10 text-household flex items-center justify-center shrink-0">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Régler votre prélèvement à la source</h3>
            <p className="body-sm text-muted-foreground text-pretty">
              Avec la méthode « {summary.methodLabel} », voici le taux individualisé à demander à chacun sur impots.gouv.fr
              (Gérer mon prélèvement à la source) pour que le PAS de chacun couvre sa part, à revenus identiques.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse tabular-nums">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left font-medium py-2"></th>
                {advice.partners.map((p) => (
                  <th key={p.partnerIndex} className={`text-right font-semibold py-2 ${TONES[p.partnerIndex === 0 ? "p0" : "p1"].text}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="py-2">Salaires et pensions soumis au taux</td>
                {advice.partners.map((p) => (
                  <td key={p.partnerIndex} className="py-2 text-right font-mono">{formatCurrency(p.base)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2">Impôt à collecter par son PAS</td>
                {advice.partners.map((p) => (
                  <td key={p.partnerIndex} className="py-2 text-right font-mono">{formatCurrency(p.taxToCollect)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2">Taux individualisé proposé par l’administration</td>
                {advice.partners.map((p) => (
                  <td key={p.partnerIndex} className="py-2 text-right font-mono text-muted-foreground">{formatRate(p.officialRate)}</td>
                ))}
              </tr>
              <tr className="font-semibold">
                <td className="py-2">Taux à demander pour couvrir sa part</td>
                {advice.partners.map((p) => (
                  <td key={p.partnerIndex} className="py-2 text-right font-mono">{formatRate(p.recommendedRate)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2">
                  Revenus prévus l’an prochain
                  <div className="text-[11px] text-muted-foreground">Facultatif : pour estimer le PAS prélevé</div>
                </td>
                {advice.partners.map((p, i) => (
                  <td key={p.partnerIndex} className="py-2 text-right">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder={String(p.base)}
                      value={planned[i]}
                      onChange={(e) => setPlanned((cur) => (i === 0 ? [e.target.value, cur[1]] : [cur[0], e.target.value]) as [string, string])}
                      className="h-8 w-28 ml-auto text-right font-mono text-xs"
                      aria-label={`Revenus prévus de ${p.name}`}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2">PAS estimé (par mois)</td>
                {advice.partners.map((p, i) => {
                  const income = planned[i] === "" ? p.base : Number(planned[i]) || 0;
                  return (
                    <td key={p.partnerIndex} className="py-2 text-right font-mono">
                      {formatCurrency(withheldAmount(p.recommendedRate, income) / 12)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-px" />
          <span>
            Estimation : le taux est la part d’impôt divisée par les salaires et pensions soumis au PAS. Les acomptes sur
            revenus fonciers ou indépendants (prélevés à part) et les prélèvements sociaux du patrimoine ne sont pas inclus.
            Le taux du foyer actuel est de {formatRate(advice.householdRate)}.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
