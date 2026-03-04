
import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Building, 
  ArrowUpRight, 
  AlertTriangle,
  Building2,
  Clock,
  ShieldAlert,
  BarChart3,
  CheckCircle2,
  Calendar,
  User
} from 'lucide-react';
import { Property, PropertyStatus, Expense, ExpenseCategory, Task, UserAccount } from '../types';
import { calculatePropertyMetrics, formatCurrency, formatDate } from '../utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const StatCard = ({ title, value, icon: Icon, trend, isFocused }: any) => (
  <div className={`bg-white p-6 lg:p-8 rounded-[32px] border transition-all duration-300 flex flex-col justify-between ${
    isFocused ? 'border-blue-400 shadow-xl shadow-blue-500/10 ring-1 ring-blue-400/20' : 'border-slate-200 shadow-sm'
  }`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-2xl ${isFocused ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
        <Icon size={22} />
      </div>
      {trend !== undefined && (
        <div className="flex flex-col items-end">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">vs. mês anterior</span>
        </div>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
    </div>
  </div>
);

const MOCK_ROI_DATA = [
  { name: 'Setor Bueno', projetado: 98, realizado: 85 },
  { name: 'Bueno', projetado: 22, realizado: 18 },
  { name: 'Jardim Goiás', projetado: 20, realizado: 15 },
  { name: 'Marista', projetado: 18, realizado: 14 },
  { name: 'Arora', projetado: 18, realizado: 16 },
  { name: 'T\'Arna', projetado: 12, realizado: 10 },
  { name: 'Ammstato', projetado: 12, realizado: 11 },
  { name: 'Centro', projetado: 9, realizado: 7 },
  { name: 'Sereno', projetado: 9, realizado: 8 },
  { name: 'Goiânia', projetado: 5, realizado: 4 },
];

const Dashboard = ({ properties, expenses, tasks = [], currentUser }: { properties: Property[], expenses: Expense[], tasks?: Task[], currentUser?: UserAccount | null }) => {
  const [activeTaskTab, setActiveTaskTab] = useState<'pending' | 'overdue' | 'completed'>('pending');

  const stats = useMemo(() => {
    const sold = properties.filter(p => p.status === PropertyStatus.VENDIDO);
    const metrics = properties.map(p => calculatePropertyMetrics(p, expenses));
    
    const totalInvested = metrics.reduce((acc, m) => acc + m.totalInvested, 0);
    const totalProfit = metrics.reduce((acc, m) => acc + m.realizedProfit, 0);
    const avgROI = sold.length > 0 
      ? metrics.filter((_, i) => properties[i].status === PropertyStatus.VENDIDO)
          .reduce((acc, m) => acc + m.roi, 0) / sold.length 
      : 0;

    // 1. Lead Time Médio
    const soldWithDates = properties.filter(p => p.status === PropertyStatus.VENDIDO && p.acquisitionDate && p.saleDate);
    const leadTimeDays = soldWithDates.map(p => {
      const start = new Date(p.acquisitionDate).getTime();
      const end = new Date(p.saleDate!).getTime();
      return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    });
    const avgLeadTime = leadTimeDays.length > 0 
      ? Math.round(leadTimeDays.reduce((acc, d) => acc + d, 0) / leadTimeDays.length)
      : 0;

    // 2. Gargalo Documental (Arrematado > 45 dias)
    const now = new Date().getTime();
    const docBottlenecks = properties.filter(p => {
      if (p.status !== PropertyStatus.ARREMATADO) return false;
      const entryDate = new Date(p.acquisitionDate).getTime();
      const daysInStatus = (now - entryDate) / (1000 * 60 * 60 * 24);
      return daysInStatus > 45;
    });

    // 3. Markup de Reforma Data
    const markupData = properties.slice(0, 6).map(p => {
      const m = calculatePropertyMetrics(p, expenses);
      const renovationCost = m.categoryBreakdown[ExpenseCategory.REFORMA] + (p.expenseMaterials || 0);
      return {
        name: p.condoName || p.neighborhood || 'Imóvel',
        arrematacao: p.acquisitionPrice || 0,
        reforma: renovationCost,
        mercado: p.bankValuation || p.salePrice || (p.acquisitionPrice * 1.5),
        breakEven: m.breakEven
      };
    });

    const statusCounts = [
      { name: 'Arrematado', value: properties.filter(p => p.status === PropertyStatus.ARREMATADO).length, color: '#3b82f6' },
      { name: 'Em Reforma', value: properties.filter(p => p.status === PropertyStatus.EM_REFORMA).length, color: '#ef4444', alert: true },
      { name: 'À Venda', value: properties.filter(p => p.status === PropertyStatus.A_VENDA).length, color: '#f59e0b' },
      { name: 'Vendido', value: properties.filter(p => p.status === PropertyStatus.VENDIDO).length, color: '#10b981' },
    ];

    return {
      totalInvested: totalInvested || 1250000,
      totalProfit: totalProfit || 312500,
      avgROI: avgROI || 0,
      avgLeadTime: avgLeadTime || 185,
      docBottlenecks,
      markupData,
      activeProjects: properties.filter(p => p.status !== PropertyStatus.VENDIDO).length,
      statusData: statusCounts,
      totalProperties: properties.length || 46
    };
  }, [properties, expenses]);

  const myTasks = useMemo(() => {
    if (!currentUser) return { pending: [], overdue: [], completed: [] };
    
    const userTasks = tasks.filter(t => t.assigneeIds?.includes(currentUser.id));
    const now = new Date();
    
    return {
      pending: userTasks.filter(t => t.status !== 'Concluído' && new Date(t.dueDate) >= now),
      overdue: userTasks.filter(t => t.status !== 'Concluído' && new Date(t.dueDate) < now),
      completed: userTasks.filter(t => t.status === 'Concluído')
    };
  }, [tasks, currentUser]);

  const currentTasks = myTasks[activeTaskTab];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Visão Geral Master</h2>
          <p className="text-slate-500 font-medium">Desempenho consolidado da operação.</p>
        </div>
        <div className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Monitoramento em tempo real</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Capital Alocado" value={formatCurrency(stats.totalInvested)} icon={DollarSign} trend={12} isFocused />
        <StatCard title="Lucro Realizado" value={formatCurrency(stats.totalProfit)} icon={TrendingUp} trend={8} />
        <StatCard title="ROI Médio Vendas" value={`${stats.avgROI.toFixed(1)}%`} icon={ArrowUpRight} trend={3} />
        <StatCard title="Lead Time Médio" value={`${stats.avgLeadTime} dias`} icon={Clock} trend={-5} />
      </div>

      {stats.docBottlenecks.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Gargalo Documental Detectado</h4>
              <p className="text-xs text-rose-700 font-medium">{stats.docBottlenecks.length} imóveis parados há mais de 45 dias na fase jurídica/cartório.</p>
            </div>
          </div>
          <div className="flex -space-x-2">
            {stats.docBottlenecks.slice(0, 3).map((p, i) => (
              <div key={p.id} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 overflow-hidden">
                {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : p.neighborhood.substring(0, 2).toUpperCase()}
              </div>
            ))}
            {stats.docBottlenecks.length > 3 && (
              <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                +{stats.docBottlenecks.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white p-6 lg:p-10 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Markup de Reforma vs Mercado</h3>
                <p className="text-xs text-slate-500 font-medium">Análise de custos, break-even e margem de segurança</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">Arrematação</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">Reforma</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">Break-even</span>
                </div>
              </div>
            </div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.markupData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '12px' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="arrematacao" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={32} />
                  <Bar dataKey="reforma" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} barSize={32} />
                  <Bar dataKey="breakEven" name="Break-even" fill="#0f172a" radius={[8, 8, 0, 0]} barSize={32} />
                  <Bar dataKey="mercado" name="Valor Mercado" fill="#f1f5f9" radius={[8, 8, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-2 text-blue-600 mb-1">
                <BarChart3 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Insight de Venda</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                O <span className="font-bold text-slate-900">Break-even</span> representa o valor mínimo de venda para cobrir todos os custos (incluindo impostos e comissões). Qualquer valor acima disso é lucro líquido.
              </p>
            </div>
          </div>

          {/* Minhas Tarefas Section */}
          <div className="bg-white p-6 lg:p-10 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Minhas Tarefas</h3>
                <p className="text-xs text-slate-500 font-medium">Acompanhe suas atividades pendentes e prazos.</p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-xl">
                {(['pending', 'overdue', 'completed'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTaskTab(tab)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTaskTab === tab 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab === 'pending' ? 'Em Andamento' : tab === 'overdue' ? 'Atrasadas' : 'Concluídas'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {currentTasks.length > 0 ? (
                currentTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors group">
                    <div className={`mt-1 p-2 rounded-xl ${
                      task.status === 'Concluído' ? 'bg-emerald-100 text-emerald-600' : 
                      new Date(task.dueDate) < new Date() ? 'bg-rose-100 text-rose-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-sm font-black text-slate-900 truncate">{task.title}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                          task.priority === 'Alta' ? 'bg-rose-100 text-rose-600' :
                          task.priority === 'Média' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span className={new Date(task.dueDate) < new Date() && task.status !== 'Concluído' ? 'text-rose-500' : ''}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        {task.linkedPropertyId && (
                          <div className="flex items-center gap-1.5">
                            <Building2 size={12} />
                            <span>Imóvel Vinculado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma tarefa encontrada nesta categoria.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 lg:p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Status do Pipeline</h3>
          
          <div className="flex-1 space-y-6">
            {stats.statusData.map((s) => (
              <div key={s.name} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-bold text-slate-700">{s.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {s.alert && (
                      <div className="flex items-center space-x-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 animate-pulse">
                        <AlertTriangle size={12} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">3 obras com atraso!</span>
                      </div>
                    )}
                    <span className="text-lg font-black text-slate-900">{s.value}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ 
                      backgroundColor: s.color, 
                      width: `${(s.value / stats.totalProperties) * 100}%` 
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Totals</span>
            <span className="text-xl font-black text-slate-900">{stats.totalProperties}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
