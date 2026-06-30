# AGENTS.md — Directives & Architecture pour Agents IA

Ce document décrit l'architecture, les principes directeurs et les commandes de développement du projet **Chacun Sa Part**. Tout agent IA intervenant sur cette base de code doit impérativement respecter ces consignes.

---

## 1. Vue d'ensemble du projet

**Chacun Sa Part** est une application web permettant à des couples (mariés ou pacsés sous déclaration commune en France) de calculer une répartition équitable de leur impôt sur le revenu.

### Principes cardinaux
- 🏛️ **Vérité fiscale de l'État (Simulateur DGFiP) :** Les calculs d'impôt s'appuient exclusivement sur le simulateur officiel de la Direction Générale des Finances Publiques (`https://simulateur-ir-ifi.impots.gouv.fr/cgi-bin/calc-[année].cgi`). Aucun moteur de calcul local ne le remplace.
- 🌐 **SPA statique + relais anti-CORS :** L'application est une SPA React (Vite) 100 % statique. Le simulateur de la DGFiP ne renvoyant pas d'en-têtes CORS, le navigateur l'interroge via un petit relais same-origin : une Cloudflare Pages Function (`functions/api/dgfip/[year].ts`) en production, le proxy de Vite (`vite.config.ts`) en développement. Le relais ne transmet que le formulaire vers l'URL `calc-[année].cgi`.
- 🚧 **Pas de repli :** Si le simulateur est indisponible, `queryDgfipSimulator` lève une `DgfipUnavailableError` et l'interface affiche un message d'indisponibilité/maintenance. Ne jamais réintroduire de calcul de substitution.
- 💾 **Persistance locale :** L'historique des simulations est géré exclusivement via `localStorage` côté client (`chacun_sa_part_simulations_v1`).

---

## 2. Stack Technique

- **Framework :** React 19 + Vite (SPA statique), hébergée sur Cloudflare Pages (free tier) avec une Pages Function pour le relais DGFiP.
- **Langage :** TypeScript (mode strict).
- **Styles :** Tailwind CSS v4 avec `@tailwindcss/postcss`.
- **Composants d'interface :** Radix UI (`@radix-ui/react-dialog`, `slider`, `tabs`, etc.) et Lucide React pour les icônes.
- **Parsing PDF :** `pdfjs-dist` avec worker local servi depuis `/public/pdf.worker.min.mjs` et .
- **Tests :** Node.js natif avec `tsx`.

---

## 3. Structure du Projet

```
chacun-sa-part/
├── functions/
│   └── api/dgfip/[year].ts       # Cloudflare Pages Function : relais vers calc-[année].cgi
├── public/
│   └── pdf.worker.min.mjs        # Worker pdfjs-dist servi statiquement
├── src/
│   ├── main.tsx                  # Point d'entrée Vite (ThemeProvider + App)
│   ├── App.tsx                   # Composant principal avec machine d'état
│   ├── index.css                 # Styles Tailwind CSS et variables CSS
│   ├── components/
│   │   ├── layout/               # Header, Stepper, Footer, Logo, ThemeProvider, ErrorBanner
│   │   └── ui/                   # Primitives UI (Dialog, Button, Card, Slider, etc.)
│   ├── features/                 # Un dossier par étape du parcours
│   │   ├── import/               # DropzoneUpload (étape 1)
│   │   ├── review/               # TaxCasesReview (étape 2)
│   │   ├── results/              # ComparisonResults, SettlementCard, sliders, tableau officiel (étape 3)
│   │   └── history/              # HistoryModal, SaveCopyDialog
│   └── lib/
│       ├── default-boxes.ts      # Cases de départ (saisie manuelle) et cases PAS
│       ├── cerfa-variables.ts    # Dictionnaire des cases fiscales officielles
│       ├── dgfip-client.ts       # Feuilles de revenus, appel du relais DGFiP, parsing HTML
│       ├── split-engine.ts       # Calcul des 4 clés de répartition & compensations
│       ├── simulation-service.ts # Orchestration des 3 simulations + répartition
│       ├── history-storage.ts    # Historique localStorage
│       ├── pdf-parser.ts         # Extraction géométrique et sémantique du PDF
│       └── types.ts, tones.ts, utils.ts
├── scripts/
│   ├── build_cerfa_variables.py  # Régénère src/lib/cerfa_variables_raw.json depuis le simulateur DGFiP
│   └── check-simulator.mts       # Contrôle de cohérence contre le vrai simulateur (npm run check:simulator)
├── test/                         # verify-engines.mjs, verify-history-service.mjs
├── index.html                    # Page HTML Vite (thème, polices)
├── vite.config.ts                # Vite + alias @ + proxy de dev vers la DGFiP
├── wrangler.toml                 # Config Cloudflare Pages
└── AGENTS.md
```

---

## 4. Commandes & Workflows de Développement

### Exécution des tests
Avant toute modification ou validation de code, exécuter impérativement la suite de tests :
```bash
npm test
```
Cette commande lance :
1. `test/verify-engines.mjs` : Validation des barèmes fiscaux, quotients, plafonnements de demi-parts et modèles de split.
2. `test/verify-history-service.mjs` : Validation du service de simulation et de la persistance locale.

