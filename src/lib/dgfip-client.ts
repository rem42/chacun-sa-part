import { IncomeSheet, SimulationResult, ValuedBox } from './types';
import { getBoxDefinition } from './cerfa-variables';


/**
 * Renomme et enrichit les variables pour l'épargne retraite (PER).
 */
export function renameSimulatorVariables(sheet: IncomeSheet): IncomeSheet {
  const cloned: IncomeSheet = { ...sheet };

  // Si des cotisations d'épargne retraite (PER) sont déclarées (6NS, 6NT, 6NU, 6RS, 6RT, 6RU)
  // sans que le plafond de déduction correspondant ne soit renseigné (6PS, 6PT, 6PU),
  // le simulateur DGFiP bloque le calcul avec l'erreur :
  // "COTISATIONS 6RS, 6RT, 6RU, 6NS, 6NT OU 6NU SANS PLAFOND CORRESPONDANT".
  // On provisionne donc automatiquement le plafond avec le montant des cotisations pour permettre le calcul officiel.
  if ((Number(cloned['6NS']) > 0 || Number(cloned['6RS']) > 0) && !cloned['6PS'] && !cloned['BPS']) {
    cloned['6PS'] = Math.max(Number(cloned['6NS']) || 0, Number(cloned['6RS']) || 0);
  }
  if ((Number(cloned['6NT']) > 0 || Number(cloned['6RT']) > 0) && !cloned['6PT'] && !cloned['BPT']) {
    cloned['6PT'] = Math.max(Number(cloned['6NT']) || 0, Number(cloned['6RT']) || 0);
  }
  if ((Number(cloned['6NU']) > 0 || Number(cloned['6RU']) > 0) && !cloned['6PU'] && !cloned['BPU']) {
    cloned['6PU'] = Math.max(Number(cloned['6NU']) || 0, Number(cloned['6RU']) || 0);
  }

  const renameMap: Record<string, string> = {
    '6PS': 'BPS',
    '6PT': 'BPT',
    '6PU': 'BPU',
  };

  let replaced = false;
  for (const [oldCode, newCode] of Object.entries(renameMap)) {
    if (oldCode in cloned) {
      cloned[newCode] = cloned[oldCode];
      delete cloned[oldCode];
      replaced = true;
    }
  }

  if (replaced || cloned['BPS'] !== undefined || cloned['BPT'] !== undefined) {
    if (cloned['APS'] === undefined) cloned['APS'] = 0;
    if (cloned['CPS'] === undefined) cloned['CPS'] = 0;
    if (cloned['DPS'] === undefined) cloned['DPS'] = 0;
    if (cloned['APT'] === undefined) cloned['APT'] = 0;
    if (cloned['CPT'] === undefined) cloned['CPT'] = 0;
    if (cloned['DPT'] === undefined) cloned['DPT'] = 0;
  }

  return cloned;
}

/**
 * Gestion des revenus fonciers étrangers (règle DGFiP 8SG / 8TK).
 */
export function handleForeignPropertyIncome(sheet: IncomeSheet): IncomeSheet {
  const cloned: IncomeSheet = { ...sheet };
  const foreignProperty =
    (Number(cloned['4BL']) || 0) + (Number(cloned['4BK']) || 0);
  const foreignIncome = Number(cloned['8TK']) || 0;

  if (foreignProperty > 0 && foreignIncome !== foreignProperty) {
    cloned['8SG'] = foreignProperty;
  }

  return cloned;
}

/**
 * Convertit les demi-enfants issus du slider de répartition en enfants en garde alternée
 * (1 enfant en garde alternée = 0.5 part fiscale).
 */
