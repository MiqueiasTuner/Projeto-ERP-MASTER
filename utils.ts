
import { Property, PropertyCalculations, Expense, ExpenseCategory, UserAccount } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

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
  let numericValue = typeof value === 'number' 
    ? Math.round(value * 100).toString() 
    : value.replace(/\D/g, '');
  
  // Remove zeros à esquerda
  numericValue = numericValue.replace(/^0+/, '');
  
  if (numericValue === '') return '0,00';
  if (numericValue.length === 1) return `0,0${numericValue}`;
  if (numericValue.length === 2) return `0,${numericValue}`;
  
  const integerPart = numericValue.slice(0, -2);
  const decimalPart = numericValue.slice(-2);
  
  const formattedInteger = parseInt(integerPart).toLocaleString('pt-BR');
  return `${formattedInteger},${decimalPart}`;
};

// Converte a string mascarada de volta para um número float ou null se vazio
export const parseBRLToFloat = (value: string): number | null => {
  // Se o usuário digitou apenas um ponto ou vírgula, não reseta o valor
  if (value === '.' || value === ',') return null;
  
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return 0;
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

  // Soma de custos iniciais e operacionais fixos do imóvel
  const initialInvestment = 
    (p.acquisitionPrice ?? 0) + 
    (p.auctioneerCommission ?? 0) +
    (p.legalEscritura ?? 0) +
    (p.legalItbi ?? 0) +
    (p.legalTaxasRegistro ?? 0) +
    (p.legalCertidoes ?? 0) +
    (p.expenseCondo ?? 0) +
    (p.expenseIptu ?? 0) +
    (p.expensePostAcquisition ?? 0) +
    (p.expenseMaterials ?? 0) +
    (p.taxes ?? 0) +
    (p.expenseIR ?? 0) +
    (p.brokerage ?? 0) +
    (p.salesTax ?? 0) +
    (p.otherCosts ?? 0);

  const totalInvested = initialInvestment + propertyExpenses.reduce((acc, e) => acc + (e.amount ?? 0), 0);
  
  const costPerM2 = (p.sizeM2 && p.sizeM2 > 0) ? totalInvested / p.sizeM2 : 0;
  const realizedProfit = p.salePrice ? (p.salePrice - totalInvested) : 0;
  const roi = totalInvested > 0 ? (realizedProfit / totalInvested) * 100 : 0;
  const breakEven = totalInvested;

  return {
    totalInvested,
    costPerM2,
    realizedProfit,
    roi,
    breakEven,
    categoryBreakdown
  };
};
