import { PDFParseResult, PDFParseWarning, ValuedBox } from './types';
import { getBoxDefinition, getDefaultAttribution } from './cerfa-variables';
import { generateId } from './utils';

// Regex pour identifier les codes cases fiscales standard (ex: 1AJ, 1BJ, 8HW, 7UD, 0CF, HLS...)
const REGEX_CASE_CODE = /\b([0-9][A-Z0-9]{2}|[A-Z]{3})\b/g;

// Motif strict "CODE Libellé : MONTANT" sur une ligne (ex: "1AJ Salaires - Déclarant 1 : 0", "5QC BNC - Déc 1 : 115000")
const REGEX_LINE_CODE_COLON = /^\s*([0-9][A-Z0-9]{2}|[A-Z]{3})\b\s*(.*?)\s*:\s*([0-9\s\u00A0\u202F\.,]+|X)\s*$/i;

// Regex pour motif CODE -> MONTANT avec séparateur ":" (ne coupe pas sur les chiffres contenus dans le libellé)
const REGEX_CODE_THEN_AMOUNT = /\b([0-9][A-Z0-9]{2}|[A-Z]{3})\b\s*[^:\n\r]{0,120}[:]\s*([0-9][0-9\s\u00A0\u202F\.]*|X)\b/gi;

// Regex pour motif MONTANT -> CODE sur une même ligne (fréquent sur Avis d'imposition)
const REGEX_AMOUNT_THEN_CODE = /\b([0-9][0-9\s\u00A0\u202F\.]*[0-9]|[0-9]+)\s*€?\s*(?:en\s+case\s+|case\s+|\(\s*)?\b([0-9][A-Z0-9]{2}|[A-Z]{3})\b/gi;

// Nettoie les séparateurs de milliers (espaces, espaces insécables, virgules, points)
function parseTaxAmount(valStr: string): number {
  if (!valStr) return 0;
  // Nettoyer les espaces standards, insécables (NBSP \u00A0, \u202F) et séparateurs
  const clean = valStr
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/\.(?=\d{3})/g, '') // Supprime les points séparateurs de milliers (ex: 45.000)
    .replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

function formatName(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function isValidTaxBoxCode(code: string): boolean {
  if (!code || code.length !== 3) return false;
  // Format standard : commence par un chiffre et contient au moins une lettre majuscule (ex: 1AJ, 5QC, 8HV, 0CF...)
  if (/^[0-9][A-Z0-9]{2}$/.test(code) && /[A-Z]/.test(code)) {
    return true;
  }
  // Codes lettres spécifiques répertoriés dans le dictionnaire Cerfa (ex: HLS, HLT, HKS...)
  return getBoxDefinition(code) !== undefined;
}

/**
 * Charge pdfjs-dist dynamiquement avec fallback résilient.
 * Utilise la version legacy pour une compatibilité totale sans fonctions JS expérimentales.
 */
async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Utilisation du worker local servi directement depuis /public pour éviter tout blocage CORS
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  return pdfjsLib;
}

interface TextItemWithCoords {
  str: string;
  x: number;
  y: number;
  width: number;
}

/**
 * Analyse le texte intégral d'un PDF de déclaration 2042 ou avis déclaratif (ASDIR).
 */
export async function parseTaxPdfClient(fileBuffer: ArrayBuffer): Promise<PDFParseResult> {
  const pdfjsLib = await getPdfJs();

  // Configuration du chargement
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const warnings: PDFParseWarning[] = [];
  const extractedMap = new Map<string, number>();

  let fullRawText = '';
  let detectedYear: number | undefined;
  let householdStatus: string | undefined;
  let declarant1Name: string | undefined;
  let declarant2Name: string | undefined;
  let totalTextItemsCount = 0;

  console.log(`[ChacunSaPart] Début d'analyse PDF : ${doc.numPages} page(s) détectée(s)`);

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    totalTextItemsCount += content.items.length;

    // 1. Extraction des items avec leurs coordonnées géométriques (X, Y)
    const itemsWithCoords: TextItemWithCoords[] = [];

    for (const item of content.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.trim().length > 0) {
        itemsWithCoords.push({
          str: item.str,
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
          width: Math.round(item.width || 0),
        });
      }
    }

    // Extraction des prénoms des déclarants sur la page 1 de la déclaration 2042
    if (pageNum === 1) {
      const d1Header = itemsWithCoords.find((it) => /DÉCLARANT\s+1/i.test(it.str));
      const d2Header = itemsWithCoords.find((it) => /DÉCLARANT\s+2/i.test(it.str));
      const prenomsLabel = itemsWithCoords.find((it) => /^Prénoms$/i.test(it.str));

      if (d1Header && prenomsLabel) {
        const d1First = itemsWithCoords.find(
          (it) =>
            it.x > 60 &&
            Math.abs(it.y - prenomsLabel.y) <= 8 &&
            Math.abs(it.x - d1Header.x) < 50 &&
            !/prénoms|nom/i.test(it.str)
        );
        if (d1First) declarant1Name = formatName(d1First.str);
      }
      if (d2Header && prenomsLabel) {
        const d2First = itemsWithCoords.find(
          (it) =>
            it.x > 200 &&
            Math.abs(it.y - prenomsLabel.y) <= 8 &&
            Math.abs(it.x - d2Header.x) < 50 &&
            !/prénoms|nom/i.test(it.str)
        );
        if (d2First) declarant2Name = formatName(d2First.str);
      }
    }

    // 2. Reconstruction des lignes physiques par coordonnées verticales (Y)
    const lineBuckets = new Map<number, TextItemWithCoords[]>();
    for (const item of itemsWithCoords) {
      let bucketY: number | null = null;
      for (const existingY of lineBuckets.keys()) {
        if (Math.abs(existingY - item.y) <= 4) {
          bucketY = existingY;
          break;
        }
      }
      const yKey = bucketY !== null ? bucketY : item.y;
      if (!lineBuckets.has(yKey)) {
        lineBuckets.set(yKey, []);
      }
      lineBuckets.get(yKey)!.push(item);
    }

    // Trier les lignes du haut vers le bas (dans un PDF, Y va de bas en haut)
    const sortedYKeys = Array.from(lineBuckets.keys()).sort((a, b) => b - a);

    const pageLines: string[] = [];
    for (const y of sortedYKeys) {
      // Trier les éléments de gauche à droite
      const sortedItems = lineBuckets.get(y)!.sort((a, b) => a.x - b.x);
      const lineText = sortedItems.map((i) => i.str).join(' ');
      pageLines.push(lineText);
    }

    const pageFullText = pageLines.join('\n');
    fullRawText += '\n' + pageFullText;

    // 3. Détection de l'année
    if (!detectedYear) {
      const yearMatch = /(?:revenus\s+de\s+(?:l['’]ann[eé]e\s+)?|d[eé]claration\s+(?:des\s+revenus\s+)?|avis\s+(?:d['’]imp[oô]t\s+)?)(202[0-9])/i.exec(pageFullText);
      if (yearMatch) {
        detectedYear = parseInt(yearMatch[1], 10);
      }
    }

    // 4. Détection de la situation familiale
    if (!householdStatus) {
      if (/(?:mari[eé][·s]?\b|situation\s*(?:du\s+foyer)?\s*:\s*M\b|état\s+civil.*marié)/i.test(pageFullText)) {
        householdStatus = 'M';
      } else if (/(?:pacs[eé][·s]?\b|situation\s*(?:du\s+foyer)?\s*:\s*O\b|état\s+civil.*pacsé)/i.test(pageFullText)) {
        householdStatus = 'O';
      }
    }

    // 5. Stratégie A : Analyse des lignes reconstituées
    for (const line of pageLines) {
      // Motif 1 : Format standard Cerfa avec libellé et deux-points
      // Ex: "1AJ Salaires - Déclarant 1 : 0" ou "5QC BNC professionnels : 115000"
      const matchColon = REGEX_LINE_CODE_COLON.exec(line);
      if (matchColon) {
        const code = matchColon[1].toUpperCase();
        if (isValidTaxBoxCode(code) && !extractedMap.has(code)) {
          const rawVal = matchColon[3].trim();
          const amount = rawVal === 'X' ? 1 : parseTaxAmount(rawVal);
          if (!isNaN(amount)) {
            extractedMap.set(code, amount);
            console.log(`[ChacunSaPart] Détecté (Ligne Cerfa) : ${code} = ${amount}`);
            continue;
          }
        }
      }

      // Motif 2 : CODE -> MONTANT avec deux-points au sein d'une ligne
      let match: RegExpExecArray | null;
      const r1 = new RegExp(REGEX_CODE_THEN_AMOUNT);
      while ((match = r1.exec(line)) !== null) {
        const code = match[1].toUpperCase();
        if (isValidTaxBoxCode(code) && !extractedMap.has(code)) {
          const rawVal = match[2].trim();
          const amount = rawVal === 'X' ? 1 : parseTaxAmount(rawVal);
          if (!isNaN(amount)) {
            extractedMap.set(code, amount);
            console.log(`[ChacunSaPart] Détecté (Code -> Montant) : ${code} = ${amount}`);
          }
        }
      }

      // Motif 3 : MONTANT -> CODE (fréquent sur Avis d'impôt : "45 000 € (1AJ)")
      const r2 = new RegExp(REGEX_AMOUNT_THEN_CODE);
      while ((match = r2.exec(line)) !== null) {
        const amount = parseTaxAmount(match[1]);
        const code = match[2].toUpperCase();
        if (isValidTaxBoxCode(code) && amount > 0 && !extractedMap.has(code)) {
          extractedMap.set(code, amount);
          console.log(`[ChacunSaPart] Détecté (Montant -> Code) : ${code} = ${amount} €`);
        }
      }

      // Motif 4 : Enfants à charge en case F / 0CF / H / 0CH
      const childrenMatch = /(?:nombre\s+d['’]enfants\s+(?:à\s+charge\s+)?(?:\(case\s+F\))?|case\s+F\b)[^\d\n\r]{0,30}?[:\s]\s*([0-9]+)\b/i.exec(line);
      if (childrenMatch) {
        const count = parseInt(childrenMatch[1], 10);
        if (count > 0 && count <= 15 && !extractedMap.has('0CF')) {
          extractedMap.set('0CF', count);
          console.log(`[ChacunSaPart] Détecté (Enfants 0CF) : ${count}`);
        }
      }

      const altChildrenMatch = /(?:enfants\s+en\s+r[eé]sidence\s+altern[eé]e|case\s+H\b)[^\d\n\r]{0,30}?[:\s]\s*([0-9]+)\b/i.exec(line);
      if (altChildrenMatch) {
        const count = parseInt(altChildrenMatch[1], 10);
        if (count > 0 && count <= 15 && !extractedMap.has('0CH')) {
          extractedMap.set('0CH', count);
          console.log(`[ChacunSaPart] Détecté (Garde alternée 0CH) : ${count}`);
        }
      }
    }

    // 6. Stratégie B : Inspection séquentielle des tokens (cellules ou colonnes adjacentes)
    for (let i = 0; i < itemsWithCoords.length; i++) {
      const token = itemsWithCoords[i].str.trim().toUpperCase();
      if (isValidTaxBoxCode(token) && !extractedMap.has(token)) {
        // Regarder dans les 4 éléments suivants pour trouver un montant
        for (let j = 1; j <= 4; j++) {
          if (i + j < itemsWithCoords.length) {
            const candidate = itemsWithCoords[i + j].str.trim();
            if (/^[0-9][0-9\s\u00A0\u202F\.]*[0-9]$|^[0-9]+$|^X$/i.test(candidate)) {
              const amount = candidate.toUpperCase() === 'X' ? 1 : parseTaxAmount(candidate);
              if (!isNaN(amount)) {
                extractedMap.set(token, amount);
                console.log(`[ChacunSaPart] Détecté (Adjacence colonne) : ${token} = ${amount}`);
                break;
              }
            }
          }
        }
      }
    }
  }

  console.log(`[ChacunSaPart] Fin d'analyse : ${extractedMap.size} case(s) extraite(s) sur ${totalTextItemsCount} fragments de texte.`);

  // 7. Stratégie C (Fallback sémantique pour Avis d'impôt où les codes 1AJ/1BJ sont remplacés par du texte)
  if (!extractedMap.has('1AJ')) {
    const sal1Match = /(?:traitements\s*,?\s*salaires|salaires\s+et\s+assimil[eé]s)[^\d\n\r]{0,50}?(?:d[eé]clarant\s+1|vous)[^\d\n\r]{0,30}?[:\s]\s*([0-9][0-9\s\u00A0\u202F\.]*[0-9]|[0-9]+)/i.exec(fullRawText);
    if (sal1Match) {
      const val = parseTaxAmount(sal1Match[1]);
      if (val > 0) extractedMap.set('1AJ', val);
    }
  }

  if (!extractedMap.has('1BJ')) {
    const sal2Match = /(?:traitements\s*,?\s*salaires|salaires\s+et\s+assimil[eé]s)[^\d\n\r]{0,50}?(?:d[eé]clarant\s+2|conjoint)[^\d\n\r]{0,30}?[:\s]\s*([0-9][0-9\s\u00A0\u202F\.]*[0-9]|[0-9]+)/i.exec(fullRawText);
    if (sal2Match) {
      const val = parseTaxAmount(sal2Match[1]);
      if (val > 0) extractedMap.set('1BJ', val);
    }
  }

  // Retenue à la source sur salaires et pensions : 8HV (Déclarant 1) / 8IV (Déclarant 2)
  if (!extractedMap.has('8HV')) {
    const pas1Match = /(?:pr[eé]l[eè]vement\s+à\s+la\s+source|retenue\s+à\s+la\s+source)[^\d\n\r]{0,50}?(?:d[eé]clarant\s+1|vous)[^\d\n\r]{0,30}?[:\s]\s*([0-9][0-9\s\u00A0\u202F\.]*[0-9]|[0-9]+)/i.exec(fullRawText);
    if (pas1Match) {
      const val = parseTaxAmount(pas1Match[1]);
      if (val > 0) extractedMap.set('8HV', val);
    }
  }

  if (!extractedMap.has('8IV')) {
    const pas2Match = /(?:pr[eé]l[eè]vement\s+à\s+la\s+source|retenue\s+à\s+la\s+source)[^\d\n\r]{0,50}?(?:d[eé]clarant\s+2|conjoint)[^\d\n\r]{0,30}?[:\s]\s*([0-9][0-9\s\u00A0\u202F\.]*[0-9]|[0-9]+)/i.exec(fullRawText);
    if (pas2Match) {
      const val = parseTaxAmount(pas2Match[1]);
      if (val > 0) extractedMap.set('8IV', val);
    }
  }

  // Années de naissance : les deux premières « Date de naissance » complétées de la page 1 (Déclarant 1 puis 2)
  const birthDates = Array.from(
    fullRawText.matchAll(/date\s+de\s+naissance\D{0,40}?\b(?:0?[1-9]|[12]\d|3[01])\s*[\/\.\-\s]\s*(?:0?[1-9]|1[0-2])\s*[\/\.\-\s]\s*((?:19|20)\d{2})\b/gi)
  )
    .map((m) => parseInt(m[1], 10))
    .filter((year) => year >= 1900 && year <= new Date().getFullYear());
  if (!extractedMap.has('0DA') && birthDates[0]) extractedMap.set('0DA', birthDates[0]);
  if (!extractedMap.has('0DB') && birthDates[1]) extractedMap.set('0DB', birthDates[1]);

  // Type de document
  let sourceType: 'declaration_2042' | 'avis_situation' | 'unknown' = 'unknown';
  if (/10330|2042/i.test(fullRawText)) {
    sourceType = 'declaration_2042';
  } else if (/avis\s+de\s+situation\s+d[eé]clarative|avis\s+d['’]imp[oô]t|asdir/i.test(fullRawText)) {
    sourceType = 'avis_situation';
  }

  // Avertissements
  if (totalTextItemsCount < 10) {
    warnings.push({
      type: 'warning',
      message: 'Ce fichier semble être une image scannée sans couche de texte reconnue. Renseignez directement vos montants ci-dessous.',
    });
  } else if (extractedMap.size === 0) {
    warnings.push({
      type: 'info',
      message: 'Aucune case fiscale chiffrée n’a été reconnue automatiquement. Nous avons initialisé les cases principales pour vous permettre de les ajuster.',
    });
  }

  // Transformation en liste de ValuedBox
  const boxes: ValuedBox[] = Array.from(extractedMap.entries()).map(([code, rawValue]) => {
    const def = getBoxDefinition(code);
    const kind = def?.kind || (code.startsWith('1B') || code === '8IV' ? 'partner_1' : 'partner_0');
    const attribution = getDefaultAttribution(kind);

    return {
      id: generateId(),
      code,
      rawValue,
      attribution,
      description: def?.description || `Case fiscale ${code}`,
      kind,
      category: def?.category,
    };
  });

  return {
    boxes,
    householdStatus: householdStatus || 'O',
    detectedYear: detectedYear || 2024,
    warnings,
    sourceType,
    declarant1Name,
    declarant2Name,
  };
}
