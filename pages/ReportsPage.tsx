
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie 
} from 'recharts';
import { FileDown, TrendingUp, DollarSign, Package, MapPin } from 'lucide-react';
import { Property, Expense, InventoryItem, PropertyStatus } from '../types';
import { calculatePropertyMetrics, formatCurrency } from '../utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ReportsPage = ({ properties, expenses, inventory }: { properties: Property[], expenses: Expense[], inventory: InventoryItem[] }) => {
  const metrics = useMemo(() => {
    const propertyData = properties.map(p => ({
      ...p,
      metrics: calculatePropertyMetrics(p, expenses)
    }));

    const totalInvested = propertyData.reduce((acc, p) => acc + p.metrics.totalInvested, 0);
    const totalInventoryValue = inventory.reduce((acc, i) => acc + (i.currentStock * 0), 0); // Mock de valor
    
    const roiByCity = Array.from(new Set(properties.map(p => p.city))).map(city => {
      const cityProps = propertyData.filter(p => p.city === city && p.status === PropertyStatus.VENDIDO);
      return {
        city,
        roi: cityProps.length > 0 ? cityProps.reduce((acc, p) => acc + p.metrics.roi, 0) / cityProps.length : 0
      };
    });

    const statusDist = Object.values(PropertyStatus).map(s => ({
      name: s,
      value: properties.filter(p => p.status === s).length
    }));

    return { totalInvested, roiByCity, statusDist };
  }, [properties, expenses, inventory]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Relatórios Gerenciais</h2>
          <p className="text-slate-500 font-medium">Análise de dados para tomada de decisão.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
          <FileDown size={18} /> Exportar Tudo (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico ROI por Cidade */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-6">Eficiência de Arremate por Praça</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.roiByCity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                <Tooltip />
                <Bar dataKey="roi" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Distribuição de Status */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-6">Pipeline de Ativos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.statusDist} innerRadius={60} outerRadius={80} dataKey="value">
                  {metrics.statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-bold uppercase">
            {metrics.statusDist.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-500 truncate">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Total Imobilizado</p>
          <p className="text-2xl font-black">{formatCurrency(metrics.totalInvested)}</p>
        </div>
        <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Retorno Médio</p>
          <p className="text-2xl font-black">28.4% <span className="text-xs font-normal opacity-70">Líquido</span></p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Giro Médio</p>
          <p className="text-2xl font-black">142 <span className="text-xs font-normal opacity-70">Dias</span></p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
