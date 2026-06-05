import { ValuedBox } from "./types";

const PAS_CATEGORY = "Prélèvement à la source (PAS) & revenus étrangers";

const PAS_PARTNER_0: ValuedBox = {
  id: "add-8hv",
  code: "8HV",
  rawValue: 0,
  attribution: 0,
  description: "Prélèvement à la source déjà payé (retenue sur salaires et pensions) – Déclarant 1",
  kind: "partner_0",
  category: PAS_CATEGORY,
};

const PAS_PARTNER_1: ValuedBox = {
  id: "add-8iv",
  code: "8IV",
  rawValue: 0,
  attribution: 1,
  description: "Prélèvement à la source déjà payé (retenue sur salaires et pensions) – Déclarant 2",
  kind: "partner_1",
  category: PAS_CATEGORY,
};

/** Cases de départ quand aucun PDF exploitable n'a été lu : saisie manuelle. */
export function buildBlankBoxes(): ValuedBox[] {
  return [
    {
      id: "init-1aj",
      code: "1AJ",
      rawValue: 0,
      attribution: 0,
      description: "Salaires et assimilés – Déclarant 1",
      kind: "partner_0",
      category: "Traitements, salaires, pensions et rentes",
    },
    {
      id: "init-1bj",
      code: "1BJ",
      rawValue: 0,
      attribution: 1,
      description: "Salaires et assimilés – Déclarant 2",
      kind: "partner_1",
      category: "Traitements, salaires, pensions et rentes",
    },
    { ...PAS_PARTNER_0, id: "init-8hv" },
    { ...PAS_PARTNER_1, id: "init-8iv" },
    {
      id: "init-0cf",
      code: "0CF",
      rawValue: 0,
      attribution: 0.5,
      description: "Nombre d’enfants à charge (hors résidence alternée)",
      kind: "child",
      category: "Situation familiale & personnes à charge",
    },
  ];
}

/**
 * Ajoute les cases de prélèvement à la source absentes du PDF, pour que l'utilisateur puisse les renseigner.
 * Retenue sur salaires/pensions : 8HV (Déclarant 1) / 8IV (Déclarant 2) ; acomptes d'impôt : 8HW / 8IW.
 * (8HX / 8IX sont les acomptes de prélèvements sociaux, 8HY / 8IY les régularisations : pas des « PAS » à saisir ici.)
 */
export function withPasBoxes(boxes: ValuedBox[]): ValuedBox[] {
  const enriched = [...boxes];
  if (!enriched.some((b) => b.code === "8HV" || b.code === "8HW")) enriched.push(PAS_PARTNER_0);
  if (!enriched.some((b) => b.code === "8IV" || b.code === "8IW")) enriched.push(PAS_PARTNER_1);
  return enriched;
}
