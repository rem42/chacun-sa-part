import assert from 'node:assert';
import { calculateSplits } from '../src/lib/split-engine.ts';
import {
  handleChildrenSplit,
  parseDgfipNumber,
  handleForeignPropertyIncome,
  renameSimulatorVariables,
  buildIncomeSheet,
  queryDgfipSimulator,
  DgfipUnavailableError,
} from '../src/lib/dgfip-client.ts';
import { computeWithholdingAdvice, withheldAmount } from '../src/lib/withholding.ts';
import { compareSimulations } from '../src/lib/compare.ts';
import { getBoxDefinition, getDefaultAttribution } from '../src/lib/cerfa-variables.ts';

console.log("=== Lancement des vérifications des moteurs fiscaux ===");

// 1. Test de conversion des demi-enfants (garde alternée)
{
  console.log("Test 1: handleChildrenSplit conversion 0.5 enfant -> garde alternée 0CH");
  const sheetWithHalf = {
    '0CF': 1.5,
    '7GA': 1200,
  };
  const converted = handleChildrenSplit(sheetWithHalf);
  console.log("- Sheet après conversion:", converted);
  assert.strictEqual(converted['0CF'], 1, "0CF réduit à 1");
  assert.strictEqual(converted['0CH'], 1, "0CH créé avec 1");
  // 1 enfant classique + 1 enfant en garde alternée (poids 1 / 0,5) : 2/3 des frais restent en 7GA, 1/3 passe en 7GE
  assert.strictEqual(converted['7GA'], 800);
  assert.strictEqual(converted['7GE'], 400);
}

// 2. Test du moteur de split et de régularisation financière
{
  console.log("Test 2: Split engine & Bilan de régularisation");
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
      code: "8HW",
      rawValue: 4500,
      attribution: 0,
      kind: "partner_0",
    },
    {
      id: "b4",
      code: "8HX",
      rawValue: 1400,
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

  const simuTogether = {
    totalTax: 3800,
    alreadyPaid: 5900,
    remainsToPay: -2100,
    source: 'dgfip',
  };

  const simuPartner0 = {
    totalTax: 3900,
    alreadyPaid: 4500,
    remainsToPay: -600,
    source: 'dgfip',
  };

  const simuPartner1 = {
    totalTax: 800,
    alreadyPaid: 1400,
    remainsToPay: -600,
    source: 'dgfip',
  };

  const splits = calculateSplits({
    simuTogether,
    simuPartner0,
    simuPartner1,
    partner0Name: "Alex",
    partner1Name: "Camille",
  });

  const equalGain = splits.equal_gain;
  console.log(`- Gain fiscal couple: ${equalGain.coupleTotalTaxGain} €`);
  assert.strictEqual(equalGain.coupleTotalTaxGain, 900, "Total isolé (4700) - Commun (3800) = 900 €");
  assert.strictEqual(equalGain.partners[0].taxAssigned + equalGain.partners[1].taxAssigned, 3800, "La somme des parts = impôt commun");
  console.log(`- Part Alex: ${equalGain.partners[0].taxAssigned} €, Part Camille: ${equalGain.partners[1].taxAssigned} €`);
  console.log(`- Résumé régularisation: "${equalGain.summarySentence}"`);
}

// 3. Test de répartition personnalisée des revenus du foyer (ex: 70% D1 / 30% D2)
{
  console.log("Test 3: Répartition personnalisée des revenus du foyer (70% D1 / 30% D2)");
  const valboxes = [
    {
      id: "b1",
      code: "1AJ",
      rawValue: 50000,
      attribution: 0,
      kind: "partner_0",
    },
    {
      id: "b2",
      code: "1BJ",
      rawValue: 30000,
      attribution: 1,
      kind: "partner_1",
    },
    {
      id: "b3",
      code: "4BA", // Revenus fonciers communs
      rawValue: 10000,
      attribution: 0.3, // 70% Déclarant 1 (1 - 0.3 = 0.7) et 30% Déclarant 2
      kind: "common",
    },
  ];

  const sheet0 = buildIncomeSheet(valboxes, 0);
  const sheet1 = buildIncomeSheet(valboxes, 1);

  console.log(`- Foncier 4BA D1 (70%) : ${sheet0['4BA']} €`);
  console.log(`- Foncier 4BA D2 (30%) : ${sheet1['4BA']} €`);
  assert.strictEqual(sheet0['4BA'], 7000, "D1 reçoit bien 70% des revenus fonciers (7 000 €)");
  assert.strictEqual(sheet1['4BA'], 3000, "D2 reçoit bien 30% des revenus fonciers (3 000 €)");
}

