import React, { Suspense, lazy, useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Stepper } from "@/components/layout/Stepper";
import { DropzoneUpload } from "@/features/import/DropzoneUpload";
import { Footer } from "@/components/layout/Footer";
import { ErrorBanner } from "@/components/layout/ErrorBanner";
import { HistoryModal } from "@/features/history/HistoryModal";
import { SaveCopyDialog } from "@/features/history/SaveCopyDialog";
import { PDFParseResult, SimulationTripResponse, ValuedBox } from "@/lib/types";
import { runTaxSimulation } from "@/lib/simulation-service";
import { buildBlankBoxes, withPasBoxes } from "@/lib/default-boxes";
import {
  getSavedSimulations,
  saveSimulation,
  SavedSimulation,
} from "@/lib/history-storage";

const TaxCasesReview = lazy(() =>
  import("@/features/review/TaxCasesReview").then((m) => ({ default: m.TaxCasesReview }))
);
const ComparisonResults = lazy(() =>
  import("@/features/results/ComparisonResults").then((m) => ({ default: m.ComparisonResults }))
);

function StepFallback() {
  return (
    <div role="status" aria-live="polite" className="py-24 text-center text-sm text-muted-foreground">
      Chargement…
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [boxes, setBoxes] = useState<ValuedBox[]>([]);
  const [partner0Name, setPartner0Name] = useState("Déclarant 1");
  const [partner1Name, setPartner1Name] = useState("Déclarant 2");
  const [partner0ChildrenFraction, setPartner0ChildrenFraction] = useState<number>(0.5);
  const [partner0CommonFraction, setPartner0CommonFraction] = useState<number>(0.5);
  const [simulationData, setSimulationData] = useState<SimulationTripResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Historique local
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeSimulationId, setActiveSimulationId] = useState<string | undefined>(undefined);
  const [activeSimulationName, setActiveSimulationName] = useState<string | undefined>(undefined);

  // Dialog pour enregistrer une copie sous un nom spécifique
  const [saveCopyDialogOpen, setSaveCopyDialogOpen] = useState(false);

  // Après un changement d'étape, amène le lecteur d'écran et le clavier au contenu
  const isFirstStep = useRef(true);
  useEffect(() => {
    if (isFirstStep.current) {
      isFirstStep.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    document.getElementById("contenu")?.focus({ preventScroll: true });
  }, [step]);

  const reloadHistory = useCallback(() => {
    const list = getSavedSimulations();
    setSavedSimulations(list);
  }, []);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  // Détection du total d'enfants à partir des cases 0CF et 0CH
  const totalChildren = boxes
    .filter((b) => b.code === "0CF" || b.code === "0CH")
    .reduce((sum, b) => sum + (b.rawValue || 0), 0);

  // Détection des cases communes du foyer
  const commonBoxes = boxes.filter((b) => b.kind === "common" || b.kind === "child");
  const totalCommonAmount = commonBoxes
    .filter((b) => b.code !== "0CF" && b.code !== "0CH")
    .reduce((sum, b) => sum + (b.rawValue || 0), 0);

  // Étape 1 : Fichier PDF téléversé et analysé
  const handleParsed = (result: PDFParseResult) => {
    setActiveSimulationId(undefined);
    setActiveSimulationName(undefined);

    setBoxes(result.boxes.length === 0 ? buildBlankBoxes() : withPasBoxes(result.boxes));

    if (result.declarant1Name) {
      setPartner0Name(result.declarant1Name);
    }
    if (result.declarant2Name) {
      setPartner1Name(result.declarant2Name);
    }

    setStep(2);
  };

  // Étape 1 bis : Chargement de l'exemple type en 1 clic
  const handleLoadDemo = (demoBoxes: ValuedBox[]) => {
    setActiveSimulationId(undefined);
    setActiveSimulationName(undefined);
    setBoxes(demoBoxes);
    setPartner0Name("Alex");
    setPartner1Name("Camille");
    setPartner0ChildrenFraction(0.5);
    setPartner0CommonFraction(0.5);
    setStep(2);
  };

  // Mise à jour d'une case
  const handleUpdateBox = (id: string, updated: Partial<ValuedBox>) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
  };

  // Ajout d'une case
  const handleAddBox = (newBox: ValuedBox) => {
    setBoxes((prev) => [...prev, newBox]);
  };

  // Suppression d'une case
  const handleDeleteBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
  };

  // Lancement du calcul via le simulateur officiel de la DGFiP (relais /api/dgfip), sans calcul de remplacement
  const runSimulation = async (
    currentBoxes: ValuedBox[],
    targetSimId?: string,
    customName?: string
  ) => {
    setIsSimulating(true);
    setErrorMessage(null);

    try {
      const data = await runTaxSimulation({
        valboxes: currentBoxes,
        partner0Name,
        partner1Name,
      });

      setSimulationData(data);
      setStep(3);

      // Sauvegarde automatique ou mise à jour dans le localStorage
      const saved = saveSimulation({
        id: targetSimId ?? activeSimulationId,
        customName: customName ?? activeSimulationName,
        boxes: currentBoxes,
        partner0Name,
        partner1Name,
        partner0ChildrenFraction,
        partner0CommonFraction,
        simulationData: data,
      });

      setActiveSimulationId(saved.id);
      setActiveSimulationName(saved.name);
      reloadHistory();
    } catch (err: unknown) {
      console.error("Erreur de simulation:", err);
      const msg = err instanceof Error ? err.message : "Erreur inattendue.";
      setErrorMessage(msg);
    } finally {
      setIsSimulating(false);
    }
  };

  // Reprendre une simulation depuis l'historique
  const handleResumeSimulation = (sim: SavedSimulation, directToEdit = false) => {
    setBoxes(sim.boxes);
    setPartner0Name(sim.partner0Name);
    setPartner1Name(sim.partner1Name);
    setPartner0ChildrenFraction(sim.partner0ChildrenFraction ?? 0.5);
    setPartner0CommonFraction(sim.partner0CommonFraction ?? 0.5);
    setSimulationData(sim.simulationData);
    setActiveSimulationId(sim.id);
    setActiveSimulationName(sim.name);
    setErrorMessage(null);

    if (directToEdit) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  // Sauvegarder une copie avec un nouveau nom
  const handleConfirmSaveCopy = (name: string) => {
    if (!simulationData) return;
    const saved = saveSimulation({
      customName: name || undefined,
      boxes,
      partner0Name,
      partner1Name,
      partner0ChildrenFraction,
      partner0CommonFraction,
      simulationData,
    });
    setActiveSimulationId(saved.id);
    setActiveSimulationName(saved.name);
    reloadHistory();
  };

  // Ajustement dynamique du slider d'enfants avec recalcul immédiat
  const handleChildrenFractionChange = (newFraction: number) => {
    setPartner0ChildrenFraction(newFraction);

    const updatedBoxes = boxes.map((b) => {
      if (b.kind === "child" || b.code === "0CF" || b.code === "0CH" || b.code === "7GA") {
        return {
          ...b,
          attribution: 1 - newFraction,
        };
      }
      return b;
    });

    setBoxes(updatedBoxes);

    if (step === 3) {
      runSimulation(updatedBoxes, activeSimulationId);
    }
  };

  // Ajustement dynamique de la répartition des revenus et charges du foyer avec recalcul immédiat
  const handleCommonFractionChange = (newFraction: number) => {
    setPartner0CommonFraction(newFraction);

    const updatedBoxes = boxes.map((b) => {
      if (b.kind === "common" || b.kind === "child") {
        return {
          ...b,
          attribution: 1 - newFraction,
        };
      }
      return b;
    });

    setBoxes(updatedBoxes);

    if (step === 3) {
      runSimulation(updatedBoxes, activeSimulationId);
    }
  };

  const handleReset = () => {
    setStep(1);
    setBoxes([]);
    setSimulationData(null);
    setErrorMessage(null);
    setActiveSimulationId(undefined);
    setActiveSimulationName(undefined);
    setPartner0Name("Déclarant 1");
    setPartner1Name("Déclarant 2");
    setPartner0ChildrenFraction(0.5);
    setPartner0CommonFraction(0.5);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground brand-backdrop">
      <a href="#contenu" className="skip-link">
        Aller au contenu principal
      </a>
      <Header
        onReset={handleReset}
        canReset={step > 1}
        historyCount={savedSimulations.length}
        onOpenHistory={() => setHistoryModalOpen(true)}
      />

      <Stepper step={step} onStepChange={setStep} />

      {/* Contenu principal */}
      <main id="contenu" tabIndex={-1} className="flex-1 container max-w-[1140px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {errorMessage && <ErrorBanner message={errorMessage} />}

        <Suspense fallback={<StepFallback />}>
        {step === 1 && (
          <DropzoneUpload
            onParsed={handleParsed}
            onLoadDemo={handleLoadDemo}
            savedSimulations={savedSimulations}
            onResumeSimulation={handleResumeSimulation}
            onOpenHistory={() => setHistoryModalOpen(true)}
          />
        )}

        {step === 2 && (
          <TaxCasesReview
            boxes={boxes}
            partner0Name={partner0Name}
            partner1Name={partner1Name}
            onUpdatePartner0Name={setPartner0Name}
            onUpdatePartner1Name={setPartner1Name}
            onUpdateBox={handleUpdateBox}
            onAddBox={handleAddBox}
            onDeleteBox={handleDeleteBox}
            onSubmit={() => runSimulation(boxes, activeSimulationId)}
            isSimulating={isSimulating}
          />
        )}

        {step === 3 && simulationData && (
          <ComparisonResults
            together={simulationData.together}
            partner0={simulationData.partner0}
            partner1={simulationData.partner1}
            splits={simulationData.splits}
            partner0Name={partner0Name}
            partner1Name={partner1Name}
            totalChildren={totalChildren}
            partner0ChildrenFraction={partner0ChildrenFraction}
            onChildrenFractionChange={handleChildrenFractionChange}
            totalCommonAmount={totalCommonAmount}
            commonBoxesCount={commonBoxes.length}
            partner0CommonFraction={partner0CommonFraction}
            onCommonFractionChange={handleCommonFractionChange}
            onEditBoxes={() => setStep(2)}
            activeSimulationName={activeSimulationName}
            onSaveAsNew={() => setSaveCopyDialogOpen(true)}
            onOpenHistory={() => setHistoryModalOpen(true)}
            boxes={boxes}
          />
        )}
        </Suspense>
      </main>

      {/* Modal d'historique */}
      <HistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        simulations={savedSimulations}
        onReloadSimulations={reloadHistory}
        onResumeSimulation={handleResumeSimulation}
        activeSimulationId={activeSimulationId}
      />

      <SaveCopyDialog
        open={saveCopyDialogOpen}
        onOpenChange={setSaveCopyDialogOpen}
        defaultName={`${activeSimulationName || `Simulation ${partner0Name} & ${partner1Name}`} (copie)`}
        onConfirm={handleConfirmSaveCopy}
      />

      <Footer />
    </div>
  );
}
