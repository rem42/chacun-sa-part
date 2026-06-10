import assert from 'node:assert';
import { runTaxSimulation } from '../src/lib/simulation-service.ts';
import {
  saveSimulation,
  getSavedSimulations,
  deleteSimulation,
  updateSimulationName,
  clearAllSimulations,
} from '../src/lib/history-storage.ts';

// Mock localStorage for node environment
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
globalThis.window = globalThis;

console.log("=== Test du service de simulation (relais DGFiP simulé) & de l'historique ===");

// 1. Test simulation directe client
const valboxes = [
  {
    id: "b1",
    code: "1AJ",
    rawValue: 48000,
    attribution: 0,
    kind: "partner_0",
  },
  {
    id: "b2",
    code: "1BJ",
    rawValue: 26000,
    attribution: 1,
    kind: "partner_1",
  },
  {
    id: "b3",
    code: "8HV",
    rawValue: 4520,
    attribution: 0,
    kind: "partner_0",
  },
  {
    id: "b4",
    code: "8IV",
    rawValue: 1380,
    attribution: 1,
    kind: "partner_1",
  },
  {
    id: "b5",
    code: "0CF",
    rawValue: 2,
    attribution: 0.5,
    kind: "child",
  },
];

// Faux relais DGFiP : impôt = 10 % des salaires transmis (1AJ + 1BJ), dont le PAS 8HV/8IV est déjà payé
const fakeDgfip = async (_url, init) => {
  const form = new URLSearchParams(init.body);
  const income = Number(form.get("1AJ") || 0) + Number(form.get("1BJ") || 0);
  const tax = Math.round(income * 0.1);
  const paid = Number(form.get("8HV") || 0) + Number(form.get("8IV") || 0);
  // Comme le vrai simulateur : IINETIR = impôt, IINET = reste à payer, IREST = montant à restituer
  const html = `<input type="hidden" name="IINETIR" value="${tax}"><input type="hidden" name="IINET" value="${Math.max(0, tax - paid)}"><input type="hidden" name="IREST" value="${Math.max(0, paid - tax)}"><input type="hidden" name="RNICOL" value="${income}">`;
  return new Response(html, { status: 200 });
};

const result = await runTaxSimulation({
  valboxes,
  partner0Name: "Alex",
  partner1Name: "Camille",
  dgfip: { fetchImpl: fakeDgfip, years: [2025] },
});

console.log(`- Résultat simulation: Impôt commun = ${result.together.totalTax} €`);
assert(result.together.totalTax > 0, "L'impôt commun est calculé");
assert(result.partner0.totalTax > 0, "L'impôt D1 isolé est calculé");
assert(result.partner1.totalTax >= 0, "L'impôt D2 isolé est calculé");
assert(result.splits.equal_gain !== undefined, "Le modèle equal_gain est calculé");
assert(result.splits.income_prorata !== undefined, "Le modèle income_prorata est calculé");

// 2. Test sauvegarde dans l'historique localStorage
const saved = saveSimulation({
  boxes: valboxes,
  partner0Name: "Alex",
  partner1Name: "Camille",
  partner0ChildrenFraction: 0.5,
  partner0CommonFraction: 0.5,
  simulationData: result,
  customName: "Simulation Principale 2024",
});

console.log(`- Sauvegarde effectuée avec ID: ${saved.id}`);
assert.strictEqual(saved.name, "Simulation Principale 2024");
assert.strictEqual(saved.summary.coupleTotalTax, result.together.totalTax);
assert.strictEqual(saved.summary.totalChildren, 2);

const list = getSavedSimulations();
assert.strictEqual(list.length, 1);
assert.strictEqual(list[0].id, saved.id);

// 3. Test renommage
updateSimulationName(saved.id, "Simulation Modifiée");
const updatedList = getSavedSimulations();
assert.strictEqual(updatedList[0].name, "Simulation Modifiée");

// 4. Test mise à jour existante
const updatedSim = saveSimulation({
  id: saved.id,
  boxes: valboxes,
  partner0Name: "Alex",
  partner1Name: "Camille",
  partner0ChildrenFraction: 0.8,
  partner0CommonFraction: 0.5,
  simulationData: result,
});
assert.strictEqual(updatedSim.partner0ChildrenFraction, 0.8);
assert.strictEqual(getSavedSimulations().length, 1);

// 5. Test suppression
deleteSimulation(saved.id);
assert.strictEqual(getSavedSimulations().length, 0);

console.log("=== TOUS LES TESTS DE SIMULATION ET HISTORIQUE SONT VALIDÉS ! ===");