// 4. queryDgfipSimulator : extraction via le relais, essai des années suivantes, aucune solution de repli
{
  console.log("Test 4: queryDgfipSimulator (relais DGFiP, extraction, indisponibilité sans repli)");
  const rawSheet = { pre_situation_famille: 'C', pre_situation_residence: 'M', '1AJ': 45000, '6PS': 2000, '0CF': 1.5 };
  const html = '<form><input type="hidden" name="IINET" value="4200"><input type="hidden" name="IREST" value="1200">'
    + '<input type="hidden" name="RNICOL" value="40500"><input type="hidden" name="TXMARJ" value="30"></form>';

  // Année courante absente (404) -> l'année précédente répond ; le formulaire transmis contient les transformations Cerfa
  const calls = [];
  const okFetch = async (url, init) => {
    calls.push({ url, body: new URLSearchParams(init.body) });
    return calls.length === 1 ? new Response('absent', { status: 404 }) : new Response(html, { status: 200 });
  };
  const res = await queryDgfipSimulator(rawSheet, { endpoint: '/api/dgfip', fetchImpl: okFetch, years: [2026, 2025] });
  console.log(`- Résultat : impôt = ${res.totalTax} €, RNI = ${res.taxableIncome} €, source = ${res.source}, année = ${res.simulatorYear}`);
  assert.strictEqual(calls[0].url, '/api/dgfip/2026');
  assert.strictEqual(calls[1].url, '/api/dgfip/2025');
  assert.strictEqual(res.totalTax, 4200);
  assert.strictEqual(res.remainsToPay, 3000);
  assert.strictEqual(res.taxableIncome, 40500);
  assert.strictEqual(res.source, 'dgfip');
  assert.strictEqual(res.simulatorYear, 2025);
  assert.strictEqual(calls[1].body.get('BPS'), '2000', "6PS renommé en BPS");
  assert.strictEqual(calls[1].body.get('0CH'), '1', "demi-enfant converti en garde alternée");

  // Simulateur indisponible (erreur réseau ou 5xx) -> DgfipUnavailableError, jamais de résultat de substitution
  for (const failing of [
    async () => { throw new Error('network down'); },
    async () => new Response('bad gateway', { status: 502 }),
  ]) {
    await assert.rejects(
      queryDgfipSimulator(rawSheet, { fetchImpl: failing, years: [2026, 2025] }),
      DgfipUnavailableError,
      "Une indisponibilité lève DgfipUnavailableError"
    );
  }

  // Refus métier de la DGFiP -> message explicite, pas de repli
  const rejectHtml = '<p class="margin-left-30px">COTISATIONS INCOHERENTES</p>';
  await assert.rejects(
    queryDgfipSimulator(rawSheet, { fetchImpl: async () => new Response(rejectHtml, { status: 200 }), years: [2025] }),
    /COTISATIONS INCOHERENTES/
  );
  console.log("- Indisponibilité et refus DGFiP : erreurs explicites, aucun calcul de remplacement");
}


// 5. Libellés des méthodes et phrase de régularisation avec virement entre conjoints
{
  console.log("Test 5: Libellés des méthodes & virement d'équilibrage");
  const valboxes = [
    { id: "t1", code: "1AJ", rawValue: 60000, attribution: 0, kind: "partner_0" },
    { id: "t2", code: "1BJ", rawValue: 20000, attribution: 1, kind: "partner_1" },
    { id: "t3", code: "8HW", rawValue: 1000, attribution: 0, kind: "partner_0" },
    { id: "t4", code: "8HX", rawValue: 2000, attribution: 1, kind: "partner_1" },
  ];
  const splits = calculateSplits({
    simuTogether: { totalTax: 5000, alreadyPaid: 3000, remainsToPay: 2000, source: 'dgfip' },
    simuPartner0: { totalTax: 5500, alreadyPaid: 1000, remainsToPay: 4500, source: 'dgfip', taxableIncome: 54000 },
    simuPartner1: { totalTax: 500, alreadyPaid: 2000, remainsToPay: -1500, source: 'dgfip', taxableIncome: 18000 },
    partner0Name: "Alex",
    partner1Name: "Camille",
  });

  for (const method of ['strict_individual', 'equal_gain', 'income_prorata', 'isolated_tax_prorata']) {
    assert.ok(splits[method].methodLabel.length > 0, `Libellé présent pour ${method}`);
    assert.ok(splits[method].methodDescription.length > 0, `Description présente pour ${method}`);
  }

  // Méthode « solo » : Camille (revenu le plus faible) paie 500 €, Alex 4 500 €
  const solo = splits.strict_individual;
  assert.strictEqual(solo.partners[1].taxAssigned, 500);
  assert.strictEqual(solo.partners[0].taxAssigned, 4500);
  // Camille a trop payé 1 500 € : Alex lui verse 1 500 € puis règle 2 000 € au fisc
  assert.strictEqual(solo.interPartnerTransfer.fromIndex, 0);
  assert.strictEqual(solo.interPartnerTransfer.toIndex, 1);
  assert.strictEqual(solo.interPartnerTransfer.amount, 1500);
  assert.ok(solo.summarySentence.startsWith("Alex verse"), "Phrase de virement au présent");
  assert.ok(solo.summarySentence.includes("administration fiscale"), "Solde dû mentionné");
  console.log(`- ${solo.methodLabel} : "${solo.summarySentence}"`);
}

