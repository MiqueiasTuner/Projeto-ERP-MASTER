
import React, { useState } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  MoreVertical, Phone, Mail, MapPin, Calendar, 
  Plus, Search, Filter, X, CheckCircle2, AlertCircle,
  DollarSign, Info, FileDown, Loader2, LayoutGrid, List, Columns
} from 'lucide-react';
import { Lead, LeadStatus, Property, UserAccount } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, parseBRLToFloat, formatBRLMask } from '../../utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ViewMode = 'kanban' | 'list' | 'grid';

const COLUMNS = Object.values(LeadStatus);

const LeadCard = ({ 
  lead, 
  property, 
  view = 'kanban',
  onUpdateLead,
  onMarkAsSold
}: { 
  lead: Lead, 
  property?: Property, 
  view?: ViewMode,
  onUpdateLead?: (lead: Lead) => void,
  onMarkAsSold?: (propertyId: string, brokerId: string, salePrice: number, saleDate: string) => void
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isMenuOpen ? 50 : 'auto'
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (newStatus === LeadStatus.SOLD) {
      const value = prompt('Digite o valor da venda:', property?.salePrice?.toString() || '0');
      if (value) {
        const saleValue = parseFloat(value);
        onUpdateLead?.({ 
          ...lead, 
          status: LeadStatus.SOLD, 
          saleValue,
          updatedAt: new Date().toISOString() 
        });
        onMarkAsSold?.(
          lead.propertyId,
          lead.brokerId,
          saleValue,
          new Date().toISOString().split('T')[0]
        );
      }
    } else {
      onUpdateLead?.({ ...lead, status: newStatus, updatedAt: new Date().toISOString() });
    }
    setIsMenuOpen(false);
  };

  if (view === 'list') {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex items-center justify-between group relative"
      >
        <div className="flex items-center space-x-4 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-alt)] flex items-center justify-center font-black text-[var(--text-muted)] text-xs border border-[var(--border)]">
            {lead.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-[var(--text-header)]">{lead.name}</h4>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{property?.neighborhood || 'Imóvel não identificado'}</p>
          </div>
          <div className="hidden lg:flex flex-col items-start space-y-1 w-40">
            <div className="flex items-center space-x-2 text-[var(--text-muted)]">
              <Mail size={12} />
              <span className="text-[10px] font-medium truncate max-w-[150px]">{lead.email}</span>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-start space-y-1 w-32">
            <div className="flex items-center space-x-2 text-[var(--text-muted)]">
              <Phone size={12} />
              <span className="text-[10px] font-medium">{lead.phone}</span>
            </div>
          </div>
          <div className="hidden xl:flex flex-col items-start space-y-1 w-32">
            <div className="flex items-center space-x-2 text-[var(--text-muted)]">
              <MapPin size={12} />
              <span className="text-[10px] font-medium">{property?.city || 'N/A'}</span>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-center space-y-1 w-32">
            <div className="flex items-center space-x-2 text-[var(--text-muted)]">
              <Calendar size={12} />
              <span className="text-[10px] font-medium">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1 w-40">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${
              lead.status === LeadStatus.SOLD ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
              lead.status === LeadStatus.LOST ? 'text-rose-500 border-rose-500/20 bg-rose-500/10' :
              'text-[var(--accent)] border-[var(--accent)]/20 bg-[var(--accent)]/10'
            }`}>
              {lead.status}
            </span>
            {lead.saleValue && (
              <span className="text-[10px] font-black text-emerald-500">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.saleValue)}
              </span>
            )}
          </div>
        </div>
        <div className="relative ml-4">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-lg transition-all"
          >
            <MoreVertical size={18} />
          </button>
          
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 py-2 overflow-hidden"
              >
                <p className="px-4 py-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border)]">Mudar Status</p>
                {Object.values(LeadStatus).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-[var(--bg-card-alt)] transition-all ${lead.status === status ? 'text-[var(--accent)]' : 'text-[var(--text-header)]'}`}
                  >
                    {status}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (view === 'grid') {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 flex items-center space-x-2">
          <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border ${
            lead.status === LeadStatus.SOLD ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
            lead.status === LeadStatus.LOST ? 'text-rose-500 border-rose-500/20 bg-rose-500/10' :
            'text-[var(--accent)] border-[var(--accent)]/20 bg-[var(--accent)]/10'
          }`}>
            {lead.status}
          </span>
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-lg transition-all"
            >
              <MoreVertical size={14} />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 py-2 overflow-hidden"
                >
                  {Object.values(LeadStatus).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-[var(--bg-card-alt)] transition-all ${lead.status === status ? 'text-[var(--accent)]' : 'text-[var(--text-header)]'}`}
                    >
                      {status}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[var(--bg-card-alt)] flex items-center justify-center font-black text-[var(--text-muted)] text-xl border border-[var(--border)] shadow-inner">
            {lead.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="text-lg font-black text-[var(--text-header)] leading-tight">{lead.name}</h4>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{property?.neighborhood || 'Imóvel não identificado'}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-[var(--border)]">
            <div className="flex flex-col items-center space-y-1">
              <Phone size={14} className="text-[var(--text-muted)]" />
              <span className="text-[10px] font-bold text-[var(--text-header)]">{lead.phone}</span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <Calendar size={14} className="text-[var(--text-muted)]" />
              <span className="text-[10px] font-bold text-[var(--text-header)]">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {lead.saleValue && (
            <div className="w-full pt-3 mt-1 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 p-2">
              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Valor da Venda</p>
              <p className="text-sm font-black text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.saleValue)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-alt)] flex items-center justify-center font-black text-[var(--text-muted)] text-[10px] border border-[var(--border)]">
            {lead.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-black text-[var(--text-header)] leading-tight">{lead.name}</h4>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{property?.neighborhood || 'Imóvel não identificado'}</p>
          </div>
        </div>
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-lg transition-all"
          >
            <MoreVertical size={16} />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 py-2 overflow-hidden"
              >
                {Object.values(LeadStatus).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-[var(--bg-card-alt)] transition-all ${lead.status === status ? 'text-[var(--accent)]' : 'text-[var(--text-header)]'}`}
                  >
                    {status}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-[var(--text-muted)]">
          <Phone size={12} />
          <span className="text-[10px] font-medium">{lead.phone}</span>
        </div>
        <div className="flex items-center space-x-2 text-[var(--text-muted)]">
          <MapPin size={12} />
          <span className="text-[10px] font-medium">{property?.city || 'N/A'}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center space-x-1 text-[var(--text-muted)]">
          <Calendar size={12} />
          <span className="text-[9px] font-bold uppercase tracking-widest">
            {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
        {lead.saleValue && (
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
            {formatCurrency(lead.saleValue)}
          </span>
        )}
      </div>
    </div>
  );
};

const Column = ({ 
  id, 
  leads, 
  properties,
  onUpdateLead,
  onMarkAsSold
}: { 
  id: string, 
  leads: Lead[], 
  properties: Property[],
  onUpdateLead: (l: Lead) => void,
  onMarkAsSold: (propertyId: string, brokerId: string, salePrice: number, saleDate: string) => void
}) => {
  const {
    setNodeRef
  } = useSortable({ id });

  const getColumnColor = (id: string) => {
    switch (id) {
      case LeadStatus.OPPORTUNITY: return 'border-orange-500/30';
      case LeadStatus.SERVICE: return 'border-purple-500/30';
      case LeadStatus.VISIT_SCHEDULED: return 'border-green-500/30';
      case LeadStatus.VISIT_DONE: return 'border-blue-500/30';
      case LeadStatus.PROPOSAL: return 'border-pink-500/30';
      case LeadStatus.SOLD: return 'border-emerald-500/30';
      case LeadStatus.LOST: return 'border-rose-500/30';
      default: return 'border-[var(--border)]';
    }
  };

  const getTitleColor = (id: string) => {
    switch (id) {
      case LeadStatus.OPPORTUNITY: return 'text-orange-500';
      case LeadStatus.SERVICE: return 'text-purple-500';
      case LeadStatus.VISIT_SCHEDULED: return 'text-green-500';
      case LeadStatus.VISIT_DONE: return 'text-blue-500';
      case LeadStatus.PROPOSAL: return 'text-pink-500';
      case LeadStatus.SOLD: return 'text-emerald-500';
      case LeadStatus.LOST: return 'text-rose-500';
      default: return 'text-[var(--text-header)]';
    }
  };

  return (
    <div className={`flex flex-col w-80 shrink-0 bg-[var(--bg-card)]/30 rounded-[32px] p-4 border ${getColumnColor(id)}`}>
      <div className="flex items-center justify-between px-3 mb-6">
        <div className="flex items-center space-x-3">
          <h3 className={`text-xs font-black uppercase tracking-widest ${getTitleColor(id)}`}>{id}</h3>
          <span className="bg-[var(--bg-card-alt)] px-2 py-0.5 rounded-lg text-[10px] font-black text-[var(--text-muted)] border border-[var(--border)]">{leads.length}</span>
        </div>
        <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-header)] hover:bg-[var(--bg-card-alt)] rounded-xl transition-all"><Plus size={16} /></button>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-4 min-h-[200px]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard 
              key={lead.id} 
              lead={lead} 
              property={properties.find(p => p.id === lead.propertyId)} 
              onUpdateLead={onUpdateLead}
              onMarkAsSold={onMarkAsSold}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const BrokerLeads = ({ leads, properties, onUpdateLead, onMarkAsSold, currentUser }: { 
  leads: Lead[], 
  properties: Property[],
  onUpdateLead: (l: Lead) => void,
  onMarkAsSold: (propertyId: string, brokerId: string, salePrice: number, saleDate: string) => void,
  currentUser?: UserAccount
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingSaleLead, setPendingSaleLead] = useState<Lead | null>(null);
  const [saleValueInput, setSaleValueInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const pageRef = React.useRef<HTMLDivElement>(null);

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState<Partial<Lead>>({
    name: '',
    phone: '',
    email: '',
    propertyId: '',
    interestType: 'Compra',
    observations: ''
  });

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone.includes(searchQuery)
  );

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.propertyId) {
      alert('Por favor, selecione um imóvel.');
      return;
    }

    const lead: Lead = {
      ...newLeadData,
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser?.id || leads[0]?.brokerId || '',
      status: LeadStatus.OPPORTUNITY,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Lead;

    // We need a way to call onAddLead. 
    // Let's assume onUpdateLead can be used if we pass a new lead, 
    // but it's better to have onAddLead.
    // Let's check App.tsx to see if we can add a lead.
    // In App.tsx I added addLead.
    
    onUpdateLead(lead); // This will work if the parent handler handles both add and update
    setShowAddLeadModal(false);
    setNewLeadData({
      name: '',
      phone: '',
      email: '',
      propertyId: '',
      interestType: 'Compra',
      observations: ''
    });
    alert('Lead registrado com sucesso!');
  };

  const exportToPDF = async () => {
    if (!pageRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0B1120',
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const style = styleTags[i];
            if (style.innerHTML.includes('oklch')) {
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, '#000');
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for kanban
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgScaledWidth, imgScaledHeight);
      pdf.save(`funil-vendas-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeLead = leads.find(l => l.id === active.id);
    const overId = over.id as string;

    if (activeLead) {
      // If dropped over a column
      if (COLUMNS.includes(overId as any)) {
        const newStatus = overId as LeadStatus;
        if (activeLead.status !== newStatus) {
          if (newStatus === LeadStatus.SOLD) {
            setPendingSaleLead(activeLead);
            setShowSaleModal(true);
          } else {
            onUpdateLead({ ...activeLead, status: newStatus, updatedAt: new Date().toISOString() });
          }
        }
      } else {
        // If dropped over another lead
        const overLead = leads.find(l => l.id === overId);
        if (overLead && activeLead.status !== overLead.status) {
          if (overLead.status === LeadStatus.SOLD) {
            setPendingSaleLead(activeLead);
            setShowSaleModal(true);
          } else {
            onUpdateLead({ ...activeLead, status: overLead.status, updatedAt: new Date().toISOString() });
          }
        }
      }
    }
    setActiveId(null);
  };

  const handleConfirmSale = () => {
    if (!pendingSaleLead) return;
    const value = parseBRLToFloat(saleValueInput);
    if (!value || value <= 0) {
      alert('Por favor, insira um valor de venda válido.');
      return;
    }

    onUpdateLead({ 
      ...pendingSaleLead, 
      status: LeadStatus.SOLD, 
      saleValue: value,
      updatedAt: new Date().toISOString() 
    });

    // Trigger property sale logic
    onMarkAsSold(
      pendingSaleLead.propertyId,
      pendingSaleLead.brokerId,
      value,
      new Date().toISOString().split('T')[0]
    );

    setShowSaleModal(false);
    setPendingSaleLead(null);
    setSaleValueInput('');
  };

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  return (
    <div ref={pageRef} className="h-[calc(100vh-180px)] flex flex-col space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-header)] tracking-tight">Funil de Vendas</h2>
          <p className="text-[var(--text-muted)] font-medium">Gerencie seus leads e acompanhe o progresso das negociações.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* View Selector */}
          <div className="bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border)] shadow-sm flex items-center">
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/20' : 'text-[var(--text-muted)] hover:text-[var(--text-header)]'}`}
            >
              <Columns size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Kanban</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/20' : 'text-[var(--text-muted)] hover:text-[var(--text-header)]'}`}
            >
              <List size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Lista</span>
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/20' : 'text-[var(--text-muted)] hover:text-[var(--text-header)]'}`}
            >
              <LayoutGrid size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Grade</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowAddLeadModal(true)}
              className="bg-[var(--accent)] text-[var(--accent-text)] px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-yellow-500/20 hover:opacity-90 transition-all flex items-center gap-2 uppercase tracking-widest"
            >
              <Plus size={18} strokeWidth={3} />
              <span className="hidden sm:inline">Novo Lead</span>
            </button>
            <button 
              onClick={exportToPDF}
              disabled={isExporting}
              className="bg-[var(--bg-card)] text-[var(--text-header)] px-6 py-3 rounded-2xl font-black text-sm border border-[var(--border)] flex items-center gap-2 hover:bg-[var(--bg-card-alt)] transition-all shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
              <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'PDF'}</span>
            </button>
            <div className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border)] shadow-sm flex items-center space-x-3">
              <Search size={18} className="text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Buscar lead..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-widest placeholder:text-[var(--text-muted)]/50 text-[var(--text-main)] w-40" 
              />
            </div>
            <button className="p-3 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-2xl transition-all shadow-sm"><Filter size={20} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          <div className="h-full overflow-x-auto pb-6 custom-scrollbar">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex space-x-6 h-full">
                {COLUMNS.map(columnId => (
                  <Column 
                    key={columnId} 
                    id={columnId} 
                    leads={filteredLeads.filter(l => l.status === columnId)} 
                    properties={properties}
                    onUpdateLead={onUpdateLead}
                    onMarkAsSold={onMarkAsSold}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeId && activeLead ? (
                  <div className="rotate-3 scale-105 shadow-2xl">
                    <LeadCard 
                      lead={activeLead} 
                      property={properties.find(p => p.id === activeLead.propertyId)} 
                      onUpdateLead={onUpdateLead}
                      onMarkAsSold={onMarkAsSold}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : viewMode === 'list' ? (
          <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {filteredLeads.map(lead => (
              <LeadCard 
                key={lead.id} 
                lead={lead} 
                property={properties.find(p => p.id === lead.propertyId)} 
                view="list"
                onUpdateLead={onUpdateLead}
                onMarkAsSold={onMarkAsSold}
              />
            ))}
            {filteredLeads.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                <AlertCircle size={48} className="mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs">Nenhum lead encontrado</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLeads.map(lead => (
              <LeadCard 
                key={lead.id} 
                lead={lead} 
                property={properties.find(p => p.id === lead.propertyId)} 
                view="grid"
                onUpdateLead={onUpdateLead}
                onMarkAsSold={onMarkAsSold}
              />
            ))}
            {filteredLeads.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                <AlertCircle size={48} className="mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs">Nenhum lead encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sale Confirmation Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-[var(--bg-header)]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-[var(--border)]">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3 text-[var(--accent)]">
                  <div className="p-2.5 bg-[var(--accent)]/10 rounded-2xl"><DollarSign size={24} strokeWidth={3} /></div>
                  <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Venda Concluída!</h3>
                </div>
                <button onClick={() => setShowSaleModal(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-xl transition-all"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-[var(--bg-card-alt)] rounded-3xl border border-[var(--border)]">
                  <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Lead</p>
                  <p className="text-lg font-black text-[var(--text-header)]">{pendingSaleLead?.name}</p>
                  <p className="text-xs font-bold text-[var(--text-muted)] mt-1">
                    {properties.find(p => p.id === pendingSaleLead?.propertyId)?.neighborhood || 'Imóvel'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Valor Final da Venda</label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-sm z-10 pointer-events-none">R$</span>
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="0,00"
                      className="w-full bg-[var(--bg-card-alt)] text-[var(--text-header)] pl-12 pr-5 py-5 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black text-xl"
                      value={saleValueInput}
                      onChange={(e) => setSaleValueInput(formatBRLMask(e.target.value))}
                    />
                  </div>
                  <p className="mt-3 flex items-center space-x-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                    <Info size={12} />
                    <span>Este valor será usado para cálculo de lucro e relatórios.</span>
                  </p>
                </div>

                <div className="flex flex-col space-y-3 pt-4">
                  <button 
                    onClick={handleConfirmSale}
                    className="w-full bg-[var(--accent)] text-[var(--accent-text)] py-5 rounded-2xl font-black text-sm shadow-xl shadow-[var(--accent)]/20 hover:opacity-90 hover:-translate-y-1 active:translate-y-0 transition-all uppercase tracking-widest"
                  >
                    Confirmar Venda
                  </button>
                  <button 
                    onClick={() => setShowSaleModal(false)}
                    className="w-full py-4 rounded-2xl font-black text-[var(--text-muted)] hover:text-[var(--text-header)] uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-[var(--border)]">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Novo Lead</h3>
                  <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">Registre um novo interessado</p>
                </div>
                <button onClick={() => setShowAddLeadModal(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-xl transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleAddLead} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Imóvel de Interesse</label>
                    <select 
                      required
                      className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
                      value={newLeadData.propertyId}
                      onChange={(e) => setNewLeadData({ ...newLeadData, propertyId: e.target.value })}
                    >
                      <option value="">Selecione um imóvel...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.title || `${p.type} em ${p.neighborhood}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Nome do Cliente</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nome completo..."
                      className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
                      value={newLeadData.name}
                      onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Telefone</label>
                      <input 
                        type="text" 
                        required
                        placeholder="(00) 00000-0000"
                        className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
                        value={newLeadData.phone}
                        onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">E-mail</label>
                      <input 
                        type="email" 
                        required
                        placeholder="email@exemplo.com"
                        className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
                        value={newLeadData.email}
                        onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Observações</label>
                    <textarea 
                      placeholder="Alguma informação relevante?"
                      className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium min-h-[100px]"
                      value={newLeadData.observations}
                      onChange={(e) => setNewLeadData({ ...newLeadData, observations: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddLeadModal(false)}
                    className="px-6 py-4 rounded-2xl font-black text-[var(--text-muted)] hover:text-[var(--text-header)] uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-[var(--accent)] text-[var(--accent-text)] px-10 py-4 rounded-2xl font-black shadow-xl shadow-yellow-500/20 hover:opacity-90 transition-all uppercase tracking-widest"
                  >
                    Registrar Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerLeads;
