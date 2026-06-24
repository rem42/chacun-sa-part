import React, { useState } from "react";
import { ArrowRight, Check, Copy, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PartnerResult, SettlementSummary } from "@/lib/types";
import { formatCurrency, grossTaxShare } from "@/lib/utils";
import { TONES, partnerTone } from "@/lib/tones";

interface SettlementCardProps {
  summary: SettlementSummary;
}

function balanceLabel(p: PartnerResult) {
  if (p.remainsToPay > 0) return `reste à payer ${formatCurrency(p.remainsToPay)}`;
  if (p.remainsToPay < 0) return `trop prélevé ${formatCurrency(-p.remainsToPay)}`;
  return "solde à zéro";
}

export function SettlementCard({ summary }: SettlementCardProps) {
  const [copied, setCopied] = useState(false);
  const [p0, p1] = summary.partners;
  const transfer = summary.interPartnerTransfer;

  const hasTransfer = transfer.amount > 0 && transfer.fromIndex !== null && transfer.toIndex !== null;
  const from = transfer.fromIndex !== null ? summary.partners[transfer.fromIndex] : null;
  const to = transfer.toIndex !== null ? summary.partners[transfer.toIndex] : null;

  const handleCopy = async () => {
    const text =
      `Chacun Sa Part — ${summary.methodLabel}\n` +
      `Impôt du foyer : ${formatCurrency(grossTaxShare(p0) + grossTaxShare(p1))}\n` +
      `- ${p0.name} : part de ${formatCurrency(grossTaxShare(p0))}, prélevé à la source ${formatCurrency(p0.alreadyPaid)} (${balanceLabel(p0)})\n` +
      `- ${p1.name} : part de ${formatCurrency(grossTaxShare(p1))}, prélevé à la source ${formatCurrency(p1.alreadyPaid)} (${balanceLabel(p1)})\n` +
      summary.summarySentence;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé) : on ne fait rien
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b">
        <div>
          <h3 className="headline-md text-foreground">Qui doit combien à qui ?</h3>
          <p className="body-sm text-muted-foreground">
            Ce que chacun a déjà versé via le prélèvement à la source, comparé à sa part.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 h-9 self-start shrink-0">
          {copied ? <Check className="h-3.5 w-3.5 text-gain" /> : <Copy className="h-3.5 w-3.5" />}
          <span aria-live="polite">{copied ? "Copié" : "Copier le récapitulatif"}</span>
        </Button>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {hasTransfer && from && to ? (
          <div className="rounded-2xl bg-primary text-primary-foreground p-5 sm:p-6 shadow-layer-2">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-75">Virement d’équilibrage</div>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <PersonChip p={from} />
              <div className="flex items-center gap-3">
                <ArrowRight className="h-5 w-5 opacity-60 hidden sm:block" />
                <span className="stat-lg">{formatCurrency(transfer.amount)}</span>
                <ArrowRight className="h-5 w-5 opacity-60" />
              </div>
              <PersonChip p={to} />
            </div>
            <p className="text-sm opacity-85 mt-4 text-pretty">
              Le prélèvement à la source de {to.name} dépasse sa part de l’impôt : ce virement rétablit l’équilibre entre vous.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gain/25 bg-gain/10 p-5 flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-gain shrink-0" />
            <div>
              <div className="font-semibold text-gain">Aucun virement entre vous</div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Chacun règle son propre solde avec l’administration fiscale, ou reçoit son propre remboursement.
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">Détail du solde de chaque conjoint</caption>
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left font-medium pb-2"></th>
                {[p0, p1].map((p) => (
                  <th key={p.partnerIndex} className={`text-right font-semibold pb-2 ${TONES[partnerTone(p.partnerIndex)].text}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-2 text-muted-foreground">Sa part de l’impôt</td>
                <td className="py-2 text-right font-mono">{formatCurrency(grossTaxShare(p0))}</td>
                <td className="py-2 text-right font-mono">{formatCurrency(grossTaxShare(p1))}</td>
              </tr>
              {((p0.outreMerPaid ?? 0) > 0 || (p1.outreMerPaid ?? 0) > 0) && (
                <tr>
                  <td className="py-2 text-muted-foreground">Girardin déjà payé</td>
                  <td className="py-2 text-right font-mono">−{formatCurrency(p0.outreMerPaid ?? 0)}</td>
                  <td className="py-2 text-right font-mono">−{formatCurrency(p1.outreMerPaid ?? 0)}</td>
                </tr>
              )}
              {((p0.socialLevies ?? 0) > 0 || (p1.socialLevies ?? 0) > 0) && (
                <tr>
                  <td className="py-2 text-muted-foreground">Prélèvements sociaux</td>
                  <td className="py-2 text-right font-mono">+{formatCurrency(p0.socialLevies ?? 0)}</td>
                  <td className="py-2 text-right font-mono">+{formatCurrency(p1.socialLevies ?? 0)}</td>
                </tr>
              )}
              <tr>
                <td className="py-2 text-muted-foreground">Déjà prélevé à la source</td>
                <td className="py-2 text-right font-mono">−{formatCurrency(p0.alreadyPaid)}</td>
                <td className="py-2 text-right font-mono">−{formatCurrency(p1.alreadyPaid)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="py-2.5">Solde</td>
                {[p0, p1].map((p) => (
                  <td
                    key={p.partnerIndex}
                    className={`py-2.5 text-right font-mono ${
                      p.remainsToPay > 0 ? "text-owe" : p.remainsToPay < 0 ? "text-gain" : "text-muted-foreground"
                    }`}
                  >
                    {formatCurrency(Math.abs(p.remainsToPay))}
                    <span className="block text-[11px] font-sans font-medium">
                      {p.remainsToPay > 0 ? "reste à payer" : p.remainsToPay < 0 ? "trop prélevé" : "équilibré"}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground bg-muted/60 p-3.5 rounded-xl flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span className="text-pretty">{summary.summarySentence}</span>
        </p>
      </div>
    </Card>
  );
}

function PersonChip({ p }: { p: PartnerResult }) {
  const t = TONES[partnerTone(p.partnerIndex)];
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 pl-1 pr-3 py-1 self-start">
      <span className={`h-7 w-7 rounded-full ${t.solid} flex items-center justify-center font-display font-semibold text-sm`}>
        {(p.name.trim()[0] || "?").toUpperCase()}
      </span>
      <span className="font-semibold">{p.name}</span>
    </span>
  );
}
