import React from "react";
import { SettlementSummary, SimulationResult, SplitMethod } from "@/lib/types";
import { formatCurrency, formatPercent, grossTaxShare } from "@/lib/utils";

interface PrintableReportProps {
  together: SimulationResult;
  partner0: SimulationResult;
  partner1: SimulationResult;
  splits: Record<SplitMethod, SettlementSummary>;
  activeMethod: SplitMethod;
  title?: string;
}

const METHOD_ORDER: SplitMethod[] = ["strict_individual", "equal_gain", "income_prorata", "isolated_tax_prorata"];

/**
 * Bilan imprimable (ou à enregistrer en PDF via « Imprimer »). Invisible à l'écran : le CSS d'impression de
 * `index.css` ne laisse apparaître que ce bloc quand l'utilisateur lance l'impression.
 */
export function PrintableReport({ together, partner0, partner1, splits, activeMethod, title }: PrintableReportProps) {
  const summary = splits[activeMethod];
  const [p0, p1] = summary.partners;
  const girardin = together.outreMerReductions ?? 0;
  const singleGross =
    partner0.totalTax + (partner0.outreMerReductions ?? 0) + partner1.totalTax + (partner1.outreMerReductions ?? 0);
  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
  const money = (v: number) => formatCurrency(v);
  const year = together.simulatorYear ? `revenus ${together.simulatorYear - 1}` : "";

  return (
    <div id="print-report" className="print-only text-black bg-white p-8 text-[12px] leading-relaxed">
      <h1 className="text-2xl font-bold">{title || "Répartition de l’impôt sur le revenu"}</h1>
      <p className="text-gray-600">
        {p0.name} et {p1.name} · {year} · établi le {today}
      </p>

      <h2 className="text-base font-bold mt-5 mb-1">Synthèse du foyer</h2>
      <table className="w-full border-collapse">
        <tbody>
          <tr><td className="py-1">Impôt sur le revenu du foyer{girardin > 0 ? " (Girardin inclus)" : ""}</td><td className="text-right font-mono">{money(together.totalTax + girardin)}</td></tr>
          {girardin > 0 && (
            <>
              <tr><td className="py-1 pl-4 text-gray-600">dont Girardin industriel, déjà payé</td><td className="text-right font-mono text-gray-600">{money(girardin)}</td></tr>
              <tr><td className="py-1 pl-4 text-gray-600">dont impôt net à régler</td><td className="text-right font-mono text-gray-600">{money(together.totalTax)}</td></tr>
            </>
          )}
          <tr><td className="py-1">Si vous déclariez séparément</td><td className="text-right font-mono">{money(singleGross)}</td></tr>
          <tr><td className="py-1">Économie de la déclaration commune</td><td className="text-right font-mono">{money(summary.coupleTotalTaxGain)}</td></tr>
          <tr><td className="py-1">Reste à payer du foyer (après prélèvement à la source)</td><td className="text-right font-mono">{money(summary.coupleRemainsToPay)}</td></tr>
        </tbody>
      </table>

      <h2 className="text-base font-bold mt-5 mb-1">Méthode retenue : {summary.methodLabel}</h2>
      <p>{summary.methodDescription}</p>

      <table className="w-full border-collapse mt-3">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1"></th>
            <th className="text-right py-1">{p0.name}</th>
            <th className="text-right py-1">{p1.name}</th>
          </tr>
        </thead>
        <tbody>
          {([
            ["Revenu net imposable", money(p0.taxableIncome), money(p1.taxableIncome)],
            ["Impôt s’il déclarait seul", money(p0.taxIfSingle), money(p1.taxIfSingle)],
            ["Sa part de l’impôt", money(grossTaxShare(p0)), money(grossTaxShare(p1))],
            ...(girardin > 0 ? [["Girardin déjà payé", `−${money(p0.outreMerPaid ?? 0)}`, `−${money(p1.outreMerPaid ?? 0)}`]] : []),
            ["Taux effectif", formatPercent(p0.effectiveTaxRate), formatPercent(p1.effectiveTaxRate)],
            ...((p0.socialLevies ?? 0) + (p1.socialLevies ?? 0) > 0
              ? [["Prélèvements sociaux", `+${money(p0.socialLevies ?? 0)}`, `+${money(p1.socialLevies ?? 0)}`]]
              : []),
            ["Déjà payé (prélèvement à la source)", `−${money(p0.alreadyPaid)}`, `−${money(p1.alreadyPaid)}`],
            ["Solde (reste à payer + / trop prélevé −)", money(p0.remainsToPay), money(p1.remainsToPay)],
          ] as string[][]).map(([label, a, b]) => (
            <tr key={label} className="border-b border-gray-300">
              <td className="py-1">{label}</td>
              <td className="text-right font-mono">{a}</td>
              <td className="text-right font-mono">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 p-3 border border-black rounded">
        <strong>Règlement entre vous : </strong>
        {summary.summarySentence}
      </div>

      <h2 className="text-base font-bold mt-5 mb-1">Les quatre méthodes côte à côte</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Méthode</th>
            <th className="text-right py-1">Part de {p0.name}</th>
            <th className="text-right py-1">Part de {p1.name}</th>
            <th className="text-right py-1">Virement</th>
          </tr>
        </thead>
        <tbody>
          {METHOD_ORDER.map((m) => {
            const s = splits[m];
            const t = s.interPartnerTransfer;
            return (
              <tr key={m} className="border-b border-gray-300">
                <td className="py-1">{s.methodLabel}{m === activeMethod ? " (retenue)" : ""}</td>
                <td className="text-right font-mono">{money(grossTaxShare(s.partners[0]))}</td>
                <td className="text-right font-mono">{money(grossTaxShare(s.partners[1]))}</td>
                <td className="text-right font-mono">
                  {t.amount > 0 && t.fromIndex !== null && t.toIndex !== null
                    ? `${s.partners[t.fromIndex].name} → ${s.partners[t.toIndex].name} : ${money(t.amount)}`
                    : "aucun"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-5 text-[10px] text-gray-600">
        Montants issus du simulateur officiel de la DGFiP{together.simulatorYear ? ` (simulateur ${together.simulatorYear})` : ""}.
        La répartition entre conjoints est une convention privée, sans valeur fiscale. Document établi avec Chacun Sa Part.
      </p>
    </div>
  );
}
