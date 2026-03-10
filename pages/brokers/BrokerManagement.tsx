
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, Search, Mail, Phone, MapPin, UserCheck, UserX, 
  Edit2, Trash2, Building2, LayoutGrid, Kanban as KanbanIcon, X, Save, FileDown, Loader2
} from 'lucide-react';
import { Broker, BrokerStatus } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BrokerManagement = ({ brokers, onAddBroker, onUpdateBroker, onDeleteBroker }: { 
  brokers: Broker[], 
  onAddBroker: (b: Broker) => void,
  onUpdateBroker: (b: Broker) => void,
  onDeleteBroker: (id: string) => void
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    if (!pageRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgScaledWidth, imgScaledHeight);
      pdf.save(`relatorio-corretores-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };
  const [formData, setFormData] = useState<Partial<Broker>>({
    name: '',
    cpfCnpj: '',
    phone: '',
    email: '',
    realEstateAgency: '',
    region: '',
    active: true,
    status: BrokerStatus.PENDING
  });

  const handleOpenDrawer = (broker?: Broker) => {
    if (broker) {
      setEditingBroker(broker);
      setFormData(broker);
    } else {
      setEditingBroker(null);
      setFormData({
        name: '',
        cpfCnpj: '',
        phone: '',
        email: '',
        realEstateAgency: '',
        region: '',
        active: true,
        status: BrokerStatus.PENDING
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBroker) {
      onUpdateBroker({ ...editingBroker, ...formData } as Broker);
    } else {
      onAddBroker({ 
        ...formData, 
        id: Math.random().toString(36).substr(2, 9) 
      } as Broker);
    }
    setIsDrawerOpen(false);
  };

  const filteredBrokers = brokers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.cpfCnpj.includes(searchTerm)
  );

  const kanbanColumns = [
    { status: BrokerStatus.PENDING, label: 'Pendentes', color: 'bg-amber-500' },
    { status: BrokerStatus.ACTIVE, label: 'Ativos', color: 'bg-emerald-500' },
    { status: BrokerStatus.INACTIVE, label: 'Inativos', color: 'bg-rose-500' }
  ];

  const renderBrokerCard = (broker: Broker) => (
    <div key={broker.id} className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${broker.status === BrokerStatus.ACTIVE ? 'bg-emerald-500' : broker.status === BrokerStatus.PENDING ? 'bg-amber-500' : 'bg-rose-500'}`} />
      
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
            broker.status === BrokerStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 
            broker.status === BrokerStatus.PENDING ? 'bg-amber-50 text-amber-600' : 
            'bg-rose-50 text-rose-600'
          }`}>
            {broker.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-black text-slate-900 leading-tight">{broker.name}</h4>
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              broker.status === BrokerStatus.ACTIVE ? 'text-emerald-500' : 
              broker.status === BrokerStatus.PENDING ? 'text-amber-500' : 
              'text-rose-500'
            }`}>
              {broker.status || (broker.active ? BrokerStatus.ACTIVE : BrokerStatus.INACTIVE)}
            </span>
          </div>
        </div>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleOpenDrawer(broker)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={16} /></button>
          <button onClick={() => onDeleteBroker(broker.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-3 text-slate-500">
          <Mail size={14} className="shrink-0" />
          <span className="text-xs font-medium truncate">{broker.email}</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-500">
          <Phone size={14} className="shrink-0" />
          <span className="text-xs font-medium">{broker.phone}</span>
        </div>
        {broker.realEstateAgency && (
          <div className="flex items-center space-x-3 text-slate-500">
            <Building2 size={14} className="shrink-0" />
            <span className="text-xs font-medium">{broker.realEstateAgency}</span>
          </div>
        )}
        {broker.region && (
          <div className="flex items-center space-x-3 text-slate-500">
            <MapPin size={14} className="shrink-0" />
            <span className="text-xs font-medium">{broker.region}</span>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{broker.cpfCnpj}</span>
        <div className="flex space-x-2">
          {broker.status !== BrokerStatus.ACTIVE && (
            <button 
              onClick={() => onUpdateBroker({ ...broker, status: BrokerStatus.ACTIVE, active: true })}
              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
              title="Ativar"
            >
              <UserCheck size={18} />
            </button>
          )}
          {broker.status !== BrokerStatus.INACTIVE && (
            <button 
              onClick={() => onUpdateBroker({ ...broker, status: BrokerStatus.INACTIVE, active: false })}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Desativar"
            >
              <UserX size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={pageRef} className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Corretores</h2>
          <p className="text-slate-500 font-medium">Cadastre e gerencie seus parceiros comerciais.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="bg-white text-slate-700 px-6 py-3 rounded-2xl font-black text-sm border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
            <span>{isExporting ? 'Exportando...' : 'PDF'}</span>
          </button>
          <div className="bg-white border border-slate-200 rounded-2xl p-1 flex shadow-sm">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 px-4 rounded-xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={16} /> <span>Grade</span>
            </button>
            <button 
              onClick={() => setViewMode('kanban')} 
              className={`p-2 px-4 rounded-xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${viewMode === 'kanban' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <KanbanIcon size={16} /> <span>Kanban</span>
            </button>
          </div>
          <button 
            onClick={() => handleOpenDrawer()}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Novo Corretor</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
        <Search className="text-slate-400 ml-2" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome, email ou CPF/CNPJ..."
          className="flex-1 bg-transparent border-none outline-none text-slate-900 font-medium placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrokers.map(broker => renderBrokerCard(broker))}
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar">
          {kanbanColumns.map(col => (
            <div key={col.status} className="flex flex-col min-w-[320px] max-w-[320px] bg-slate-50/50 rounded-[32px] p-4 min-h-[600px]">
              <div className="flex items-center justify-between mb-6 px-2">
                <div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">{col.label}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {filteredBrokers.filter(b => (b.status || (b.active ? BrokerStatus.ACTIVE : BrokerStatus.INACTIVE)) === col.status).length} Corretores
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
              </div>
              <div className="space-y-4">
                {filteredBrokers
                  .filter(b => (b.status || (b.active ? BrokerStatus.ACTIVE : BrokerStatus.INACTIVE)) === col.status)
                  .map(broker => renderBrokerCard(broker))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side Panel (Drawer) */}
      <AnimatePresence>
        {isDrawerOpen && createPortal(
          <div className="fixed inset-0 z-[9999]">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingBroker ? 'Editar Corretor' : 'Novo Corretor'}</h3>
                  <p className="text-slate-500 text-sm font-medium">Preencha os dados do parceiro.</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-white text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">CPF ou CNPJ</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-white text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                          value={formData.cpfCnpj}
                          onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Telefone</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-white text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">E-mail</label>
                      <input 
                        type="email" 
                        required
                        className="w-full bg-white text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        className="w-full bg-white text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium appearance-none"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as BrokerStatus, active: e.target.value === BrokerStatus.ACTIVE })}
                      >
                        {Object.values(BrokerStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Imobiliária (Opcional)</label>
                      <input 
                        type="text" 
                        className="w-full bg-white text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={formData.realEstateAgency}
                        onChange={(e) => setFormData({ ...formData, realEstateAgency: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Região de Atuação</label>
                      <input 
                        type="text" 
                        className="w-full bg-white text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-8">
                    <button 
                      type="button" 
                      onClick={() => setIsDrawerOpen(false)}
                      className="px-6 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest flex items-center gap-2"
                    >
                      <Save size={18} />
                      <span>Salvar</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrokerManagement;
