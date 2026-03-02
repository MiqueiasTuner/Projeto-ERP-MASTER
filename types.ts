
export enum PropertyStatus {
  ARREMATADO = 'Arrematado',
  EM_REFORMA = 'Em Reforma',
  A_VENDA = 'À Venda',
  VENDIDO = 'Vendido'
}

export enum PropertyType {
  APARTAMENTO = 'Apartamento',
  CASA = 'Casa',
  TERRENO = 'Terreno',
  COMERCIAL = 'Comercial'
}

export enum AcquisitionType {
  LEILAO_JUDICIAL = 'Leilão Judicial',
  LEILAO_EXTRAJUDICIAL = 'Leilão Extrajudicial',
  VENDA_DIRETA = 'Venda Direta',
  OUTROS = 'Outros'
}

export enum ExpenseCategory {
  REFORMA = 'Reforma',
  MANUTENCAO = 'Manutenção',
  IMPOSTOS = 'Impostos',
  LEGAL = 'Legal',
  COMERCIAL = 'Comercial',
  OUTROS = 'Outros'
}

export enum QuoteStatus {
  PENDENTE = 'Pendente',
  APROVADO = 'Aprovado',
  REJEITADO = 'Rejeitado',
  CONCLUIDO = 'Concluído'
}

export interface QuoteItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  supplierId: string;
  supplierName: string;
  items: QuoteItem[];
  totalAmount: number;
  status: QuoteStatus;
  date: string;
  validUntil?: string;
  notes?: string;
}

export interface PropertyLog {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  action: string;
  fromStatus?: PropertyStatus;
  toStatus?: PropertyStatus;
  timestamp: string;
  details?: string;
}

export enum MovementType {
  ENTRADA_COMPRA = 'Entrada (Compra)',
  SAIDA_OBRA = 'Saída (Obra)',
  AJUSTE_INVENTARIO = 'Ajuste'
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  category: string;
  phone: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: 'un' | 'm2' | 'm' | 'kg' | 'cx' | 'l';
  category: string;
  minStock: number;
  currentStock: number;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
  supplierId?: string;
  propertyId?: string;
  description: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export enum UserRole {
  MASTER = 'Master',
  COLABORADOR = 'Colaborador'
}

export type PermissionModule = 'properties' | 'inventory' | 'finances' | 'teams' | 'reports';
export type PermissionAction = 'view' | 'edit' | 'delete';

export interface UserPermissions {
  properties: PermissionAction[];
  inventory: PermissionAction[];
  finances: PermissionAction[];
  teams: PermissionAction[];
  reports: PermissionAction[];
}

export interface Team {
  id: string;
  name: string;
  description: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string;
  active: boolean;
  permissions: UserPermissions;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  url: string;
  date: string;
}

export interface Expense {
  id: string;
  propertyId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  userId: string;
  userName: string;
  attachments: Attachment[];
}

export interface Property {
  id: string;
  type: PropertyType;
  acquisitionType?: AcquisitionType;
  city: string;
  neighborhood: string;
  neighborhood2?: string;
  address: string;
  sizeM2: number;
  status: PropertyStatus;
  acquisitionDate: string;
  bankValuation: number;
  acquisitionPrice: number;
  auctioneerCommission: number;
  salePrice?: number;
  images: string[];
  
  // New fields from spreadsheet
  realEstateAgency?: string;
  condoExpenses?: number;
  iptuExpenses?: number;
  registrationCertificatesExpenses?: number;
  legalEscritura?: number;
  legalItbi?: number;
  legalTaxasRegistro?: number;
  budgetReforma?: number;
  postAcquisitionExpenses?: number;
  brokerage?: number;
  salesTax?: number;
  otherCosts?: number;
  
  itbiPaid?: boolean;
  registroPaid?: boolean;
}

export interface PropertyCalculations {
  totalInvested: number;
  costPerM2: number;
  realizedProfit: number;
  roi: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
}
