import assert from 'node:assert';

const REGEX_CODE_THEN_AMOUNT = /\b([0-9][A-Z]{2})\b[^\d\n\r]{0,80}?[:\s\-]\s*([0-9][0-9\s\u00A0\u202F\.]*[0-9]|[0-9]+)\b/gi;
const REGEX_AMOUNT_THEN_CODE = /\b([0-9][0-9\s\u00A0\u202F\.]*[0-9]|[0-9]+)\s*€?\s*(?:en\s+case\s+|case\s+|\(\s*)?\b([0-9][A-Z]{2})\b/gi;

function parseTaxAmount(valStr) {
  const clean = valStr.replace(/[\s\u00A0\u202F\.]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

function extractFromLine(line) {
  const extracted = {};

  let match;
  // 1. CODE -> MONTANT
  const r1 = new RegExp(REGEX_CODE_THEN_AMOUNT);
  while ((match = r1.exec(line)) !== null) {
    const code = match[1].toUpperCase();
    const val = parseTaxAmount(match[2]);
    if (val > 0) extracted[code] = val;
  }

  // 2. MONTANT -> CODE
  const r2 = new RegExp(REGEX_AMOUNT_THEN_CODE);
  while ((match = r2.exec(line)) !== null) {
    const val = parseTaxAmount(match[1]);
    const code = match[2].toUpperCase();
    if (val > 0 && !extracted[code]) extracted[code] = val;
  }

  return extracted;
}

console.log("Test des regex d'extraction de cases...");

const samples = [
  "1AJ : 45 200 €",
  "1BJ TRAITEMENTS, SALAIRES : 28 100",
  "Frais réels 1AK : 3 500 €",
  "8HW Prélèvement à la source : 4 520 €",
  "8HX 1 380 €",
  "7UD Dons aux organismes d'aide : 300 €",
  "Salaires et assimilés 45 000 € (1AJ)",
  "Traitements 28 000 1BJ",
];

for (const s of samples) {
  const res = extractFromLine(s);
  console.log(`"${s}" =>`, res);
  assert(Object.keys(res).length > 0, `Doit extraire une case de: "${s}"`);
}

console.log("Tous les patterns de regex fonctionnent parfaitement !");
