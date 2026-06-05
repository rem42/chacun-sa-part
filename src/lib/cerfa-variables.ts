import { BoxKind, CerfaBoxDefinition } from './types';
import rawCerfaList from './cerfa_variables_raw.json';

interface RawCerfaEntry {
  boxes: string[];
  description: string;
  type: string;
}

export function getCategoryForCode(code: string): string {
  const prefix = code.toUpperCase().charAt(0);
  switch (prefix) {
    case '0':
      return 'Situation familiale & personnes à charge';
    case '1':
      return 'Traitements, salaires, pensions et rentes';
    case '2':
      return 'Revenus des capitaux mobiliers (dividendes, intérêts)';
    case '3':
      return 'Plus-values et gains de cession';
    case '4':
      return 'Revenus fonciers (loyers, SCPI, déficit foncier)';
    case '5':
      return 'Bénéfices professionnels (BIC, BNC, BA, micro-entreprise)';
    case '6':
      return 'Charges déductibles (épargne retraite PER, pensions...)';
    case '7':
      return 'Réductions et crédits d’impôt (dons, garde, emploi à domicile...)';
    case '8':
      return 'Prélèvement à la source (PAS) & revenus étrangers';
    case 'H':
      return 'Réductions et crédits d’impôt (Investissements Outre-Mer, RICI)';
    default:
      return 'Autres rubriques fiscales';
  }
}

// Construction de la table d'indexation
const BOX_MAP = new Map<string, CerfaBoxDefinition>();
const ALL_BOXES: CerfaBoxDefinition[] = [];

(rawCerfaList as RawCerfaEntry[]).forEach((item) => {
  const boxCodes = item.boxes || [];
  if (boxCodes.length === 0) return;

  const referenceCode = boxCodes[0];
  const type = (item.type === 'float' || item.type === 'bool') ? item.type : 'int';
  const category = getCategoryForCode(referenceCode);

  if (boxCodes.length === 1) {
    const def: CerfaBoxDefinition = {
      code: referenceCode,
      referenceCode,
      description: item.description,
      type,
      kind: 'common',
      category,
    };
    BOX_MAP.set(referenceCode, def);
    ALL_BOXES.push(def);
  } else {
    // 1st box = Partner 0
    const defP0: CerfaBoxDefinition = {
      code: boxCodes[0],
      referenceCode,
      description: `${item.description} (Déclarant 1)`,
      type,
      kind: 'partner_0',
      category,
    };
    BOX_MAP.set(boxCodes[0], defP0);
    ALL_BOXES.push(defP0);

    // 2nd box = Partner 1
    if (boxCodes.length >= 2) {
      const defP1: CerfaBoxDefinition = {
        code: boxCodes[1],
        referenceCode,
        description: `${item.description} (Déclarant 2)`,
        type,
        kind: 'partner_1',
        category,
      };
      BOX_MAP.set(boxCodes[1], defP1);
      ALL_BOXES.push(defP1);
    }

    // Subsequent boxes = Child / Dependents
    for (let i = 2; i < boxCodes.length; i++) {
      const defChild: CerfaBoxDefinition = {
        code: boxCodes[i],
        referenceCode,
        description: `${item.description} (Personne à charge ${i - 1})`,
        type,
        kind: 'child',
        category,
      };
      BOX_MAP.set(boxCodes[i], defChild);
      ALL_BOXES.push(defChild);
    }
  }
});

