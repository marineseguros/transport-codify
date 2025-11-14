import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WeeklyReminderModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export const WeeklyReminderModal = ({ open, onClose, userId }: WeeklyReminderModalProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmed = async () => {
    setIsConfirming(true);
    try {
      const { error } = await supabase
        .from("weekly_reminder_confirmations")
        .insert({
          user_id: userId,
          confirmed_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Remove localStorage flag
      localStorage.removeItem(`weekly_reminder_dismissed_${userId}`);
      
      toast.success("Obrigado por confirmar!");
      onClose();
    } catch (error) {
      console.error("Error confirming reminder:", error);
      toast.error("Erro ao confirmar. Tente novamente.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDismiss = () => {
    // Mark as dismissed for today in localStorage
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`weekly_reminder_dismissed_${userId}`, today);
    onClose();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia!";
    if (hour < 18) return "Boa tarde!";
    return "Boa noite!";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{getGreeting()}</DialogTitle>
          <DialogDescription className="text-base pt-2">
            É segunda-feira! Por favor, certifique-se de que todas as cotações e fechamentos 
            realizados até o momento foram devidamente registrados no sistema.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="w-full sm:w-auto"
          >
            Vou fazer depois
          </Button>
          <Button
            onClick={handleConfirmed}
            disabled={isConfirming}
            className="w-full sm:w-auto"
          >
            {isConfirming ? "Confirmando..." : "Tudo registrado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
