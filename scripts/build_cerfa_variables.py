#!/usr/bin/env python3
"""
Régénère src/lib/cerfa_variables_raw.json à partir du formulaire du simulateur officiel de la DGFiP.

Adapté du notebook de https://github.com/tbelhalfaoui/deuxpots (backend/build_cerfa_variables.ipynb).

Usage (depuis la racine du dépôt) :
    python3 -m venv .venv-cerfa && .venv-cerfa/bin/pip install requests beautifulsoup4 lxml
    .venv-cerfa/bin/python scripts/build_cerfa_variables.py 2026            # écrit le fichier
    .venv-cerfa/bin/python scripts/build_cerfa_variables.py 2026 --dry-run  # affiche seulement le diff

L'année est celle du simulateur (« impôt 2026 sur les revenus 2025 » → 2026), la même que celle de
l'URL calc-<année>.cgi utilisée par le relais.
"""
import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "src/lib/cerfa_variables_raw.json"
FORM_URL = "https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/{year}/complet/index.htm"

BOXCODE_REGEX = re.compile(r"^[0-9A-Z]{2,3}$")
USE_TITLE_FOR = {"5VA", "7JP"}
ATTRIBUTION_FIELDS = {"Déclarant 1", "Déclarant 2", "Personne à charge", "1ère personne à charge", "2ème personne à charge"}
WHITESPACES = re.compile(r"\s+")


def clean_text(text):
    return WHITESPACES.sub(" ", text).strip().strip("-:– ")


def extract_boxes(soup):
    """Une entrée par <input> lié à une case : code, morceaux de description, type, attribution."""
    boxes = []
    missing_chunks = set()
    for field in soup.find_all("input", type=["text", "checkbox", "radio"]):
        labelled_by = field.get("aria-labelledby")
        if not labelled_by:
            continue
        ref_ids = labelled_by.split()
        if ref_ids[0] != "case":
            continue

        # 1. Code de la case
        field_title = clean_text(field["title"])
        if field_title in USE_TITLE_FOR:
            boxcode = field_title
        else:
            ref_ids.pop(0)
            ref_id_box = ref_ids.pop(0)
            boxcode_tag = field.find_previous(id=ref_id_box) or field.find_next(id=ref_id_box)
            boxcode = clean_text(boxcode_tag.text) if boxcode_tag else field_title
        if not boxcode:
            print(f"[warn] code introuvable : {labelled_by}", file=sys.stderr)
            continue
        if not BOXCODE_REGEX.match(boxcode):
            # Libellé qui n'est pas un code (ex. « 3VG au quotient ») : le nom du champ (« _3VG ») fait foi.
            fallback = field.get("name", "").lstrip("_")
            print(f"[warn] libellé « {boxcode} » remplacé par le nom du champ « {fallback} »", file=sys.stderr)
            boxcode = fallback

        # 2. Morceaux de description (titres de section + libellés référencés par aria-labelledby)
        if "pause" in ref_ids:
            ref_ids.remove("pause")
        section_tag = field.find_previous(lambda tag: tag.get("class") == ["bgCommonDarkPart"] and tag.find("strong"))
        section_text = clean_text(section_tag.text) if section_tag else ""
        chunks = []
        for i, ref_id in enumerate(ref_ids):
            ref_tag = field.find_previous(id=ref_id)
            if not ref_tag:  # libellé placé après la case : erreur du simulateur, on l'ignore
                missing_chunks.add(boxcode)
                continue
            ref_text = clean_text(ref_tag.text)
            if i == 0 and section_text and section_text != ref_text:
                chunks.append(section_text)
            chunks.append(ref_text)
        boxes.append({"code": boxcode, "description_chunks": chunks, "type": "int" if field["type"] == "text" else "bool"})

    for box in boxes:
        chunks = box["description_chunks"]
        box["attribution"] = chunks.pop() if chunks and chunks[-1] in ATTRIBUTION_FIELDS else None
    return boxes, missing_chunks


