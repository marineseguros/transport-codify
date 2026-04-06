import * as React from "react";
import { Check, ChevronDown, X, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  showSelectAll?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Todos",
  emptyMessage = "Nenhum item encontrado.",
  className,
  showSelectAll = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [multiMode, setMultiMode] = React.useState(false);

  React.useEffect(() => {
    if (selected.length > 1) {
      setMultiMode(true);
    }
  }, [selected.length]);

  const handleSelect = (value: string) => {
    if (multiMode) {
      if (selected.includes(value)) {
        onChange(selected.filter((item) => item !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      if (selected.includes(value) && selected.length === 1) {
        onChange([]);
        setOpen(false);
      } else {
        onChange([value]);
        setOpen(false);
      }
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setMultiMode(false);
  };

  const toggleMultiMode = () => {
    const newMode = !multiMode;
    setMultiMode(newMode);
    if (!newMode && selected.length > 1) {
      onChange([selected[0]]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const label = options.find((opt) => opt.value === selected[0])?.label;
      return label || placeholder;
    }
    if (selected.length === options.length && options.length > 0) {
      return "Todos";
    }
    return `${selected.length} selecionados`;
  };

  const allSelected = selected.length === options.length && options.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          selected.length === 0 && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate text-xs">{getDisplayText()}</span>
        <div className="flex items-center gap-1 ml-2">
          {selected.length > 0 && (
            <X
              className="h-3.5 w-3.5 opacity-50 hover:opacity-100 cursor-pointer"
              onClick={handleClearAll}
            />
          )}
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </div>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute z-50 mt-1 min-w-[12rem] w-max overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            {/* Multi toggle header */}
            <div className="flex items-center justify-between gap-4 px-2 py-1.5 border-b border-border/40">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {multiMode ? "Multiseleção" : "Seleção única"}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleMultiMode}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors",
                      multiMode
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <List className="h-3 w-3" />
                    Multi
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {multiMode ? "Desativar multiseleção" : "Ativar multiseleção"}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-1">
              {/* Select all (multi mode only) */}
              {multiMode && showSelectAll && options.length > 0 && (
                <div
                  role="option"
                  aria-selected={allSelected}
                  onClick={handleSelectAll}
                  className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground font-medium border-b border-border/40 mb-1 whitespace-nowrap"
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {allSelected && <Check className="h-4 w-4" />}
                  </span>
                  Selecionar todos
                </div>
              )}

              {options.length === 0 && (
                <div className="py-3 text-center text-sm text-muted-foreground">{emptyMessage}</div>
              )}

              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {isSelected && <Check className="h-4 w-4" />}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
