
// Types for Sintese ERP
export enum CommercialStatus {
  DISPONIVEL = 'Disponível',
  RESERVADO = 'Reservado',
  VENDIDO = 'Vendido'
}

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
  SOLICITADO = 'Solicitado',
  COTACAO = 'Em Cotação',
  APROVADO = 'Aprovado',
  RECEBIDO = 'Recebido',
  REJEITADO = 'Rejeitado'
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
  imageUrl?: string;
  averageCost?: number;
  usageStatus?: number; // 0-100
  linkedPropertyId?: string;
  linkedPropertyName?: string;
  supplierId?: string;
  supplierName?: string;
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
  attachmentUrl?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Administrador',
  OPERADOR = 'Operador',
  BROKER = 'Corretor'
}

export type PermissionModule = 'properties' | 'inventory' | 'finances' | 'teams' | 'reports' | 'brokers';
export type PermissionAction = 'view' | 'edit' | 'delete';

export interface UserPermissions {
  properties: PermissionAction[];
  inventory: PermissionAction[];
  finances: PermissionAction[];
  teams: PermissionAction[];
  reports: PermissionAction[];
  brokers: PermissionAction[];
}

export interface Team {
  id: string;
  name: string;
  description: string;
  managerId?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string;
  active: boolean;
  permissions: UserPermissions;
  photoUrl?: string;
  phone?: string;
  jobTitle?: string;
  bio?: string;
  companyLogo?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  timestamp: string;
  channelId?: string; // 'general', 'team-id', or 'dm-id'
  attachments?: Attachment[];
}

export enum TaskStatus {
  TODO = 'A Fazer',
  IN_PROGRESS = 'Em Progresso',
  REVIEW = 'Em Revisão',
  DONE = 'Concluído'
}

export enum TaskPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  URGENT = 'Urgente'
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  timestamp: string;
}

export interface Task {
  id: string;
  protocol?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string; // Deprecated, use assigneeIds
  assigneeName?: string; // Deprecated
  assigneeIds?: string[]; // New: Multiple assignees
  creatorId: string;
  departmentId?: string; // If null, visible to all (or specific logic)
  dueDate?: string;
  createdAt?: string; // Added createdAt
  tags?: string[];
  comments?: number; // Count
  commentsList?: TaskComment[]; // Actual comments
  attachments?: number;
  linkedPropertyId?: string; // Link to property
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  description?: string;
  type: 'meeting' | 'task' | 'reminder' | 'other';
  linkedTaskId?: string;
  userId: string; // Creator
  attendees?: string[]; // User IDs
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

export enum AuctionStatus {
  OPEN = 'Aberto',
  FINISHED = 'Finalizado',
  WON = 'Arrematado',
  LOST = 'Perdido',
  CANCELED = 'Cancelado'
}

export interface Bid {
  id: string;
  auctionId: string;
  amount: number;
  date: string;
  userId: string;
  userName: string;
  isWinning?: boolean;
}

export interface Auction {
  id: string;
  title: string;
  description?: string;
  link?: string;
  date: string;
  status: AuctionStatus;
  initialPrice: number;
  currentBid?: number;
  myMaxBid?: number;
  propertyType?: PropertyType;
  city: string;
  neighborhood: string;
  auctioneer?: string;
  bids: Bid[];
  createdAt: string;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
}

export enum OLXStatus {
  NONE = 'Não Publicado',
  PENDING = 'Pendente',
  ACTIVE = 'Ativo',
  REJECTED = 'Rejeitado',
  SYNCING = 'Sincronizando'
}

export interface OLXData {
  status: OLXStatus;
  adId?: string;
  publishedAt?: string;
  lastSync?: string;
  errorMessage?: string;
  externalUrl?: string;
}

export interface Wallet {
  balance: number;
  slots: {
    total: number;
    used: number;
  };
  transactions: {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    date: string;
  }[];
}

export interface Property {
  id: string;
  title?: string; // New field for custom property name/label
  type: PropertyType;
  acquisitionType?: AcquisitionType;
  city: string;
  neighborhood: string;
  neighborhood2?: string; // Bairro/Condom2
  condoName?: string; // Bairro/Condom
  realEstateAgency?: string; // IMOBILIARIA
  address: string;
  sizeM2: number;
  status: PropertyStatus;
  acquisitionDate: string;
  bankValuation: number;
  acquisitionPrice: number;
  auctioneerCommission: number;
  salePrice?: number;
  saleDate?: string;
  brokerName?: string;
  saleNotes?: string;
  images: string[];
  
  // Legal & Registration
  legalEscritura?: number;
  legalItbi?: number;
  legalTaxasRegistro?: number;
  legalCertidoes?: number; // Despesas Registro/Certidoes
  
  // Ongoing Expenses (Pre-sale)
  expenseCondo?: number; // Desp. Condom.
  expenseIptu?: number; // Desp. IPTU
  expensePostAcquisition?: number; // Despesas IPTU/COND. AGUA/ENERGIA POS/ARREMATAÇAO
  
  // Others
  budgetReforma?: number;
  expenseMaterials?: number; // Despesas Reforma - Materiais (R$)
  brokerage?: number;
  salesTax?: number;
  taxes?: number; // Impostos (R$)
  expenseIR?: number; // Imposto de Renda (IR)
  otherCosts?: number; // Outros Custos
  
  itbiPaid?: boolean;
  registroPaid?: boolean;

  // Portal Integration Fields
  cep?: string;
  rooms?: number;
  bathrooms?: number;
  garageSpaces?: number;
  features?: string[];
  complexFeatures?: string[];
  monthlyCondo?: number;
  monthlyIptu?: number;

  // Broker Module Fields
  availableForBrokers?: boolean;
  commercialStatus?: CommercialStatus;
  responsibleBrokerId?: string;
  description?: string;
  improvements?: string;
  locationApprox?: string;

  // OLX Integration
  olx?: OLXData;
}

export interface CommercialProperty {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  city: string;
  salePrice: number;
  description: string;
  improvements: string;
  images: string[];
  commercialStatus: CommercialStatus;
}

export enum LeadStatus {
  OPPORTUNITY = 'Oportunidade',
  SERVICE = 'Atendimento',
  VISIT_SCHEDULED = 'Visita agendada',
  VISIT_DONE = 'Visita Realizada',
  PROPOSAL = 'Proposta',
  SOLD = 'Venda concluída',
  LOST = 'Negociação perdida'
}

export enum BrokerStatus {
  PENDING = 'Pendente',
  ACTIVE = 'Ativo',
  INACTIVE = 'Inativo'
}

export interface Broker {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  realEstateAgency?: string;
  region?: string;
  active: boolean;
  status: BrokerStatus;
  userId?: string;
  password?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  interestType: string;
  observations?: string;
  propertyId: string;
  brokerId: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  saleValue?: number;
}

export interface PropertyCalculations {
  totalInvested: number;
  costPerM2: number;
  realizedProfit: number;
  roi: number;
  breakEven: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
}
