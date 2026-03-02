
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Building, ChevronRight, LayoutGrid, Kanban as KanbanIcon, ArrowRight, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { Property, PropertyStatus, Expense } from '../types';
import { formatCurrency, calculatePropertyMetrics } from '../utils';

// --- Card Individual Memoizado para Performance Máxima ---
const PropertyCard = React.memo(({ 
  property, 
  metrics, 
  onDragStart, 
  onClick,
  onDelete
}: { 
  property: Property, 
  metrics: any, 
  onDragStart: (e: React.DragEvent) => void,
  onClick: () => void,
  onDelete: (e: React.MouseEvent) => void
}) => (
  <div 
    draggable
    onDragStart={onDragStart}
    onClick={onClick}
    className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1.5 transition-all duration-300 cursor-grab active:cursor-grabbing overflow-hidden group select-none relative"
  >
    <div className="h-24 md:h-28 overflow-hidden bg-slate-100 relative">
      {property.images && property.images.length > 0 ? (
        <img src={property.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20} /></div>
      )}
      <div className="absolute top-2 right-2 flex gap-1">
        <button 
          onClick={onDelete}
          className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
        <div className="text-[8px] text-emerald-600 font-black bg-white/90 backdrop-blur px-2 py-0.5 rounded shadow-sm flex items-center">
          {metrics.roi.toFixed(0)}% ROI
        </div>
      </div>
    </div>
    <div className="p-4">
      <h4 className="font-black text-slate-900 text-xs truncate mb-1 tracking-tight">{property.neighborhood}</h4>
      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center mb-3">
        <MapPin size={8} className="mr-1" /> {property.city}
      </p>
      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
        <span className="text-[10px] font-black text-slate-900">{formatCurrency(metrics.totalInvested)}</span>
        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-300 group-hover:text-blue-600 transition-colors">
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  </div>
));

interface KanbanColumnProps {
  status: PropertyStatus;
  items: Property[];
  expenses: Expense[];
  onDrop: (id: string, status: PropertyStatus) => void;
  onNavigate: (id: string) => void;
  onDeleteProperty: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  status, 
  items, 
  expenses, 
  onDrop, 
  onNavigate,
  onDeleteProperty
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const id = e.dataTransfer.getData('propertyId');
    if (id) onDrop(id, status);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInternal}
      className={`flex flex-col min-w-[280px] md:min-w-[320px] max-w-[360px] rounded-[40px] p-4 min-h-[500px] border-2 transition-all duration-200 ${
        isOver ? 'bg-blue-50/50 border-blue-400 border-dashed' : 'bg-slate-100/40 border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-6 px-3">
        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isOver ? 'text-blue-600' : 'text-slate-400'}`}>
          {status}
        </h3>
        <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-900 shadow-sm border border-slate-100">{items.length}</span>
      </div>
      
      <div className="space-y-4 flex-1">
        {items.map(p => (
          <PropertyCard 
            key={p.id}
            property={p}
            metrics={calculatePropertyMetrics(p, expenses)}
            onDragStart={(e) => {
              e.dataTransfer.setData('propertyId', p.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => onNavigate(p.id)}
            onDelete={(e) => {
              e.stopPropagation();
              onDeleteProperty(p.id);
            }}
          />
        ))}
        {items.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 opacity-20 border-2 border-dashed border-slate-200 rounded-[32px]">
            <Building size={32} className="mb-2" />
            <p className="text-[9px] font-black uppercase tracking-widest">Arraste para cá</p>
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
}

const PropertyList = ({ properties, expenses, onUpdateStatus, onDeleteProperty }: PropertyListProps) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');

  const filteredProperties = useMemo(() => {
    const s = search.toLowerCase();
    return properties.filter(p => p.neighborhood.toLowerCase().includes(s) || p.city.toLowerCase().includes(s));
  }, [properties, search]);

  const handleNavigate = useCallback((id: string) => navigate(`/imovel/${id}`), [navigate]);

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
              onDrop={onUpdateStatus}
              onNavigate={handleNavigate}
              onDeleteProperty={onDeleteProperty}
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
                 <div onClick={() => handleNavigate(p.id)} className="cursor-pointer">
                   <div className="h-52 relative overflow-hidden bg-slate-100">
                      {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={40} /></div>}
                      <div className="absolute top-5 left-5"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-white bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/10">{p.status}</span></div>
                   </div>
                   <div className="p-8">
                      <div className="flex justify-between items-start mb-2"><h3 className="font-black text-slate-900 truncate flex-1 tracking-tight text-xl">{p.neighborhood}</h3><div className="text-emerald-600 font-black text-base">{metrics.roi.toFixed(0)}%</div></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{p.city}</p>
                      <div className="flex justify-between items-end border-t border-slate-50 pt-6"><div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Capital Alocado</p><p className="font-black text-slate-900 text-lg truncate">{formatCurrency(metrics.totalInvested)}</p></div><div className="bg-slate-900 text-white p-3 rounded-2xl group-hover:bg-blue-600 transition-all"><ArrowRight size={20} /></div></div>
                   </div>
                 </div>
              </div>
             );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyList;
