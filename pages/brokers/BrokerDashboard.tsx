
import React from 'react';
import { Users, Calendar, FileText, TrendingUp, Home, ArrowRight } from 'lucide-react';
import { Lead, Property, LeadStatus, UserAccount } from '../../types';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) => (
  <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm flex items-center space-x-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-[var(--text-header)]">{value}</p>
    </div>
  </div>
);

const BrokerDashboard = ({ leads, properties, onAddLead, currentUser }: { 
  leads: Lead[], 
  properties: Property[],
  onAddLead: (l: Lead) => void,
  currentUser?: UserAccount
}) => {
  const [showAddLeadModal, setShowAddLeadModal] = React.useState(false);
  const [newLeadData, setNewLeadData] = React.useState<Partial<Lead>>({
    name: '',
    phone: '',
    email: '',
    propertyId: '',
    interestType: 'Compra',
    observations: ''
  });

  const activeLeads = leads.filter(l => l.status !== LeadStatus.SOLD && l.status !== LeadStatus.LOST).length;
  const scheduledVisits = leads.filter(l => l.status === LeadStatus.VISIT_SCHEDULED).length;
  const proposals = leads.filter(l => l.status === LeadStatus.PROPOSAL).length;
  const completedSales = leads.filter(l => l.status === LeadStatus.SOLD).length;
  
  const availableProperties = properties.length;

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.propertyId) {
      alert('Por favor, selecione um imóvel.');
      return;
    }

    const lead: Lead = {
      ...newLeadData,
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser?.id || leads[0]?.brokerId || '',
      status: LeadStatus.OPPORTUNITY,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Lead;

    onAddLead(lead);
    setShowAddLeadModal(false);
    setNewLeadData({
      name: '',
      phone: '',
      email: '',
      propertyId: '',
      interestType: 'Compra',
      observations: ''
    });
    alert('Lead registrado com sucesso!');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-header)] tracking-tight">Painel do Corretor</h2>
          <p className="text-[var(--text-muted)] font-medium">Bem-vindo! Veja um resumo das suas atividades.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowAddLeadModal(true)}
            className="bg-[var(--accent)] text-[var(--accent-text)] px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-yellow-500/20 hover:opacity-90 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Novo Lead</span>
          </button>
          <Link 
            to="/corretor/imoveis"
            className="bg-[var(--bg-card)] text-[var(--text-header)] px-6 py-3 rounded-2xl font-black text-sm border border-[var(--border)] flex items-center justify-center space-x-2 uppercase tracking-widest hover:bg-[var(--bg-card-alt)] transition-all"
          >
            <Home size={18} strokeWidth={3} />
            <span className="hidden sm:inline">Ver Imóveis</span>
          </Link>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-[var(--border)]">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Novo Lead</h3>
                  <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">Registre um novo interessado</p>
                </div>
                <button onClick={() => setShowAddLeadModal(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-xl transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleAddLead} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Imóvel de Interesse</label>
                    <select 
                      required
                      className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
                      value={newLeadData.propertyId}
                      onChange={(e) => setNewLeadData({ ...newLeadData, propertyId: e.target.value })}
                    >
                      <option value="">Selecione um imóvel...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.title || `${p.type} em ${p.neighborhood}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Nome do Cliente</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nome completo..."
                      className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
                      value={newLeadData.name}
                      onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Telefone</label>
                      <input 
                        type="text" 
                        required
                        placeholder="(00) 00000-0000"
                        className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
                        value={newLeadData.phone}
                        onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">E-mail</label>
                      <input 
                        type="email" 
                        required
                        placeholder="email@exemplo.com"
                        className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
                        value={newLeadData.email}
                        onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest ml-1">Observações</label>
                    <textarea 
                      placeholder="Alguma informação relevante?"
                      className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium min-h-[100px]"
                      value={newLeadData.observations}
                      onChange={(e) => setNewLeadData({ ...newLeadData, observations: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddLeadModal(false)}
                    className="px-6 py-4 rounded-2xl font-black text-[var(--text-muted)] hover:text-[var(--text-header)] uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-[var(--accent)] text-[var(--accent-text)] px-10 py-4 rounded-2xl font-black shadow-xl shadow-yellow-500/20 hover:opacity-90 transition-all uppercase tracking-widest"
                  >
                    Registrar Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Leads Ativos" value={activeLeads} icon={Users} color="bg-yellow-500/10 text-yellow-500" />
        <StatCard label="Visitas Agendadas" value={scheduledVisits} icon={Calendar} color="bg-amber-500/10 text-amber-500" />
        <StatCard label="Em Negociação" value={proposals} icon={FileText} color="bg-purple-500/10 text-purple-500" />
        <StatCard label="Vendas Concluídas" value={completedSales} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[var(--text-header)] tracking-tight">Últimos Leads</h3>
            <Link to="/corretor/leads" className="text-[var(--accent)] text-xs font-black uppercase tracking-widest hover:underline">Ver Todos</Link>
          </div>
          <div className="space-y-4">
            {leads.slice(0, 5).map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-4 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-[var(--bg-card)] rounded-xl flex items-center justify-center font-black text-[var(--text-muted)] text-xs border border-[var(--border)]">
                    {lead.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-header)]">{lead.name}</h4>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{lead.status}</p>
                  </div>
                </div>
                <Link to="/corretor/leads" className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"><ArrowRight size={18} /></Link>
              </div>
            ))}
            {leads.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-[var(--text-muted)] font-medium">Nenhum lead registrado ainda.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <h3 className="text-xl font-black text-[var(--text-header)] tracking-tight mb-2">Imóveis Disponíveis</h3>
            <p className="text-[var(--text-muted)] font-medium mb-8">Temos {availableProperties} imóveis prontos para venda.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] p-4 rounded-3xl">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total</p>
                <p className="text-2xl font-black text-[var(--text-header)]">{availableProperties}</p>
              </div>
              <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] p-4 rounded-3xl">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Novos</p>
                <p className="text-2xl font-black text-[var(--accent)]">
                  {properties.filter(p => {
                    const createdDate = new Date(p.createdAt || '');
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return createdDate >= weekAgo;
                  }).length}
                </p>
              </div>
            </div>

            <Link 
              to="/corretor/imoveis"
              className="w-full bg-[var(--accent)] text-[var(--accent-text)] py-4 rounded-2xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
            >
              <span>Explorar Catálogo</span>
              <ArrowRight size={18} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerDashboard;
