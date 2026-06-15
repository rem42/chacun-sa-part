import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Lock,
  Sparkles,
  AlertCircle,
  Loader2,
  History,
  ArrowRight,
  PenLine,
  Scale,
  HandCoins,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseTaxPdfClient } from "@/lib/pdf-parser";
import { PDFParseResult, ValuedBox } from "@/lib/types";
import { generateId, formatCurrency } from "@/lib/utils";
import { SavedSimulation } from "@/lib/history-storage";

interface DropzoneUploadProps {
  onParsed: (result: PDFParseResult) => void;
  onLoadDemo: (demoBoxes: ValuedBox[]) => void;
  savedSimulations?: SavedSimulation[];
  onResumeSimulation?: (simulation: SavedSimulation, directToEdit?: boolean) => void;
  onOpenHistory?: () => void;
}

export function DropzoneUpload({
  onParsed,
  onLoadDemo,
  savedSimulations = [],
  onResumeSimulation,
  onOpenHistory,
}: DropzoneUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setErrorMessage("Ce fichier n’est pas un PDF. Téléchargez votre déclaration ou votre avis depuis impots.gouv.fr au format PDF.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseTaxPdfClient(buffer);
      onParsed(result);
    } catch (err: unknown) {
      console.error("Erreur de parsing PDF:", err);
      setErrorMessage(
        "Impossible de lire ce PDF. Vérifiez qu’il s’agit d’une déclaration 2042 ou d’un avis de situation déclarative, non protégé par un mot de passe. Vous pouvez aussi saisir vos montants manuellement."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDemoClick = () => {
    // Cas type : couple aux revenus inégaux (48 000 € / 26 000 €), 2 enfants, PAS cohérent avec l'impôt du foyer
    const demoBoxes: ValuedBox[] = [
      {
        id: generateId(),
        code: "1AJ",
        rawValue: 48000,
        attribution: 0,
        description: "Salaires et assimilés – Déclarant 1",
        kind: "partner_0",
        category: "Traitements, salaires, pensions et rentes",
      },
      {
        id: generateId(),
        code: "1BJ",
        rawValue: 26000,
        attribution: 1,
        description: "Salaires et assimilés – Déclarant 2",
        kind: "partner_1",
        category: "Traitements, salaires, pensions et rentes",
      },
      {
        id: generateId(),
        code: "8HW",
        rawValue: 1850,
        attribution: 0,
        description: "Prélèvement à la source déjà payé – Déclarant 1",
        kind: "partner_0",
        category: "Prélèvement à la source (PAS) & revenus étrangers",
      },
      {
        id: generateId(),
        code: "8HX",
        rawValue: 250,
        attribution: 1,
        description: "Prélèvement à la source déjà payé – Déclarant 2",
        kind: "partner_1",
        category: "Prélèvement à la source (PAS) & revenus étrangers",
      },
      {
        id: generateId(),
        code: "0CF",
        rawValue: 2,
        attribution: 0.5,
        description: "Nombre d’enfants à charge (hors résidence alternée)",
        kind: "child",
        category: "Situation familiale & personnes à charge",
      },
      {
        id: generateId(),
        code: "7GA",
        rawValue: 2400,
        attribution: 0.5,
        description: "Frais de garde hors du domicile d’un enfant de moins de 6 ans",
        kind: "child",
        category: "Réductions et crédits d’impôt (dons, garde, emploi à domicile...)",
      },
      {
        id: generateId(),
        code: "7UD",
        rawValue: 300,
        attribution: 0.5,
        description: "Dons aux organismes d’aide aux personnes en difficulté (réduction de 75 %)",
        kind: "common",
        category: "Réductions et crédits d’impôt (dons, garde, emploi à domicile...)",
      },
    ];

    onLoadDemo(demoBoxes);
  };

  const openFilePicker = () => {
    if (!isLoading) fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10">
      {/* Accroche */}
      <section className="text-center space-y-5 pt-2 sm:pt-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-layer-1">
          <span className="flex -space-x-1" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-p0 ring-2 ring-card" />
            <span className="h-2.5 w-2.5 rounded-full bg-p1 ring-2 ring-card" />
          </span>
          Couples mariés ou pacsés · déclaration commune
        </p>
        <h1 className="display-hero text-foreground max-w-3xl mx-auto text-balance">
          Un seul impôt pour le foyer,{" "}
          <span className="italic text-p0">chacun</span>{" "}
          <span className="italic text-p1">sa part</span>.
        </h1>
        <p className="body-base text-muted-foreground max-w-2xl mx-auto text-pretty">
          L’administration envoie un seul avis d’impôt au couple. Découvrez combien chacun
          devrait réellement payer, selon la méthode de partage qui vous ressemble, et
          qui doit rembourser qui après le prélèvement à la source.
        </p>
      </section>

      {/* Historique récent si des simulations existent */}
      {savedSimulations.length > 0 && onResumeSimulation && (
        <section aria-label="Simulations récentes" className="p-4 rounded-2xl bg-card border shadow-layer-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-primary" />
              Reprendre une simulation
            </h2>
            {onOpenHistory && savedSimulations.length > 2 && (
              <Button variant="link" size="sm" onClick={onOpenHistory} className="text-xs h-7 px-0">
                Tout l’historique ({savedSimulations.length})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {savedSimulations.slice(0, 2).map((sim) => (
              <button
                type="button"
                key={sim.id}
                onClick={() => onResumeSimulation(sim, false)}
                className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border text-left transition-colors cursor-pointer"
              >
                <span className="min-w-0 space-y-0.5">
                  <span className="block font-medium text-sm truncate text-foreground">{sim.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    Impôt du foyer :{" "}
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {formatCurrency(sim.summary.coupleTotalTax)}
                    </span>
                    {sim.summary.coupleGain > 0 && (
                      <span className="text-gain font-medium tabular-nums">
                        {" "}· {formatCurrency(sim.summary.coupleGain)} économisés
                      </span>
                    )}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Zone de dépôt */}
      <section className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          aria-label="Importer votre déclaration ou avis de situation au format PDF"
          aria-busy={isLoading}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFilePicker();
            }
          }}
          className={`relative rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-ring/25 ${
            isDragging
              ? "border-p0 bg-p0/5 scale-[1.01]"
              : "border-input hover:border-primary/50 bg-card hover:bg-card/60"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
              e.target.value = "";
            }}
            accept=".pdf,application/pdf"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center px-6 py-10 sm:py-14 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-secondary text-primary flex items-center justify-center">
              {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <UploadCloud className="h-8 w-8" />}
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-lg text-foreground">
                {isLoading ? "Lecture du document…" : "Déposez votre déclaration PDF ici"}
              </p>
              <p className="text-sm text-muted-foreground">
                ou <span className="text-primary font-medium underline underline-offset-4">choisissez un fichier</span>
                {" "}— déclaration 2042 ou avis de situation déclarative
              </p>
            </div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gain/10 px-3 py-1 text-xs font-medium text-gain">
              <Lock className="h-3 w-3" />
              Le fichier est lu dans votre navigateur, il n’est jamais envoyé
            </p>
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="flex items-start gap-2 p-3 text-sm rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Alternatives : exemple ou saisie manuelle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDemoClick}
            className="group flex items-center gap-3 p-4 rounded-2xl bg-card border shadow-layer-1 text-left hover:border-primary/40 transition-colors cursor-pointer"
          >
            <span className="h-10 w-10 rounded-xl bg-owe/10 text-owe flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-foreground">Essayer avec un exemple</span>
              <span className="block text-xs text-muted-foreground">
                Alex et Camille : 48 000 € et 26 000 € de salaires, 2 enfants
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onParsed({ boxes: [], warnings: [], sourceType: "unknown" })}
            className="group flex items-center gap-3 p-4 rounded-2xl bg-card border shadow-layer-1 text-left hover:border-primary/40 transition-colors cursor-pointer"
          >
            <span className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
              <PenLine className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-foreground">Saisir mes montants</span>
              <span className="block text-xs text-muted-foreground">
                Sans fichier : salaires, prélèvement à la source, enfants…
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* Comment ça marche */}
      <section aria-labelledby="how-title" className="space-y-5">
        <h2 id="how-title" className="headline-md text-center text-foreground">Comment ça marche ?</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              icon: FileText,
              title: "Vos cases fiscales",
              text: "Les montants de votre déclaration commune sont repris case par case (1AJ, 1BJ, 8HW…).",
            },
            {
              icon: Scale,
              title: "Trois calculs officiels",
              text: "L’impôt du couple, puis celui de chacun comme s’il déclarait seul, via le simulateur de la DGFiP.",
            },
            {
              icon: HandCoins,
              title: "Votre répartition",
              text: "Choisissez une méthode de partage et obtenez le virement qui équilibre le prélèvement à la source.",
            },
          ].map((item, i) => (
            <li key={item.title} className="p-5 rounded-2xl bg-card border shadow-layer-1 space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-semibold text-primary/30 tabular-nums">{i + 1}</span>
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Confidentialité — formulation exacte de ce qui transite */}
      <section className="rounded-2xl border border-border bg-muted/40 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
        <div className="flex items-start gap-2.5">
          <Lock className="h-4 w-4 text-gain shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground font-semibold">PDF lu localement.</strong> Le document
            n’est jamais téléversé.
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Landmark className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground font-semibold">Montants seulement.</strong> Seules les
            valeurs des cases sont transmises au simulateur officiel de la DGFiP, sans être conservées.
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <History className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground font-semibold">Historique privé.</strong> Vos
            simulations sont enregistrées dans ce navigateur, nulle part ailleurs.
          </span>
        </div>
      </section>
    </div>
  );
}
