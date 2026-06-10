import { SplitMethod } from './types';
import { SavedSimulation } from './history-storage';
import { grossTaxShare } from './utils';

export type ComparisonRowKind = 'amount' | 'percent';

export interface ComparisonRow {
  key: string;
  label: string;
  group: 'foyer' | 'partner0' | 'partner1';
  a: number;
  b: number;
  delta: number;
  kind: ComparisonRowKind;
}

export interface SimulationComparison {
  method: SplitMethod;
  rows: ComparisonRow[];
}

const row = (
  key: string,
  label: string,
  group: ComparisonRow['group'],
  a: number,
  b: number,
  kind: ComparisonRowKind = 'amount'
): ComparisonRow => ({ key, label, group, a, b, delta: b - a, kind });

/**
 * Compare deux simulations enregistrées (A = la plus ancienne, B = la plus récente) pour une méthode de partage.
 * Les noms des conjoints peuvent différer d'une simulation à l'autre : on compare Déclarant 1 avec Déclarant 1.
 */
export function compareSimulations(
  a: SavedSimulation,
  b: SavedSimulation,
  method: SplitMethod = 'equal_gain'
): SimulationComparison {
  const sa = a.simulationData.splits[method];
  const sb = b.simulationData.splits[method];
  const girardin = (s: SavedSimulation) => s.simulationData.together.outreMerReductions ?? 0;

  const rows: ComparisonRow[] = [
    row('household-tax', 'Impôt du foyer (Girardin inclus)', 'foyer',
      a.simulationData.together.totalTax + girardin(a), b.simulationData.together.totalTax + girardin(b)),
    row('household-net', 'Impôt net à régler', 'foyer', a.simulationData.together.totalTax, b.simulationData.together.totalTax),
    row('household-gain', 'Économie de la déclaration commune', 'foyer', sa.coupleTotalTaxGain, sb.coupleTotalTaxGain),
    row('household-remains', 'Reste à payer du foyer', 'foyer', sa.coupleRemainsToPay, sb.coupleRemainsToPay),
    row('transfer', 'Virement entre conjoints', 'foyer', sa.interPartnerTransfer.amount, sb.interPartnerTransfer.amount),
  ];

  ([0, 1] as const).forEach((i) => {
    const pa = sa.partners[i];
    const pb = sb.partners[i];
    const group = i === 0 ? 'partner0' : 'partner1';
    rows.push(
      row(`income-${i}`, 'Revenu net imposable', group, pa.taxableIncome, pb.taxableIncome),
      row(`single-${i}`, 'Impôt s’il déclarait seul', group, pa.taxIfSingle, pb.taxIfSingle),
      row(`share-${i}`, 'Sa part de l’impôt', group, grossTaxShare(pa), grossTaxShare(pb)),
      row(`rate-${i}`, 'Taux effectif', group, pa.effectiveTaxRate, pb.effectiveTaxRate, 'percent'),
      row(`paid-${i}`, 'Déjà payé (PAS)', group, pa.alreadyPaid, pb.alreadyPaid),
      row(`remains-${i}`, 'Solde (reste à payer + / trop prélevé −)', group, pa.remainsToPay, pb.remainsToPay)
    );
  });

  return { method, rows };
}
