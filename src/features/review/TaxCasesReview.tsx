import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Users,
  ArrowRight,
  Search,
  RotateCcw,
  X,
  Info,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ValuedBox, BoxKind, CerfaBoxDefinition } from "@/lib/types";
import {
  searchBoxes,
  getAllCategories,
  getDefaultAttribution,
  getCategoryForCode,
} from "@/lib/cerfa-variables";
import { generateId, formatCurrency } from "@/lib/utils";
import { TONES, Tone } from "@/lib/tones";

interface TaxCasesReviewProps {
  boxes: ValuedBox[];
  partner0Name: string;
  partner1Name: string;
  onUpdatePartner0Name: (name: string) => void;
  onUpdatePartner1Name: (name: string) => void;
  onUpdateBox: (id: string, updated: Partial<ValuedBox>) => void;
  onAddBox: (newBox: ValuedBox) => void;
  onDeleteBox: (id: string) => void;
  onSubmit: () => void;
  isSimulating: boolean;
}

export function TaxCasesReview({
  boxes,
  partner0Name,
  partner1Name,
  onUpdatePartner0Name,
  onUpdatePartner1Name,
  onUpdateBox,
  onAddBox,
  onDeleteBox,
  onSubmit,
  isSimulating,
}: TaxCasesReviewProps) {
  // Modal d'ajout de case
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<BoxKind>("partner_0");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [displayLimit, setDisplayLimit] = useState(40);

  // Années de naissance (0DA / 0DB) : saisies à part, elles ne sont pas des montants
  const isBirthYearBox = (code: string) => code === "0DA" || code === "0DB";
  const birthYearOf = (code: string) => boxes.find((b) => b.code === code)?.rawValue || 0;
  const handleBirthYearChange = (code: "0DA" | "0DB", raw: string) => {
    const year = parseInt(raw.replace(/\D/g, "").slice(0, 4), 10) || 0;
    const existing = boxes.find((b) => b.code === code);
    if (existing) {
      onUpdateBox(existing.id, { rawValue: year });
    } else if (year > 0) {
      const kind: BoxKind = code === "0DA" ? "partner_0" : "partner_1";
      onAddBox({
        id: generateId(),
        code,
        rawValue: year,
        attribution: getDefaultAttribution(kind),
        description: `Année de naissance – ${code === "0DA" ? "Déclarant 1" : "Déclarant 2"}`,
        kind,
        category: getCategoryForCode(code),
      });
    }
  };

  // Filtrage des cases par déclarant / foyer
  const p0Boxes = boxes.filter((b) => b.kind === "partner_0" && !isBirthYearBox(b.code));
  const p1Boxes = boxes.filter((b) => b.kind === "partner_1" && !isBirthYearBox(b.code));
  const commonBoxes = boxes.filter(
    (b) => (b.kind === "common" || b.kind === "child") && !isBirthYearBox(b.code)
  );

  // Totaux calculés pour affichage
  const isCountBox = (code: string) => code === "0CF" || code === "0CH";

  const totalP0 = p0Boxes
    .filter((b) => !isCountBox(b.code))
    .reduce((sum, b) => sum + (b.rawValue || 0), 0);

  const totalP1 = p1Boxes
    .filter((b) => !isCountBox(b.code))
    .reduce((sum, b) => sum + (b.rawValue || 0), 0);

  const totalCommon = commonBoxes
    .filter((b) => !isCountBox(b.code))
    .reduce((sum, b) => sum + (b.rawValue || 0), 0);

  const totalCommonD0 = commonBoxes
    .filter((b) => !isCountBox(b.code))
    .reduce(
      (sum, b) => sum + Math.round((b.rawValue || 0) * (1 - (b.attribution ?? 0.5))),
      0
    );

  const totalCommonD1 = commonBoxes
    .filter((b) => !isCountBox(b.code))
    .reduce(
      (sum, b) => sum + Math.round((b.rawValue || 0) * (b.attribution ?? 0.5)),
      0
    );

  // Catégories disponibles pour le filtre
  const allCategories = useMemo(() => getAllCategories(), []);

  // Recherche parmi toutes les cases
  const filteredBoxes = useMemo(() => {
    return searchBoxes(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const displayedBoxes = useMemo(() => {
    return filteredBoxes.slice(0, displayLimit);
  }, [filteredBoxes, displayLimit]);

  // Ouverture de la modale avec pré-sélection
  const openAddDialog = (kind: BoxKind) => {
    setTargetCategory(kind);
    setSearchQuery("");
    setSelectedCategory("ALL");
    setDisplayLimit(40);
    setIsAddingOpen(true);
  };

  // Ajout de la case sélectionnée
  const handleSelectBox = (
    code: string,
    description: string,
    kind: BoxKind,
    category?: string
  ) => {
    const boxCategory = category || getCategoryForCode(code);
    const newBox: ValuedBox = {
      id: generateId(),
      code,
      rawValue: 0,
      attribution: getDefaultAttribution(kind),
      description,
      kind,
      category: boxCategory,
    };
    onAddBox(newBox);
    setIsAddingOpen(false);
  };

  // Gestion de la répartition numéraire (€) pour les cases communes
  const handleCommonTotalChange = (b: ValuedBox, newTotal: number) => {
    const safeTotal = Math.max(0, newTotal);
    onUpdateBox(b.id, { rawValue: safeTotal });
  };

  const handleCommonD0Change = (b: ValuedBox, newD0: number) => {
    const safeD0 = Math.max(0, newD0);
    if (b.rawValue > 0) {
      if (safeD0 <= b.rawValue) {
        const newAttribution = (b.rawValue - safeD0) / b.rawValue;
        onUpdateBox(b.id, {
          attribution: Math.max(0, Math.min(1, newAttribution)),
        });
      } else {
        const currentD1 = Math.round(b.rawValue * (b.attribution ?? 0.5));
        const newTotal = safeD0 + currentD1;
        const newAttribution = newTotal > 0 ? currentD1 / newTotal : 0;
        onUpdateBox(b.id, { rawValue: newTotal, attribution: newAttribution });
      }
    } else {
      onUpdateBox(b.id, { rawValue: safeD0, attribution: 0 });
    }
  };

  const handleCommonD1Change = (b: ValuedBox, newD1: number) => {
    const safeD1 = Math.max(0, newD1);
    if (b.rawValue > 0) {
      if (safeD1 <= b.rawValue) {
        const newAttribution = safeD1 / b.rawValue;
        onUpdateBox(b.id, {
          attribution: Math.max(0, Math.min(1, newAttribution)),
        });
      } else {
        const currentD0 = Math.round(b.rawValue * (1 - (b.attribution ?? 0.5)));
        const newTotal = currentD0 + safeD1;
        const newAttribution = newTotal > 0 ? safeD1 / newTotal : 1;
        onUpdateBox(b.id, { rawValue: newTotal, attribution: newAttribution });
      }
    } else {
      onUpdateBox(b.id, { rawValue: safeD1, attribution: 1 });
    }
  };

  const handlePresetSplit = (
    b: ValuedBox,
    preset: "50-50" | "100-0" | "0-100"
  ) => {
    if (preset === "50-50") {
      onUpdateBox(b.id, { attribution: 0.5 });
    } else if (preset === "100-0") {
      onUpdateBox(b.id, { attribution: 0 });
    } else if (preset === "0-100") {
      onUpdateBox(b.id, { attribution: 1 });
    }
  };

  const handleResetAllCommonTo5050 = () => {
    commonBoxes.forEach((b) => {
      onUpdateBox(b.id, { attribution: 0.5 });
    });
  };

  // Changement rapide d'affectation d'une case entre D1, D2 et Foyer
  const handleReassignBox = (id: string, newKind: BoxKind) => {
    onUpdateBox(id, {
      kind: newKind,
      attribution: getDefaultAttribution(newKind),
    });
  };

  const hasPas = boxes.some((b) => ["8HW", "8HX", "8HV", "8IV"].includes(b.code) && b.rawValue > 0);

  const renderMoveControl = (b: ValuedBox) => {
    const options: { kind: BoxKind; label: string; tone: Tone }[] = [
      { kind: "partner_0", label: partner0Name, tone: "p0" },
      { kind: "partner_1", label: partner1Name, tone: "p1" },
      { kind: "common", label: "Foyer", tone: "household" },
    ];
    const currentKind: BoxKind = b.kind === "child" ? "common" : b.kind;
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] text-muted-foreground shrink-0">Concerne :</span>
        <div role="group" aria-label={`Rattacher la case ${b.code}`} className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg min-w-0">
          {options.map((o) => {
            const active = currentKind === o.kind;
            return (
              <button
                key={o.kind}
                type="button"
                aria-pressed={active}
                onClick={() => !active && handleReassignBox(b.id, o.kind)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium truncate max-w-[110px] transition-colors ${
                  active
                    ? `${TONES[o.tone].solid} shadow-xs cursor-default`
                    : "text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
                }`}
                title={active ? undefined : `Rattacher à ${o.kind === "common" ? "l’ensemble du foyer" : o.label}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPartnerColumn = (
    tone: "p0" | "p1",
    kind: "partner_0" | "partner_1",
    name: string,
    label: string,
    columnBoxes: ValuedBox[],
    total: number,
    emptyHint: string
  ) => {
    const t = TONES[tone];
    return (
      <Card className={`flex flex-col overflow-hidden border-t-4 ${tone === "p0" ? "border-t-p0" : "border-t-p1"}`}>
        <CardHeader className="p-5 pb-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 rounded-full ${t.solid} flex items-center justify-center font-display text-lg font-semibold shrink-0`}>
                {(name.trim()[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate">{name}</h3>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] text-muted-foreground">
                {columnBoxes.length} case{columnBoxes.length > 1 ? "s" : ""}
              </div>
              {total > 0 && (
                <div className={`font-mono text-sm font-bold tabular-nums ${t.text}`}>{formatCurrency(total)}</div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-4 sm:p-5 space-y-3">
          {columnBoxes.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed text-muted-foreground text-xs space-y-1">
              <p className="font-medium text-foreground/80">Aucune case pour {name}.</p>
              <p>{emptyHint}</p>
            </div>
          ) : (
            columnBoxes.map((b) => (
              <div key={b.id} className="p-3.5 rounded-xl border bg-card hover:border-input transition-colors space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Badge variant="cerfa" className="shrink-0 mt-px">{b.code}</Badge>
                    <p className="text-[13px] text-foreground leading-snug">{b.description}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onDeleteBox(b.id)}
                    aria-label={`Supprimer la case ${b.code}`}
                    title="Supprimer cette case"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {renderMoveControl(b)}
                  <div className="relative w-36 ml-auto">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      aria-label={`Montant de la case ${b.code} pour ${name}`}
                      value={b.rawValue !== undefined && b.rawValue !== 0 ? b.rawValue : ""}
                      onChange={(e) => onUpdateBox(b.id, { rawValue: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-sm text-right font-mono font-bold tabular-nums pr-7"
                      placeholder="0"
                    />
                    <span className="absolute right-2.5 top-2 text-sm text-muted-foreground pointer-events-none">€</span>
                  </div>
                </div>
              </div>
            ))
          )}

          <Button
            variant="outline"
            size="sm"
            className={`w-full gap-1.5 h-10 border-dashed shadow-none ${t.hoverBorder}`}
            onClick={() => openAddDialog(kind)}
          >
            <Plus className="h-4 w-4" />
            Ajouter une case pour {name}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-[1140px] mx-auto space-y-6 sm:space-y-8">
      {/* 1. En-tête & prénoms des conjoints */}
      <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <h2 className="headline-lg text-foreground">Vérifiez vos cases fiscales</h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Chaque montant est rattaché au déclarant concerné. Les revenus et charges du foyer
            se répartissent entre vous deux, directement en euros.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {([
            { tone: "p0" as const, label: "Déclarant 1", value: partner0Name, onChange: onUpdatePartner0Name, birthCode: "0DA" as const },
            { tone: "p1" as const, label: "Déclarant 2", value: partner1Name, onChange: onUpdatePartner1Name, birthCode: "0DB" as const },
          ]).map((f) => (
            <label key={f.label} className={`flex items-center gap-2.5 pl-3 pr-1.5 py-1.5 rounded-xl border bg-card ${TONES[f.tone].border}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${TONES[f.tone].dot} shrink-0`} aria-hidden />
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{f.label}</span>
              <Input
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                placeholder="Prénom"
                className="h-8 w-full sm:w-32 text-sm font-semibold border-transparent bg-muted/60 focus-visible:bg-card"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">né(e) en</span>
              <Input
                value={birthYearOf(f.birthCode) || ""}
                onChange={(e) => handleBirthYearChange(f.birthCode, e.target.value)}
                inputMode="numeric"
                placeholder="1985"
                aria-label={`Année de naissance de ${f.value || f.label} (modifie l’abattement lié à l’âge)`}
                className="h-8 w-20 text-sm font-semibold border-transparent bg-muted/60 focus-visible:bg-card"
              />
            </label>
          ))}
        </div>
      </section>

      {/* 2. Deux colonnes : Déclarant 1 et Déclarant 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {renderPartnerColumn(
          "p0",
          "partner_0",
          partner0Name,
          "Déclarant 1 · revenus et charges personnels",
          p0Boxes,
          totalP0,
          "Ajoutez ses salaires (1AJ), ses frais réels (1AK) ou son prélèvement à la source (8HV)."
        )}
        {renderPartnerColumn(
          "p1",
          "partner_1",
          partner1Name,
          "Déclarant 2 · revenus et charges personnels",
          p1Boxes,
          totalP1,
          "Ajoutez ses salaires (1BJ), ses frais réels (1BK) ou son prélèvement à la source (8IV)."
        )}
      </div>

      {/* 3. Revenus & charges du foyer */}
      <Card className="overflow-hidden border-t-4 border-t-household">
        <CardHeader className="p-5 pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-household/10 text-household flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Revenus et charges du foyer</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenus fonciers, placements, enfants à charge, dons, réductions et crédits d’impôt communs.
                </p>
              </div>
            </div>
            {totalCommon > 0 && (
              <div className="text-right shrink-0 self-end sm:self-auto">
                <div className="text-[11px] text-muted-foreground">
                  {commonBoxes.length} case{commonBoxes.length > 1 ? "s" : ""}
                </div>
                <div className="font-mono text-sm font-bold tabular-nums text-household">{formatCurrency(totalCommon)}</div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {commonBoxes.length > 0 && totalCommon > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-household/5 border border-household/15">
              <div className="flex-1 w-full space-y-1.5">
                <div className="flex justify-between text-xs font-semibold tabular-nums">
                  <span className="text-p0">{partner0Name} · {formatCurrency(totalCommonD0)}</span>
                  <span className="text-p1">{partner1Name} · {formatCurrency(totalCommonD1)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex bg-muted" aria-hidden>
                  <div className="bg-p0 transition-all duration-300" style={{ width: `${(totalCommonD0 / Math.max(1, totalCommonD0 + totalCommonD1)) * 100}%` }} />
                  <div className="bg-p1 flex-1 transition-all duration-300" />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 self-end sm:self-auto shrink-0"
                onClick={handleResetAllCommonTo5050}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Tout remettre à 50 / 50
              </Button>
            </div>
          )}

          {commonBoxes.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed text-muted-foreground text-xs space-y-1">
              <p className="font-medium text-foreground/80">Aucun revenu ni charge commune.</p>
              <p>Enfants à charge, revenus fonciers, dons, emploi à domicile… ajoutez-les ici.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commonBoxes.map((b) => {
                const isChild = isCountBox(b.code);
                const totalVal = b.rawValue || 0;
                const d0Fraction = 1 - (b.attribution ?? 0.5);
                const d0Val = Math.round(totalVal * d0Fraction);
                const d1Val = totalVal - d0Val;
                const unit = isChild ? "enf." : "€";
                const p0Pct = Math.round(d0Fraction * 100);

                return (
                  <div key={b.id} className="p-4 rounded-xl border bg-card hover:border-input transition-colors space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Badge variant="cerfa" className="shrink-0 mt-px">{b.code}</Badge>
                        <div className="min-w-0">
                          <p className="text-[13px] text-foreground leading-snug">{b.description}</p>
                          {b.category && <p className="text-[11px] text-muted-foreground mt-0.5">{b.category}</p>}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => onDeleteBox(b.id)}
                        aria-label={`Supprimer la case ${b.code}`}
                        title="Supprimer cette case"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label htmlFor={`total-${b.id}`} className="text-[11px] font-semibold text-muted-foreground block">
                          {isChild ? "Nombre total" : "Montant total"}
                        </label>
                        <div className="relative">
                          <Input
                            id={`total-${b.id}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={b.rawValue !== undefined ? b.rawValue : ""}
                            onChange={(e) => handleCommonTotalChange(b, parseFloat(e.target.value) || 0)}
                            className="h-9 text-sm font-mono font-bold tabular-nums text-right pr-10"
                            placeholder="0"
                          />
                          <span className="absolute right-2.5 top-2 text-sm text-muted-foreground pointer-events-none">{unit}</span>
                        </div>
                      </div>

                      {([
                        { tone: "p0" as const, name: partner0Name, val: d0Val, pct: p0Pct, onChange: (v: number) => handleCommonD0Change(b, v) },
                        { tone: "p1" as const, name: partner1Name, val: d1Val, pct: 100 - p0Pct, onChange: (v: number) => handleCommonD1Change(b, v) },
                      ]).map((part) => (
                        <div key={part.tone} className="space-y-1">
                          <label htmlFor={`${part.tone}-${b.id}`} className={`flex items-center justify-between gap-2 text-[11px] font-semibold ${TONES[part.tone].text}`}>
                            <span className="truncate">Part de {part.name}</span>
                            {totalVal > 0 && <span className="font-normal text-muted-foreground tabular-nums">{part.pct} %</span>}
                          </label>
                          <div className="relative">
                            <Input
                              id={`${part.tone}-${b.id}`}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              value={part.val}
                              onChange={(e) => part.onChange(parseFloat(e.target.value) || 0)}
                              className={`h-9 text-sm font-mono font-bold tabular-nums text-right pr-10 ${TONES[part.tone].border}`}
                              placeholder="0"
                            />
                            <span className="absolute right-2.5 top-2 text-sm text-muted-foreground pointer-events-none">{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {renderMoveControl(b)}
                      <div role="group" aria-label="Répartition rapide" className="flex items-center gap-1">
                        {([
                          { preset: "100-0" as const, label: `100 % ${partner0Name}`, active: p0Pct === 100 },
                          { preset: "50-50" as const, label: "50 / 50", active: p0Pct === 50 },
                          { preset: "0-100" as const, label: `100 % ${partner1Name}`, active: p0Pct === 0 },
                        ]).map((o) => (
                          <button
                            key={o.preset}
                            type="button"
                            aria-pressed={o.active}
                            onClick={() => handlePresetSplit(b, o.preset)}
                            className={`h-6 px-2 rounded-md text-[11px] font-medium border transition-colors truncate max-w-[130px] cursor-pointer ${
                              o.active
                                ? "bg-household/10 border-household/40 text-household"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-input"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className={`w-full gap-1.5 h-10 border-dashed shadow-none ${TONES.household.hoverBorder}`}
            onClick={() => openAddDialog("common")}
          >
            <Plus className="h-4 w-4" />
            Ajouter un revenu ou une charge du foyer
          </Button>
        </CardContent>
      </Card>

      {/* 4. Modal / Dialog d'ajout de case Cerfa (Toutes les cases + Recherche + Liste 1 colonne) */}
      <Dialog open={isAddingOpen} onOpenChange={setIsAddingOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="headline-md pr-8">Ajouter une case fiscale</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Cherchez par code (1AJ, 7UD…) ou par mot-clé parmi toutes les cases de la déclaration.
            </DialogDescription>
          </DialogHeader>

          {/* Choix du bénéficiaire de la case */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-muted-foreground block">
              Cette case concerne :
            </span>
            <div role="radiogroup" aria-label="Rattachement de la case" className="grid grid-cols-3 gap-2">
              {([
                { kind: "partner_0" as BoxKind, label: partner0Name, tone: "p0" as Tone },
                { kind: "partner_1" as BoxKind, label: partner1Name, tone: "p1" as Tone },
                { kind: "common" as BoxKind, label: "Le foyer", tone: "household" as Tone },
              ]).map((o) => {
                const active = targetCategory === o.kind;
                return (
                  <button
                    key={o.kind}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTargetCategory(o.kind)}
                    className={`h-9 px-2 rounded-lg text-xs font-semibold border truncate transition-colors cursor-pointer ${
                      active ? `${TONES[o.tone].solid} border-transparent` : "border-input bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtres de recherche & catégories */}
          <div className="space-y-2.5 pt-2">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Barre de recherche avec icône */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDisplayLimit(40);
                  }}
                  placeholder="Code ou mot-clé : 1AJ, loyers, dons…"
                  aria-label="Rechercher une case"
                  className="pl-9 pr-8 text-xs h-9"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Effacer la recherche"
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Sélecteur de catégorie traduite */}
              <div className="w-full sm:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setDisplayLimit(40);
                  }}
                  aria-label="Filtrer par rubrique"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  <option value="ALL">Toutes les rubriques ({filteredBoxes.length})</option>
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compteur de résultats */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>
                {filteredBoxes.length} case{filteredBoxes.length > 1 ? "s" : ""} trouvée{filteredBoxes.length > 1 ? "s" : ""}
                {selectedCategory !== "ALL" && ` dans « ${selectedCategory} »`}
              </span>
            </div>
          </div>

          {/* RÉSULTAT EN MODE LISTE À UNE SEULE COLONNE */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[46vh] pr-1 pt-1">
            {displayedBoxes.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed text-muted-foreground text-xs space-y-2">
                <p>Aucune case ne correspond à votre recherche.</p>
                <p className="text-[11px]">Essayez un autre code ou mot-clé, ou choisissez « Toutes les rubriques ».</p>
              </div>
            ) : (
              displayedBoxes.map((def: CerfaBoxDefinition) => (
                <div
                  key={def.code}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card hover:border-primary/60 hover:bg-muted/30 transition-all text-left group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Badge variant="cerfa" className="shrink-0 self-start mt-0.5">
                      {def.code}
                    </Badge>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {def.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                            {def.category}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          {def.type === "bool"
                            ? "Case à cocher"
                            : def.type === "float"
                            ? "Nombre"
                            : "Montant en €"}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 text-xs h-8 shrink-0 self-end sm:self-center"
                    onClick={() =>
                      handleSelectBox(
                        def.code,
                        def.description,
                        targetCategory,
                        def.category
                      )
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Ajouter</span>
                  </Button>
                </div>
              ))
            )}

            {/* Bouton de chargement progressif si grand nombre de résultats */}
            {filteredBoxes.length > displayLimit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground h-9 my-1"
                onClick={() => setDisplayLimit((prev) => prev + 40)}
              >
                Afficher plus de résultats ({filteredBoxes.length - displayLimit} restants)
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Validation finale & lancement de la simulation (collée en bas d'écran) */}
      <div className="sticky bottom-3 z-30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card/95 backdrop-blur border shadow-layer-2">
        <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
          {hasPas ? (
            <>
              <Info className="h-4 w-4 text-primary shrink-0 mt-px" />
              <span>Le calcul interroge le simulateur officiel de la DGFiP ; comptez quelques secondes.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-owe shrink-0 mt-px" />
              <span>
                Aucun prélèvement à la source renseigné (8HW, 8HX…) : le virement d’équilibrage ne pourra pas être calculé.
              </span>
            </>
          )}
        </div>

        <Button
          onClick={onSubmit}
          disabled={isSimulating}
          size="lg"
          className="gap-2 w-full sm:w-auto shrink-0"
        >
          {isSimulating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Calcul en cours…</span>
            </>
          ) : (
            <>
              <span>Calculer la répartition</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
