"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, RotateCcw } from "lucide-react";

type FormRestoreModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onStartFresh: () => void;
  stepNumber?: number;
};

export function FormRestoreModal({
  open,
  onOpenChange,
  onContinue,
  onStartFresh,
  stepNumber,
}: FormRestoreModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-700 bg-zinc-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Resume Your Registration?
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {stepNumber ? (
              <>
                We found your saved progress from step {stepNumber}. Would you like to
                continue where you left off, or start fresh?
              </>
            ) : (
              <>
                We found your saved progress. Would you like to continue where you left
                off, or start fresh?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
          <Clock className="h-5 w-5 text-amber-400" />
          <p className="text-sm text-zinc-300">
            Your progress is saved for 24 hours after you close the form.
          </p>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onStartFresh}
            className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Start Fresh
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            Continue Where I Left Off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
