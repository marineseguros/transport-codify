import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onFirstPage: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
}

export function PaginationControls({
  currentPage,
  totalCount,
  pageSize,
  canGoPrev,
  canGoNext,
  onFirstPage,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
  loading = false
}: PaginationControlsProps) {
  const startItem = ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Registros por página</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Página {currentPage} de {totalPages}
        </div>
        
        <p className="text-sm text-muted-foreground">
          Exibindo {startItem} a {endItem} de {totalCount} registros
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={onFirstPage}
          disabled={!canGoPrev || loading}
        >
          <span className="sr-only">Ir para primeira página</span>
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={onPrevPage}
          disabled={!canGoPrev || loading}
        >
          <span className="sr-only">Ir para página anterior</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={onNextPage}
          disabled={!canGoNext || loading}
        >
          <span className="sr-only">Ir para próxima página</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}