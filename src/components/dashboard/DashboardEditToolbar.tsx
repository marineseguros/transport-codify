import { Button } from "@/components/ui/button";
import { 
  Settings2, 
  RotateCcw, 
  Check, 
  Eye, 
  EyeOff 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardCard } from "@/hooks/useDashboardLayout";

interface DashboardEditToolbarProps {
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  cards: DashboardCard[];
  toggleCardVisibility: (cardId: string) => void;
  resetLayout: () => void;
  canEdit: boolean;
}

export function DashboardEditToolbar({
  editMode,
  setEditMode,
  cards,
  toggleCardVisibility,
  resetLayout,
  canEdit,
}: DashboardEditToolbarProps) {
  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2">
      {editMode ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                Visibilidade
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Cards do Dashboard</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {cards.map((card) => (
                <DropdownMenuItem
                  key={card.id}
                  onClick={() => toggleCardVisibility(card.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span>{card.title}</span>
                  {card.visible ? (
                    <Eye className="h-4 w-4 text-success" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetLayout}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>

          <Button 
            size="sm" 
            onClick={() => setEditMode(false)}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Concluir
          </Button>
        </>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setEditMode(true)}
          className="gap-2"
        >
          <Settings2 className="h-4 w-4" />
          Editar Dashboard
        </Button>
      )}
    </div>
  );
}