// 6. Économie partagée 50/50 : aucune part négative
{
  console.log("Test 6: Économie partagée 50/50 sans part négative");
  const valboxes = [
    { id: "e1", code: "1AJ", rawValue: 48000, attribution: 0, kind: "partner_0" },
    { id: "e2", code: "1BJ", rawValue: 26000, attribution: 1, kind: "partner_1" },
  ];
  const run = (t0, t1, together) =>
    calculateSplits({
            simuTogether: { totalTax: together, alreadyPaid: 0, remainsToPay: together, source: 'dgfip' },
      simuPartner0: { totalTax: t0, alreadyPaid: 0, remainsToPay: t0, source: 'dgfip' },
      simuPartner1: { totalTax: t1, alreadyPaid: 0, remainsToPay: t1, source: 'dgfip' },
    }).equal_gain.partners.map((p) => p.taxAssigned);

  // Cas nominal : économie 900 € -> 450 € chacun
  assert.deepStrictEqual(run(3900, 800, 3800), [3450, 350]);
  // Camille ne paierait rien seule : elle ne peut pas avoir une part négative
  assert.deepStrictEqual(run(3775, 0, 2174), [2174, 0]);
  // Moitié de l'économie supérieure à l'impôt solo de D2 : D2 à 0, D1 paie tout l'impôt commun
  assert.deepStrictEqual(run(5000, 300, 4000), [4000, 0]);
  // Cas symétrique côté D1
  assert.deepStrictEqual(run(300, 5000, 4000), [0, 4000]);
  // Surcoût éventuel de la déclaration commune partagé par moitié
  assert.deepStrictEqual(run(1000, 1000, 2200), [1100, 1100]);
  for (const [t0, t1, tg] of [[3900, 800, 3800], [3775, 0, 2174], [5000, 300, 4000]]) {
    const [a, b] = run(t0, t1, tg);
    assert.ok(a >= 0 && b >= 0, "Aucune part négative");
    assert.strictEqual(a + b, tg, "La somme des parts = impôt commun");
  }
  console.log("- Parts toujours positives et somme = impôt commun");
}

