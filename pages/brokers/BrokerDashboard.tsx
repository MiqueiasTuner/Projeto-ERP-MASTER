
import React from 'react';
import { Users, Calendar, FileText, TrendingUp, Home, ArrowRight } from 'lucide-react';
import { Lead, Property, LeadStatus } from '../../types';
import { Link } from 'react-router-dom';

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center space-x-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

const BrokerDashboard = ({ leads, properties }: { leads: Lead[], properties: Property[] }) => {
  const activeLeads = leads.filter(l => l.status !== LeadStatus.SOLD && l.status !== LeadStatus.LOST).length;
  const scheduledVisits = leads.filter(l => l.status === LeadStatus.VISIT_SCHEDULED).length;
  const proposals = leads.filter(l => l.status === LeadStatus.PROPOSAL_SENT || l.status === LeadStatus.NEGOTIATION).length;
  const completedSales = leads.filter(l => l.status === LeadStatus.SOLD).length;
  
  const availableProperties = properties.filter(p => p.availableForBrokers).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Painel do Corretor</h2>
          <p className="text-slate-500 font-medium">Bem-vindo! Veja um resumo das suas atividades.</p>
        </div>
        <Link 
          to="/corretor/imoveis"
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
        >
          <Home size={18} strokeWidth={3} />
          <span>Ver Imóveis</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Leads Ativos" value={activeLeads} icon={Users} color="bg-blue-50 text-blue-600" />
        <StatCard label="Visitas Agendadas" value={scheduledVisits} icon={Calendar} color="bg-amber-50 text-amber-600" />
        <StatCard label="Em Negociação" value={proposals} icon={FileText} color="bg-purple-50 text-purple-600" />
        <StatCard label="Vendas Concluídas" value={completedSales} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Últimos Leads</h3>
            <Link to="/corretor/leads" className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">Ver Todos</Link>
          </div>
          <div className="space-y-4">
            {leads.slice(0, 5).map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400 text-xs border border-slate-100">
                    {lead.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{lead.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lead.status}</p>
                  </div>
                </div>
                <Link to="/corretor/leads" className="p-2 text-slate-300 hover:text-blue-600 transition-all"><ArrowRight size={18} /></Link>
              </div>
            ))}
            {leads.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-slate-400 font-medium">Nenhum lead registrado ainda.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0A192F] p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white tracking-tight mb-2">Imóveis Disponíveis</h3>
            <p className="text-slate-400 font-medium mb-8">Temos {availableProperties} imóveis prontos para venda.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                <p className="text-2xl font-black text-white">{availableProperties}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Novos</p>
                <p className="text-2xl font-black text-[#FFD700]">3</p>
              </div>
            </div>

            <Link 
              to="/corretor/imoveis"
              className="w-full bg-[#FFD700] text-[#0A192F] py-4 rounded-2xl font-black text-sm hover:bg-yellow-400 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
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