export function handleChildrenSplit(sheet: IncomeSheet): IncomeSheet {
  const cloned: IncomeSheet = { ...sheet };

  const numChildrenBoxes: [string, string][] = [
    ['0CF', '0CH'], // Nombre d'enfants à charge -> garde alternée
    ['0CG', '0CI'], // Enfants handicapés
    ['7EA', '7EB'], // Collège
    ['7EC', '7ED'], // Lycée
    ['7EF', '7EG'], // Enseignement supérieur
  ];

  let madeConversion = false;

  for (const [boxFrom, boxTo] of numChildrenBoxes) {
    const rawVal = cloned[boxFrom];
    if (rawVal === undefined || rawVal === null) continue;
    const value = Number(rawVal);
    if (!value || isNaN(value)) continue;

    // Si le nombre se termine par 0.5
    if (Math.round(value * 10) % 10 !== 0) {
      cloned[boxFrom] = Math.max(0, Math.round(value - 0.5));
      cloned[boxTo] = (Number(cloned[boxTo]) || 0) + 1;
      madeConversion = true;
    }
  }

  // Frais de garde : une case par rang d'enfant, en garde classique (7GA-7GC) ou alternée (7GE-7GG).
  const CARE_STD = ['7GA', '7GB', '7GC'];
  const CARE_ALT = ['7GE', '7GF', '7GG'];
  const careTotal = (codes: string[]) => codes.reduce((sum, c) => sum + (Number(cloned[c]) || 0), 0);
  const careCount = (codes: string[]) => codes.filter((c) => Number(cloned[c]) > 0).length;
  const stdCountBefore = careCount(CARE_STD);
  const altCountBefore = careCount(CARE_ALT);
  const stdTotalBefore = careTotal(CARE_STD);
  const altTotalBefore = careTotal(CARE_ALT);
  let stdTotal = stdTotalBefore;
  let altTotal = altTotalBefore;

  if (madeConversion) {
    // Les frais de garde suivent les enfants : un enfant en garde alternée ne porte que la moitié des frais
    // d'un enfant en garde classique (pondération 1 / 0,5).
    const standardChildren = Number(cloned['0CF']) || 0;
    const alternatingConverted = Number(cloned['0CH']) || 0;
    const weight = standardChildren + 0.5 * alternatingConverted;
    const movedToAlt = weight > 0 ? Math.round(stdTotal * ((0.5 * alternatingConverted) / weight)) : stdTotal;
    stdTotal -= movedToAlt;
    altTotal += movedToAlt;

    // Les enfants en garde alternée déclarés dans les cases 7EB/7ED/7EG ou 0CI ne peuvent pas dépasser 0CH,
    // et 0CH doit rester pair pour que le foyer garde le même nombre de parts (2 × 0,5 = 1 enfant).
    const totalAlternating = Math.max(
      Number(cloned['0CH']) || 0,
      Number(cloned['0CI']) || 0,
      (Number(cloned['7EB']) || 0) + (Number(cloned['7ED']) || 0) + (Number(cloned['7EG']) || 0)
    );
    let newAlternating = totalAlternating - (Number(cloned['0CH']) || 0);
    if (newAlternating % 2 === 1) newAlternating += 1;
    if (newAlternating > 0) {
      cloned['0CH'] = (Number(cloned['0CH']) || 0) + newAlternating;
      cloned['0CF'] = Math.max(0, (Number(cloned['0CF']) || 0) - newAlternating / 2);
    }
  }

  // Le simulateur refuse un rang d'enfant (7GB, 7GC…) sans enfant correspondant. Quand un conjoint a moins d'enfants
  // que de cases de frais, les frais sont regroupés sur ses premiers enfants ; inchangés si tout est cohérent.
  const fitCare = (codes: string[], total: number, totalBefore: number, countBefore: number, children: number) => {
    const slots = Math.min(codes.length, Math.floor(children));
    const used = Math.min(slots, Math.max(countBefore, total > 0 ? 1 : 0));
    if (total === totalBefore && countBefore <= slots) return; // déjà cohérent : montants par enfant conservés
    codes.forEach((c, index) => {
      if (index >= used) {
        cloned[c] = 0;
        return;
      }
      const share = index === used - 1 ? total - Math.round(total / used) * (used - 1) : Math.round(total / used);
      cloned[c] = share;
    });
  };
  const standardChildren = Number(cloned['0CF']) || 0;
  const alternatingChildren = Number(cloned['0CH']) || 0;
  if (standardChildren + alternatingChildren > 0) {
    fitCare(CARE_STD, stdTotal, stdTotalBefore, stdCountBefore, standardChildren);
    fitCare(CARE_ALT, altTotal, altTotalBefore, altCountBefore, alternatingChildren);
  }

  return cloned;
}

/**
 * Construit la feuille de saisie fiscale pour :
 * - Le foyer commun (individualize = null)
 * - Le Déclarant 1 seul (individualize = 0)
 * - Le Déclarant 2 seul (individualize = 1)
 */
