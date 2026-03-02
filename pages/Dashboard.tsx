
import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Building, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { Property, PropertyStatus, Expense } from '../types';
import { calculatePropertyMetrics, formatCurrency } from '../utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const StatCard = ({ title, value, icon: Icon, trend }: any) => (
  <div className="bg-white p-6 lg:p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
        <Icon size={22} />
      </div>
      {trend !== undefined && (
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
    </div>
  </div>
);

const Dashboard = ({ properties, expenses }: { properties: Property[], expenses: Expense[] }) => {
  const stats = useMemo(() => {
    const sold = properties.filter(p => p.status === PropertyStatus.VENDIDO);
    const metrics = properties.map(p => calculatePropertyMetrics(p, expenses));
    
    const totalInvested = metrics.reduce((acc, m) => acc + m.totalInvested, 0);
    const totalProfit = metrics.reduce((acc, m) => acc + m.realizedProfit, 0);
    const avgROI = sold.length > 0 
      ? metrics.filter((_, i) => properties[i].status === PropertyStatus.VENDIDO)
          .reduce((acc, m) => acc + m.roi, 0) / sold.length 
      : 0;

    const statusCounts = Object.values(PropertyStatus).map(status => ({
      name: status,
      value: properties.filter(p => p.status === status).length
    }));

    const cityROI = Array.from(new Set(properties.map(p => p.city))).map(city => {
      const cityProps = properties.filter(p => p.city === city && p.status === PropertyStatus.VENDIDO);
      const roi = cityProps.length > 0 
        ? cityProps.reduce((acc, p) => acc + calculatePropertyMetrics(p, expenses).roi, 0) / cityProps.length
        : 0;
      return { name: city, roi };
    });

    return {
      totalInvested,
      totalProfit,
      avgROI,
      activeProjects: properties.filter(p => p.status !== PropertyStatus.VENDIDO).length,
      statusData: statusCounts,
      cityROI: cityROI.sort((a, b) => b.roi - a.roi)
    };
  }, [properties, expenses]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Visão Geral Master</h2>
          <p className="text-slate-500 font-medium">Desempenho consolidado da operação.</p>
        </div>
        <div className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-slate-500 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Monitoramento em tempo real</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Capital Alocado" value={formatCurrency(stats.totalInvested)} icon={DollarSign} trend={12} />
        <StatCard title="Lucro Realizado" value={formatCurrency(stats.totalProfit)} icon={TrendingUp} trend={8} />
        <StatCard title="ROI Médio Vendas" value={`${stats.avgROI.toFixed(1)}%`} icon={ArrowUpRight} trend={3} />
        <StatCard title="Projetos Ativos" value={stats.activeProjects.toString()} icon={Building} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white p-6 lg:p-10 rounded-[40px] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Performance ROI por Praça</h3>
          <div className="h-80 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.cityROI}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} unit="%" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '12px' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'ROI']}
                />
                <Bar dataKey="roi" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 lg:p-10 rounded-[40px] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Status do Pipeline</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {stats.statusData.map((s, i) => (
              <div key={s.name} className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{s.name}</p>
                  <p className="text-sm font-black text-slate-900">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
