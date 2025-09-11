import { CotacaoTRN } from '@/types';

export const formatCPFCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    // CPF format: 000.000.000-00
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    // CNPJ format: 00.000.000/0000-00
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
};

export const exportToCsv = (data: CotacaoTRN[], filename: string = 'cotacoes.csv') => {
  if (!data.length) return;

  const headers = [
    'ID',
    'Unidade',
    'CNPJ',
    'Segurado',
    'Produtor Origem',
    'Produtor Negociador',
    'Produtor Cotador',
    'Seguradora',
    'Ramo',
    'Captação',
    'Status Seguradora',
    'Motivo Recusa',
    'Tipo',
    'Data Cotação',
    'Data Fechamento',
    'Início Vigência',
    'Fim Vigência',
    'Valor Prêmio',
    'Status',
    'Número Apólice',
    'Observações'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(cotacao => [
      cotacao.id,
      cotacao.unidade,
      cotacao.cnpj,
      cotacao.segurado,
      cotacao.produtor_origem?.nome || '',
      cotacao.produtor_negociador?.nome || '',
      cotacao.produtor_cotador?.nome || '',
      cotacao.seguradora?.nome || '',
      cotacao.ramo?.descricao || '',
      cotacao.captacao?.descricao || '',
      cotacao.status_seguradora?.descricao || '',
      cotacao.motivo_recusa || '',
      cotacao.tipo,
      cotacao.data_cotacao,
      cotacao.data_fechamento || '',
      cotacao.inicio_vigencia || '',
      cotacao.fim_vigencia || '',
      cotacao.valor_premio,
      cotacao.status,
      cotacao.num_apolice || '',
      `"${cotacao.observacoes?.replace(/"/g, '""') || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const parseCsvFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            const obj: any = {};
            
            headers.forEach((header, index) => {
              obj[header.trim()] = values[index]?.trim().replace(/^"|"$/g, '') || '';
            });
            
            return obj;
          });
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
};