# Corrections manuelles des libellés / attributions que le simulateur étiquette mal.
# Chaque entrée est évaluée à la demande : si une case a disparu ou changé de code d'une année à l'autre,
# la correction est ignorée avec un avertissement au lieu de planter. À revoir à chaque millésime.
def manual_overrides(b):
    # Instantané des libellés d'origine : toutes les corrections se calculent sur ces valeurs, pas sur celles
    # déjà corrigées (sinon le préfixe de 6QS serait ajouté deux fois à 6QT, etc.).
    original = {code: list(box["description_chunks"]) for code, box in b.items()}

    def chunks(code):
        return original[code]

    def micro(code, label):  # insère le type de recettes avant le dernier morceau (micro-entreprise)
        return chunks(code)[:-1] + [label] + chunks(code)[-1:]

    sales, services = "Ventes de marchandises et assimilées", "Prestations de services et locations meublées"
    return [
        ("1AV", {"attribution": "Déclarant 1"}), ("1BV", {"attribution": "Déclarant 2"}),
        ("1CH", {"attribution": "1ère personne à charge"}), ("1DH", {"attribution": "2ème personne à charge"}),
        ("1BH", {"attribution": "Déclarant 2"}),
        ("5HH", lambda: {"description_chunks": chunks("5IH")}), ("5VJ", lambda: {"description_chunks": chunks("5UJ")}),
        ("8HV", {"attribution": "Déclarant 1"}), ("8HW", {"attribution": "Déclarant 1"}),
        ("8HX", {"attribution": "Déclarant 1"}), ("8HY", {"attribution": "Déclarant 1"}), ("8HZ", {"attribution": "Déclarant 1"}),
        ("8SI", {"attribution": "Déclarant 2"}), ("5UC", {"attribution": "Déclarant 2"}), ("5VC", {"attribution": "Personne à charge"}),
        *[(c, lambda: {"description_chunks": micro("5TA", sales)}) for c in ("5TA", "5UA", "5VA")],
        *[(c, lambda: {"description_chunks": micro("5TJ", sales)}) for c in ("5TJ", "5UJ", "5VJ")],
        *[(c, lambda: {"description_chunks": micro("5TB", services)}) for c in ("5TB", "5UB", "5VB")],
        *[(c, lambda: {"description_chunks": micro("5TK", services)}) for c in ("5TK", "5UK", "5VK")],
        *[(c, lambda: {"description_chunks": chunks("5AD") + chunks("5AF")}) for c in ("5AF", "5AI", "5AH")],
        *[(c, lambda: {"description_chunks": ["Autres cotisations déduites des BIC, BNC, BA, rémun. art 62 CGI ou salaires"] + chunks("6QS")})
          for c in ("6QS", "6QT", "6QU")],
        ("7WC", {"description_chunks": [
            "PROROGATION EN 2022 DE L'ENGAGEMENT DE LOCATION DANS LE SECTEUR INTERMÉDIAIRE",
            "Investissements en métropole et dans les DOM-COM", "Investissements achevés en 2013", "Investissements réalisés en 2013",
            "Investissement réalisé du 1.1 au 31.3.2013 avec contrat de réservation enregistré au plus tard le 31/12/2012"]}),
        *[(c, (lambda pct: lambda: {"description_chunks": chunks(c) + [pct]})(pct)) for c, pct in
          (("7BK", "15%"), ("7BL", "20%"), ("7BM", "35%"), ("7BN", "40%"), ("7BO", "65%"))],
        *[(c, (lambda n, h, s: lambda: {"description_chunks": chunks(c) + [h, s]})(c, h, s)) for c, h, s in
          (("7ZQ", "Dans l'habitation principale", "1er système"), ("7ZR", "Dans l'habitation principale", "2eme système"),
           ("7ZS", "Dans l'habitation secondaire", "1er système"), ("7ZT", "Dans l'habitation secondaire", "2eme système"))],
        *[(c, (lambda c, ref: lambda: {"description_chunks": chunks(c)[0:2] + chunks(ref)[-2:-1] + chunks(c)[2:]})(c, ref)) for c, ref in
          (("7TK", "7TJ"), ("7TO", "7TM"), ("7TQ", "7TP"), ("7TS", "7TR"))],
        ("5ZW", lambda: {"description_chunks": chunks("5XZ")}),
    ]


