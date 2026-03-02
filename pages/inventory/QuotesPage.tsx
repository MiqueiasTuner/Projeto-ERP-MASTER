
import React, { useState } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, 
  CheckCircle2, XCircle, Clock, ArrowRight,
  Trash2, Edit3, ShoppingCart, User
} from 'lucide-react';
import { Quote, QuoteStatus, Supplier, InventoryItem, MovementType } from '../../types';

interface QuotesPageProps {
  quotes: Quote[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  onAddQuote: (quote: Quote) => void;
  onUpdateQuoteStatus: (id: string, status: QuoteStatus) => void;
  onDeleteQuote: (id: string) => void;
  onPurchaseQuote: (quote: Quote) => void;
}

const QuotesPage = ({ 
  quotes, 
  suppliers, 
  inventory, 
  onAddQuote, 
  onUpdateQuoteStatus, 
  onDeleteQuote,
  onPurchaseQuote
}: QuotesPageProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'Todos'>('Todos');

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
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: quoteItems.map(qi => ({
        ...qi,
        name: inventory.find(i => i.id === qi.itemId)?.name || 'Item desconhecido'
      })),
      totalAmount,
      status: QuoteStatus.PENDENTE,
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

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'Todos' || q.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.PENDENTE: return 'bg-amber-100 text-amber-700 border-amber-200';
      case QuoteStatus.APROVADO: return 'bg-blue-100 text-blue-700 border-blue-200';
      case QuoteStatus.REJEITADO: return 'bg-rose-100 text-rose-700 border-rose-200';
      case QuoteStatus.CONCLUIDO: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.PENDENTE: return <Clock size={14} />;
      case QuoteStatus.APROVADO: return <CheckCircle2 size={14} />;
      case QuoteStatus.REJEITADO: return <XCircle size={14} />;
      case QuoteStatus.CONCLUIDO: return <ShoppingCart size={14} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Orçamentos</h1>
          <p className="text-slate-500 font-medium">Gestão de cotações e compras com fornecedores</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Orçamento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por fornecedor..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium appearance-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="Todos">Todos os Status</option>
            {Object.values(QuoteStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Orçamento</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><XCircle size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fornecedor</label>
                <select 
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-slate-900 transition-all font-medium"
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
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Itens do Orçamento</label>
                  <button 
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Adicionar Item
                  </button>
                </div>
                
                {quoteItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="col-span-12 md:col-span-5">
                      <select 
                        required
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium"
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
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium"
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
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium"
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
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-slate-900 transition-all font-medium min-h-[100px]"
                  placeholder="Condições de pagamento, prazo de entrega, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                >
                  Salvar Orçamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {filteredQuotes.length > 0 ? (
          filteredQuotes.map(quote => (
            <div key={quote.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="bg-slate-50 p-4 rounded-2xl text-slate-400 group-hover:text-slate-900 transition-colors">
                    <FileText size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{quote.supplierName}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(quote.status)} flex items-center gap-1.5`}>
                        {getStatusIcon(quote.status)}
                        {quote.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {quote.date}</span>
                      <span className="flex items-center gap-1.5"><ShoppingCart size={14} /> {quote.items.length} itens</span>
                      <span className="text-slate-900 font-bold">Total: R$ {quote.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {quote.status === QuoteStatus.PENDENTE && (
                    <>
                      <button 
                        onClick={() => onUpdateQuoteStatus(quote.id, QuoteStatus.APROVADO)}
                        className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                        <CheckCircle2 size={16} /> Aprovar
                      </button>
                      <button 
                        onClick={() => onUpdateQuoteStatus(quote.id, QuoteStatus.REJEITADO)}
                        className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                        <XCircle size={16} /> Rejeitar
                      </button>
                    </>
                  )}
                  {quote.status === QuoteStatus.APROVADO && (
                    <button 
                      onClick={() => onPurchaseQuote(quote)}
                      className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 text-xs font-bold shadow-lg shadow-emerald-600/20"
                    >
                      <ShoppingCart size={16} /> Confirmar Compra
                    </button>
                  )}
                  <button 
                    onClick={() => onDeleteQuote(quote.id)}
                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="px-8 pb-8">
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    <div className="col-span-6">Item</div>
                    <div className="col-span-2 text-center">Qtd</div>
                    <div className="col-span-2 text-right">Unit</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                  {quote.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-xs font-bold text-slate-600 px-2 border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                      <div className="col-span-6">{item.name}</div>
                      <div className="col-span-2 text-center">{item.quantity}</div>
                      <div className="col-span-2 text-right">R$ {item.unitPrice.toFixed(2)}</div>
                      <div className="col-span-2 text-right text-slate-900">R$ {(item.quantity * item.unitPrice).toFixed(2)}</div>
                    </div>
                  ))}
                  {quote.notes && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                      <p className="text-xs text-slate-500 italic">{quote.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-[32px] border border-dashed border-slate-200 p-20 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">Comece criando um novo orçamento para negociar com seus fornecedores.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotesPage;
