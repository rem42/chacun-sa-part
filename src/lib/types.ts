export type BoxKind = 'partner_0' | 'partner_1' | 'child' | 'common' | 'unknown';

export interface CerfaBoxDefinition {
  code: string;
  description: string;
  type: 'int' | 'float' | 'bool';
  kind: BoxKind;
  referenceCode: string;
  category?: string;
}

export interface ValuedBox {
  id: string;
  code: string;
  rawValue: number;
  attribution: number; // 0 = 100% Déclarant 1, 1 = 100% Déclarant 2, 0.5 = 50/50
  description?: string;
  kind: BoxKind;
  category?: string;
}

export type HouseholdStatus = 'M' | 'O' | 'C' | 'D' | 'V';

export type IncomeSheet = Record<string, number | string>;

/** Taux et assiettes de prélèvement à la source calculés par le simulateur (déclaration commune). */
export interface WithholdingInfo {
  householdRate?: number;   // Taux du foyer, % (RASTXFOYER)
  rate0?: number;           // Taux individualisé officiel du Déclarant 1, % (RASTXDEC1)
  rate1?: number;           // Taux individualisé officiel du Déclarant 2, % (RASTXDEC2)
  base0?: number;           // Salaires / pensions du Déclarant 1 soumis au taux (TSTAUXRASV)
  base1?: number;           // Salaires / pensions du Déclarant 2 soumis au taux (TSTAUXRASC)
}

export interface SimulationResult {
  totalTax: number;             // Impôt net dû final (IINETIR)
  alreadyPaid: number;          // Prélèvement à la source / acomptes déjà versés
  remainsToPay: number;         // Reste à payer au fisc (ou négatif si restitution)
  decote?: number;              // Décote (IDEC)
  taxBeforeCredits?: number;    // Impôt après décote et réductions, avant crédits d'impôt (IAVIM)
  netTaxBeforeCredits?: number; // Impôt brut barème avant réductions / crédits (IDRS2 / IRTOTAL)
  taxableIncome?: number;       // Revenu net imposable retenu (RNICOL)
  grossIncome?: number;         // Revenu brut global (RRBG)
  deductions?: number;          // Charges déductibles globales (CHTOT)
  perDeduction?: number;        // Épargne retraite PER déduite (APERPV / 6NS)
  totalReductions?: number;     // Total des réductions d'impôt (ITRED)
  outreMerReductions?: number;  // Girardin industriel Outre-Mer (RLOCENT + RCOLENT)
  taxCredits?: number;          // Crédits d'impôt (CI2CK, etc.)
  proportionalTax?: number;     // Impôt proportionnel flat tax (IPROP)
  averageTaxRate?: number;      // Taux moyen d'imposition (%)
  marginalTaxRate?: number;     // Taux marginal d'imposition (TMI en %)
  withholding?: WithholdingInfo; // Données de prélèvement à la source (déclaration commune uniquement)
  socialLevies?: number;        // Prélèvements sociaux nets sur revenus du patrimoine (CSG/CRDS)
  source: 'dgfip' | 'local';    // Provenance ('local' : anciennes simulations de l'historique, avant suppression du repli)
  simulatorYear?: number;
  errorMessage?: string;
}

export type SplitMethod =
  | 'strict_individual'     // Déclaration isolée avec absorption de tranche (Chacun de son côté + tranche)
  | 'equal_gain'            // Partage 50/50 de l'avantage fiscal commun
  | 'income_prorata'         // Prorata des revenus nets imposables
  | 'isolated_tax_prorata';   // Prorata de l'impôt fictif individuel

export interface PartnerResult {
  partnerIndex: 0 | 1;
  name: string;
  taxableIncome: number;
  taxIfSingle: number;       // Impôt calculé si célibataire isolé
  taxAssigned: number;       // Impôt net qui lui est imputé selon la méthode, après déduction de son propre Girardin
  outreMerPaid?: number;     // Réduction Girardin industriel financée par ce conjoint (déjà payée par lui)
  taxGain: number;           // Économie réalisée grâce au couple
  effectiveTaxRate: number;  // Taux effectif (taxAssigned / taxableIncome)
  alreadyPaid: number;       // PAS déjà prélevé (8HW ou 8HX)
  remainsToPay: number;      // Solde net théorique (taxAssigned - alreadyPaid)
  socialLevies?: number;     // Prélèvements sociaux imputés à ce partenaire
  amountToTaxOffice: number; // Montant à régler directement aux impôts
  amountToPartner: number;   // Montant à régler à l'autre conjoint (compensation)
}

export interface SettlementSummary {
  method: SplitMethod;
  methodLabel: string;
  methodDescription: string;
  coupleTotalTaxTogether: number;
  coupleTotalTaxSingle: number;
  coupleTotalTaxGain: number;
  coupleAlreadyPaid: number;
  coupleRemainsToPay: number;
  partners: [PartnerResult, PartnerResult];
  interPartnerTransfer: {
    fromIndex: 0 | 1 | null;
    toIndex: 0 | 1 | null;
    amount: number;
  };
  summarySentence: string;
}

export interface SimulationTripResponse {
  together: SimulationResult;
  partner0: SimulationResult;
  partner1: SimulationResult;
  splits: Record<SplitMethod, SettlementSummary>;
}

export interface PDFParseWarning {
  type: 'warning' | 'info';
  message: string;
  code?: string;
}

export interface PDFParseResult {
  boxes: ValuedBox[];
  householdStatus?: string;
  detectedYear?: number;
  warnings: PDFParseWarning[];
  sourceType: 'declaration_2042' | 'avis_situation' | 'unknown';
  declarant1Name?: string;
  declarant2Name?: string;
}
