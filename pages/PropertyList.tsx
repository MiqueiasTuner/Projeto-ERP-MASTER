
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Search, 
  MapPin, 
  Building, 
  ChevronRight, 
  ChevronLeft,
  LayoutGrid, 
  Kanban as KanbanIcon, 
  ArrowRight, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  X,
  DollarSign,
  TrendingUp,
  Calendar,
  Maximize2,
  Edit3
} from 'lucide-react';
import { Property, PropertyStatus, Expense } from '../types';
import { formatCurrency, calculatePropertyMetrics, formatDate, formatBRLMask, parseBRLToFloat } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import PropertyForm from './PropertyForm';
import CustomDatePicker from '../src/components/CustomDatePicker';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// --- Card Individual Redesenhado ---
const PropertyKanbanCard = React.memo(({ 
  property, 
  metrics, 
  onEdit,
  onView,
  onDelete,
  onMoveLeft,
  onMoveRight
}: { 
  property: Property, 
  metrics: any, 
  onEdit: () => void,
  onView: () => void,
  onDelete: (e: React.MouseEvent) => void,
  onMoveLeft?: () => void,
  onMoveRight?: () => void
}) => {
  return (
    <div 
      className="bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden group select-none flex flex-col"
    >
      {/* Image Section */}
      <div className="h-32 overflow-hidden bg-slate-100 relative">
        {property.images && property.images.length > 0 ? (
          <img src={property.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>
        )}
        
        {/* Overlay Badges */}
        <div className="absolute top-3 left-3">
          <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-white/20 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider">{metrics.roi.toFixed(0)}% ROI</span>
          </div>
        </div>

        <div className="absolute top-3 right-3 flex gap-1.5">
          <button 
            onClick={onDelete}
            className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute inset-x-0 bottom-2 flex justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMoveLeft ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
              className="p-1.5 bg-white/90 backdrop-blur-md rounded-lg text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Mover para esquerda"
            >
              <ChevronLeft size={14} />
            </button>
          ) : <div />}
          {onMoveRight ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
              className="p-1.5 bg-white/90 backdrop-blur-md rounded-lg text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Mover para direita"
            >
              <ChevronRight size={14} />
            </button>
          ) : <div />}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {property.title && (
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-100">
                {property.title}
              </span>
            )}
            {property.status === PropertyStatus.VENDIDO && (
              <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 border border-emerald-400/20">
                VENDIDO
              </span>
            )}
          </div>
          <h4 className="font-black text-slate-900 text-sm truncate mb-1 tracking-tight">
            {property.condoName || property.neighborhood}
          </h4>
          <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <MapPin size={10} className="mr-1 text-blue-500" /> 
            <span className="truncate">{property.city}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Investido</p>
            <p className="text-[11px] font-black text-slate-900 truncate">{formatCurrency(metrics.totalInvested)}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Área</p>
            <p className="text-[11px] font-black text-slate-900">{property.sizeM2}m²</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex gap-2 pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <Maximize2 size={12} /> Detalhes
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2.5 bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="Editar Cadastro"
          >
            <Edit3 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

interface KanbanColumnProps {
  status: PropertyStatus;
  items: Property[];
  expenses: Expense[];
  onEdit: (property: Property) => void;
  onView: (id: string) => void;
  onDeleteProperty: (id: string) => void;
  onMoveProperty: (id: string, direction: 'left' | 'right') => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  status, 
  items, 
  expenses, 
  onEdit,
  onView,
  onDeleteProperty,
  onMoveProperty
}) => {
  const totalValue = useMemo(() => {
    return items.reduce((acc, p) => acc + calculatePropertyMetrics(p, expenses).totalInvested, 0);
  }, [items, expenses]);

  const statuses = Object.values(PropertyStatus) as PropertyStatus[];
  const currentIndex = statuses.indexOf(status);

  return (
    <div 
      className="flex flex-col min-w-[300px] max-w-[340px] rounded-[32px] p-4 min-h-[600px] transition-all duration-300 bg-slate-100/50"
    >
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex flex-col">
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.15em] mb-1">
            {status}
          </h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {items.length} Ativos • {formatCurrency(totalValue)}
          </p>
        </div>
        <div className={`w-2 h-2 rounded-full ${
          status === PropertyStatus.ARREMATADO ? 'bg-blue-500' :
          status === PropertyStatus.EM_REFORMA ? 'bg-amber-500' :
          status === PropertyStatus.A_VENDA ? 'bg-emerald-500' : 'bg-slate-400'
        }`} />
      </div>
      
      <div className="space-y-4 flex-1">
        {items.map(p => (
          <PropertyKanbanCard 
            key={p.id}
            property={p}
            metrics={calculatePropertyMetrics(p, expenses)}
            onEdit={() => onEdit(p)}
            onView={() => onView(p.id)}
            onDelete={(e) => {
              e.stopPropagation();
              onDeleteProperty(p.id);
            }}
            onMoveLeft={currentIndex > 0 ? () => onMoveProperty(p.id, 'left') : undefined}
            onMoveRight={currentIndex < statuses.length - 1 ? () => onMoveProperty(p.id, 'right') : undefined}
          />
        ))}
        
        {items.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[24px] bg-white/30">
            <Building size={24} className="mb-2 opacity-20" />
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface PropertyListProps {
  properties: Property[];
  expenses: Expense[];
  onUpdateStatus: (id: string, status: PropertyStatus) => void;
  onDeleteProperty: (id: string) => void;
  addLog?: (log: any) => Promise<void>;
}

const PropertyList = ({ properties, expenses, onUpdateStatus, onDeleteProperty, addLog }: PropertyListProps) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  
  // Sold Modal States
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);
  const [soldProperty, setSoldProperty] = useState<Property | null>(null);
  const [saleData, setSaleData] = useState({
    salePrice: 0,
    saleDate: new Date().toISOString().split('T')[0],
    brokerName: '',
    saleNotes: ''
  });

  const filteredProperties = useMemo(() => {
    const s = search.toLowerCase();
    return properties.filter(p => 
      p.neighborhood.toLowerCase().includes(s) || 
      p.city.toLowerCase().includes(s) ||
      (p.condoName?.toLowerCase().includes(s)) ||
      (p.realEstateAgency?.toLowerCase().includes(s)) ||
      (p.neighborhood2?.toLowerCase().includes(s))
    );
  }, [properties, search]);

  const handleViewDetails = useCallback((id: string) => navigate(`/imovel/${id}`), [navigate]);

  const handleMoveProperty = async (id: string, direction: 'left' | 'right') => {
    const property = properties.find(p => p.id === id);
    if (!property) return;

    const statuses = Object.values(PropertyStatus) as PropertyStatus[];
    const currentIndex = statuses.indexOf(property.status);
    const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < statuses.length) {
      const newStatus = statuses[nextIndex];
      
      if (newStatus === PropertyStatus.VENDIDO) {
        setSoldProperty(property);
        setIsSoldModalOpen(true);
      } else {
        await onUpdateStatus(id, newStatus);
        if (addLog) {
          await addLog({
            propertyId: id,
            action: 'Alteração de Status',
            fromStatus: property.status,
            toStatus: newStatus,
            details: `Imóvel movido para ${newStatus} via setas de navegação.`
          });
        }
      }
    }
  };

  const handleConfirmSale = async () => {
    if (!soldProperty) return;

    try {
      await setDoc(doc(db, 'properties', soldProperty.id), {
        status: PropertyStatus.VENDIDO,
        salePrice: saleData.salePrice,
        saleDate: saleData.saleDate,
        brokerName: saleData.brokerName,
        saleNotes: saleData.saleNotes
      }, { merge: true });

      if (addLog) {
        await addLog({
          propertyId: soldProperty.id,
          action: 'Venda Realizada',
          fromStatus: soldProperty.status,
          toStatus: PropertyStatus.VENDIDO,
          details: `Venda registrada: ${formatCurrency(saleData.salePrice)} em ${formatDate(saleData.saleDate)}. Corretor: ${saleData.brokerName}`
        });
      }

      setIsSoldModalOpen(false);
      setSoldProperty(null);
      setSaleData({ salePrice: 0, saleDate: new Date().toISOString().split('T')[0], brokerName: '', saleNotes: '' });
    } catch (error) {
      console.error("Error confirming sale:", error);
    }
  };

  const handleSaveProperty = async (updatedProperty: Property) => {
    try {
      await setDoc(doc(db, 'properties', updatedProperty.id), updatedProperty as any, { merge: true });
      setEditingProperty(null);
    } catch (error) {
      console.error("Error updating property:", error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Ativos Operacionais</h2>
          <p className="text-slate-500 font-medium">Controle de portfólio e pipeline de obras.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
           <div className="bg-white border border-slate-200 rounded-[22px] p-1.5 flex shadow-sm order-2 sm:order-1">
              <button onClick={() => setViewMode('kanban')} className={`flex-1 sm:flex-none p-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest ${viewMode === 'kanban' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                <KanbanIcon size={18} /> <span>Kanban</span>
              </button>
              <button onClick={() => setViewMode('grid')} className={`flex-1 sm:flex-none p-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid size={18} /> <span>Grade</span>
              </button>
           </div>
           <Link to="/novo" className="bg-blue-600 text-white px-8 py-4 rounded-[28px] font-black hover:bg-blue-700 transition-all flex items-center justify-center space-x-3 shadow-2xl shadow-blue-500/20 order-1 sm:order-2 active:scale-95">
            <Plus size={22} strokeWidth={3} /> <span>Novo Ativo</span>
           </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[28px] border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por condomínio, bairro ou cidade..." 
            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium placeholder:text-slate-400 transition-all text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar -mx-6 px-6">
          {(Object.values(PropertyStatus) as PropertyStatus[]).map(status => (
            <KanbanColumn 
              key={status}
              status={status}
              items={filteredProperties.filter(p => p.status === status)}
              expenses={expenses}
              onEdit={setEditingProperty}
              onView={handleViewDetails}
              onDeleteProperty={onDeleteProperty}
              onMoveProperty={handleMoveProperty}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProperties.map(p => {
             const metrics = calculatePropertyMetrics(p, expenses);
             return (
              <div key={p.id} className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative">
                 <button 
                   onClick={(e) => { e.stopPropagation(); onDeleteProperty(p.id); }}
                   className="absolute top-5 right-5 z-10 p-2.5 bg-white/90 backdrop-blur rounded-xl text-rose-500 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-rose-600 hover:text-white"
                 >
                   <Trash2 size={16} />
                 </button>
                 <div onClick={() => handleViewDetails(p.id)} className="cursor-pointer">
                   <div className="h-52 relative overflow-hidden bg-slate-100">
                      {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={40} /></div>}
                      <div className="absolute top-5 left-5"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-white bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/10">{p.status}</span></div>
                   </div>
                   <div className="p-8">
                      {p.title && (
                        <div className="mb-3">
                          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
                            {p.title}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-slate-900 truncate flex-1 tracking-tight text-xl">
                          {p.condoName || p.neighborhood}
                        </h3>
                        <div className="text-emerald-600 font-black text-base">{metrics.roi.toFixed(0)}%</div>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                        {p.city} {p.neighborhood2 ? `• ${p.neighborhood2}` : ''}
                      </p>
                      <div className="flex justify-between items-end border-t border-slate-50 pt-6"><div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Capital Alocado</p><p className="font-black text-slate-900 text-lg truncate">{formatCurrency(metrics.totalInvested)}</p></div><div className="bg-slate-900 text-white p-3 rounded-2xl group-hover:bg-blue-600 transition-all"><ArrowRight size={20} /></div></div>
                   </div>
                 </div>
              </div>
             );
          })}
        </div>
      )}

      {/* Edit Property Drawer */}
      <AnimatePresence>
        {editingProperty && createPortal(
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingProperty(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-[110] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Editar Ativo</h3>
                  <p className="text-slate-500 text-sm font-medium">Altere os dados do imóvel.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => { setEditingProperty(null); handleViewDetails(editingProperty.id); }} className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">
                    Ver Detalhes Completos
                  </button>
                  <button onClick={() => setEditingProperty(null)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                <PropertyForm 
                  properties={[editingProperty]} 
                  onSave={handleSaveProperty} 
                  onCancel={() => setEditingProperty(null)}
                />
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>

      {/* Sold Modal */}
      <AnimatePresence>
        {isSoldModalOpen && soldProperty && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <DollarSign size={40} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Confirmar Venda</h3>
                <p className="text-slate-500 font-medium mt-2">Registre os detalhes da transação final.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço de Venda (R$)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 pl-12 pr-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-xl text-emerald-600"
                      value={formatBRLMask(saleData.salePrice)}
                      onChange={(e) => setSaleData({...saleData, salePrice: parseBRLToFloat(e.target.value) || 0})}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Venda</label>
                    <CustomDatePicker 
                      selected={saleData.saleDate ? new Date(saleData.saleDate + 'T00:00:00') : null}
                      onChange={(date) => setSaleData({...saleData, saleDate: date ? date.toISOString().split('T')[0] : ''})}
                      placeholderText="DD/MM/AAAA"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Corretor Responsável</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                      placeholder="Nome do corretor"
                      value={saleData.brokerName}
                      onChange={(e) => setSaleData({...saleData, brokerName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações da Venda</label>
                  <textarea 
                    className="w-full bg-slate-50 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm h-24 resize-none"
                    placeholder="Detalhes adicionais..."
                    value={saleData.saleNotes}
                    onChange={(e) => setSaleData({...saleData, saleNotes: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsSoldModalOpen(false)} 
                    className="flex-1 px-8 py-5 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmSale}
                    className="flex-1 px-8 py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20"
                  >
                    Confirmar Venda
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyList;
