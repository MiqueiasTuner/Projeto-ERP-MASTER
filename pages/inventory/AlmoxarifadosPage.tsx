
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Warehouse as WarehouseIcon, Plus, MapPin, Trash2, Edit, X } from 'lucide-react';
import { Warehouse, UserAccount } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface AlmoxarifadosPageProps {
  warehouses: Warehouse[];
  onAddWarehouse: (w: Warehouse) => void;
  onDeleteWarehouse: (id: string) => void;
  currentUser: UserAccount;
}

const AlmoxarifadosPage = ({ warehouses, onAddWarehouse, onDeleteWarehouse, currentUser }: AlmoxarifadosPageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newWarehouse: Warehouse = {
      id: editingWarehouse?.id || Math.random().toString(36).substr(2, 9),
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      location: (form.elements.namedItem('location') as HTMLInputElement).value
    };
    onAddWarehouse(newWarehouse);
    setIsModalOpen(false);
    setEditingWarehouse(null);
  };

  const handleEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setIsModalOpen(true);
  };

  const inputClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-3.5 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-[var(--text-muted)]";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-[var(--text-header)] tracking-tight">Almoxarifados</h2>
          <p className="text-[var(--text-muted)] font-medium text-sm">Locais físicos de armazenamento central ou periférico.</p>
        </div>
        <button 
          onClick={() => { setEditingWarehouse(null); setIsModalOpen(true); }}
          className="bg-[var(--bg-header)] text-[var(--text-header)] px-8 py-3.5 rounded-[24px] font-black flex items-center gap-3 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all shadow-2xl shadow-[var(--bg-header)]/20"
        >
          <Plus size={20} strokeWidth={3} /> <span className="text-sm">Novo Ponto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(warehouses || []).map(w => (
          <div key={w.id} className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm hover:shadow-2xl hover:shadow-[var(--accent)]/5 hover:-translate-y-1.5 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-[var(--bg-card-alt)] text-[var(--text-muted)] rounded-[20px] shadow-inner transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-text)]">
                <WarehouseIcon size={28} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEdit(w)} className="p-2.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-all"><Edit size={16} /></button>
                <button onClick={() => onDeleteWarehouse(w.id)} className="p-2.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-rose-600 rounded-xl transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
            <h3 className="font-black text-[var(--text-header)] text-xl mb-2 tracking-tight">{w.name}</h3>
            <div className="flex items-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
              <MapPin size={14} className="mr-1.5 text-[var(--accent)]" /> {w.location}
            </div>
          </div>
        ))}
        {(!warehouses || warehouses.length === 0) && (
          <div className="col-span-full py-20 text-center text-[var(--text-muted)] italic font-black uppercase tracking-widest text-xs bg-[var(--bg-card-alt)] rounded-[40px] border-2 border-dashed border-[var(--border)]">
            Nenhum ponto de armazenamento cadastrado.
          </div>
        )}
      </div>

      {/* New Almoxarifado Drawer */}
      <AnimatePresence>
        {isModalOpen && createPortal(
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsModalOpen(false); setEditingWarehouse(null); }}
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
                  <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">{editingWarehouse ? 'Editar Almoxarifado' : 'Novo Almoxarifado'}</h3>
                  <p className="text-[var(--text-muted)] text-sm font-medium">{editingWarehouse ? 'Atualize os dados do local.' : 'Cadastre um novo local de armazenamento.'}</p>
                </div>
                <button 
                  onClick={() => { setIsModalOpen(false); setEditingWarehouse(null); }}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Identificação do Local</label>
                  <input required name="name" type="text" placeholder="Ex: Depósito Central - Zona Norte" className={inputClass} defaultValue={editingWarehouse?.name || ''} />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Endereço de Referência</label>
                  <input required name="location" type="text" placeholder="Ex: Av. das Indústrias, 500" className={inputClass} defaultValue={editingWarehouse?.location || ''} />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingWarehouse(null); }}
                    className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[var(--bg-header)] text-[var(--text-header)] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[var(--bg-header)]/20 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all"
                  >
                    {editingWarehouse ? 'Salvar Alterações' : 'Salvar Local'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};

export default AlmoxarifadosPage;
