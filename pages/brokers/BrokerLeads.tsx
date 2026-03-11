
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
  DollarSign, Info, FileDown, Loader2
} from 'lucide-react';
import { Lead, LeadStatus, Property } from '../../types';
import { formatCurrency, parseBRLToFloat, formatBRLMask } from '../../utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLUMNS = Object.values(LeadStatus);

const LeadCard = ({ lead, property }: { lead: Lead, property?: Property }) => {
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
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-[10px] border border-slate-100">
            {lead.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 leading-tight">{lead.name}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{property?.neighborhood || 'Imóvel não identificado'}</p>
          </div>
        </div>
        <button className="p-1 text-slate-300 hover:text-slate-600 rounded-lg transition-all"><MoreVertical size={16} /></button>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-slate-500">
          <Phone size={12} />
          <span className="text-[10px] font-medium">{lead.phone}</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-500">
          <MapPin size={12} />
          <span className="text-[10px] font-medium">{property?.city || 'N/A'}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-1 text-slate-400">
          <Calendar size={12} />
          <span className="text-[9px] font-bold uppercase tracking-widest">
            {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
        {lead.saleValue && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
            {formatCurrency(lead.saleValue)}
          </span>
        )}
      </div>
    </div>
  );
};

const Column = ({ id, leads, properties }: { id: string, leads: Lead[], properties: Property[] }) => {
  const {
    setNodeRef
  } = useSortable({ id });

  return (
    <div className="flex flex-col w-80 shrink-0 bg-slate-50/50 rounded-[32px] p-4 border border-slate-100">
      <div className="flex items-center justify-between px-3 mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{id}</h3>
          <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-black text-slate-400 border border-slate-200">{leads.length}</span>
        </div>
        <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all"><Plus size={16} /></button>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-4 min-h-[200px]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} property={properties.find(p => p.id === lead.propertyId)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const BrokerLeads = ({ leads, properties, onUpdateLead }: { 
  leads: Lead[], 
  properties: Property[],
  onUpdateLead: (l: Lead) => void 
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingSaleLead, setPendingSaleLead] = useState<Lead | null>(null);
  const [saleValueInput, setSaleValueInput] = useState('');
  const pageRef = React.useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    if (!pageRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC',
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
    setShowSaleModal(false);
    setPendingSaleLead(null);
    setSaleValueInput('');
  };

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  return (
    <div ref={pageRef} className="h-[calc(100vh-180px)] flex flex-col space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Funil de Vendas</h2>
          <p className="text-slate-500 font-medium">Gerencie seus leads e acompanhe o progresso das negociações.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="bg-white text-slate-700 px-6 py-3 rounded-2xl font-black text-sm border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
            <span>{isExporting ? 'Exportando...' : 'PDF'}</span>
          </button>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <Search size={18} className="text-slate-400" />
            <input type="text" placeholder="Buscar lead..." className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-widest placeholder:text-slate-300 w-40" />
          </div>
          <button className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all shadow-sm"><Filter size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
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
                leads={leads.filter(l => l.status === columnId)} 
                properties={properties}
              />
            ))}
          </div>

          <DragOverlay>
            {activeId && activeLead ? (
              <div className="rotate-3 scale-105 shadow-2xl">
                <LeadCard lead={activeLead} property={properties.find(p => p.id === activeLead.propertyId)} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Sale Confirmation Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3 text-emerald-600">
                  <div className="p-2.5 bg-emerald-50 rounded-2xl"><DollarSign size={24} strokeWidth={3} /></div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Venda Concluída!</h3>
                </div>
                <button onClick={() => setShowSaleModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Lead</p>
                  <p className="text-lg font-black text-slate-900">{pendingSaleLead?.name}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    {properties.find(p => p.id === pendingSaleLead?.propertyId)?.neighborhood || 'Imóvel'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Valor Final da Venda</label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm z-10 pointer-events-none">R$</span>
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="0,00"
                      className="w-full bg-slate-50 text-slate-900 pl-12 pr-5 py-5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-xl"
                      value={saleValueInput}
                      onChange={(e) => setSaleValueInput(formatBRLMask(e.target.value))}
                    />
                  </div>
                  <p className="mt-3 flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    <Info size={12} />
                    <span>Este valor será usado para cálculo de lucro e relatórios.</span>
                  </p>
                </div>

                <div className="flex flex-col space-y-3 pt-4">
                  <button 
                    onClick={handleConfirmSale}
                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 hover:-translate-y-1 active:translate-y-0 transition-all uppercase tracking-widest"
                  >
                    Confirmar Venda
                  </button>
                  <button 
                    onClick={() => setShowSaleModal(false)}
                    className="w-full py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerLeads;
