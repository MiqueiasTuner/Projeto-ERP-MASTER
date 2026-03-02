
import { Property, PropertyCalculations, Expense, ExpenseCategory } from './types';

export const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '---';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Formata data para o padrão brasileiro DD/MM/AAAA
export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '---';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '---';
  
  // Usamos as partes manualmente ou toLocaleDateString para garantir o formato DD/MM/AAAA
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC' // Importante para evitar que fusos horários mudem o dia (datas de banco costumam vir em UTC)
  });
};

// Formata um número puro para o padrão visual brasileiro (sem o símbolo R$)
export const formatBRLMask = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '';
  
  // Se for um número (do banco), multiplica por 100 para tratar como centavos na máscara
  const numericValue = typeof value === 'number' 
    ? Math.round(value * 100).toString() 
    : value.replace(/\D/g, '');
  
  if (numericValue === '' || numericValue === '0') return '';
  
  const integerPart = numericValue.slice(0, -2) || '0';
  const decimalPart = numericValue.slice(-2).padStart(2, '0');
  
  const formattedInteger = parseInt(integerPart).toLocaleString('pt-BR');
  return `${formattedInteger},${decimalPart}`;
};

// Converte a string mascarada de volta para um número float ou null se vazio
export const parseBRLToFloat = (value: string): number | null => {
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return null;
  return parseFloat(cleanValue) / 100;
};

export const calculatePropertyMetrics = (p: Property, expenses: Expense[]): PropertyCalculations => {
  const propertyExpenses = expenses.filter(e => e.propertyId === p.id);
  
  const categoryBreakdown: Record<ExpenseCategory, number> = {
    [ExpenseCategory.REFORMA]: 0,
    [ExpenseCategory.MANUTENCAO]: 0,
    [ExpenseCategory.IMPOSTOS]: 0,
    [ExpenseCategory.LEGAL]: 0,
    [ExpenseCategory.COMERCIAL]: 0,
    [ExpenseCategory.OUTROS]: 0,
  };

  propertyExpenses.forEach(e => {
    categoryBreakdown[e.category] += (e.amount ?? 0);
  });

  // Soma de custos iniciais usando Nullish Coalescing para tratar campos vazios como 0 apenas no cálculo
  const initialInvestment = (p.acquisitionPrice ?? 0) + (p.auctioneerCommission ?? 0);
  const totalInvested = initialInvestment + propertyExpenses.reduce((acc, e) => acc + (e.amount ?? 0), 0);
  
  const costPerM2 = (p.sizeM2 && p.sizeM2 > 0) ? totalInvested / p.sizeM2 : 0;
  const realizedProfit = p.salePrice ? (p.salePrice - totalInvested) : 0;
  const roi = totalInvested > 0 ? (realizedProfit / totalInvested) * 100 : 0;

  return {
    totalInvested,
    costPerM2,
    realizedProfit,
    roi,
    categoryBreakdown
  };
};
