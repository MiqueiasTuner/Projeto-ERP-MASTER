
import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Papa from 'papaparse';
import { 
  Package, Plus, Search, Filter, Trash2, Edit, X, 
  TrendingDown, AlertTriangle, Wallet, MessageCircle, 
  ArrowUpRight, History, MoreHorizontal, ChevronRight,
  ExternalLink, Building, XCircle, FileUp, FileDown, Loader2
} from 'lucide-react';
import { InventoryItem, StockMovement, MovementType, UserAccount } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { reportService } from '../../ReportService';

interface InsumosPageProps {
  items: InventoryItem[];
  movements?: StockMovement[];
  onDeleteItem: (id: string) => void;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  currentUser: UserAccount;
}

const InsumosPage = ({ items, movements = [], onDeleteItem, onAddItem, currentUser }: InsumosPageProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      await reportService.generateInventoryReport(items);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedItems = results.data.map((row: any) => ({
          name: row.nome || row.name || '',
          category: row.categoria || row.category || 'Outros',
          unit: (row.unidade || row.unit || 'un') as InventoryItem['unit'],
          minStock: parseFloat(row.estoqueMinimo || row.minStock) || 0,
          averageCost: parseFloat(row.custoMedio || row.averageCost) || 0,
          currentStock: 0,
          usageStatus: 0
        }));

        importedItems.forEach(item => {
          if (item.name) onAddItem(item);
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert(`${importedItems.length} insumos importados com sucesso!`);
      },
      error: (error) => {
        console.error("CSV Error:", error);
        alert("Erro ao processar CSV. Verifique o formato.");
      }
    });
  };

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    unit: 'un' as InventoryItem['unit'],
    minStock: 0,
    averageCost: 0,
    imageUrl: ''
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'minStock' || name === 'averageCost' ? (value === '' ? 0 : parseFloat(value)) : value
    }));
  };

  const handleEditItem = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    setFormData({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      minStock: item.minStock,
      averageCost: item.averageCost || 0,
      imageUrl: item.imageUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (formData.id) {
        // Edit logic - assuming onAddItem handles updates if ID is present or we need a separate onUpdate
        // For now, let's assume we need to update the parent
        await onAddItem({
          ...formData,
          currentStock: items.find(i => i.id === formData.id)?.currentStock || 0,
          usageStatus: items.find(i => i.id === formData.id)?.usageStatus || 0
        } as any);
      } else {
        await onAddItem({
          ...formData,
          currentStock: 0,
          usageStatus: 0
        } as any);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      category: '',
      unit: 'un',
      minStock: 0,
      averageCost: 0,
      imageUrl: ''
    });
  };

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

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         i.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || i.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [items]);

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

  const inputClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-3.5 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-[var(--text-muted)]";

  return (
    <div ref={pageRef} className="min-h-screen bg-[var(--bg-main)] space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-header)] tracking-tight">Gestão de Insumos</h2>
          <p className="text-[var(--text-muted)] font-medium">Controle de estoque, cotações e eficiência operacional.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="bg-[var(--bg-card)] text-[var(--text-main)] px-6 py-3 rounded-xl font-bold border border-[var(--border)] flex items-center gap-2 hover:bg-[var(--bg-card-alt)] transition-all shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
            <span>{isExporting ? 'Exportando...' : 'PDF'}</span>
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`bg-[var(--bg-card)] text-[var(--text-main)] px-6 py-3 rounded-xl font-bold border border-[var(--border)] flex items-center gap-2 hover:bg-[var(--bg-card-alt)] transition-all shadow-sm ${isFilterOpen ? 'ring-2 ring-[var(--accent)]' : ''}`}
            >
              <Filter size={18} /> <span>{filterCategory === 'All' ? 'Filtros' : filterCategory}</span>
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border)] z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setFilterCategory(cat); setIsFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${filterCategory === cat ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportCSV}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[var(--bg-card)] text-[var(--text-main)] px-6 py-3 rounded-xl font-bold border border-[var(--border)] flex items-center gap-2 hover:bg-[var(--bg-card-alt)] transition-all shadow-sm"
          >
            <FileUp size={18} /> <span>Importar CSV</span>
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-[var(--bg-header)] text-[var(--text-header)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all shadow-xl shadow-[var(--bg-header)]/10"
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
          className="bg-[var(--bg-card)] p-4 rounded-[20px] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Wallet size={20} />
            </div>
            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">+4.2%</span>
          </div>
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-0.5">Capital Imobilizado</p>
          <h3 className="text-xl font-black text-[var(--text-header)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.capitalImobilizado)}
          </h3>
          <p className="text-[9px] text-[var(--text-muted)] mt-1 font-medium">Valor total em estoque atual</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--bg-card)] p-4 rounded-[20px] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] rounded-xl">
              <TrendingDown size={20} />
            </div>
            <span className="text-[9px] font-black text-[var(--text-muted)] bg-[var(--bg-card-alt)] px-2 py-1 rounded-lg">Últimos 30 dias</span>
          </div>
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-0.5">Fluxo de Saída</p>
          <h3 className="text-xl font-black text-[var(--text-header)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.fluxoSaida)}
          </h3>
          <p className="text-[9px] text-[var(--text-muted)] mt-1 font-medium">Gastos em insumos recentemente</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-card)] p-4 rounded-[20px] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            {stats.alertasReposicao > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-0.5">Alertas de Reposição</p>
          <h3 className="text-xl font-black text-rose-600">{stats.alertasReposicao || 0} Itens</h3>
          <p className="text-[9px] text-[var(--text-muted)] mt-1 font-medium">Abaixo do estoque mínimo</p>
        </motion.div>
      </div>

      {/* Table Section */}
      <div className="bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input 
              type="text" 
              placeholder="Buscar insumo..." 
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card-alt)] border-none rounded-xl focus:ring-2 focus:ring-[var(--accent)]/20 outline-none font-medium text-xs transition-all text-[var(--text-main)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Visualização:</span>
            <div className="flex bg-[var(--bg-card-alt)] p-1 rounded-lg">
              <button className="p-1.5 bg-[var(--bg-card)] shadow-sm rounded-md text-[var(--text-header)]"><Package size={16} /></button>
              <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-header)]"><History size={16} /></button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-card-alt)]/50">
                <th className="px-4 py-3 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Insumo</th>
                <th className="px-4 py-3 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Categoria</th>
                <th className="px-4 py-3 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Imóvel Vinculado</th>
                <th className="px-4 py-3 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Saldo Atual</th>
                <th className="px-4 py-3 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Custo Médio</th>
                <th className="px-4 py-3 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Utilização</th>
                <th className="px-4 py-3 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => handleOpenDrawer(item)}
                  className="hover:bg-[var(--bg-card-alt)]/80 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-alt)] overflow-hidden border border-[var(--border)] flex items-center justify-center shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={16} className="text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text-header)] text-xs">{item.name}</p>
                        <p className="text-[9px] text-[var(--text-muted)] font-medium">ID: {item.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-[var(--bg-card-alt)] flex items-center justify-center text-[var(--text-muted)]">
                        <Building size={10} />
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        {item.linkedPropertyName || 'Estoque Central'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`font-black text-xs ${item.currentStock < item.minStock ? 'text-rose-500' : 'text-[var(--text-header)]'}`}>
                      {item.currentStock} <span className="text-[9px] font-normal text-[var(--text-muted)] uppercase">{item.unit}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-[var(--text-main)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.averageCost || 0)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-tighter">Status</span>
                        <span className="text-[9px] font-black text-[var(--text-header)]">{item.usageStatus || 0}%</span>
                      </div>
                      <div className="h-1 w-full bg-[var(--bg-card-alt)] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.usageStatus || 0}%` }}
                          className={`h-full rounded-full ${
                            (item.usageStatus || 0) > 80 ? 'bg-rose-500' : (item.usageStatus || 0) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleWhatsAppSync(e, item)}
                        className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                        title="WhatsApp Sync"
                      >
                        <MessageCircle size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleEditItem(e, item)}
                        className="p-2 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg transition-all"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                        className="p-2 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-rose-600 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
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
      {createPortal(
        <AnimatePresence>
          {isDrawerOpen && selectedItem && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="fixed inset-0 bg-[var(--bg-header)]/40 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full max-w-lg bg-[var(--bg-card)] shadow-2xl z-[110] flex flex-col border-l border-[var(--border)]"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Histórico do Insumo</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">{selectedItem.name}</p>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-3 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-2xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  {/* Item Summary in Drawer */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border)]">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Saldo Atual</p>
                      <p className="text-xl font-black text-[var(--text-header)]">{selectedItem.currentStock} {selectedItem.unit}</p>
                    </div>
                    <div className="p-5 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border)]">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Custo Médio</p>
                      <p className="text-xl font-black text-[var(--text-header)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedItem.averageCost || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Inflation Monitor Chart Placeholder */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Monitor de Inflação</h4>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg">Estável</span>
                    </div>
                    <div className="h-32 w-full bg-[var(--bg-card-alt)] rounded-2xl border border-dashed border-[var(--border)] flex items-center justify-center">
                      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Gráfico de Evolução de Preços</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Movimentações Recentes</h4>
                    <div className="space-y-4">
                      {itemHistory.length > 0 ? (
                        itemHistory.map((mov) => (
                          <div key={mov.id} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                mov.type === MovementType.ENTRADA_COMPRA ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--bg-card-alt)] text-[var(--text-muted)]'
                              }`}>
                                {mov.type === MovementType.ENTRADA_COMPRA ? <ArrowUpRight size={18} /> : <TrendingDown size={18} />}
                              </div>
                              <div className="w-px h-full bg-[var(--border)] group-last:hidden" />
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-[var(--text-header)] text-sm">{mov.type}</p>
                                <p className="text-[10px] font-bold text-[var(--text-muted)]">{new Date(mov.date).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] mb-2">{mov.description}</p>
                              <div className="flex items-center gap-4">
                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase">Qtd: <span className="text-[var(--text-header)]">{mov.quantity}</span></div>
                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase">Total: <span className="text-[var(--text-header)]">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mov.totalPrice)}
                                </span></div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10">
                          <Package size={32} className="text-[var(--border)] mx-auto mb-3" />
                          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Nenhuma movimentação registrada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-[var(--border)] bg-[var(--bg-card-alt)]/50">
                  <button className="w-full bg-[var(--bg-header)] text-[var(--text-header)] py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all flex items-center justify-center gap-2">
                    <ExternalLink size={16} />
                    <span>Ver Relatório Completo</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* New Insumo Drawer */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="fixed inset-0 bg-[var(--bg-header)]/40 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--bg-card)] shadow-2xl z-[110] flex flex-col border-l border-[var(--border)]"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">{formData.id ? 'Editar Insumo' : 'Novo Insumo'}</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">{formData.id ? 'Atualize os dados do material.' : 'Adicione ao catálogo.'}</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome do Material</label>
                    <input 
                      required
                      name="name"
                      type="text" 
                      placeholder="Ex: Cimento Votoran CP-II 50kg" 
                      className={inputClass} 
                      value={formData.name}
                      onChange={handleFormChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Categoria</label>
                    <select 
                      required
                      name="category"
                      className={inputClass}
                      value={formData.category}
                      onChange={handleFormChange}
                    >
                      <option value="">Selecione...</option>
                      <option value="Alvenaria">Alvenaria</option>
                      <option value="Elétrica">Elétrica</option>
                      <option value="Hidráulica">Hidráulica</option>
                      <option value="Pintura">Pintura</option>
                      <option value="Acabamento">Acabamento</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Unidade</label>
                      <select 
                        name="unit"
                        className={inputClass}
                        value={formData.unit}
                        onChange={handleFormChange}
                      >
                        <option value="un">Unidade (un)</option>
                        <option value="m2">m²</option>
                        <option value="kg">Quilo (kg)</option>
                        <option value="cx">Caixa (cx)</option>
                        <option value="l">Litro (l)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Estoque Mín.</label>
                      <input 
                        name="minStock"
                        type="number" 
                        placeholder="0" 
                        className={inputClass} 
                        value={formData.minStock === 0 ? '' : formData.minStock}
                        onFocus={(e) => e.target.select()}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Custo Médio (R$)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">R$</span>
                      <input 
                        name="averageCost"
                        type="number" 
                        placeholder="0.00" 
                        className={`${inputClass} pl-10`}
                        value={formData.averageCost === 0 ? '' : formData.averageCost}
                        onFocus={(e) => e.target.select()}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">URL da Imagem</label>
                    <input 
                      name="imageUrl"
                      type="text" 
                      placeholder="https://..." 
                      className={inputClass} 
                      value={formData.imageUrl}
                      onChange={handleFormChange}
                    />
                  </div>
                </form>

                <div className="p-8 border-t border-[var(--border)] bg-[var(--bg-card-alt)]/50 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
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
                      "Salvar"
                    )}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default InsumosPage;
