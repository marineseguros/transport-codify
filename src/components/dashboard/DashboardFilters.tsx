import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import { CalendarIcon, Filter, X, Save, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Produtor, Seguradora, Ramo } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardFilterValues {
  dateFilter: string;
  dateRange?: DateRange;
  produtorFilter: string;
  seguradoraFilter: string;
  ramoFilter: string;
  segmentoFilter: string;
  regraFilter: string;
  anoEspecifico: string;
}

interface SavedFilter {
  name: string;
  filters: DashboardFilterValues;
}

interface DashboardFiltersProps {
  filters: DashboardFilterValues;
  onFiltersChange: (filters: DashboardFilterValues) => void;
  produtores: Produtor[];
  seguradoras: Seguradora[];
  ramos: Ramo[];
}

const STORAGE_KEY_PREFIX = "dashboard_saved_filters";

// Get unique segmentos from ramos
const getUniqueSegmentos = (ramos: Ramo[]): string[] => {
  const segmentos = new Set<string>();
  ramos.forEach(r => {
    if (r.segmento) segmentos.add(r.segmento);
  });
  return Array.from(segmentos).sort();
};

// Get unique regras from ramos
const getUniqueRegras = (ramos: Ramo[]): string[] => {
  const regras = new Set<string>();
  ramos.forEach(r => {
    if (r.regra) regras.add(r.regra);
  });
  return Array.from(regras).sort();
};

// Get years for ano específico
const getAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }
  return years;
};

export function DashboardFilters({
  filters,
  onFiltersChange,
  produtores,
  seguradoras,
  ramos,
}: DashboardFiltersProps) {
  const { user } = useAuth();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState("");
  const [showSavePopover, setShowSavePopover] = useState(false);

  // User-specific storage key
  const storageKey = user?.user_id ? `${STORAGE_KEY_PREFIX}_${user.user_id}` : STORAGE_KEY_PREFIX;

  // Load saved filters from localStorage (per user)
  useEffect(() => {
    if (!user?.user_id) return;
    
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading saved filters:", e);
      }
    } else {
      setSavedFilters([]);
    }
  }, [storageKey, user?.user_id]);

  const updateFilter = <K extends keyof DashboardFilterValues>(
    key: K,
    value: DashboardFilterValues[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateFilter: "mes_atual",
      dateRange: undefined,
      produtorFilter: "todos",
      seguradoraFilter: "todas",
      ramoFilter: "todos",
      segmentoFilter: "todos",
      regraFilter: "todas",
      anoEspecifico: "",
    });
  };

  const saveCurrentFilters = () => {
    if (!newFilterName.trim()) {
      toast.error("Digite um nome para o filtro");
      return;
    }

    const newSaved: SavedFilter = {
      name: newFilterName.trim(),
      filters: { ...filters },
    };

    const updated = [...savedFilters.filter(f => f.name !== newSaved.name), newSaved];
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setNewFilterName("");
    setShowSavePopover(false);
    toast.success(`Filtro "${newSaved.name}" salvo com sucesso`);
  };

  const loadSavedFilter = (saved: SavedFilter) => {
    onFiltersChange(saved.filters);
    toast.success(`Filtro "${saved.name}" aplicado`);
  };

  const deleteSavedFilter = (name: string) => {
    const updated = savedFilters.filter(f => f.name !== name);
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    toast.success("Filtro removido");
  };

  const segmentos = getUniqueSegmentos(ramos);
  const regras = getUniqueRegras(ramos);
  const availableYears = getAvailableYears();

  const hasActiveFilters =
    filters.dateFilter !== "mes_atual" ||
    filters.produtorFilter !== "todos" ||
    filters.seguradoraFilter !== "todas" ||
    filters.ramoFilter !== "todos" ||
    filters.segmentoFilter !== "todos" ||
    filters.regraFilter !== "todas";

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
          
          <div className="flex items-center gap-1">
            {/* Saved filters dropdown */}
            {savedFilters.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                    <Bookmark className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Filtros Salvos</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {savedFilters.map((saved) => (
                        <div
                          key={saved.name}
                          className="flex items-center justify-between p-2 rounded hover:bg-muted"
                        >
                          <button
                            onClick={() => loadSavedFilter(saved)}
                            className="text-sm text-left flex-1 truncate"
                          >
                            {saved.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => deleteSavedFilter(saved.name)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Clear filters - discrete */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}

            {/* Save filters */}
            <Popover open={showSavePopover} onOpenChange={setShowSavePopover}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <Save className="h-3 w-3 mr-1" />
                  Salvar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <Label className="text-sm">Nome do filtro</Label>
                  <Input
                    placeholder="Ex: Meus fechamentos"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveCurrentFilters()}
                  />
                  <Button onClick={saveCurrentFilters} size="sm" className="w-full">
                    Salvar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {/* Período */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Período</Label>
            <Select value={filters.dateFilter} onValueChange={(v) => updateFilter("dateFilter", v)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes_atual">Este mês</SelectItem>
                <SelectItem value="mes_anterior">Mês passado</SelectItem>
                <SelectItem value="ano_atual">Ano atual</SelectItem>
                <SelectItem value="ano_anterior">Ano anterior</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                <SelectItem value="personalizado">Período personalizado</SelectItem>
                <SelectItem value="ano_especifico">Ano específico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom date range picker */}
          {filters.dateFilter === "personalizado" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Datas</Label>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(range) => updateFilter("dateRange", range)}
              />
            </div>
          )}

          {/* Ano específico selector */}
          {filters.dateFilter === "ano_especifico" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ano</Label>
              <Select
                value={filters.anoEspecifico}
                onValueChange={(v) => updateFilter("anoEspecifico", v)}
              >
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Produtor */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Produtor</Label>
            <Select
              value={filters.produtorFilter}
              onValueChange={(v) => updateFilter("produtorFilter", v)}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {produtores
                  .filter((p) => p.ativo)
                  .map((produtor) => (
                    <SelectItem key={produtor.id} value={produtor.nome}>
                      {produtor.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seguradora */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Seguradora</Label>
            <Select
              value={filters.seguradoraFilter}
              onValueChange={(v) => updateFilter("seguradoraFilter", v)}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {seguradoras
                  .filter((s) => s.ativo)
                  .map((seg) => (
                    <SelectItem key={seg.id} value={seg.nome}>
                      {seg.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ramo */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ramo</Label>
            <Select value={filters.ramoFilter} onValueChange={(v) => updateFilter("ramoFilter", v)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {ramos
                  .filter((r) => r.ativo)
                  .map((ramo) => (
                    <SelectItem key={ramo.id} value={ramo.descricao}>
                      {ramo.descricao}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Segmento */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Segmento</Label>
            <Select
              value={filters.segmentoFilter}
              onValueChange={(v) => updateFilter("segmentoFilter", v)}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {segmentos.map((seg) => (
                  <SelectItem key={seg} value={seg}>
                    {seg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Regra */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo Regra</Label>
            <Select
              value={filters.regraFilter}
              onValueChange={(v) => updateFilter("regraFilter", v)}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {regras.map((regra) => (
                  <SelectItem key={regra} value={regra}>
                    {regra}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
