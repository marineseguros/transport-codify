import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GripVertical, 
  X, 
  Minimize2, 
  Maximize2, 
  Square 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardWrapperProps {
  cardId: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  editMode: boolean;
  canEdit: boolean;
  size?: 'small' | 'medium' | 'large';
  onRemove?: () => void;
  onResize?: (size: 'small' | 'medium' | 'large') => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isDragging?: boolean;
  headerActions?: ReactNode;
  className?: string;
}

export function DashboardCardWrapper({
  cardId,
  title,
  subtitle,
  children,
  editMode,
  canEdit,
  size = 'medium',
  onRemove,
  onResize,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  headerActions,
  className,
}: DashboardCardWrapperProps) {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-1',
    large: 'col-span-1 md:col-span-2',
  };

  return (
    <Card
      className={cn(
        "relative transition-all duration-200",
        editMode && "ring-2 ring-dashed ring-muted-foreground/30 hover:ring-primary/50",
        isDragging && "opacity-50 scale-95",
        sizeClasses[size],
        className
      )}
      draggable={editMode && canEdit}
      onDragStart={(e) => {
        if (editMode && canEdit) {
          e.dataTransfer.setData('text/plain', cardId);
          onDragStart?.();
        }
      }}
      onDragEnd={() => {
        if (editMode && canEdit) {
          onDragEnd?.();
        }
      }}
      onDragOver={(e) => {
        if (editMode && canEdit) {
          e.preventDefault();
          onDragOver?.(e);
        }
      }}
      onDrop={(e) => {
        if (editMode && canEdit) {
          e.preventDefault();
          onDrop?.();
        }
      }}
    >
      {/* Edit Mode Controls */}
      {editMode && canEdit && (
        <div className="absolute -top-2 -right-2 z-10 flex gap-1">
          {/* Resize buttons */}
          <div className="flex bg-background border rounded-md shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-6 w-6 p-0", size === 'small' && "bg-primary/20")}
              onClick={() => onResize?.('small')}
              title="Pequeno"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-6 w-6 p-0", size === 'medium' && "bg-primary/20")}
              onClick={() => onResize?.('medium')}
              title="Médio"
            >
              <Square className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-6 w-6 p-0", size === 'large' && "bg-primary/20")}
              onClick={() => onResize?.('large')}
              title="Grande"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Remove button */}
          <Button
            variant="destructive"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onRemove}
            title="Remover card"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Drag Handle */}
      {editMode && canEdit && (
        <div className="absolute top-2 left-2 z-10 cursor-move">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {title && (
        <CardHeader className={cn("pb-2", editMode && canEdit && "pl-8")}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {headerActions}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={cn(!title && editMode && canEdit && "pt-8")}>
        {children}
      </CardContent>
    </Card>
  );
}