// Ajout des cases indispensables même si absentes du JSON brut
const ESSENTIAL_BOXES: CerfaBoxDefinition[] = [
  {
    code: '0DA',
    referenceCode: '0DA',
    description: 'Année de naissance – Déclarant 1',
    type: 'int',
    kind: 'partner_0',
    category: 'Situation familiale & personnes à charge',
  },
  {
    code: '0DB',
    referenceCode: '0DB',
    description: 'Année de naissance – Déclarant 2',
    type: 'int',
    kind: 'partner_1',
    category: 'Situation familiale & personnes à charge',
  },
  {
    code: '1AJ',
    referenceCode: '1AJ',
    description: 'Salaires et assimilés – Déclarant 1',
    type: 'int',
    kind: 'partner_0',
    category: 'Traitements, salaires, pensions et rentes',
  },
  {
    code: '1BJ',
    referenceCode: '1AJ',
    description: 'Salaires et assimilés – Déclarant 2',
    type: 'int',
    kind: 'partner_1',
    category: 'Traitements, salaires, pensions et rentes',
  },
  {
    code: '1AK',
    referenceCode: '1AK',
    description: 'Frais réels déductibles – Déclarant 1',
    type: 'int',
    kind: 'partner_0',
    category: 'Traitements, salaires, pensions et rentes',
  },
  {
    code: '1BK',
    referenceCode: '1AK',
    description: 'Frais réels déductibles – Déclarant 2',
    type: 'int',
    kind: 'partner_1',
    category: 'Traitements, salaires, pensions et rentes',
  },
  {
    code: '8HW',
    referenceCode: '8HW',
    description: 'Prélèvement à la source déjà payé – Déclarant 1',
    type: 'int',
    kind: 'partner_0',
    category: 'Prélèvement à la source (PAS) & revenus étrangers',
  },
  {
    code: '8HX',
    referenceCode: '8HW',
    description: 'Prélèvement à la source déjà payé – Déclarant 2',
    type: 'int',
    kind: 'partner_1',
    category: 'Prélèvement à la source (PAS) & revenus étrangers',
  },
  {
    code: '0CF',
    referenceCode: '0CF',
    description: 'Nombre d’enfants à charge (hors résidence alternée)',
    type: 'float',
    kind: 'child',
    category: 'Situation familiale & personnes à charge',
  },
  {
    code: '0CH',
    referenceCode: '0CH',
    description: 'Nombre d’enfants en résidence alternée',
    type: 'float',
    kind: 'child',
    category: 'Situation familiale & personnes à charge',
  },
  {
    code: '7UD',
    referenceCode: '7UD',
    description: 'Dons aux organismes d’aide aux personnes en difficulté (réduction de 75 %)',
    type: 'int',
    kind: 'common',
    category: 'Réductions et crédits d’impôt (dons, garde, emploi à domicile...)',
  },
  {
    code: '7GA',
    referenceCode: '7GA',
    description: 'Frais de garde hors du domicile d’un enfant de moins de 6 ans',
    type: 'int',
    kind: 'child',
    category: 'Réductions et crédits d’impôt (dons, garde, emploi à domicile...)',
  },
  {
    code: '7DB',
    referenceCode: '7DB',
    description: 'Emploi d’un salarié à domicile (services à la personne)',
    type: 'int',
    kind: 'common',
    category: 'Réductions et crédits d’impôt (dons, garde, emploi à domicile...)',
  },
  {
    code: '8HV',
    referenceCode: '8HV',
    description: 'Retenue à la source sur salaires et pensions – Déclarant 1',
    type: 'int',
    kind: 'partner_0',
    category: 'Prélèvement à la source (PAS) & revenus étrangers',
  },
  {
    code: '8IV',
    referenceCode: '8HV',
    description: 'Retenue à la source sur salaires et pensions – Déclarant 2',
    type: 'int',
    kind: 'partner_1',
    category: 'Prélèvement à la source (PAS) & revenus étrangers',
  },
  {
    code: '5QC',
    referenceCode: '5QC',
    description: 'Bénéfices non commerciaux professionnels (régime de la déclaration contrôlée) – Déclarant 1',
    type: 'int',
    kind: 'partner_0',
    category: 'Bénéfices professionnels (BIC, BNC, BA, micro-entreprise)',
  },
  {
    code: '5RC',
    referenceCode: '5QC',
    description: 'Bénéfices non commerciaux professionnels (régime de la déclaration contrôlée) – Déclarant 2',
    type: 'int',
    kind: 'partner_1',
    category: 'Bénéfices professionnels (BIC, BNC, BA, micro-entreprise)',
  },
  {
    code: '6NS',
    referenceCode: '6NS',
    description: 'Cotisations aux plans d’épargne retraite (PER) – Déclarant 1',
    type: 'int',
    kind: 'partner_0',
    category: 'Charges déductibles (épargne retraite PER, pensions...)',
  },
  {
    code: '6NT',
    referenceCode: '6NS',
    description: 'Cotisations aux plans d’épargne retraite (PER) – Déclarant 2',
    type: 'int',
    kind: 'partner_1',
    category: 'Charges déductibles (épargne retraite PER, pensions...)',
  },
  {
    code: 'HLS',
    referenceCode: 'HLS',
    description: "Réduction investissement Outre-Mer en entreprise (Girardin 2025 - 56 %)",
    type: 'int',
    kind: 'partner_0',
    category: 'Réductions et crédits d’impôt (Investissements Outre-Mer, RICI)',
  },
  {
    code: 'HLT',
    referenceCode: 'HLT',
    description: "Réduction investissement Outre-Mer en entreprise (Girardin 2025 - 66 %)",
    type: 'int',
    kind: 'partner_0',
    category: 'Réductions et crédits d’impôt (Investissements Outre-Mer, RICI)',
  },
  {
    code: 'HKS',
    referenceCode: 'HKS',
    description: "Réduction investissement Outre-Mer en entreprise (Girardin report 2024)",
    type: 'int',
    kind: 'partner_0',
    category: 'Réductions et crédits d’impôt (Investissements Outre-Mer, RICI)',
  },
  {
    code: '8TT',
    referenceCode: '8TT',
    description: "Contrats de capitalisation ou d'assurance-vie souscrits à l'étranger",
    type: 'bool',
    kind: 'common',
    category: 'Prélèvement à la source (PAS) & revenus étrangers',
  },
  {
    code: '8UU',
    referenceCode: '8UU',
    description: "Compte bancaire ouvert, détenu, utilisé ou clos à l'étranger",
    type: 'bool',
    kind: 'common',
    category: 'Prélèvement à la source (PAS) & revenus étrangers',
  },
];

