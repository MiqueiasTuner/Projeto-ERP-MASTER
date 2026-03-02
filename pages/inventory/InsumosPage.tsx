
import React, { useState } from 'react';
import { Package, Plus, Search, Filter, Trash2, Edit, X } from 'lucide-react';
import { InventoryItem } from '../../types';

interface InsumosPageProps {
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  onDeleteItem: (id: string) => void;
}

const InsumosPage = ({ items, setItems, onDeleteItem }: InsumosPageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newItem: InventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      category: (form.elements.namedItem('category') as HTMLInputElement).value,
      unit: (form.elements.namedItem('unit') as HTMLSelectElement).value as any,
      minStock: parseFloat((form.elements.namedItem('min') as HTMLInputElement).value),
      currentStock: 0
    };
    setItems([...items, newItem]);
    setIsModalOpen(false);
  };

  const inputClass = "w-full bg-slate-50 text-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Catálogo de Insumos</h2>
          <p className="text-slate-500 font-medium">Gestão inteligente de materiais para reforma.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-8 py-3.5 rounded-[24px] font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20"
        >
          <Plus size={20} strokeWidth={3} /> <span>Novo Item</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Filtrar por nome do material ou categoria técnica..." 
            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-[20px] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none font-medium placeholder:text-slate-400 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
                <Package size={28} />
              </div>
              <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-3 py-1.5 rounded-xl tracking-[0.1em]">
                {item.category}
              </span>
            </div>
            <h3 className="font-black text-slate-900 mb-2 text-lg tracking-tight">{item.name}</h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Estoque Físico</p>
                <p className={`text-2xl font-black ${item.currentStock < item.minStock ? 'text-rose-500' : 'text-slate-900'}`}>
                  {item.currentStock} <span className="text-sm font-normal text-slate-400">{item.unit}</span>
                </p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl"><Edit size={16} /></button>
                <button 
                  onClick={() => onDeleteItem(item.id)}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {item.currentStock < item.minStock && (
              <div className="mt-6 flex items-center gap-2 text-[10px] text-rose-600 font-black bg-rose-50 px-4 py-3 rounded-2xl border border-rose-100">
                <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                ABAIXO DO MÍNIMO ({item.minStock})
              </div>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <form onSubmit={addItem} className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tight">Novo Insumo</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Nome Comercial</label>
                <input required name="name" type="text" placeholder="Ex: Cimento Votoran CP-II 50kg" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Categoria Técnica</label>
                  <input required name="category" type="text" placeholder="Ex: Alvenaria" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Unidade</label>
                  <select name="unit" className={inputClass + " appearance-none"}>
                    <option value="un">Unidade (un)</option>
                    <option value="m2">Metro Quadrado (m2)</option>
                    <option value="kg">Quilo (kg)</option>
                    <option value="cx">Caixa (cx)</option>
                    <option value="l">Litro (l)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Nível Mínimo para Alerta</label>
                <input required name="min" type="number" placeholder="Ex: 10" className={inputClass} />
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-[20px] text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all">Salvar Material</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InsumosPage;
