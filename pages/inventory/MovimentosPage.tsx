
import React, { useState } from 'react';
import { ArrowRightLeft, Plus, Search, Truck, MapPin, Building2, ShoppingCart, X } from 'lucide-react';
import { StockMovement, InventoryItem, Supplier, Property, MovementType } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

interface MovimentosPageProps {
  movements: StockMovement[];
  items: InventoryItem[];
  suppliers: Supplier[];
  properties: Property[];
  onAddMovement: (m: StockMovement) => void;
}

const MovimentosPage = ({ movements, items, suppliers, properties, onAddMovement }: MovimentosPageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    
    // Captura manual dos campos para garantir precisão
    const itemId = (form.elements.namedItem('itemId') as HTMLSelectElement).value;
    const type = (form.elements.namedItem('type') as HTMLSelectElement).value as MovementType;
    const quantity = parseFloat((form.elements.namedItem('quantity') as HTMLInputElement).value);
    const unitPrice = parseFloat((form.elements.namedItem('unitPrice') as HTMLInputElement).value);
    const date = (form.elements.namedItem('date') as HTMLInputElement).value;
    const propertyId = (form.elements.namedItem('propertyId') as HTMLSelectElement).value || undefined;
    const description = (form.elements.namedItem('description') as HTMLInputElement).value;

    if (!itemId || isNaN(quantity) || quantity <= 0) {
      alert("Por favor, preencha todos os campos obrigatórios corretamente.");
      return;
    }

    onAddMovement({
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      type,
      quantity,
      unitPrice: unitPrice || 0,
      totalPrice: quantity * (unitPrice || 0),
      date,
      propertyId,
      description: description || "Movimentação registrada via sistema"
    });
    
    setIsModalOpen(false);
  };

  const inputClass = "w-full bg-slate-50 text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Fluxo de Materiais</h2>
          <p className="text-slate-500 font-medium text-sm">Controle logístico de compras e canteiros.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-[28px] font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl"
        >
          <Plus size={20} strokeWidth={3} /> <span>Novo Movimento</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6">Data</th>
                <th className="px-8 py-6">Operação</th>
                <th className="px-8 py-6">Insumo</th>
                <th className="px-8 py-6">Qtd</th>
                <th className="px-8 py-6 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...movements].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((mov) => {
                const item = items.find(i => i.id === mov.itemId);
                return (
                  <tr key={mov.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6 text-[11px] font-bold text-slate-500">{formatDate(mov.date)}</td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${mov.type === MovementType.ENTRADA_COMPRA ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                        {mov.type}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-800 tracking-tight">{item?.name || 'Item não encontrado'}</td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-600">
                      {mov.quantity} <span className="text-[10px] font-normal text-slate-400">{item?.unit}</span>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-slate-900 text-base">{formatCurrency(mov.totalPrice)}</td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-300 italic font-black uppercase tracking-widest text-xs">Nenhuma movimentação registrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl p-8 md:p-12 my-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black tracking-tight">Novo Movimento</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tipo de Operação</label>
                  <select name="type" required className={inputClass}>
                    {Object.values(MovementType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Data</label>
                  <input name="date" required type="date" className={inputClass} defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Insumo / Material</label>
                <select name="itemId" required className={inputClass}>
                  <option value="">Selecione o material...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Quantidade</label>
                  <input name="quantity" required type="number" step="0.01" className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Preço Unitário (Opcional)</label>
                  <input name="unitPrice" type="number" step="0.01" className={inputClass} placeholder="R$ 0.00" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Destinação (Imóvel)</label>
                <select name="propertyId" className={inputClass}>
                  <option value="">Estoque Central</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.neighborhood} - {p.city}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Observações</label>
                <input name="description" type="text" className={inputClass} placeholder="Ex: NF 1234, Uso na pintura, etc." />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-12">
              <button type="button" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Cancelar</button>
              <button type="submit" className="order-1 sm:order-2 flex-1 py-4 bg-blue-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all">Registrar Movimento</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MovimentosPage;