ESSENTIAL_BOXES.forEach((b) => {
  if (!BOX_MAP.has(b.code)) {
    BOX_MAP.set(b.code, b);
    ALL_BOXES.push(b);
  }
});

export function getBoxDefinition(code: string): CerfaBoxDefinition | undefined {
  return BOX_MAP.get(code.toUpperCase());
}

export function getAllBoxes(): CerfaBoxDefinition[] {
  return ALL_BOXES;
}

export function getAllCategories(): string[] {
  const cats = new Set<string>();
  ALL_BOXES.forEach((b) => {
    if (b.category) cats.add(b.category);
  });
  return Array.from(cats);
}

export function searchBoxes(
  query = '',
  category = '',
  limit?: number
): CerfaBoxDefinition[] {
  const q = query.trim().toUpperCase();
  const cat = category.trim();

  let matched = ALL_BOXES;

  if (cat && cat !== 'ALL') {
    matched = matched.filter((b) => b.category === cat);
  }

  if (q) {
    matched = matched.filter(
      (b) =>
        b.code.toUpperCase().includes(q) ||
        b.description.toUpperCase().includes(q) ||
        (b.category && b.category.toUpperCase().includes(q))
    );
  }

  if (limit && limit > 0) {
    return matched.slice(0, limit);
  }

  return matched;
}

export function getDefaultAttribution(kind: BoxKind): number {
  switch (kind) {
    case 'partner_0':
      return 0; // 100% Déclarant 1
    case 'partner_1':
      return 1; // 100% Déclarant 2
    case 'child':
    case 'common':
    default:
      return 0.5; // 50 / 50 par défaut
  }
}
