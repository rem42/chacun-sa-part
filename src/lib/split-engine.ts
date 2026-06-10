import {
  PartnerResult,
  SettlementSummary,
  SimulationResult,
  SplitMethod,
} from './types';
import { formatCurrency } from './utils';

export interface SplitEngineInput {
  simuTogether: SimulationResult;
  simuPartner0: SimulationResult;
  simuPartner1: SimulationResult;
  partner0Name?: string;
  partner1Name?: string;
}

/**
 * Calcule la balance financière et les virements de compensation inter-conjoints.
 */
function computeSettlementDetails(
  p0TaxAssigned: number,
  p1TaxAssigned: number,
  p0AlreadyPaid: number,
  p1AlreadyPaid: number,
  p0Name: string,
  p1Name: string,
  p0SocialLevies: number = 0,
  p1SocialLevies: number = 0
) {
  const p0Remains = Math.round((p0TaxAssigned + p0SocialLevies) - p0AlreadyPaid);
  const p1Remains = Math.round((p1TaxAssigned + p1SocialLevies) - p1AlreadyPaid);

  let p0ToTaxOffice = 0;
  let p1ToTaxOffice = 0;
  let p0ToPartner = 0;
  let p1ToPartner = 0;
  let transferFromIndex: 0 | 1 | null = null;
  let transferToIndex: 0 | 1 | null = null;
  let transferAmount = 0;
  let summarySentence = '';

  if (p0Remains >= 0 && p1Remains >= 0) {
    // Les deux doivent au fisc
    p0ToTaxOffice = p0Remains;
    p1ToTaxOffice = p1Remains;
    summarySentence = `Aucun virement entre vous : chacun prend en charge son reste à payer (${p0Name} : ${formatCurrency(p0Remains)}, ${p1Name} : ${formatCurrency(p1Remains)}).`;
  } else if (p0Remains <= 0 && p1Remains <= 0) {
    // Les deux reçoivent un remboursement
    p0ToTaxOffice = p0Remains;
    p1ToTaxOffice = p1Remains;
    summarySentence = `L’administration fiscale rembourse le foyer : ${formatCurrency(Math.abs(p0Remains))} reviennent à ${p0Name} et ${formatCurrency(Math.abs(p1Remains))} à ${p1Name}.`;
  } else if (p0Remains > 0 && p1Remains < 0) {
    // P1 a trop payé (avance pour le couple), P0 n'a pas assez payé
    transferAmount = Math.abs(p1Remains);
    transferFromIndex = 0;
    transferToIndex = 1;
    p0ToPartner = transferAmount;
    p1ToPartner = -transferAmount;
    p0ToTaxOffice = p0Remains + p1Remains; // Solde net dû au fisc par le couple
    p1ToTaxOffice = 0;

    summarySentence = `${p0Name} verse ${formatCurrency(transferAmount)} à ${p1Name} pour compenser le prélèvement à la source trop élevé de ${p1Name}.`;
    if (p0ToTaxOffice > 0) {
      summarySentence += ` ${p0Name} prend ensuite en charge le solde de ${formatCurrency(p0ToTaxOffice)} dû à l’administration fiscale.`;
    } else if (p0ToTaxOffice < 0) {
      summarySentence += ` Le remboursement du foyer (${formatCurrency(-p0ToTaxOffice)}) revient à ${p0Name}.`;
    }
  } else {
    // P0 a trop payé, P1 n'a pas assez payé
    transferAmount = Math.abs(p0Remains);
    transferFromIndex = 1;
    transferToIndex = 0;
    p1ToPartner = transferAmount;
    p0ToPartner = -transferAmount;
    p1ToTaxOffice = p0Remains + p1Remains;
    p0ToTaxOffice = 0;

    summarySentence = `${p1Name} verse ${formatCurrency(transferAmount)} à ${p0Name} pour compenser le prélèvement à la source trop élevé de ${p0Name}.`;
    if (p1ToTaxOffice > 0) {
      summarySentence += ` ${p1Name} prend ensuite en charge le solde de ${formatCurrency(p1ToTaxOffice)} dû à l’administration fiscale.`;
    } else if (p1ToTaxOffice < 0) {
      summarySentence += ` Le remboursement du foyer (${formatCurrency(-p1ToTaxOffice)}) revient à ${p1Name}.`;
    }
  }

  return {
    p0Remains,
    p1Remains,
    p0ToTaxOffice,
    p1ToTaxOffice,
    p0ToPartner,
    p1ToPartner,
    transferFromIndex,
    transferToIndex,
    transferAmount,
    summarySentence,
  };
}

