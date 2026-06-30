# Chacun Sa Part ⚖️

Application web moderne, rapide et respectueuse de la vie privée permettant à un couple (marié ou pacsé sous déclaration commune) de répartir équitablement leur impôt sur le revenu.

Inspirée de la démarche du projet open-source `deuxpots`.

---

## Fonctionnalités clés

- 🔒 **Confidentialité :** Le PDF est lu dans votre navigateur et n'est jamais envoyé. Seuls les montants nécessaires au calcul transitent par un relais technique (Cloudflare) vers le simulateur officiel de la DGFiP ; rien n'est conservé.
- 💾 **Historique des simulations (localStorage) :** Conservez vos différentes simulations directement dans votre navigateur, reprenez-les en 1 clic pour tester d'autres hypothèses et ajustez les montants à tout moment.
- 🏛️ **Simulateur officiel DGFiP uniquement :** barème, quotient familial, plafonnement, décote et prélèvement à la source calculés par le simulateur de l'État. S'il est indisponible, un message de maintenance s'affiche (aucun calcul de remplacement).
- 👨‍👩‍👧‍👦 **Curseur de répartition dynamique des enfants :** Ajustez librement l'attribution des parts d'enfants entre Déclarant 1 et Déclarant 2 pour les simulations isolées avec recalcul instantané.
- 📊 **4 modèles de répartition proposés :**
  1. **Partage 50/50 du gain fiscal (Recommandé) :** Chacun bénéficie de la moitié de l'économie globale générée par la déclaration commune.
  2. **Prorata des revenus nets :** Répartition proportionnelle aux revenus imposables respectifs.
  3. **Prorata de l'impôt isolé :** Répartition proportionnelle à ce que chacun aurait payé en étant célibataire.
  4. **Individualisé strict :** Application du barème isolé.
- 💳 **Bilan de régularisation financière :** Intègre les prélèvements à la source (PAS) déjà payés sur les fiches de paie (retenue sur salaires `8HV` / `8IV`, acomptes `8HW` / `8IW`, lus sur les simulations officielles) et calcule le virement d'équilibrage précis à effectuer entre conjoints (ex: *« Alex doit virer 750 € à Camille »*).
- 🧮 **Girardin industriel :** traité comme de l'impôt déjà payé par son porteur (réintégré à l'impôt du foyer, déduit de sa part, pris en compte dans son taux effectif).
- 🆚 **Comparaison de deux simulations :** dans l'historique, cochez deux simulations (par exemple deux années) pour voir l'évolution ligne à ligne.
- 🖨️ **Bilan imprimable :** bouton « Imprimer / PDF » (enregistrement en PDF via la boîte d'impression du navigateur).
- 📅 **Réglage du prélèvement à la source :** taux individualisé à demander à chacun pour que son PAS couvre sa part, avec estimation mensuelle.
- ⚡ **Mode Démo 1-clic :** Permet de tester immédiatement l'outil sans fichier PDF avec un couple type.

---

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer les tests unitaires et fiscaux
npm test

# Lancer le serveur de développement (Vite)
npm run dev

# Compiler pour la production
npm run build

# Prévisualiser la version de production
npm run preview          # SPA seule
npm run preview:pages    # SPA + Pages Function (wrangler)
```

Ouvrez [http://localhost:5173](http://localhost:3000) dans votre navigateur.

---

## Déploiement sur Cloudflare Pages

L'application est une SPA statique (`dist/`) hébergée sur **Cloudflare Pages**, avec une Pages Function (`functions/api/dgfip/[year].ts`) qui relaie les appels vers le simulateur DGFiP (pas de CORS côté DGFiP). La configuration est dans `wrangler.toml` (`pages_build_output_dir = "dist"`).

### Déploiement automatique (Git)

Dans le dashboard : *Workers & Pages → Create → Pages → Connect to Git*, puis :

| Réglage | Valeur |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Variable d'environnement | `NODE_VERSION` = `22` (ou plus récent) |

Chaque push sur la branche de production déclenche un build et un déploiement ; les autres branches produisent des préversions.

> ⚠️ Le projet doit être de type **Pages**. Si Cloudflare exécute `npx wrangler deploy` (projet créé comme Worker), le déploiement échoue avec `Missing entry-point to Worker script or to assets directory`, car `wrangler deploy` cible les Workers. Dans ce cas, soit la « deploy command » est remplacée par `npx wrangler pages deploy dist`, soit le projet est recréé en Pages.

### Déploiement manuel

```bash
npx wrangler login          # une seule fois
npm run deploy              # build + wrangler pages deploy dist
```

### Tester localement avec la vraie Pages Function

```bash
npm run preview:pages       # build + wrangler pages dev dist
```

En développement classique (`npm run dev`), c'est le proxy de Vite (`vite.config.ts`) qui joue le rôle du relais.

---

## Mise à jour annuelle des cases fiscales

Chaque année, la DGFiP ajoute, renomme ou retire des cases de la déclaration 2042. Le dictionnaire `src/lib/cerfa_variables_raw.json` se régénère depuis le formulaire du simulateur officiel avec `scripts/build_cerfa_variables.py` (adapté du notebook de [deuxpots](https://github.com/tbelhalfaoui/deuxpots)).

**Quand :** dès que le simulateur du nouveau millésime est en ligne (début de campagne, avril–mai). L'argument est l'année du simulateur : « impôt 2027 sur les revenus 2026 » → `2027`.

```bash
# Une seule fois : environnement Python dédié (ignoré par git)
python3 -m venv .venv-cerfa
.venv-cerfa/bin/pip install requests beautifulsoup4 lxml

# 1. Aperçu : cases ajoutées / supprimées et avertissements, sans rien écrire
.venv-cerfa/bin/python scripts/build_cerfa_variables.py 2027 --dry-run

# 2. Régénération de src/lib/cerfa_variables_raw.json
.venv-cerfa/bin/python scripts/build_cerfa_variables.py 2027

# 3. Vérifications (le 2e appelle le vrai simulateur : réseau requis)
npm test && npm run build
npm run check:simulator -- 2027
```

À contrôler après chaque régénération :

- les avertissements `[warn]` du script (`correction manuelle ignorée` : une case citée dans `manual_overrides()` a changé de code ; `groupe à vérifier` : attribution Déclarant 1 / 2 ambiguë) ;
- le diff des cases ajoutées / supprimées par rapport à la brochure pratique de la 2042 ;
- les cases ajoutées à la main dans `MANUAL_VARIABLES` (état civil `0A*`, enfants `0C*`) et celles citées en dur dans `default-boxes.ts`, `pdf-parser.ts` et les tests (1AJ/1BJ, 8HV/8IV, 0CF, 6NS/6PS…) : elles doivent exister dans le nouveau millésime ;
- `npm run check:simulator` : 7 foyers types (Girardin, enfants, frais de garde, crédits supérieurs à l'impôt, PER…) sont passés au vrai simulateur ; le script échoue si la somme des PAS « solo » ≠ PAS du foyer, ou si la somme des parts / des restes à payer ≠ impôt / reste à payer officiels.

Le détail de la procédure figure dans [`AGENTS.md`](AGENTS.md), section 7.


## Licence

[MIT](LICENSE) © 2026 Rémy BRUYERE
