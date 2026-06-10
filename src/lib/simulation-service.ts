import { SimulationTripResponse, ValuedBox } from './types';
import { buildIncomeSheet, queryDgfipSimulator, DgfipQueryOptions } from './dgfip-client';
import { calculateSplits } from './split-engine';

export interface RunSimulationOptions {
  valboxes: ValuedBox[];
  partner0Name?: string;
  partner1Name?: string;
  /** Options de requête vers le simulateur DGFiP (relais, fetch injectable pour les tests). */
  dgfip?: DgfipQueryOptions;
}

/**
 * Exécute la simulation complète dans le navigateur : trois appels au simulateur officiel de la DGFiP
 * (via le relais serveur `/api/dgfip`) pour la déclaration commune et chaque conjoint isolé,
 * puis calcul des 4 clés de répartition équitable.
 * Si le simulateur est indisponible, une erreur est levée : aucun calcul de remplacement n'est fait.
 */
export async function runTaxSimulation({
  valboxes,
  partner0Name = 'Déclarant 1',
  partner1Name = 'Déclarant 2',
  dgfip,
}: RunSimulationOptions): Promise<SimulationTripResponse> {
  if (!Array.isArray(valboxes) || valboxes.length === 0) {
    throw new Error('Aucune case fiscale fournie pour la simulation.');
  }

  const [simuTogether, simuPartner0, simuPartner1] = await Promise.all([
    queryDgfipSimulator(buildIncomeSheet(valboxes, null), dgfip),
    queryDgfipSimulator(buildIncomeSheet(valboxes, 0), dgfip),
    queryDgfipSimulator(buildIncomeSheet(valboxes, 1), dgfip),
  ]);

  const splits = calculateSplits({
    simuTogether,
    simuPartner0,
    simuPartner1,
    partner0Name,
    partner1Name,
  });

  return {
    together: simuTogether,
    partner0: simuPartner0,
    partner1: simuPartner1,
    splits,
  };
}
