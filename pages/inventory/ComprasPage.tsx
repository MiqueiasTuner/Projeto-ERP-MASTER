
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Plus, Search, Filter, Calendar, 
  CheckCircle2, XCircle, Clock, ArrowRight, ArrowLeft,
  Trash2, Edit3, ShoppingCart, User, Zap,
  MoreHorizontal, Building, Package, X
} from 'lucide-react';
import { Quote, QuoteStatus, Supplier, InventoryItem, Property, UserAccount } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface ComprasPageProps {
  quotes: Quote[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  properties: Property[];
  onAddQuote: (quote: Quote) => void;
  onUpdateQuoteStatus: (id: string, status: QuoteStatus) => void;
  onDeleteQuote: (id: string) => void;
  onPurchaseQuote: (quote: Quote) => void;
  currentUser: UserAccount;
}

const ComprasPage = ({ 
  quotes, 
  suppliers, 
  inventory, 
  properties,
  onAddQuote, 
  onUpdateQuoteStatus, 
  onDeleteQuote,
  onPurchaseQuote,
  currentUser
}: ComprasPageProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quoteItems, setQuoteItems] = useState<{ itemId: string, quantity: number, unitPrice: number }[]>([]);
  const [notes, setNotes] = useState('');

  const handleAddItem = () => {
    setQuoteItems([...quoteItems, { itemId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuoteItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    const totalAmount = quoteItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const newQuote: Quote = {
      id: Math.random().toString(36).substr(2, 9),
      organizationId: currentUser.organizationId || '',
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: quoteItems.map(qi => ({
        ...qi,
        name: inventory.find(i => i.id === qi.itemId)?.name || 'Item desconhecido'
      })),
      totalAmount,
      status: QuoteStatus.SOLICITADO,
      date: new Date().toISOString().split('T')[0],
      notes
    };

    onAddQuote(newQuote);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedSupplierId('');
    setQuoteItems([]);
    setNotes('');
  };

  const kanbanColumns = [
    { id: QuoteStatus.SOLICITADO, title: 'Solicitado', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: QuoteStatus.COTACAO, title: 'Em Cotação', icon: FileText, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10' },
    { id: QuoteStatus.APROVADO, title: 'Aprovado', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: QuoteStatus.RECEBIDO, title: 'Recebido', icon: ShoppingCart, color: 'text-[var(--text-header)]', bg: 'bg-[var(--bg-card-alt)]', showZap: true },
  ];

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => 
      q.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [quotes, searchTerm]);

  const inputClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-3.5 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-[var(--text-muted)]";

  return (
    <div className="min-h-screen bg-[var(--bg-main)] space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-header)] tracking-tight">Dashboard de Compras</h2>
          <p className="text-[var(--text-muted)] font-medium">Gestão estratégica de suprimentos e Kanban de pedidos.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Buscar pedidos..." 
              className="w-full pl-12 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/20 outline-none font-medium text-sm transition-all text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[var(--bg-header)] text-[var(--text-header)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all shadow-xl shadow-[var(--bg-header)]/10"
          >
            <Plus size={18} /> <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {kanbanColumns.map(column => (
          <div key={column.id} className="flex flex-col min-w-[280px]">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 ${column.bg} ${column.color} rounded-lg`}>
                  <column.icon size={18} />
                </div>
                <h3 className="font-black text-[var(--text-header)] text-sm uppercase tracking-widest">{column.title}</h3>
                {column.showZap && (
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg ml-2">
                    <Zap size={10} fill="currentColor" />
                    <span>AUTO-ESTOQUE</span>
                  </div>
                )}
              </div>
              <span className="text-xs font-black text-[var(--text-muted)] bg-[var(--bg-card-alt)] px-2 py-1 rounded-md">
                {filteredQuotes.filter(q => q.status === column.id).length}
              </span>
            </div>

            <div className="flex-1 space-y-4 min-h-[500px] bg-[var(--bg-card-alt)]/50 p-3 rounded-[24px] border border-dashed border-[var(--border)]">
              {filteredQuotes.filter(q => q.status === column.id).map(quote => (
                <motion.div 
                  layoutId={quote.id}
                  key={quote.id}
                  className="bg-[var(--bg-card)] p-5 rounded-2xl shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow cursor-pointer group relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">#{quote.id.substring(0, 6)}</span>
                    <button className="text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  
                  <h4 className="font-bold text-[var(--text-header)] text-sm mb-1 line-clamp-2">
                    {quote.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                  </h4>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[var(--bg-card-alt)] flex items-center justify-center text-[var(--text-muted)]">
                      <User size={12} />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-main)] truncate">{quote.supplierName}</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total</span>
                      <span className="text-sm font-black text-[var(--text-header)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 rounded-lg">
                      <Building size={10} />
                      <span>OBRA MASTER</span>
                    </div>
                  </div>

                  {/* Quick Actions Overlay */}
                  <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                    {column.id === QuoteStatus.COTACAO && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateQuoteStatus(quote.id, QuoteStatus.SOLICITADO); }}
                        className="bg-[var(--bg-card)] p-2 rounded-lg shadow-sm text-[var(--text-muted)] hover:text-[var(--accent)] hover:scale-110 transition-transform"
                      >
                        <ArrowLeft size={18} />
                      </button>
                    )}
                    {column.id === QuoteStatus.APROVADO && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateQuoteStatus(quote.id, QuoteStatus.COTACAO); }}
                        className="bg-[var(--bg-card)] p-2 rounded-lg shadow-sm text-[var(--text-muted)] hover:text-[var(--accent)] hover:scale-110 transition-transform"
                      >
                        <ArrowLeft size={18} />
                      </button>
                    )}
                    
                    {column.id === QuoteStatus.SOLICITADO && (
                      <button 
                        onClick={() => onUpdateQuoteStatus(quote.id, QuoteStatus.COTACAO)}
                        className="bg-[var(--bg-card)] p-2 rounded-lg shadow-sm text-[var(--accent)] hover:scale-110 transition-transform"
                      >
                        <ArrowRight size={18} />
                      </button>
                    )}
                    {column.id === QuoteStatus.COTACAO && (
                      <button 
                        onClick={() => onUpdateQuoteStatus(quote.id, QuoteStatus.APROVADO)}
                        className="bg-[var(--bg-card)] p-2 rounded-lg shadow-sm text-emerald-600 hover:scale-110 transition-transform"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    {column.id === QuoteStatus.APROVADO && (
                      <button 
                        onClick={() => onPurchaseQuote(quote)}
                        className="bg-emerald-600 p-2 rounded-lg shadow-sm text-white hover:scale-110 transition-transform"
                      >
                        <ShoppingCart size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => onDeleteQuote(quote.id)}
                      className="bg-[var(--bg-card)] p-2 rounded-lg shadow-sm text-rose-500 hover:scale-110 transition-transform"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* New Orçamento Drawer */}
      {createPortal(
        <AnimatePresence>
          {isAdding && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdding(false)}
                className="fixed inset-0 bg-[var(--bg-header)]/40 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[var(--bg-card)] shadow-2xl z-[110] flex flex-col border-l border-[var(--border)]"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Novo Orçamento</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">Inicie uma nova cotação.</p>
                  </div>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Fornecedor</label>
                    <select 
                      required
                      className={inputClass}
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                    >
                      <option value="">Selecione um fornecedor</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Itens do Orçamento</label>
                      <button 
                        type="button"
                        onClick={handleAddItem}
                        className="text-xs font-bold text-[var(--accent)] flex items-center gap-1 hover:underline"
                      >
                        <Plus size={14} /> Adicionar Item
                      </button>
                    </div>
                    
                    {quoteItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border)]">
                        <div className="col-span-12 md:col-span-5">
                          <select 
                            required
                            className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl outline-none text-sm font-medium text-[var(--text-main)]"
                            value={item.itemId}
                            onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                          >
                            <option value="">Selecione o insumo</option>
                            {inventory.map(i => (
                              <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <input 
                            type="number"
                            placeholder="Qtd"
                            required
                            min="1"
                            className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl outline-none text-sm font-medium text-[var(--text-main)]"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <input 
                            type="number"
                            placeholder="R$ Unit"
                            required
                            min="0"
                            step="0.01"
                            className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl outline-none text-sm font-medium text-[var(--text-main)]"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-1 flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Observações</label>
                    <textarea 
                      className={`${inputClass} min-h-[100px]`}
                      placeholder="Condições de pagamento, prazo de entrega, etc..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-[var(--bg-header)] text-[var(--text-header)] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[var(--bg-header)]/20 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all"
                    >
                      Salvar Orçamento
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default ComprasPage;