// 7. Lecture des nombres et du solde du simulateur (réponses réelles : guillemets simples, valeurs cadrées à droite)
{
  console.log("Test 7: Parsing des champs du simulateur (PAS, prélèvements sociaux, remboursement)");
  assert.strictEqual(parseDgfipNumber('     502'), 502);
  assert.strictEqual(parseDgfipNumber('-     4200'), -4200, "signe séparé des chiffres par des espaces");
  assert.strictEqual(parseDgfipNumber('6.5'), 6.5);
  assert.strictEqual(parseDgfipNumber('*     11401'), 11401, "astérisque de plafonnement du quotient familial");
  assert.strictEqual(parseDgfipNumber(''), undefined);
  assert.strictEqual(parseDgfipNumber(undefined), undefined);

  const page = (fields) =>
    '<form>' + Object.entries(fields).map(([k, v]) => `<input type='hidden' name='${k}' value='${v}' />`).join('') + '</form>';
  const query = (fields) =>
    queryDgfipSimulator({ '1AJ': 1 }, { fetchImpl: async () => new Response(page(fields), { status: 200 }), years: [2026] });

  // PAS faible (100 €) : IINET (4 602) > IINETIR (4 358), mais les prélèvements sociaux valent bien PSNET = 344 €
  const lowPas = await query({ IINETIR: '    4358', PSNET: '     344', IINET: '    4602', IREST: '       0', RNICOL: '   60500' });
  assert.strictEqual(lowPas.socialLevies, 344);
  assert.strictEqual(lowPas.remainsToPay, 4602);
  assert.strictEqual(lowPas.alreadyPaid, 100, "PAS déjà versé = dû (IR + PS) − reste à payer");

  // PAS supérieur à l'impôt : remboursement de 1 298 € (IREST), PAS = 6 000 €
  const refund = await query({ IINETIR: '    4358', PSNET: '     344', IINET: '       0', IREST: '    1298' });
  assert.strictEqual(refund.remainsToPay, -1298);
  assert.strictEqual(refund.alreadyPaid, 6000);

  // Sans prélèvements sociaux
  const noPs = await query({ IINETIR: '    3883', IINET: '     883', IREST: '       0' });
  assert.strictEqual(noPs.socialLevies, undefined);
  assert.strictEqual(noPs.alreadyPaid, 3000);
  console.log("- PAS, prélèvements sociaux et remboursements correctement extraits");
}

// 8. Feuille « solo » : toutes les cases du déclarant 2 sont ramenées à la case de référence du déclarant 1
{
  console.log("Test 8: Cases PAS et revenus du déclarant 2 en simulation isolée");
  const mk = (code, rawValue, attribution) => ({ id: code, code, rawValue, attribution, kind: attribution === 1 ? 'partner_1' : 'partner_0' });
  const valboxes = [
    mk('1AJ', 40000, 0), mk('1BJ', 25000, 1),
    mk('8HV', 3000, 0), mk('8IV', 1200, 1),    // retenue à la source sur salaires
    mk('8HW', 500, 0), mk('8IW', 300, 1),      // acomptes d'impôt sur le revenu
    mk('8HX', 70, 0), mk('8IX', 40, 1),        // acomptes de prélèvements sociaux
  ];
  const solo1 = buildIncomeSheet(valboxes, 1);
  assert.strictEqual(solo1['1AJ'], 25000);
  assert.strictEqual(solo1['8HV'], 1200);
  assert.strictEqual(solo1['8HW'], 300, "8IW → 8HW (et non 8HX, qui est l'acompte PS du déclarant 1)");
  assert.strictEqual(solo1['8HX'], 40);
  const solo0 = buildIncomeSheet(valboxes, 0);
  assert.strictEqual(solo0['8HW'], 500);
  assert.strictEqual(solo0['8HX'], 70);
  assert.strictEqual(solo0['1AJ'], 40000);
  console.log("- 8IV/8IW/8IX → 8HV/8HW/8HX ; 8HX n'est plus confondu avec le PAS du déclarant 2");
}

// 9. Enfants en garde alternée : 0CH cohérent avec 7EB/7ED/7EG
{
  console.log("Test 9: Cohérence 0CH / 7EB après conversion d'un demi-enfant");
  const converted = handleChildrenSplit({ '0CF': 1, '7EA': 0.5 });
  assert.strictEqual(converted['7EA'], 0);
  assert.strictEqual(converted['7EB'], 1);
  assert.strictEqual(converted['0CH'], 2, "0CH rendu pair et au moins égal à 7EB");
  assert.strictEqual(converted['0CF'], 0, "un enfant à charge = deux enfants en garde alternée");
  console.log("- Nombre de parts conservé");
}

// 9b. Frais de garde : jamais de rang d'enfant (7GB…) sans enfant correspondant, plafonds par enfant préservés
{
  console.log("Test 9b: Frais de garde et nombre d'enfants du conjoint");
  // 2 enfants partagés 50/50 → chaque conjoint n'a qu'un enfant : les frais (1 750 + 1 750) sont regroupés sur 7GA
  const oneChild = handleChildrenSplit({ '0CF': 1, '7GA': 1750, '7GB': 1750 });
  assert.strictEqual(oneChild['7GA'], 3500);
  assert.strictEqual(oneChild['7GB'], 0);
  // Conjoint qui garde ses 2 enfants : montants par enfant inchangés (plafond appliqué enfant par enfant par le simulateur)
  const twoChildren = handleChildrenSplit({ '0CF': 2, '7GA': 4000, '7GB': 1000 });
  assert.strictEqual(twoChildren['7GA'], 4000);
  assert.strictEqual(twoChildren['7GB'], 1000);
  // 3 enfants, 1,5 pour ce conjoint : 1 en garde classique + 1 en alternée, frais répartis 2/3 – 1/3, total conservé
  const mixed = handleChildrenSplit({ '0CF': 1.5, '7GA': 900, '7GB': 900 });
  assert.strictEqual(mixed['0CF'], 1);
  assert.strictEqual(mixed['0CH'], 1);
  const total = (mixed['7GA'] || 0) + (mixed['7GB'] || 0) + (mixed['7GE'] || 0) + (mixed['7GF'] || 0);
  assert.strictEqual(total, 1800, "aucun euro de frais perdu");
  assert.strictEqual(mixed['7GB'], 0, "un seul enfant en garde classique : pas de 7GB");
  console.log("- Frais de garde cohérents avec les enfants");
}

