/**
 * Contrôle de cohérence contre le VRAI simulateur de la DGFiP (réseau requis, donc hors `npm test`).
 * À lancer à chaque nouveau millésime et après toute modification de dgfip-client.ts / split-engine.ts :
 *
 *   npm run check:simulator            # année courante, puis précédente
 *   npm run check:simulator -- 2027    # année précise
 *
 * Pour chaque foyer type, vérifie que le simulateur accepte les 3 feuilles (commun, Déclarant 1, Déclarant 2) et que :
 *   Σ PAS des simulations solo = PAS du foyer ; Σ prélèvements sociaux solo = ceux du foyer ;
 *   pour les 4 méthodes : Σ parts d'impôt = impôt net du foyer et Σ restes à payer = reste à payer du foyer.
 */
import { runTaxSimulation } from '../src/lib/simulation-service.ts';
import type { ValuedBox } from '../src/lib/types.ts';

const TOLERANCE = 2; // arrondis à l'euro cumulés sur 2 conjoints
// Seuil de recouvrement : le simulateur ne réclame pas un solde inférieur à 12 € (il ne le rembourse pas non plus).
// Chacune des 3 simulations peut donc « absorber » jusqu'à 12 € sur le PAS déjà payé et sur le reste à payer.
const RECOVERY_THRESHOLD = 12;

const direct: typeof fetch = (url, init) =>
  fetch(String(url).replace('/api/dgfip/', 'https://simulateur-ir-ifi.impots.gouv.fr/cgi-bin/calc-') + '.cgi', init);

const box = (code: string, rawValue: number, attribution: number, kind: ValuedBox['kind']): ValuedBox => ({
  id: code,
  code,
  rawValue,
  attribution,
  kind,
});
const d1 = (code: string, value: number) => box(code, value, 0, 'partner_0');
const d2 = (code: string, value: number) => box(code, value, 1, 'partner_1');

const scenarios: Record<string, ValuedBox[]> = {
  'Salaires, PAS faible, foncier commun': [d1('1AJ', 48000), d2('1BJ', 26000), box('4BA', 6000, 0.5, 'common'), d1('8HV', 200), d2('8IV', 100)],
  'PAS supérieur à l’impôt (remboursement)': [d1('1AJ', 60000), d2('1BJ', 20000), d1('8HV', 9000), d2('8IV', 2500), d1('8HW', 300), d2('8IW', 150)],
  'Girardin industriel porté par D1': [d1('1AJ', 70000), d2('1BJ', 30000), d1('HLS', 6000), d1('8HV', 2000), d2('8IV', 900)],
  '2 enfants 50/50 + frais de garde': [d1('1AJ', 45000), d2('1BJ', 38000), box('0CF', 2, 0.5, 'child'), box('7GA', 2500, 0.5, 'child'), box('7GB', 2500, 0.5, 'child'), d1('8HV', 3000), d2('8IV', 2500)],
  '3 enfants (1,5 chacun) + frais de garde': [d1('1AJ', 52000), d2('1BJ', 41000), box('0CF', 3, 0.5, 'child'), box('7GA', 3000, 0.5, 'child'), box('7GB', 3000, 0.5, 'child'), d1('8HV', 4000), d2('8IV', 3000)],
  'Crédit d’impôt supérieur à l’impôt': [d1('1AJ', 28000), d2('1BJ', 22000), box('7DB', 6000, 0.5, 'common'), d1('8HV', 500), d2('8IV', 300)],
  'PER + dividendes avec crédit 2CK': [d1('1AJ', 80000), d2('1BJ', 35000), d1('6NS', 3000), box('2DC', 4000, 0.5, 'common'), box('2CK', 500, 0.5, 'common'), d1('8HV', 8000), d2('8IV', 2500)],
};

const explicitYear = process.argv[2] ? [Number(process.argv[2])] : undefined;
let failures = 0;
const fail = (scenario: string, message: string) => {
  failures += 1;
  console.error(`  ✗ ${scenario} : ${message}`);
};
const close = (a: number, b: number, tolerance = TOLERANCE) => Math.abs(a - b) <= tolerance;

for (const [name, valboxes] of Object.entries(scenarios)) {
  try {
    const trip = await runTaxSimulation({ valboxes, dgfip: { fetchImpl: direct, years: explicitYear } });
    const { together, partner0, partner1, splits } = trip;
    const before = failures;

    if (!close(partner0.alreadyPaid + partner1.alreadyPaid, together.alreadyPaid, RECOVERY_THRESHOLD))
      fail(name, `Σ PAS solo ${partner0.alreadyPaid + partner1.alreadyPaid} ≠ PAS foyer ${together.alreadyPaid}`);
    const levies = (partner0.socialLevies ?? 0) + (partner1.socialLevies ?? 0);
    if (!close(levies, together.socialLevies ?? 0)) fail(name, `Σ prélèvements sociaux solo ${levies} ≠ foyer ${together.socialLevies ?? 0}`);

    for (const [method, summary] of Object.entries(splits)) {
      const [a, b] = summary.partners;
      if (!close(a.taxAssigned + b.taxAssigned, together.totalTax)) fail(name, `${method} : Σ parts ${a.taxAssigned + b.taxAssigned} ≠ impôt net ${together.totalTax}`);
      if (!close(a.remainsToPay + b.remainsToPay, together.remainsToPay, RECOVERY_THRESHOLD)) fail(name, `${method} : Σ restes ${a.remainsToPay + b.remainsToPay} ≠ reste foyer ${together.remainsToPay}`);
    }
    console.log(`${failures === before ? '✓' : '✗'} ${name} (simulateur ${together.simulatorYear}) — impôt ${together.totalTax} €, reste ${together.remainsToPay} €`);
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

if (failures > 0) {
  console.error(`\n${failures} écart(s) détecté(s) : ne pas publier avant d'avoir compris la cause.`);
  process.exit(1);
}
console.log('\nTous les foyers types sont cohérents avec le simulateur officiel.');
