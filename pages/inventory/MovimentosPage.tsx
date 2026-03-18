
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowRightLeft, Plus, Search, Filter, Trash2, Edit, X, 
  ArrowUpRight, TrendingDown, Clock, Paperclip, 
  Building, Package, ChevronRight, MoreHorizontal,
  ArrowDownRight, CheckCircle2, AlertCircle, XCircle
} from 'lucide-react';
import { StockMovement, InventoryItem, Supplier, Property, MovementType, UserAccount } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface MovimentosPageProps {
  movements: StockMovement[];
  items: InventoryItem[];
  suppliers: Supplier[];
  properties: Property[];
  onAddMovement: (m: StockMovement) => void;
  currentUser: UserAccount;
}

const MovimentosPage = ({ movements, items, suppliers, properties, onAddMovement, currentUser }: MovimentosPageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ENTRY' | 'EXIT'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: MovementType.ENTRADA_COMPRA,
    itemId: '',
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    date: new Date().toISOString().split('T')[0],
    propertyId: '',
    supplierId: '',
    description: ''
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      const q = name === 'quantity' ? (value === '' ? 0 : parseFloat(value)) : prev.quantity;
      const u = name === 'unitPrice' ? (value === '' ? 0 : parseFloat(value)) : prev.unitPrice;
      const t = name === 'totalPrice' ? (value === '' ? 0 : parseFloat(value)) : prev.totalPrice;

      if (name === 'quantity' || name === 'unitPrice') {
        updated.totalPrice = q * u;
        updated.quantity = q;
        updated.unitPrice = u;
      } else if (name === 'totalPrice') {
        updated.totalPrice = t;
        if (q > 0) {
          updated.unitPrice = t / q;
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId || formData.quantity <= 0) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      const movement: StockMovement = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        quantity: Number(formData.quantity),
        totalPrice: Number(formData.totalPrice),
        unitPrice: Number(formData.totalPrice) / Number(formData.quantity)
      };
      await onAddMovement(movement);
      setIsModalOpen(false);
      setFormData({
        type: MovementType.ENTRADA_COMPRA,
        itemId: '',
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        date: new Date().toISOString().split('T')[0],
        propertyId: '',
        supplierId: '',
        description: ''
      });
    } catch (error) {
      console.error("Erro ao salvar movimento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for Widgets
  const stats = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalEntradas = movements
      .filter(m => m.type === MovementType.ENTRADA_COMPRA && new Date(m.date) >= firstDayOfMonth)
      .reduce((acc, m) => acc + m.totalPrice, 0);
      
    const totalSaidas = movements
      .filter(m => m.type === MovementType.SAIDA_OBRA && new Date(m.date) >= firstDayOfMonth)
      .reduce((acc, m) => acc + m.totalPrice, 0);
      
    const lastUpdate = movements.length > 0 
      ? new Date(Math.max(...movements.map(m => new Date(m.date).getTime())))
      : null;

    return { totalEntradas, totalSaidas, lastUpdate };
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return movements
      .filter(m => {
        const item = items.find(i => i.id === m.itemId);
        const matchesSearch = item?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             m.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = filterType === 'ALL' || 
                           (filterType === 'ENTRY' && m.type === MovementType.ENTRADA_COMPRA) ||
                           (filterType === 'EXIT' && m.type === MovementType.SAIDA_OBRA);
                           
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, items, searchTerm, filterType]);

  const inputClass = "w-full bg-[var(--bg-card)] text-[var(--text-main)] px-5 py-3.5 rounded-2xl border border-[var(--border-main)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-slate-400";

  return (
    <div className="min-h-screen bg-[var(--bg-main)] space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-header)] tracking-tight">Fluxo de Materiais</h2>
          <p className="text-[var(--text-muted)] font-medium">Auditoria completa de entradas e saídas de estoque.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[var(--bg-header)] text-[var(--text-header)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all shadow-xl shadow-[var(--bg-header)]/10"
          >
            <Plus size={18} /> <span>Novo Movimento</span>
          </button>
        </div>
      </div>

      {/* Top Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[var(--bg-card)] p-6 rounded-[20px] border border-[var(--border-main)] shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">+12% vs mês ant.</span>
          </div>
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mb-1">Total Entradas (Mês)</p>
          <h3 className="text-2xl font-black text-[var(--text-main)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalEntradas)}
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 font-medium">Volume de compras de materiais</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--bg-card)] p-6 rounded-[20px] border border-[var(--border-main)] shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <ArrowDownRight size={24} />
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">+8% vs mês ant.</span>
          </div>
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mb-1">Total Saídas (Canteiros)</p>
          <h3 className="text-2xl font-black text-[var(--text-main)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSaidas)}
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 font-medium">Valor enviado e aplicado nas obras</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-card)] p-6 rounded-[20px] border border-[var(--border-main)] shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[var(--bg-main)] text-[var(--text-muted)] rounded-xl">
              <Clock size={24} />
            </div>
            <span className="text-[10px] font-black text-[var(--text-muted)] bg-[var(--bg-main)] px-2 py-1 rounded-lg">Real-time</span>
          </div>
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mb-1">Última Atualização</p>
          <h3 className="text-2xl font-black text-[var(--text-main)]">
            {stats.lastUpdate ? stats.lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 font-medium">Tempo desde o último registro</p>
        </motion.div>
      </div>

      {/* Table Section */}
      <div className="bg-[var(--bg-card)] rounded-[24px] border border-[var(--border-main)] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[var(--border-main)] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por insumo ou descrição..." 
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-main)] border-none rounded-xl focus:ring-2 focus:ring-[var(--accent)]/20 outline-none font-medium text-sm transition-all text-[var(--text-main)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-[var(--bg-main)] p-1 rounded-xl shrink-0">
              <button 
                onClick={() => setFilterType('ALL')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'ALL' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterType('ENTRY')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'ENTRY' ? 'bg-[var(--bg-card)] text-emerald-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                Entradas
              </button>
              <button 
                onClick={() => setFilterType('EXIT')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'EXIT' ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                Saídas
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-main)]/50">
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Operação</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Insumo</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Origem / Destino</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Qtd</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Valor Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {filteredMovements.map((mov) => {
                const item = items.find(i => i.id === mov.itemId);
                const property = properties.find(p => p.id === mov.propertyId);
                
                return (
                  <tr key={mov.id} className="hover:bg-[var(--bg-main)]/80 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          mov.type === MovementType.ENTRADA_COMPRA ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--bg-main)] text-[var(--text-muted)]'
                        }`}>
                          {mov.type === MovementType.ENTRADA_COMPRA ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${
                            mov.type === MovementType.ENTRADA_COMPRA ? 'text-emerald-500' : 'text-[var(--text-muted)]'
                          }`}>
                            {mov.type === MovementType.ENTRADA_COMPRA ? 'Entrada' : 'Saída'}
                          </p>
                          <p className="text-[9px] text-[var(--text-muted)] font-bold">Auditado</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-bold text-[var(--text-main)]">
                        {new Date(mov.date).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {new Date(mov.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-main)] overflow-hidden border border-[var(--border-main)] flex items-center justify-center shrink-0">
                          {item?.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={16} className="text-[var(--text-muted)]" />
                          )}
                        </div>
                        <p className="font-bold text-[var(--text-main)] text-sm">{item?.name || 'Item não encontrado'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)]">
                          <Building size={12} />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-muted)]">
                          {mov.type === MovementType.ENTRADA_COMPRA ? 'Estoque Central' : (property?.neighborhood || 'Obra Desconhecida')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-black text-sm text-[var(--text-main)]">
                        {mov.quantity} <span className="text-[10px] font-normal text-[var(--text-muted)] uppercase">{item?.unit}</span>
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className={`text-sm font-black ${mov.type === MovementType.ENTRADA_COMPRA ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {mov.type === MovementType.ENTRADA_COMPRA ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mov.totalPrice)}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2.5 bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-all" title="Ver Recibo">
                          <Paperclip size={18} />
                        </button>
                        <button className="p-2.5 bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl transition-all">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-[var(--bg-main)] rounded-full text-[var(--text-muted)]">
                        <ArrowRightLeft size={40} />
                      </div>
                      <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">Nenhuma movimentação encontrada</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Movement Drawer */}
      <AnimatePresence mode="wait">
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[var(--bg-header)]/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 right-0 w-full max-w-md bg-[var(--bg-card)] shadow-2xl flex flex-col border-l border-[var(--border)]"
            >
                <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Novo Movimento</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">Audite entradas e saídas.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors rounded-full hover:bg-[var(--bg-main)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Tipo de Operação</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: MovementType.ENTRADA_COMPRA }))}
                        className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                          formData.type === MovementType.ENTRADA_COMPRA 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ring-2 ring-emerald-500/20' 
                            : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-main)] hover:bg-[var(--bg-main)]/80'
                        }`}
                      >
                        <ArrowUpRight size={16} /> Entrada
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: MovementType.SAIDA_OBRA }))}
                        className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                          formData.type === MovementType.SAIDA_OBRA 
                            ? 'bg-[var(--bg-main)] text-[var(--text-main)] border-[var(--accent)]/50 ring-2 ring-[var(--accent)]/20' 
                            : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-main)] hover:bg-[var(--bg-main)]/80'
                        }`}
                      >
                        <ArrowDownRight size={16} /> Saída
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Data do Registro</label>
                    <input 
                      required
                      name="date"
                      type="date" 
                      className={inputClass} 
                      value={formData.date}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Insumo / Material</label>
                    <select 
                      required
                      name="itemId"
                      className={inputClass}
                      value={formData.itemId}
                      onChange={handleFormChange}
                    >
                      <option value="">Selecione o material...</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Quantidade</label>
                      <input 
                        required
                        name="quantity"
                        type="number" 
                        placeholder="0.00" 
                        className={inputClass} 
                        value={formData.quantity === 0 ? '' : formData.quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Valor Unitário (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">R$</span>
                        <input 
                          required
                          name="unitPrice"
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          className={`${inputClass} pl-10`} 
                          value={formData.unitPrice === 0 ? '' : formData.unitPrice}
                          onFocus={(e) => e.target.select()}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Valor Total (Calculado)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">R$</span>
                      <input 
                        required
                        name="totalPrice"
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        className={`${inputClass} pl-10 bg-[var(--bg-main)]/50`} 
                        value={formData.totalPrice === 0 ? '' : formData.totalPrice}
                        onFocus={(e) => e.target.select()}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Destinação (Imóvel)</label>
                    <select 
                      name="propertyId"
                      className={inputClass}
                      value={formData.propertyId}
                      onChange={handleFormChange}
                    >
                      <option value="">Estoque Central</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.neighborhood} - {p.city}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Descrição / Motivo</label>
                    <textarea 
                      name="description"
                      className={`${inputClass} h-24 resize-none`}
                      placeholder="Ex: Reposição de estoque ou saída para pintura..."
                      value={formData.description}
                      onChange={handleFormChange}
                    />
                  </div>
                </form>

                <div className="p-8 border-t border-[var(--border-main)] bg-[var(--bg-main)]/50 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-main)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-[var(--bg-header)] text-[var(--text-header)] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[var(--bg-header)]/20 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Registrar"
                    )}
                  </button>
                </div>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MovimentosPage;