export function buildIncomeSheet(
  valboxes: ValuedBox[],
  individualize: 0 | 1 | null
): IncomeSheet {
  const activeBoxes = valboxes.filter((b) => b.rawValue !== undefined && b.rawValue !== null && b.rawValue > 0);

  if (individualize === null) {
    // Foyer commun
    const d1Birth = valboxes.find((b) => b.code === '0DA')?.rawValue;
    const d2Birth = valboxes.find((b) => b.code === '0DB')?.rawValue;
    const sheet: IncomeSheet = {
      '0DA': d1Birth ? String(d1Birth) : '1980',
      '0DB': d2Birth ? String(d2Birth) : '1980',
      'pre_situation_famille': 'O',
      'pre_situation_residence': 'M',
    };

    activeBoxes.forEach((b) => {
      if (b.code !== '0DA' && b.code !== '0DB') {
        sheet[b.code] = b.rawValue;
      }
    });

    return sheet;
  }

  // Simulation individuelle (Célibataire isolé)
  const d1Birth = valboxes.find((b) => b.code === '0DA')?.rawValue;
  const d2Birth = valboxes.find((b) => b.code === '0DB')?.rawValue;
  const singleBirth = individualize === 0 ? (d1Birth || '1980') : (d2Birth || d1Birth || '1980');

  const sheet: IncomeSheet = {
    '0DA': String(singleBirth),
    'pre_situation_famille': 'C',
    'pre_situation_residence': 'M',
  };

  activeBoxes.forEach((b) => {
    // Ignorer les codes d'état civil dans la répartition chiffrée
    if (b.code === '0DA' || b.code === '0DB' || b.code === '0AM') {
      return;
    }

    let allocatedValue = 0;
    if (individualize === 0) {
      // Déclarant 1 prend (1 - attribution)
      allocatedValue = b.rawValue * (1 - b.attribution);
    } else {
      // Déclarant 2 prend attribution
      allocatedValue = b.rawValue * b.attribution;
    }

    if (allocatedValue > 0) {
      const definition = getBoxDefinition(b.code);
      const isFloat = definition?.type === 'float' || b.code === '0CH';
      const finalVal = isFloat ? Math.round(allocatedValue * 10) / 10 : Math.round(allocatedValue);
      // Un célibataire déclare toujours dans la case de référence du dictionnaire CERFA
      // (ex : 1BJ → 1AJ, 8IV → 8HV, 8IW → 8HW).
      const targetCode = definition?.referenceCode ?? b.code;
      sheet[targetCode] = (Number(sheet[targetCode]) || 0) + finalVal;
    }
  });

  return sheet;
}

/**
 * Parse la réponse HTML retournée par le simulateur officiel de la DGFiP.
 */