### Lancement du serveur de développement
```bash
npm run dev
```
Démarre Vite sur [http://localhost:5173](http://localhost:5173) ; `/api/dgfip/[année]` est relayé vers la DGFiP par le proxy de Vite.

### Compilation de production
```bash
npm run build
```
Vérifie les types puis génère la SPA statique dans `dist/`.

### Prévisualisation avec la vraie Pages Function / déploiement
```bash
npm run preview:pages   # build + wrangler pages dev dist
npm run deploy          # build + wrangler pages deploy dist (Cloudflare Pages)
```

---

## 5. Règles Spécifiques pour les Modifications

1. **Simulateur officiel DGFiP, sans repli :**
   Toute simulation passe par `queryDgfipSimulator` (relais `/api/dgfip/[année]`). En cas d'indisponibilité, l'erreur est remontée à l'utilisateur (message de maintenance), jamais masquée par un calcul local.

2. **Préservation de la robustesse des moteurs fiscaux :**
   Toute modification touchant `split-engine.ts` ou `dgfip-client.ts` doit obligatoirement être couverte par un test dans `test/verify-engines.mjs`.

3. **Compatibilité PDF :**
   `pdfjs-dist` nécessite le worker servi depuis `/public/pdf.worker.min.mjs`.

4. **Identité visuelle :**
   Chaque rôle a une couleur unique, définie en tokens dans `src/index.css` et exposée par `src/lib/tones.ts` : `p0` (Déclarant 1, bleu), `p1` (Déclarant 2, framboise), `household` (foyer, violet), `gain` (économie/remboursement), `owe` (reste à payer). Ne pas coder de couleurs hexadécimales dans les composants. Les textes ne doivent jamais affirmer que « tout est local » : le PDF est lu dans le navigateur, mais les montants transitent par le relais `/api/dgfip` (Cloudflare) vers le simulateur DGFiP.

5. **Gestion de l'historique :**
   Toute évolution du modèle de données de simulation (`SavedSimulation`) doit prévoir la rétrocompatibilité lors de la lecture du `localStorage` (gestion de champs optionnels avec valeurs par défaut).

6. **Cases PAS (prélèvement à la source) :**
   Les noms de cases à ne pas confondre : `8HV`/`8IV` = retenue à la source sur salaires et pensions (Déclarant 1 / 2), `8HW`/`8IW` = acomptes d'impôt, `8HX`/`8IX` = acomptes de prélèvements sociaux, `8HY`/`8IY` et `8HZ`/`8IZ` = régularisations. Le PAS déjà payé et les prélèvements sociaux de chaque conjoint ne sont **pas** recalculés à partir des cases : ils se lisent sur les trois simulations officielles (`alreadyPaid = IINETIR + PSNET − (IINET − IREST)`, `socialLevies = PSNET`). Les feuilles « solo » ramènent chaque case du Déclarant 2 à la case de référence du dictionnaire (`referenceCode`), jamais via une table codée en dur.

---

## 7. Mise à jour annuelle du dictionnaire des cases (`cerfa_variables_raw.json`)

Chaque millésime, la DGFiP ajoute, renomme ou retire des cases. Le dictionnaire `src/lib/cerfa_variables_raw.json` se régénère depuis le formulaire du simulateur officiel (`https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/<année>/complet/index.htm`). Le script reprend le notebook de [deuxpots](https://github.com/tbelhalfaoui/deuxpots) (`backend/build_cerfa_variables.ipynb`).

Quand ? Dès que la DGFiP ouvre le simulateur du nouveau millésime (début de la campagne déclarative, avril–mai) : `<année>` = année du simulateur (« impôt 2027 sur les revenus 2026 » → `2027`), la même que `calc-<année>.cgi`.

```bash
python3 -m venv .venv-cerfa && .venv-cerfa/bin/pip install requests beautifulsoup4 lxml   # une seule fois
.venv-cerfa/bin/python scripts/build_cerfa_variables.py 2027 --dry-run   # 1. aperçu : cases ajoutées / supprimées + avertissements
.venv-cerfa/bin/python scripts/build_cerfa_variables.py 2027             # 2. écrit src/lib/cerfa_variables_raw.json
npm test && npm run build                                                 # 3. vérifications
npm run check:simulator -- 2027                                           # 4. cohérence avec le vrai simulateur (réseau)
```

Points de contrôle à chaque mise à jour :
1. **Lire les avertissements `[warn]`** du script : `correction manuelle ignorée` (une case citée dans `manual_overrides()` a disparu ou changé de code → mettre à jour la liste), `groupe à vérifier` (des cases de même libellé dont l'attribution Déclarant 1/2 est ambiguë), `libellé remplacé par le nom du champ`.
2. **Relire le diff** (`git diff --stat`, puis les codes ajoutés/supprimés) : il doit correspondre aux nouveautés de la brochure pratique de la 2042. Une case supprimée qui figurait dans un ancien PDF ne sera plus reconnue ; une case ajoutée est immédiatement saisissable.
3. **Cases ajoutées à la main** (`MANUAL_VARIABLES` dans le script : état civil `0A*`, enfants `0C*`, `0DJ`, `0DN`) : absentes du formulaire détaillé, elles sont réinjectées à chaque exécution. Vérifier qu'elles existent toujours dans la 2042.
4. **Dictionnaires dérivés** : `ESSENTIAL_BOXES` (`cerfa-variables.ts`), `default-boxes.ts`, `pdf-parser.ts` et les tests référencent quelques codes en dur (1AJ/1BJ, 8HV/8IV, 0CF, 6NS/6PS, 4BA/4BL/8TK, 7GA/7GE…) : vérifier qu'ils existent encore.
5. **Relais et années** : `queryDgfipSimulator` essaie l'année courante, la précédente puis 2025 ; ajuster `years` si le calendrier DGFiP change. Penser à tester un cas réel de bout en bout (3 simulations : commun, D1 seul, D2 seul) et à contrôler que Σ(PAS solo) = PAS du foyer et Σ(restes à payer) = reste à payer du foyer.
6. **Erreur « case inconnue » du simulateur** : si le simulateur refuse un code, c'est qu'il n'existe plus dans le millésime visé → le retirer du dictionnaire.