// 9c. Impôt négatif (crédits d'impôt supérieurs à l'impôt) : IRESTIR remplace IINETIR
{
  console.log("Test 9c: Impôt net négatif (crédit d'impôt remboursable)");
  const html = "<input type='hidden' name='IRESTIR' value='-     1352' /><input type='hidden' name='IINET' value='       0' /><input type='hidden' name='IREST' value='    1852' />";
  const res = await queryDgfipSimulator({ '1AJ': 1 }, { fetchImpl: async () => new Response(html, { status: 200 }), years: [2026] });
  assert.strictEqual(res.totalTax, -1352);
  assert.strictEqual(res.remainsToPay, -1852);
  assert.strictEqual(res.alreadyPaid, 500, "PAS = −1 352 − (−1 852)");
  console.log("- Restitution correctement interprétée");
}

// 10. Prélèvements sociaux et PAS lus sur les simulations officielles
{
  console.log("Test 10: Prélèvements sociaux attribués d'après les simulations solo");
  const splits = calculateSplits({
    simuTogether: { totalTax: 4000, alreadyPaid: 4100, remainsToPay: 300, socialLevies: 400, source: 'dgfip' },
    simuPartner0: { totalTax: 3500, alreadyPaid: 3000, remainsToPay: 1000, socialLevies: 300, source: 'dgfip', taxableIncome: 40000 },
    simuPartner1: { totalTax: 1000, alreadyPaid: 1100, remainsToPay: 0, socialLevies: 100, source: 'dgfip', taxableIncome: 20000 },
  });
  const r = splits.isolated_tax_prorata;
  assert.strictEqual(r.partners[0].socialLevies, 300);
  assert.strictEqual(r.partners[1].socialLevies, 100);
  // impôt attribué 3 111 / 889 ; reste à payer = impôt + PS − PAS
  assert.strictEqual(r.partners[0].taxAssigned + r.partners[1].taxAssigned, 4000);
  assert.strictEqual(r.partners[0].remainsToPay, r.partners[0].taxAssigned + 300 - 3000);
  assert.strictEqual(r.partners[1].remainsToPay, r.partners[1].taxAssigned + 100 - 1100);
  assert.strictEqual(r.coupleAlreadyPaid, 4100);
  assert.strictEqual(r.partners[0].remainsToPay + r.partners[1].remainsToPay, 300, "somme des restes = reste à payer du foyer");
  console.log("- Somme des restes à payer = reste à payer officiel du foyer");
}

