import { useEffect, useState } from "react";
import { BookmarkPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SaveCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onConfirm: (name: string) => void;
}

export function SaveCopyDialog({ open, onOpenChange, defaultName, onConfirm }: SaveCopyDialogProps) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  const confirm = () => {
    onConfirm(name.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-5 w-5 text-primary" aria-hidden />
            <span>Enregistrer une copie</span>
          </DialogTitle>
          <DialogDescription>
            Donnez-lui un nom pour la retrouver facilement dans l’historique.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label htmlFor="save-copy-name" className="sr-only">
            Nom de la copie
          </label>
          <Input
            id="save-copy-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. : hypothèse avec frais réels"
            className="w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") confirm();
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={confirm}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
