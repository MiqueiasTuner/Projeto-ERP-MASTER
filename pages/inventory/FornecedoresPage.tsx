
import React, { useState } from 'react';
import { Truck, Plus, Search, Trash2, Edit, Phone, FileText, X, XCircle } from 'lucide-react';
import { Supplier } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface FornecedoresPageProps {
  suppliers: Supplier[];
  onAddSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

const FornecedoresPage = ({ suppliers, onAddSupplier, onDeleteSupplier }: FornecedoresPageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = (suppliers || []).filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.cnpj?.includes(searchTerm) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newSupplier: Supplier = {
      id: Math.random().toString(36).substr(2, 9),
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      cnpj: (form.elements.namedItem('cnpj') as HTMLInputElement).value,
      category: (form.elements.namedItem('category') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
    };
    onAddSupplier(newSupplier);
    setIsModalOpen(false);
  };

  const inputClass = "w-full bg-slate-50 text-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Fornecedores</h2>
          <p className="text-slate-500 font-medium text-sm">Gestão de parceiros e prestadores de serviço.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-8 py-3.5 rounded-[24px] font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20"
        >
          <Plus size={20} strokeWidth={3} /> <span className="text-sm">Novo Fornecedor</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, CNPJ ou categoria técnica..." 
            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-[20px] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredSuppliers.map(s => (
          <div key={s.id} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1.5 transition-all group flex items-start justify-between">
            <div className="flex gap-6">
              <div className="p-5 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-[24px] transition-colors shadow-inner">
                <Truck size={32} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-xl leading-tight mb-1 tracking-tight">{s.name}</h3>
                <p className="text-[10px] font-black text-blue-600 uppercase mb-4 tracking-[0.2em]">{s.category}</p>
                <div className="space-y-2">
                  <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <FileText size={14} className="mr-2 text-slate-300" /> {s.cnpj || 'Sem CNPJ'}
                  </div>
                  <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <Phone size={14} className="mr-2 text-slate-300" /> {s.phone}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit size={18} /></button>
              <button onClick={() => onDeleteSupplier(s.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {filteredSuppliers.length === 0 && (
          <div className="lg:col-span-2 py-20 text-center text-slate-300 italic font-black uppercase tracking-widest text-xs bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
            Nenhum fornecedor encontrado.
          </div>
        )}
      </div>

      {/* New Fornecedor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Fornecedor</h3>
                  <p className="text-slate-500 text-sm font-medium">Cadastre parceiros estratégicos para sua obra.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <XCircle size={32} strokeWidth={1.5} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social / Nome Fantasia</label>
                  <input required name="name" type="text" placeholder="Ex: Silva Construções Ltda" className={inputClass} />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ ou CPF</label>
                  <input name="cnpj" type="text" placeholder="00.000.000/0001-00" className={inputClass} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria Técnica</label>
                    <input required name="category" type="text" placeholder="Ex: Hidráulica" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Contato / Celular</label>
                    <input required name="phone" type="text" placeholder="(11) 99999-9999" className={inputClass} />
                  </div>
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
                    Efetivar Cadastro
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

export default FornecedoresPage;