/**
 * Calcule tous les scénarios de répartition d'impôt.
 */
export function calculateSplits(input: SplitEngineInput): Record<SplitMethod, SettlementSummary> {
  const {
    simuTogether,
    simuPartner0,
    simuPartner1,
    partner0Name = 'Déclarant 1',
    partner1Name = 'Déclarant 2',
  } = input;

  // Tout provient du simulateur officiel : chaque déclaration « solo » reprend les cases attribuées au conjoint
  // (revenus, PAS 8HV/8HW/8HX… et propriété des biens), donc le PAS déjà payé et les prélèvements sociaux
  // (17,2 % sur le patrimoine, proportionnels) se lisent directement dessus.
  const income0 = simuPartner0.taxableIncome ?? 0;
  const income1 = simuPartner1.taxableIncome ?? 0;
  const alreadyPaid0 = simuPartner0.alreadyPaid;
  const alreadyPaid1 = simuPartner1.alreadyPaid;
  const p0SocialLevies = simuPartner0.socialLevies ?? 0;
  const p1SocialLevies = simuPartner1.socialLevies ?? 0;

  const coupleTotalTaxTogether = simuTogether.totalTax;
  const coupleTotalTaxSingle = simuPartner0.totalTax + simuPartner1.totalTax;
  const coupleTotalTaxGain = Math.max(0, coupleTotalTaxSingle - coupleTotalTaxTogether);
  // Girardin industriel (outre-mer) : somme sortie de la poche de son porteur pour payer une partie de l'impôt,
  // donc déjà payée par lui. On répartit l'impôt « avant Girardin » (brut) puis on crédite à chacun sa propre réduction.
  // Le porteur se lit sur les simulations solo ; le montant retenu est celui réellement imputé sur la déclaration commune.
  const girardinTotal = simuTogether.outreMerReductions ?? 0;
  const solo0Girardin = simuPartner0.outreMerReductions ?? 0;
  const solo1Girardin = simuPartner1.outreMerReductions ?? 0;
  const girardinWeight = solo0Girardin + solo1Girardin;
  const girardin0 =
    girardinTotal > 0 ? Math.round((girardinTotal * (girardinWeight > 0 ? solo0Girardin / girardinWeight : 0.5))) : 0;
  const girardin1 = girardinTotal - girardin0;
  const grossTogether = coupleTotalTaxTogether + girardinTotal;
  const grossSolo0 = simuPartner0.totalTax + solo0Girardin;
  const grossSolo1 = simuPartner1.totalTax + solo1Girardin;
  const grossSingle = grossSolo0 + grossSolo1;

  const coupleAlreadyPaid = alreadyPaid0 + alreadyPaid1;
  const coupleRemainsToPay = simuTogether.remainsToPay;

  const methods: {
    method: SplitMethod;
    label: string;
    description: string;
    calcTax: () => [number, number];
  }[] = [
    {
      method: 'strict_individual',
      label: 'Le revenu le plus modeste paie son impôt « solo »',
      description:
        'Le conjoint aux revenus les plus faibles paie ce qu’il paierait s’il déclarait seul. L’autre règle le reste de l’impôt du foyer : il bénéficie donc de toute l’économie liée à la déclaration commune.',
      calcTax: () => {
        // Le conjoint aux revenus les plus faibles (ou impôt isolé inférieur) paie son impôt isolé.
        // Le conjoint aux revenus les plus élevés profite de la tranche inoccupée et paie le reliquat du foyer.
        if (income0 >= income1) {
          const tax1 = Math.min(grossSolo1, grossTogether);
          const tax0 = Math.max(0, grossTogether - tax1);
          return [tax0, tax1];
        } else {
          const tax0 = Math.min(grossSolo0, grossTogether);
          const tax1 = Math.max(0, grossTogether - tax0);
          return [tax0, tax1];
        }
      },
    },
    {
      method: 'equal_gain',
      label: 'Économie partagée à parts égales',
      description:
        'Chacun part de l’impôt qu’il paierait s’il déclarait seul, puis l’économie apportée par la déclaration commune est partagée en deux parts égales. Une part ne peut pas être négative : si la moitié de l’économie dépasse l’impôt « solo » de l’un, il ne paie rien et l’autre conserve le reste de l’économie.',
      calcTax: () => {
        // Écart entre les deux déclarations séparées et la déclaration commune, partagé par moitié.
        // Non plafonné à 0 : un éventuel surcoût de la déclaration commune est lui aussi partagé.
        const halfDiff = (grossSingle - grossTogether) / 2;
        const raw0 = grossSolo0 - halfDiff;
        const raw1 = grossSolo1 - halfDiff;

        // raw0 + raw1 = impôt commun : on borne chaque part à [0, impôt commun]
        if (raw1 <= 0) return [grossTogether, 0];
        if (raw0 <= 0) return [0, grossTogether];
        const tax0 = Math.round(raw0);
        return [tax0, grossTogether - tax0];
      },
    },
    {
      method: 'income_prorata',
      label: 'Au prorata des revenus nets imposables',
      description:
        'L’impôt du foyer est réparti en proportion du revenu net imposable de chacun : les deux conjoints supportent ainsi le même taux moyen d’imposition.',
      calcTax: () => {
        const totalIncome = income0 + income1;
        if (totalIncome <= 0) {
          const half = Math.round(grossTogether / 2);
          return [half, grossTogether - half];
        }
        const tax0 = Math.round((grossTogether * income0) / totalIncome);
        const tax1 = grossTogether - tax0;
        return [tax0, tax1];
      },
    },
    {
      method: 'isolated_tax_prorata',
      label: 'Au prorata de l’impôt « solo »',
      description:
        'L’impôt du foyer est réparti en proportion de l’impôt que chacun paierait s’il déclarait seul : l’économie de la déclaration commune profite à chacun dans la même proportion.',
      calcTax: () => {
        if (grossSingle <= 0) {
          const half = Math.round(grossTogether / 2);
          return [half, grossTogether - half];
        }
        const tax0 = Math.round((grossTogether * grossSolo0) / grossSingle);
        const tax1 = grossTogether - tax0;
        return [tax0, tax1];
      },
    },
  ];

  const results = {} as Record<SplitMethod, SettlementSummary>;

  for (const item of methods) {
    // Part de l'impôt avant Girardin, diminuée de la réduction que chacun a lui-même financée
    const [grossAssigned0, grossAssigned1] = item.calcTax();
    const taxAssigned0 = grossAssigned0 - girardin0;
    const taxAssigned1 = grossAssigned1 - girardin1;
    const taxGain0 = Math.max(0, simuPartner0.totalTax - taxAssigned0);
    const taxGain1 = Math.max(0, simuPartner1.totalTax - taxAssigned1);

    const settlement = computeSettlementDetails(
      taxAssigned0,
      taxAssigned1,
      alreadyPaid0,
      alreadyPaid1,
      partner0Name,
      partner1Name,
      p0SocialLevies,
      p1SocialLevies
    );

    const p0: PartnerResult = {
      partnerIndex: 0,
      name: partner0Name,
      taxableIncome: income0,
      taxIfSingle: simuPartner0.totalTax,
      taxAssigned: taxAssigned0,
      outreMerPaid: girardin0,
      taxGain: taxGain0,
      effectiveTaxRate: income0 > 0 ? ((taxAssigned0 + girardin0) / income0) * 100 : 0,
      alreadyPaid: alreadyPaid0,
      remainsToPay: settlement.p0Remains,
      socialLevies: p0SocialLevies,
      amountToTaxOffice: settlement.p0ToTaxOffice,
      amountToPartner: settlement.p0ToPartner,
    };

    const p1: PartnerResult = {
      partnerIndex: 1,
      name: partner1Name,
      taxableIncome: income1,
      taxIfSingle: simuPartner1.totalTax,
      taxAssigned: taxAssigned1,
      outreMerPaid: girardin1,
      taxGain: taxGain1,
      effectiveTaxRate: income1 > 0 ? ((taxAssigned1 + girardin1) / income1) * 100 : 0,
      alreadyPaid: alreadyPaid1,
      remainsToPay: settlement.p1Remains,
      socialLevies: p1SocialLevies,
      amountToTaxOffice: settlement.p1ToTaxOffice,
      amountToPartner: settlement.p1ToPartner,
    };

    results[item.method] = {
      method: item.method,
      methodLabel: item.label,
      methodDescription: item.description,
      coupleTotalTaxTogether,
      coupleTotalTaxSingle,
      coupleTotalTaxGain,
      coupleAlreadyPaid,
      coupleRemainsToPay,
      partners: [p0, p1],
      interPartnerTransfer: {
        fromIndex: settlement.transferFromIndex,
        toIndex: settlement.transferToIndex,
        amount: settlement.transferAmount,
      },
      summarySentence: settlement.summarySentence,
    };
  }

  return results;
}
