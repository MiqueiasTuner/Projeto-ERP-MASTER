
import React from 'react';
import { Users, Calendar, FileText, TrendingUp, Home, ArrowRight } from 'lucide-react';
import { Lead, Property, LeadStatus } from '../../types';
import { Link } from 'react-router-dom';

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

const BrokerDashboard = ({ leads, properties }: { leads: Lead[], properties: Property[] }) => {
  const activeLeads = leads.filter(l => l.status !== LeadStatus.SOLD && l.status !== LeadStatus.LOST).length;
  const scheduledVisits = leads.filter(l => l.status === LeadStatus.VISIT_SCHEDULED).length;
  const proposals = leads.filter(l => l.status === LeadStatus.PROPOSAL).length;
  const completedSales = leads.filter(l => l.status === LeadStatus.SOLD).length;
  
  const availableProperties = properties.filter(p => p.availableForBrokers).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-header)] tracking-tight">Painel do Corretor</h2>
          <p className="text-[var(--text-muted)] font-medium">Bem-vindo! Veja um resumo das suas atividades.</p>
        </div>
        <Link 
          to="/corretor/imoveis"
          className="bg-[var(--accent)] text-[var(--accent-text)] px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-yellow-500/20 hover:opacity-90 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
        >
          <Home size={18} strokeWidth={3} />
          <span>Ver Imóveis</span>
        </Link>
      </div>

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
                <p className="text-2xl font-black text-[var(--accent)]">3</p>
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