def apply_overrides(boxes):
    by_code = {b["code"]: b for b in boxes}
    computed = []
    for code, override in manual_overrides(by_code):
        try:
            computed.append((by_code[code], override() if callable(override) else override))
        except KeyError as missing:
            print(f"[warn] correction manuelle ignorée pour {code} (case {missing} absente du formulaire)", file=sys.stderr)
    for box, fields in computed:
        box.update(fields)


# Cases ajoutées à la main : absentes du formulaire détaillé (état civil, enfants) ou à ordre imposé.
# Dans `boxes`, le 1er code est celui du déclarant 1 (utilisé pour toute simulation « solo »), le 2ᵉ celui du déclarant 2.
MANUAL_VARIABLES = [
    {"boxes": ["0AP", "0AF"], "type": "bool", "description": "Titulaire d'une pension pour une invalidité d'au moins 40 % ou d'une carte d'invalidité d'au moins 80%"},
    {"boxes": ["0AW", "0AS"], "type": "bool", "description": "Vous êtes âgé de plus de 74 ans, vous êtes titulaire de la carte du combattant ou d'une pension militaire d'invalidité ou de victime de guerre"},
    {"boxes": ["0CF"], "type": "float", "description": "Nombre d'enfants à charge non mariés, qui ne sont pas en résidence alternée, de moins de 18 ans au 1er janvier de l'année de perception des revenus, ou nés durant la même année ou handicapés quel que soit leur âge"},
    {"boxes": ["0CG"], "type": "float", "description": "Nombre d'enfants qui ne sont pas en résidence alternée à charge titulaires de la carte d'invalidité."},
    {"boxes": ["0CH"], "type": "int", "description": "Nombre d'enfants à charge en résidence alternée, non mariés de moins de 18 ans au 1er janvier de l'année de perception des revenus, ou nés durant la même année ou handicapés quel que soit leur âge"},
    {"boxes": ["0CI"], "type": "int", "description": "Nombre d'enfants à charge en résidence alternée titulaires de la carte d'invalidité"},
    {"boxes": ["0CR"], "type": "int", "description": "Nombre de titulaires (autres que les enfants) de la carte invalidité d'au moins 80 %"},
    {"boxes": ["0DJ"], "type": "int", "description": "Nombre d'enfants majeurs célibataires sans enfant"},
    {"boxes": ["0DN"], "type": "int", "description": "Nombre d'enfants mariés/pacsés et d'enfants non mariés chargés de famille"},
    {"boxes": ["0AM"], "type": "bool", "description": "Marié·e"},
    {"boxes": ["0AO"], "type": "bool", "description": "Pacsé·e"},
    {"boxes": ["0AD"], "type": "bool", "description": "Divorcé·e/séparé·e"},
    {"boxes": ["0AC"], "type": "bool", "description": "Célibataire"},
    {"boxes": ["0AV"], "type": "bool", "description": "Veuf·ve"},
]

WORD_REPLACEMENTS = [
    ("dun", "d'un"), ("lemploi", "l'emploi"), ("marié", "marié·e"), ("mariés", "marié·e·s"), ("âgé", "âgé·e"), ("âgés", "âgé·e·s"),
    ("pacsé", "pacsé·e"), ("pacsés", "pacsé·e·s"), ("né", "né·e"), ("nés", "né·e·s"), ("majeurs", "majeur·e·s"),
    ("handicapé", "handicapé·e"), ("handicapés", "handicapé·e·s"), ("salariés", "salarié·e·s"), ("pensionnés", "pensionné·e·s"),
    ("un salarié", "un·e salarié·e"), ("dun salarié", "dun·e salarié·e"), ("inventeurs", "inventeur·euse·s"), ("auteurs", "auteur·ice·s"),
    ("demandeur", "demandeur·euse"), ("inscrit", "inscrit·e"), ("OGAou", "OGA ou"),
]


