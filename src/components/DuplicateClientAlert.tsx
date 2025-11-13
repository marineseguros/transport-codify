import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Cliente } from '@/types';
import { Edit } from 'lucide-react';

interface DuplicateClientAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente;
  captacaoDescricao?: string;
  canEdit: boolean;
  onEdit: () => void;
}

export const DuplicateClientAlert: React.FC<DuplicateClientAlertProps> = ({
  open,
  onOpenChange,
  cliente,
  captacaoDescricao,
  canEdit,
  onEdit,
}) => {
  const formatCpfCnpj = (cpfCnpj: string) => {
    const numbers = cpfCnpj.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cpfCnpj;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-destructive">
            CNPJ já cadastrado
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-4">
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">🏢 Cliente:</span>
                  <span className="font-medium text-foreground">{cliente.segurado}</span>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">🆔 CPF/CNPJ:</span>
                  <span className="font-mono text-foreground">{formatCpfCnpj(cliente.cpf_cnpj)}</span>
                </div>
                
                {cliente.email && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">📧 E-mail:</span>
                    <span className="text-foreground">{cliente.email}</span>
                  </div>
                )}
                
                {cliente.telefone && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">📞 Telefone:</span>
                    <span className="text-foreground">{cliente.telefone}</span>
                  </div>
                )}
                
                {cliente.cidade && cliente.uf && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">📍 Localização:</span>
                    <span className="text-foreground">{cliente.cidade}, {cliente.uf}</span>
                  </div>
                )}
                
                {captacaoDescricao && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">🎯 Captação:</span>
                    <span className="text-foreground">{captacaoDescricao}</span>
                  </div>
                )}
                
                {cliente.observacoes && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">📝 Observações:</span>
                    <span className="text-foreground">{cliente.observacoes}</span>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">OK</AlertDialogCancel>
          {canEdit && (
            <AlertDialogAction 
              onClick={onEdit}
              className="w-full sm:w-auto gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
