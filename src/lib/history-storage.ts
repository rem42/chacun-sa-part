import { SimulationTripResponse, ValuedBox } from './types';

export interface SavedSimulationSummary {
  coupleTotalTax: number;
  coupleGain: number;
  partner0Tax: number;
  partner1Tax: number;
  partner0Income: number;
  partner1Income: number;
  totalChildren: number;
}

export interface SavedSimulation {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  partner0Name: string;
  partner1Name: string;
  boxes: ValuedBox[];
  partner0ChildrenFraction: number;
  partner0CommonFraction: number;
  simulationData: SimulationTripResponse;
  summary: SavedSimulationSummary;
}

const STORAGE_KEY = 'chacun_sa_part_simulations_v1';

/**
 * Extrait les métriques de synthèse à partir des résultats d'une simulation
 */
export function extractSimulationSummary(
  boxes: ValuedBox[],
  partner0Name: string,
  partner1Name: string,
  simulationData: SimulationTripResponse
): SavedSimulationSummary {
  const equalGain = simulationData.splits.equal_gain;
  const [p0, p1] = equalGain.partners;

  const totalChildren = boxes
    .filter((b) => b.code === '0CF' || b.code === '0CH')
    .reduce((sum, b) => sum + (b.rawValue || 0), 0);

  return {
    coupleTotalTax: simulationData.together.totalTax,
    coupleGain: equalGain.coupleTotalTaxGain,
    partner0Tax: p0.taxAssigned,
    partner1Tax: p1.taxAssigned,
    partner0Income: p0.taxableIncome,
    partner1Income: p1.taxableIncome,
    totalChildren,
  };
}

/**
 * Récupère toutes les simulations enregistrées dans le localStorage
 */
export function getSavedSimulations(): SavedSimulation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Trier par date de dernière modification décroissante
    return parsed.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Erreur lors de la lecture de l’historique des simulations:', err);
    return [];
  }
}

export interface SaveSimulationInput {
  id?: string;
  customName?: string;
  name?: string;
  partner0Name: string;
  partner1Name: string;
  boxes: ValuedBox[];
  partner0ChildrenFraction: number;
  partner0CommonFraction: number;
  simulationData: SimulationTripResponse;
}

/**
 * Sauvegarde ou met à jour une simulation dans le localStorage
 */
export function saveSimulation(data: SaveSimulationInput): SavedSimulation {
  const list = getSavedSimulations();
  const now = new Date().toISOString();

  const summary = extractSimulationSummary(
    data.boxes,
    data.partner0Name,
    data.partner1Name,
    data.simulationData
  );

  const defaultName = `Simulation ${data.partner0Name} & ${data.partner1Name}`;

  if (data.id) {
    const index = list.findIndex((s) => s.id === data.id);
    if (index !== -1) {
      const existing = list[index];
      const updated: SavedSimulation = {
        ...existing,
        name: data.customName?.trim() || existing.name || defaultName,
        partner0Name: data.partner0Name,
        partner1Name: data.partner1Name,
        boxes: data.boxes,
        partner0ChildrenFraction: data.partner0ChildrenFraction,
        partner0CommonFraction: data.partner0CommonFraction,
        simulationData: data.simulationData,
        summary,
        updatedAt: now,
      };
      list[index] = updated;
      persistList(list);
      return updated;
    }
  }

  // Création d'une nouvelle simulation
  const newId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newRecord: SavedSimulation = {
    id: newId,
    createdAt: now,
    updatedAt: now,
    name: data.customName?.trim() || defaultName,
    partner0Name: data.partner0Name,
    partner1Name: data.partner1Name,
    boxes: data.boxes,
    partner0ChildrenFraction: data.partner0ChildrenFraction,
    partner0CommonFraction: data.partner0CommonFraction,
    simulationData: data.simulationData,
    summary,
  };

  list.unshift(newRecord);
  persistList(list);
  return newRecord;
}

/**
 * Met à jour le nom d'une simulation existante
 */
export function updateSimulationName(id: string, newName: string): boolean {
  const list = getSavedSimulations();
  const target = list.find((s) => s.id === id);
  if (!target) return false;

  target.name = newName.trim() || target.name;
  target.updatedAt = new Date().toISOString();
  persistList(list);
  return true;
}

/**
 * Supprime une simulation par son ID
 */
export function deleteSimulation(id: string): void {
  const list = getSavedSimulations();
  const filtered = list.filter((s) => s.id !== id);
  persistList(filtered);
}

/**
 * Supprime tout l'historique des simulations
 */
export function clearAllSimulations(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Erreur lors du vidage de l’historique:', err);
  }
}

function persistList(list: SavedSimulation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde dans le localStorage:', err);
  }
}