export function parseDgfipHtml(html: string): Record<string, string> {
  const results: Record<string, string> = {};

  // Extraction des inputs cachés : <input type="hidden" name="..." value="...">
  const inputRegex = /<input[^>]*type=["']hidden["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = inputRegex.exec(html)) !== null) {
    const tag = match[0];
    const nameMatch = /name=["']([^"']+)["']/i.exec(tag);
    const valueMatch = /value=["']([^"']*)["']/i.exec(tag);
    if (nameMatch && valueMatch) {
      results[nameMatch[1]] = valueMatch[1];
    }
  }

  // Recherche d'un éventuel message d'erreur explicite
  const errorMatch = /<p[^>]*class=["'][^"']*margin-left-30px[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(html);
  if (errorMatch) {
    results['error'] = errorMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  return results;
}

/**
 * Convertit une valeur renvoyée par le simulateur. Les champs sont cadrés sur la droite par des espaces,
 * y compris entre le signe et les chiffres (« -     4200 ») : on retire donc tous les espaces.
 */
export function parseDgfipNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  // Un « * » devant le montant signale un plafonnement (ex. du quotient familial) : la valeur reste valable.
  const cleaned = raw.replace(/[\s*]+/g, '');
  if (cleaned === '') return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

/** Point d'entrée du relais serveur vers le simulateur DGFiP (voir functions/api/dgfip/[year].ts). */
export const DGFIP_PROXY_PATH = '/api/dgfip';

export const DGFIP_UNAVAILABLE_MESSAGE =
  "Le simulateur officiel de la DGFiP est momentanément indisponible (maintenance ou coupure). Aucun calcul de remplacement n'est proposé : réessayez dans quelques instants.";

/** Le simulateur officiel n'a pas pu fournir de résultat (indisponibilité, maintenance, réponse inexploitable). */
export class DgfipUnavailableError extends Error {
  constructor(message = DGFIP_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = 'DgfipUnavailableError';
  }
}

export interface DgfipQueryOptions {
  /** URL de base du relais (par défaut `/api/dgfip`). */
  endpoint?: string;
  /** Implémentation de `fetch` (injectable pour les tests). */
  fetchImpl?: typeof fetch;
  /** Années de simulateur à essayer, dans l'ordre (par défaut : année courante, précédente, 2025). */
  years?: number[];
}

/**
 * Interroge le simulateur officiel de la DGFiP via le relais serveur (le simulateur n'envoie pas d'en-têtes CORS)
 * et extrait les résultats officiels. Aucun calcul de remplacement : si le simulateur ne répond pas,
 * une `DgfipUnavailableError` est levée pour que l'interface affiche un message d'indisponibilité.
 */
export async function queryDgfipSimulator(
  rawSheet: IncomeSheet,
  options: DgfipQueryOptions = {}
): Promise<SimulationResult> {
  let sheet = renameSimulatorVariables(rawSheet);
  sheet = handleChildrenSplit(sheet);
  sheet = handleForeignPropertyIncome(sheet);

  const { endpoint = DGFIP_PROXY_PATH, fetchImpl = fetch } = options;

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(sheet)) {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, String(value));
    }
  }

  const currentYear = new Date().getFullYear();
  const candidateYears = options.years ?? Array.from(new Set([currentYear, currentYear - 1, 2025]));
  let dgfipError: string | undefined;

  for (const year of candidateYears) {
    try {
      const response = await fetchImpl(`${endpoint}/${year}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const html = await response.text();
        const extracted = parseDgfipHtml(html);

        if (extracted['error']) {
          dgfipError ??= extracted['error'];
          continue;
        }

        if (extracted['IINET'] !== undefined || extracted['IINETIR'] !== undefined) {
          const num = (name: string) => parseDgfipNumber(extracted[name]);
          // Quand les crédits d'impôt dépassent l'impôt (frais de garde, emploi à domicile…), le simulateur n'envoie plus
          // IINETIR mais IRESTIR, négatif : c'est l'impôt net du foyer (une restitution).
          const totalTax = num('IINETIR') ?? num('IRESTIR') ?? num('IINET') ?? 0;
          // IINET = montant restant à payer, IREST = montant à restituer (tous deux ≥ 0, PAS et prélèvements sociaux inclus).
          const remainsToPay = (num('IINET') ?? 0) - (num('IREST') ?? 0);
          // PSNET = prélèvements sociaux nets sur les revenus du patrimoine (CSG/CRDS/solidarité).
          const socialLevies = num('PSNET') ?? num('NAPCRP');
          // Tout ce qui est déjà acquitté (retenue à la source, acomptes, régularisations) = dû − reste à payer.
          const alreadyPaid = totalTax + (socialLevies ?? 0) - remainsToPay;
          const taxableIncome = num('RNICOL') ?? num('RNI');
          const outreMerReductions = (num('RLOCENT') ?? 0) + (num('RCOLENT') ?? 0);
          const irTotal = parseDgfipNumber(extracted['IRTOTAL']);

          return {
            totalTax,
            alreadyPaid,
            remainsToPay,
            decote: num('IDEC'),
            taxBeforeCredits: num('IAVIM') ?? 0,
            netTaxBeforeCredits: num('IDRS2') ?? (irTotal === undefined ? undefined : Math.round(irTotal)),
            taxableIncome,
            grossIncome: num('RRBG'),
            deductions: num('CHTOT'),
            perDeduction: num('APERPV') ?? (Number(sheet['6NS']) || Number(sheet['6RS']) || undefined),
            totalReductions: num('ITRED'),
            outreMerReductions: outreMerReductions || undefined,
            taxCredits: num('CI2CK'),
            proportionalTax: num('IPROP'),
            marginalTaxRate: num('TXMARJ'),
            averageTaxRate:
              num('TX_MOY_IR') ??
              (taxableIncome && totalTax ? Math.round((totalTax / taxableIncome) * 1000) / 10 : undefined),
            withholding: {
              householdRate: num('RASTXFOYER'),
              rate0: num('RASTXDEC1'),
              rate1: num('RASTXDEC2'),
              base0: num('TSTAUXRASV'),
              base1: num('TSTAUXRASC'),
            },
            socialLevies: socialLevies || undefined,
            source: 'dgfip',
            simulatorYear: year,
          };
        }
      }
    } catch (err: unknown) {
      console.warn(`[queryDgfipSimulator] Échec sur l'année ${year} :`, err instanceof Error ? err.message : err);
    }
  }

  if (dgfipError) {
    throw new Error(`Le simulateur de la DGFiP a refusé les données : ${dgfipError}`);
  }
  throw new DgfipUnavailableError();
}