// 11. Girardin industriel : somme déjà payée par son porteur
{
  console.log("Test 11: Girardin crédité au porteur");
  const splits = calculateSplits({
    simuTogether: { totalTax: 7000, alreadyPaid: 0, remainsToPay: 7000, outreMerReductions: 6000, source: 'dgfip', taxableIncome: 90000 },
    simuPartner0: { totalTax: 9000, alreadyPaid: 0, remainsToPay: 9000, outreMerReductions: 6000, source: 'dgfip', taxableIncome: 60000 },
    simuPartner1: { totalTax: 2000, alreadyPaid: 0, remainsToPay: 2000, source: 'dgfip', taxableIncome: 30000 },
  });
  // Impôt avant Girardin : foyer 13 000, solo 15 000 + 2 000 → 13 000 × 15 000 / 17 000 = 11 471 pour D1
  const r = splits.isolated_tax_prorata;
  assert.strictEqual(r.partners[0].taxAssigned, 11471 - 6000, "D1 : sa part brute moins son Girardin");
  assert.strictEqual(r.partners[1].taxAssigned, 13000 - 11471);
  for (const method of Object.keys(splits)) {
    const [a, b] = splits[method].partners;
    assert.strictEqual(a.taxAssigned + b.taxAssigned, 7000, `${method} : somme = impôt net du foyer`);
    assert.strictEqual(a.remainsToPay + b.remainsToPay, 7000, `${method} : somme des restes = reste du foyer`);
  }
  // Taux effectif : l'impôt payé via le Girardin compte (11 471 € / 60 000 € de revenu net imposable)
  assert.ok(Math.abs(r.partners[0].effectiveTaxRate - (11471 / 60000) * 100) < 1e-9);
  // Sans Girardin, rien ne change
  const plain = calculateSplits({
    simuTogether: { totalTax: 4000, alreadyPaid: 0, remainsToPay: 4000, source: 'dgfip' },
    simuPartner0: { totalTax: 3000, alreadyPaid: 0, remainsToPay: 3000, source: 'dgfip' },
    simuPartner1: { totalTax: 2000, alreadyPaid: 0, remainsToPay: 2000, source: 'dgfip' },
  });
  assert.strictEqual(plain.isolated_tax_prorata.partners[0].taxAssigned, 2400);
  console.log("- Réduction Girardin imputée à son porteur, totaux conservés");
}

// 12. Réglage du prélèvement à la source
{
  console.log("Test 12: Taux de PAS conseillé");
  const together = {
    totalTax: 4000, alreadyPaid: 0, remainsToPay: 4000, source: 'dgfip',
    withholding: { householdRate: 6.5, rate0: 8.1, rate1: 3.9, base0: 40000, base1: 25000 },
  };
  const summary = calculateSplits({
    simuTogether: together,
    simuPartner0: { totalTax: 3000, alreadyPaid: 0, remainsToPay: 3000, source: 'dgfip', taxableIncome: 40000 },
    simuPartner1: { totalTax: 2000, alreadyPaid: 0, remainsToPay: 2000, source: 'dgfip', taxableIncome: 25000 },
  }).isolated_tax_prorata; // 2 400 € / 1 600 €
  const advice = computeWithholdingAdvice(together, summary);
  assert.strictEqual(advice.partners[0].recommendedRate, 6, "2 400 / 40 000 = 6 %");
  assert.strictEqual(advice.partners[1].recommendedRate, 6.4, "1 600 / 25 000 = 6,4 %");
  assert.strictEqual(advice.partners[0].officialRate, 8.1);
  assert.strictEqual(withheldAmount(6.4, 30000), 1920);
  assert.strictEqual(computeWithholdingAdvice({ ...together, withholding: undefined }, summary), undefined, "pas d'assiette → pas de conseil");
  console.log("- Taux conseillés : 6 % / 6,4 %");
}

// 13. Comparaison de deux simulations enregistrées
{
  console.log("Test 13: Comparaison de deux simulations");
  const make = (tax, gain, girardin) => {
    const sims = (t, g) => ({ totalTax: t, alreadyPaid: 0, remainsToPay: t, source: 'dgfip', taxableIncome: 30000, outreMerReductions: g });
    const together = sims(tax, girardin);
    const splits = calculateSplits({ simuTogether: together, simuPartner0: sims(tax, girardin), simuPartner1: sims(gain, 0) });
    return { id: 'x', createdAt: '', updatedAt: '', name: 'n', partner0Name: 'A', partner1Name: 'B', boxes: [], partner0ChildrenFraction: 0.5, partner0CommonFraction: 0.5, simulationData: { together, partner0: sims(tax, girardin), partner1: sims(gain, 0), splits }, summary: {} };
  };
  const cmp = compareSimulations(make(4000, 1000, 0), make(5000, 1000, 2000), 'isolated_tax_prorata');
  const byKey = Object.fromEntries(cmp.rows.map((r) => [r.key, r]));
  assert.strictEqual(byKey['household-net'].delta, 1000);
  assert.strictEqual(byKey['household-tax'].a, 4000);
  assert.strictEqual(byKey['household-tax'].b, 7000, "le Girardin est réintégré à l'impôt du foyer");
  assert.ok(byKey['share-0'] && byKey['remains-1'] && byKey['rate-0'].kind === 'percent');
  console.log("- Lignes de comparaison cohérentes");
}

console.log("=== TOUS LES TESTS DES MOTEURS FISCAUX SONT VALIDÉS AVEC SUCCÈS ! ===");