def group_into_variables(boxes):
    """Les cases de même libellé attribuées à Déclarant 1 / 2 / personnes à charge forment une variable (ordre = ordre du formulaire)."""
    pregrouped = defaultdict(list)
    for box in boxes:
        pregrouped[box["description"]].append(box)

    variables = []
    for description, group in pregrouped.items():
        attributed = [b for b in group if b["attribution"]]
        types = {b["type"] for b in group}
        suspicious = (
            len([b for b in group if b["attribution"] == "Déclarant 1"]) > 1
            or len([b for b in group if b["attribution"] == "Déclarant 2"]) > 1
            or len(attributed) not in (0, len(group))
            or (attributed and (group[0]["attribution"] != "Déclarant 1" or len(group) < 2 or group[1]["attribution"] != "Déclarant 2"))
            or len(types) != 1
        )
        if suspicious:
            print(f"[warn] groupe à vérifier : {description}", file=sys.stderr)
            for b in group:
                print(f"         {b['code']} {b['attribution']}", file=sys.stderr)
        var_type = sorted(types)[0]
        if attributed:
            variables.append({"boxes": [b["code"] for b in group], "description": description, "type": var_type})
        else:
            variables += [{"boxes": [b["code"]], "description": description, "type": var_type} for b in group]
    return variables


def prettify(variables):
    for var in variables:
        if not var["description"]:
            continue
        for lookup, repl in WORD_REPLACEMENTS:
            var["description"] = re.sub(r"\b%s\b" % lookup, repl, var["description"])
            var["description"] = re.sub(r"\b%s\b" % lookup.capitalize(), repl.capitalize(), var["description"])
        if not var["description"].endswith("."):
            var["description"] += "."


def codes_of(variables):
    return {code for var in variables for code in var["boxes"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("year", type=int, help="année du simulateur (ex. 2026 pour les revenus 2025)")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--dry-run", action="store_true", help="n'écrit rien, affiche seulement les cases ajoutées / supprimées")
    args = parser.parse_args()

    response = requests.get(FORM_URL.format(year=args.year), timeout=60)
    response.raise_for_status()
    # lxml est indispensable : html.parser perd ~30 % des champs de cette page. L'encodage (ISO-8859-15) est lu dans la balise <meta>.
    soup = BeautifulSoup(response.content, "lxml")

    boxes, missing_chunks = extract_boxes(soup)
    apply_overrides(boxes)
    for box in boxes:
        box["description"] = " - ".join(box["description_chunks"])
    for code in sorted(missing_chunks):
        print(f"[info] libellé partiellement introuvable : {code} → {next(b['description'] for b in boxes if b['code'] == code)}", file=sys.stderr)
    for box in boxes:
        if len(box["description_chunks"]) <= 1:
            print(f"[info] libellé très court : {box['code']} → {box['description']}", file=sys.stderr)

    form_names = {f["name"].lstrip("_") for f in soup.find_all("input", type=["text", "checkbox", "radio"])
                  if (f.get("aria-labelledby") or "").startswith("case") and f.get("name")}
    unknown = sorted({b["code"] for b in boxes} - form_names)
    if unknown:
        print(f"[warn] codes extraits qui ne sont pas des champs du formulaire : {' '.join(unknown)}", file=sys.stderr)

    variables = group_into_variables(boxes) + MANUAL_VARIABLES
    prettify(variables)

    previous = json.loads(args.out.read_text(encoding="utf-8")) if args.out.exists() else []
    added, removed = sorted(codes_of(variables) - codes_of(previous)), sorted(codes_of(previous) - codes_of(variables))
    print(f"Simulateur {args.year} : {len(codes_of(variables))} cases ({len(variables)} variables)")
    print(f"  + {len(added)} nouvelles : {' '.join(added)}")
    print(f"  - {len(removed)} supprimées : {' '.join(removed)}")

    if not args.dry_run:
        args.out.write_text(json.dumps(variables, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
        print(f"Écrit : {args.out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
