import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  SavedSimulation,
  deleteSimulation,
  updateSimulationName,
  clearAllSimulations,
} from "@/lib/history-storage";
import { formatCurrency } from "@/lib/utils";
import { SimulationComparisonTable } from "@/features/history/SimulationComparisonTable";
import {
  History,
  Trash2,
  Play,
  Edit2,
  Check,
  X,
  Sparkles,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  GitCompare,
} from "lucide-react";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simulations: SavedSimulation[];
  onReloadSimulations: () => void;
  onResumeSimulation: (simulation: SavedSimulation, directToEdit?: boolean) => void;
  activeSimulationId?: string;
}

export function HistoryModal({
  open,
  onOpenChange,
  simulations,
  onReloadSimulations,
  onResumeSimulation,
  activeSimulationId,
}: HistoryModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current.slice(-1), id]
    );
  const selectedSimulations = simulations
    .filter((s) => selectedIds.includes(s.id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const startRename = (sim: SavedSimulation) => {
    setEditingId(sim.id);
    setEditingName(sim.name);
  };

  const saveRename = (id: string) => {
    if (editingName.trim()) {
      updateSimulationName(id, editingName.trim());
      onReloadSimulations();
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleDelete = (id: string) => {
    deleteSimulation(id);
    onReloadSimulations();
  };

  const handleClearAll = () => {
    clearAllSimulations();
    setConfirmClear(false);
    onReloadSimulations();
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0">
              <History className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="headline-md">Historique des simulations</DialogTitle>
              <DialogDescription className="text-xs">
                Enregistrées dans ce navigateur uniquement. Reprenez-en une pour la consulter ou la modifier.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Corps défilant */}
        <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-3">
          {comparing && selectedSimulations.length === 2 ? (
            <SimulationComparisonTable
              older={selectedSimulations[0]}
              newer={selectedSimulations[1]}
              onBack={() => setComparing(false)}
            />
          ) : simulations.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed text-muted-foreground space-y-3">
              <History className="h-10 w-10 mx-auto opacity-30" />
              <div className="font-medium text-sm text-foreground">
                Aucune simulation enregistrée pour l’instant
              </div>
              <p className="text-xs max-w-sm mx-auto">
                Chaque calcul est enregistré automatiquement ici : vous pourrez le reprendre et tester d’autres répartitions.
              </p>
            </div>
          ) : (
            simulations.map((sim) => {
              const isActive = sim.id === activeSimulationId;
              const isRenaming = editingId === sim.id;
              const dateStr = formatDate(sim.updatedAt || sim.createdAt);

              return (
                <div
                  key={sim.id}
                  className={`p-4 rounded-xl border transition-all duration-150 ${
                    isActive
                      ? "border-primary/40 bg-secondary/50"
                      : "bg-card hover:border-input"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                    {isRenaming ? (
                      <div className="flex items-center gap-1 flex-1 max-w-md">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(sim.id);
                            if (e.key === "Escape") cancelRename();
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gain"
                          onClick={() => saveRename(sim.id)}
                          aria-label="Valider le nouveau nom"
                          title="Valider"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={cancelRename}
                          aria-label="Annuler le renommage"
                          title="Annuler"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {sim.name}
                        </span>
                        {isActive && (
                          <Badge variant="default" className="text-[10px] py-0 px-1.5 h-4">
                            En cours
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100"
                          onClick={() => startRename(sim)}
                          aria-label={`Renommer « ${sim.name} »`}
                          title="Renommer la simulation"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(sim.id)}
                          onChange={() => toggleSelected(sim.id)}
                          aria-label={`Comparer « ${sim.name} »`}
                        />
                        Comparer
                      </label>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>

                  {/* Détails chiffrés */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 text-xs">
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="text-muted-foreground text-[10px] uppercase font-semibold">
                        Déclarants
                      </div>
                      <div className="font-medium truncate mt-0.5">
                        {sim.partner0Name} & {sim.partner1Name}
                      </div>
                    </div>

                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="text-muted-foreground text-[10px] uppercase font-semibold">
                        Impôt du foyer
                      </div>
                      <div className="font-mono font-bold text-foreground tabular-nums mt-0.5">
                        {formatCurrency(sim.summary.coupleTotalTax)}
                      </div>
                    </div>

                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="text-muted-foreground text-[10px] uppercase font-semibold">
                        Économie
                      </div>
                      <div className="font-mono font-bold text-gain tabular-nums mt-0.5">
                        {formatCurrency(Math.max(0, sim.summary.coupleGain))}
                      </div>
                    </div>

                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="text-muted-foreground text-[10px] uppercase font-semibold">
                        Contenu
                      </div>
                      <div className="font-medium mt-0.5">
                        {sim.boxes.length} case{sim.boxes.length > 1 ? "s" : ""}
                        {sim.summary.totalChildren > 0
                          ? ` · ${sim.summary.totalChildren} enfant${sim.summary.totalChildren > 1 ? "s" : ""}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(sim.id)}
                      className="text-destructive/80 hover:text-destructive hover:bg-destructive/10 h-8 px-2 gap-1 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Supprimer</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onResumeSimulation(sim, true);
                          onOpenChange(false);
                        }}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Modifier les cases</span>
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          onResumeSimulation(sim, false);
                          onOpenChange(false);
                        }}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Voir la répartition</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
          {simulations.length > 0 ? (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive font-medium">
                  Supprimer toutes les simulations ?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 text-xs"
                >
                  Oui, tout vider
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(false)}
                  className="h-7 text-xs"
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear(true)}
                className="text-muted-foreground hover:text-destructive text-xs h-8"
              >
                Vider l’historique
              </Button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {simulations.length >= 2 && (
              <Button
                variant="default"
                size="sm"
                disabled={selectedSimulations.length !== 2}
                onClick={() => setComparing(true)}
                className="text-xs h-8 gap-1.5"
                title="Cochez deux simulations pour les comparer"
              >
                <GitCompare className="h-3.5 w-3.5" />
                Comparer ({selectedSimulations.length}/2)
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Fermer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
