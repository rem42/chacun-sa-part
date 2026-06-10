import { SettlementSummary, SimulationResult } from './types';

export interface WithholdingAdvicePartner {
  partnerIndex: 0 | 1;
  name: string;
  /** Salaires / pensions soumis au taux de PAS (lus dans le simulateur). */
  base: number;
  /** Impôt net que la méthode choisie met à sa charge (après son éventuel Girardin). */
  taxToCollect: number;
  /** Taux individualisé proposé par l'administration (revenus au prorata), en %. */
  officialRate?: number;
  /** Taux qui amènerait son PAS annuel à sa part d'impôt, en %. */
  recommendedRate: number;
}

export interface WithholdingAdvice {
  partners: [WithholdingAdvicePartner, WithholdingAdvicePartner];
  householdRate?: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Taux de prélèvement à la source à demander pour que le PAS de chacun couvre sa part d'impôt
 * (si les revenus restent ceux de la simulation). Retourne `undefined` si le simulateur n'a pas fourni les assiettes.
 */
export function computeWithholdingAdvice(
  together: SimulationResult,
  summary: SettlementSummary
): WithholdingAdvice | undefined {
  const info = together.withholding;
  if (!info || !info.base0 || !info.base1) return undefined;

  const build = (index: 0 | 1, base: number, officialRate?: number): WithholdingAdvicePartner => {
    const partner = summary.partners[index];
    const raw = base > 0 ? (partner.taxAssigned / base) * 100 : 0;
    return {
      partnerIndex: index,
      name: partner.name,
      base,
      taxToCollect: partner.taxAssigned,
      officialRate,
      // Un taux est compris entre 0 et 43 % (barème maximal du PAS) ; arrondi au dixième comme sur impots.gouv.fr
      recommendedRate: round1(Math.min(43, Math.max(0, raw))),
    };
  };

  return {
    partners: [build(0, info.base0, info.rate0), build(1, info.base1, info.rate1)],
    householdRate: info.householdRate,
  };
}

/** PAS annuel prélevé pour un taux et des revenus prévus. */
export function withheldAmount(ratePercent: number, plannedIncome: number): number {
  return Math.round((ratePercent / 100) * plannedIncome);
}
