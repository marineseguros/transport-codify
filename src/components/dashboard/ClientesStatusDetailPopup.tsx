import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Building, Calendar, DollarSign, MapPin } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";

type StatusType = 'fechados' | 'aberto_mes' | 'aberto_total' | 'declinados';

interface ClientesStatusDetailPopupProps {
  open: boolean;
  onClose: () => void;
  produtorNome: string;
  statusType: StatusType;
  cotacoes: Cotacao[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

const statusConfig: Record<StatusType, { title: string; color: string; badgeVariant: 'default' | 'success-alt' | 'warning' | 'destructive' }> = {
  fechados: { title: 'Negócios Fechados', color: 'text-success', badgeVariant: 'success-alt' },
  aberto_mes: { title: 'Em Aberto (Período)', color: 'text-brand-orange', badgeVariant: 'warning' },
  aberto_total: { title: 'Em Aberto (Total)', color: 'text-chart-4', badgeVariant: 'default' },
  declinados: { title: 'Declinados', color: 'text-destructive', badgeVariant: 'destructive' },
};

// Helper to group by CNPJ + Ramo Group
const getBranchGroup = (ramoDescricao: string | undefined): string => {
  if (!ramoDescricao) return "outros";
  const ramoUpper = ramoDescricao.toUpperCase();
  if (ramoUpper.includes("RCTR-C") || ramoUpper.includes("RC-DC")) {
    return "RCTR-C + RC-DC";
  }
  if (ramoUpper.includes("NACIONAL")) return "NACIONAL";
  if (ramoUpper.includes("EXPORTAÇÃO") || ramoUpper.includes("EXPORTACAO")) return "EXPORTAÇÃO";
  if (ramoUpper.includes("IMPORTAÇÃO") || ramoUpper.includes("IMPORTACAO")) return "IMPORTAÇÃO";
  if (ramoUpper.includes("RCTR-VI")) return "RCTR-VI";
  if (ramoUpper.includes("RCTA-C")) return "RCTA-C";
  if (ramoUpper.includes("AMBIENTAL")) return "AMBIENTAL";
  if (ramoUpper.includes("RC-V")) return "RC-V";
  if (ramoUpper.includes("AVULSA")) return "AVULSA";
  return "OUTROS";
};

interface GroupedCliente {
  segurado: string;
  cpfCnpj: string;
  ramoGroup: string;
  cidade?: string;
  uf?: string;
  seguradora?: string;
  premioTotal: number;
  dataInicio?: string;
  dataFechamento?: string;
  cotacoes: Cotacao[];
}

export function ClientesStatusDetailPopup({
  open,
  onClose,
  produtorNome,
  statusType,
  cotacoes,
  formatCurrency,
  formatDate,
}: ClientesStatusDetailPopupProps) {
  const config = statusConfig[statusType];

  // Group cotações by CNPJ + Ramo Group
  const groupedClientes: GroupedCliente[] = [];
  const groupMap = new Map<string, GroupedCliente>();

  cotacoes.forEach(cotacao => {
    const ramoGroup = getBranchGroup(cotacao.ramo?.descricao);
    const key = `${cotacao.cpf_cnpj}_${ramoGroup}`;
    
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        segurado: cotacao.segurado,
        cpfCnpj: cotacao.cpf_cnpj,
        ramoGroup,
        cidade: cotacao.cliente?.cidade,
        uf: cotacao.cliente?.uf,
        seguradora: cotacao.seguradora?.nome,
        premioTotal: 0,
        dataInicio: cotacao.data_cotacao,
        dataFechamento: cotacao.data_fechamento || undefined,
        cotacoes: [],
      });
    }

    const group = groupMap.get(key)!;
    group.premioTotal += cotacao.valor_premio || 0;
    group.cotacoes.push(cotacao);

    // Update dates if more recent
    if (cotacao.data_cotacao && (!group.dataInicio || cotacao.data_cotacao < group.dataInicio)) {
      group.dataInicio = cotacao.data_cotacao;
    }
    if (cotacao.data_fechamento && (!group.dataFechamento || cotacao.data_fechamento > group.dataFechamento)) {
      group.dataFechamento = cotacao.data_fechamento;
    }

    // Collect unique seguradoras
    if (cotacao.seguradora?.nome && !group.seguradora?.includes(cotacao.seguradora.nome)) {
      group.seguradora = group.seguradora 
        ? `${group.seguradora} | ${cotacao.seguradora.nome}`
        : cotacao.seguradora.nome;
    }
  });

  groupMap.forEach(value => groupedClientes.push(value));
  
  // Sort by premium descending
  groupedClientes.sort((a, b) => b.premioTotal - a.premioTotal);

  const totalPremio = groupedClientes.reduce((sum, c) => sum + c.premioTotal, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>{config.title} - {produtorNome}</span>
            <Badge variant={config.badgeVariant} className="ml-2">
              {groupedClientes.length} clientes
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className={`text-xl font-bold ${config.color}`}>{groupedClientes.length}</p>
                <p className="text-xs text-muted-foreground">Clientes Distintos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{formatCurrency(totalPremio)}</p>
                <p className="text-xs text-muted-foreground">Prêmio Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{cotacoes.length}</p>
                <p className="text-xs text-muted-foreground">Total Cotações</p>
              </div>
            </div>

            {/* Client List */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Cliente</th>
                    <th className="text-left py-2 px-2 font-medium">CPF/CNPJ</th>
                    <th className="text-left py-2 px-2 font-medium">Ramo</th>
                    <th className="text-left py-2 px-2 font-medium">Seguradora</th>
                    <th className="text-center py-2 px-2 font-medium">Localidade</th>
                    <th className="text-center py-2 px-2 font-medium">
                      {statusType === 'fechados' ? 'Fechamento' : 'Início'}
                    </th>
                    <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                    <th className="text-center py-2 px-2 font-medium">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedClientes.map((cliente, index) => (
                    <tr key={`${cliente.cpfCnpj}_${cliente.ramoGroup}`} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[150px]" title={cliente.segurado}>
                            {cliente.segurado}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground font-mono">
                        {cliente.cpfCnpj}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">
                          {cliente.ramoGroup}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs truncate max-w-[100px]" title={cliente.seguradora}>
                        {cliente.seguradora || '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        {cliente.cidade && cliente.uf ? (
                          <span className="flex items-center justify-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {cliente.cidade}/{cliente.uf}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className="flex items-center justify-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {statusType === 'fechados' && cliente.dataFechamento
                            ? formatDate(cliente.dataFechamento)
                            : cliente.dataInicio 
                              ? formatDate(cliente.dataInicio)
                              : '-'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={`font-semibold ${config.color}`}>
                          {formatCurrency(cliente.premioTotal)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {cliente.cotacoes.length}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {groupedClientes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado para este status.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
