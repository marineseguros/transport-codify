import * as React from "react";
import { Check, ChevronDown, X, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  // Auto-enable multi mode if multiple items are already selected
  React.useEffect(() => {
    if (selected.length > 1) {
      setMultiMode(true);
    }
  }, [selected.length]);

  const handleSelect = (value: string) => {
    if (multiMode) {
      // Multi-select behavior
      if (selected.includes(value)) {
        onChange(selected.filter((item) => item !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      // Single-select behavior: toggle or replace
      if (selected.includes(value) && selected.length === 1) {
        onChange([]);
      } else {
        onChange([value]);
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

  const toggleMultiMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newMode = !multiMode;
    setMultiMode(newMode);
    // When switching from multi to single and multiple are selected, keep only the first
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 w-full justify-between text-xs font-normal bg-background border-input",
            selected.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <div className="flex items-center gap-1 ml-2">
            {selected.length > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={handleClearAll}
              />
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 bg-popover border shadow-md z-50" align="start">
        <Command>
          {/* Multi-select toggle header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
            <span className="text-[11px] text-muted-foreground font-medium">
              {multiMode ? "Multiseleção ativa" : "Seleção única"}
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
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-3 text-center text-sm">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {multiMode && showSelectAll && options.length > 0 && (
                <CommandItem
                  onSelect={handleSelectAll}
                  className="cursor-pointer font-medium border-b mb-1"
                >
                  <div className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    allSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50"
                  )}>
                    {allSelected && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <span>Selecionar todos</span>
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                  className="cursor-pointer"
                >
                  <div className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center border",
                    multiMode ? "rounded-sm border-primary" : "rounded-full border-primary",
                    selected.includes(option.value)
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50"
                  )}>
                    {selected.includes(option.value) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
