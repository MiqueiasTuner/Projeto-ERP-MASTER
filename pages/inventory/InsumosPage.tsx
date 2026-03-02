
import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Search, Filter, Trash2, Edit, X, 
  TrendingDown, AlertTriangle, Wallet, MessageCircle, 
  ArrowUpRight, History, MoreHorizontal, ChevronRight,
  ExternalLink, Building, XCircle
} from 'lucide-react';
import { InventoryItem, StockMovement, MovementType } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface InsumosPageProps {
  items: InventoryItem[];
  movements?: StockMovement[];
  onDeleteItem: (id: string) => void;
}

const InsumosPage = ({ items, movements = [], onDeleteItem }: InsumosPageProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculations for Widgets
  const stats = useMemo(() => {
    const capitalImobilizado = items.reduce((acc, item) => acc + (item.currentStock * (item.averageCost || 0)), 0);
    
    // Last 30 days movements
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const fluxoSaida = movements
      .filter(m => m.type === MovementType.SAIDA_OBRA && new Date(m.date) >= thirtyDaysAgo)
      .reduce((acc, m) => acc + m.totalPrice, 0);
      
    const alertasReposicao = items.filter(i => i.currentStock < i.minStock).length;

    return { capitalImobilizado, fluxoSaida, alertasReposicao };
  }, [items, movements]);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDrawer = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleWhatsAppSync = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    const phone = "5511999999999"; // Mock or from supplier
    const supplier = item.supplierName || "Fornecedor";
    const property = item.linkedPropertyName || "Obra Master";
    const message = `Olá ${supplier}, aqui é da Master Imóveis. Preciso de cotação/entrega do item ${item.name} para a obra ${property}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const itemHistory = useMemo(() => {
    if (!selectedItem) return [];
    return movements
      .filter(m => m.itemId === selectedItem.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedItem, movements]);

  const inputClass = "w-full bg-slate-50 text-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Insumos</h2>
          <p className="text-slate-500 font-medium">Controle de estoque, cotações e eficiência operacional.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-slate-700 px-6 py-3 rounded-xl font-bold border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={18} /> <span>Filtros</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10"
          >
            <Plus size={18} /> <span>Novo Insumo</span>
          </button>
        </div>
      </div>

      {/* Top Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Wallet size={24} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+4.2%</span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Capital Imobilizado</p>
          <h3 className="text-2xl font-black text-slate-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.capitalImobilizado || 1250000)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Valor total em estoque atual</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Últimos 30 dias</span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Fluxo de Saída</p>
          <h3 className="text-2xl font-black text-slate-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.fluxoSaida || 45200)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Gastos em insumos recentemente</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={24} />
            </div>
            {stats.alertasReposicao > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Alertas de Reposição</p>
          <h3 className="text-2xl font-black text-rose-600">{stats.alertasReposicao || 0} Itens</h3>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Abaixo do estoque mínimo</p>
        </motion.div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar insumo ou categoria..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visualização:</span>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button className="p-1.5 bg-white shadow-sm rounded-md text-slate-900"><Package size={16} /></button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600"><History size={16} /></button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insumo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Imóvel Vinculado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Médio</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilização</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => handleOpenDrawer(item)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">ID: {item.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                        <Building size={12} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {item.linkedPropertyName || 'Estoque Central'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className={`font-black text-sm ${item.currentStock < item.minStock ? 'text-rose-500' : 'text-slate-900'}`}>
                      {item.currentStock} <span className="text-[10px] font-normal text-slate-400 uppercase">{item.unit}</span>
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.averageCost || 0)}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-32">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Status</span>
                        <span className="text-[10px] font-black text-slate-900">{item.usageStatus || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.usageStatus || 0}%` }}
                          className={`h-full rounded-full ${
                            (item.usageStatus || 0) > 80 ? 'bg-rose-500' : (item.usageStatus || 0) > 50 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleWhatsAppSync(e, item)}
                        className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="WhatsApp Sync"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Histórico do Insumo</h3>
                  <p className="text-slate-500 text-sm font-medium">{selectedItem.name}</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Item Summary in Drawer */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Atual</p>
                    <p className="text-xl font-black text-slate-900">{selectedItem.currentStock} {selectedItem.unit}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Médio</p>
                    <p className="text-xl font-black text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedItem.averageCost || 0)}
                    </p>
                  </div>
                </div>

                {/* Inflation Monitor Chart Placeholder */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Monitor de Inflação</h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Estável</span>
                  </div>
                  <div className="h-32 w-full bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gráfico de Evolução de Preços</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Movimentações Recentes</h4>
                  <div className="space-y-4">
                    {itemHistory.length > 0 ? (
                      itemHistory.map((mov) => (
                        <div key={mov.id} className="flex gap-4 group">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              mov.type === MovementType.ENTRADA_COMPRA ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {mov.type === MovementType.ENTRADA_COMPRA ? <ArrowUpRight size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div className="w-px h-full bg-slate-100 group-last:hidden" />
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-bold text-slate-900 text-sm">{mov.type}</p>
                              <p className="text-[10px] font-bold text-slate-400">{new Date(mov.date).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">{mov.description}</p>
                            <div className="flex items-center gap-4">
                              <div className="text-[10px] font-black text-slate-400 uppercase">Qtd: <span className="text-slate-900">{mov.quantity}</span></div>
                              <div className="text-[10px] font-black text-slate-400 uppercase">Total: <span className="text-slate-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mov.totalPrice)}
                              </span></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <Package size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma movimentação registrada</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                  <ExternalLink size={16} />
                  <span>Ver Relatório Completo</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Insumo Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Insumo</h3>
                  <p className="text-slate-500 text-sm font-medium">Adicione materiais ao catálogo estratégico.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <XCircle size={32} strokeWidth={1.5} />
                </button>
              </div>

              <form className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Material</label>
                    <input type="text" placeholder="Ex: Cimento Votoran CP-II 50kg" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select className={inputClass}>
                      <option value="">Selecione...</option>
                      <option value="Alvenaria">Alvenaria</option>
                      <option value="Elétrica">Elétrica</option>
                      <option value="Hidráulica">Hidráulica</option>
                      <option value="Pintura">Pintura</option>
                      <option value="Acabamento">Acabamento</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                    <select className={inputClass}>
                      <option value="un">Unidade (un)</option>
                      <option value="m2">Metro Quadrado (m2)</option>
                      <option value="kg">Quilo (kg)</option>
                      <option value="cx">Caixa (cx)</option>
                      <option value="l">Litro (l)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Estoque Mínimo</label>
                    <input type="number" placeholder="0" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo Inicial (R$)</label>
                    <input type="number" placeholder="0.00" className={inputClass} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Imagem (Opcional)</label>
                  <input type="text" placeholder="https://..." className={inputClass} />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all"
                  >
                    Salvar Insumo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InsumosPage;
