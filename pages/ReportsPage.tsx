
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { FileDown, TrendingUp, DollarSign, Package, MapPin, Calendar, Building2, PieChart as PieChartIcon, Gavel, HardHat } from 'lucide-react';
import { Property, Expense, InventoryItem, PropertyStatus, ExpenseCategory } from '../types';
import { calculatePropertyMetrics, formatCurrency } from '../utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-black text-slate-900">
              {entry.name}: {typeof entry.value === 'number' && entry.name.toLowerCase().includes('roi') ? `${entry.value.toFixed(1)}%` : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ReportsPage = ({ properties, expenses, inventory }: { properties: Property[], expenses: Expense[], inventory: InventoryItem[] }) => {
  const metrics = useMemo(() => {
    const propertyData = properties.map(p => ({
      ...p,
      metrics: calculatePropertyMetrics(p, expenses)
    }));

    const totalInvested = propertyData.reduce((acc, p) => acc + p.metrics.totalInvested, 0);
    const totalProfit = propertyData.reduce((acc, p) => acc + p.metrics.realizedProfit, 0);
    const soldProperties = propertyData.filter(p => p.status === PropertyStatus.VENDIDO);
    const avgROI = soldProperties.length > 0 
      ? soldProperties.reduce((acc, p) => acc + p.metrics.roi, 0) / soldProperties.length 
      : 0;

    const soldWithDates = soldProperties.filter(p => p.acquisitionDate && p.saleDate);
    const leadTimeDays = soldWithDates.map(p => {
      const start = new Date(p.acquisitionDate).getTime();
      const end = new Date(p.saleDate!).getTime();
      return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    });
    const avgLeadTime = leadTimeDays.length > 0 
      ? Math.round(leadTimeDays.reduce((acc, d) => acc + d, 0) / leadTimeDays.length)
      : 0;

    const statusDist = Object.values(PropertyStatus).map(status => ({
      name: status,
      value: properties.filter(p => p.status === status).length
    }));

    const cityGroups = properties.reduce((acc: any, p) => {
      if (!acc[p.city]) acc[p.city] = { name: p.city, roi: 0, count: 0 };
      const m = calculatePropertyMetrics(p, expenses);
      if (p.status === PropertyStatus.VENDIDO) {
        acc[p.city].roi += m.roi;
        acc[p.city].count += 1;
      }
      return acc;
    }, {});

    const roiByCity = Object.values(cityGroups).map((g: any) => ({
      name: g.name,
      roi: g.count > 0 ? g.roi / g.count : 0
    })).sort((a, b) => b.roi - a.roi);

    // Renovation Analysis
    const renovationCosts = propertyData.map(p => ({
      name: p.condoName || p.neighborhood || 'Imóvel',
      cost: (p.metrics.categoryBreakdown[ExpenseCategory.REFORMA] || 0) + (p.expenseMaterials || 0),
      total: p.metrics.totalInvested
    })).sort((a, b) => b.cost - a.cost).slice(0, 6);

    // Inventory Value
    const inventoryByCategory = inventory.reduce((acc: any, item) => {
      acc[item.category] = (acc[item.category] || 0) + (item.currentStock * (item.averageCost || 0));
      return acc;
    }, {});

    const inventoryValueData = Object.entries(inventoryByCategory).map(([name, value]) => ({
      name,
      value: value as number
    })).sort((a, b) => b.value - a.value);

    // Profitability Analysis
    const profitabilityData = propertyData.filter(p => p.status === PropertyStatus.VENDIDO).map(p => {
      const renovation = (p.metrics.categoryBreakdown[ExpenseCategory.REFORMA] || 0) + (p.expenseMaterials || 0);
      const otherCosts = p.metrics.totalInvested - p.acquisitionPrice - renovation;
      return {
        name: p.condoName || p.neighborhood || 'Imóvel',
        arremate: p.acquisitionPrice,
        reforma: renovation,
        outros: otherCosts,
        venda: p.salePrice || 0,
        lucro: p.metrics.realizedProfit
      };
    }).slice(0, 10);

    return { totalInvested, roiByCity, statusDist, avgROI, avgLeadTime, renovationCosts, inventoryValueData, profitabilityData };
  }, [properties, expenses, inventory]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Relatórios Analíticos</h2>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" />
            Inteligência de dados para maximização de ROI
          </p>
        </div>
        <button className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-[24px] text-sm font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10">
          <FileDown size={20} /> Exportar Relatório PDF
        </button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl">
              <Gavel size={32} />
            </div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Investimento</span>
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Arrematado</p>
            <p className="text-3xl font-black text-slate-900">{formatCurrency(properties.reduce((acc, p) => acc + (p.acquisitionPrice || 0), 0))}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-orange-500/30 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-orange-50 text-orange-600 rounded-3xl">
              <HardHat size={32} />
            </div>
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">Obras</span>
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total em Reformas</p>
            <p className="text-3xl font-black text-slate-900">{formatCurrency(expenses.reduce((acc, e) => acc + e.amount, 0))}</p>
          </div>
        </div>

        <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 shadow-sm flex flex-col justify-between group hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-3xl">
              <DollarSign size={32} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">Vendas</span>
          </div>
          <div>
            <p className="text-[11px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Vendas Realizadas</p>
            <p className="text-3xl font-black text-slate-900">{formatCurrency(properties.filter(p => p.status === PropertyStatus.VENDIDO).reduce((acc, p) => acc + (p.salePrice || 0), 0))}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-4">
            <DollarSign size={24} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capital Alocado</p>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(metrics.totalInvested)}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ROI Médio Líquido</p>
          <p className="text-2xl font-black text-slate-900">{metrics.avgROI.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-4">
            <Calendar size={24} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giro Médio (Dias)</p>
          <p className="text-2xl font-black text-slate-900">{metrics.avgLeadTime} Dias</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mb-4">
            <Building2 size={24} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ativos em Carteira</p>
          <p className="text-2xl font-black text-slate-900">{properties.length}</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ROI by City */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Performance por Praça (ROI)</h3>
              <p className="text-xs text-slate-500 font-medium">Rentabilidade média por cidade de atuação</p>
            </div>
            <MapPin size={20} className="text-slate-300" />
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.roiByCity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} unit="%" />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} width={100} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="roi" name="ROI Médio" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pipeline de Ativos</h3>
            <PieChartIcon size={20} className="text-slate-300" />
          </div>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.statusDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {metrics.statusDist.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
              <span className="text-3xl font-black text-slate-900">{properties.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {metrics.statusDist.map((item, index) => (
              <div key={item.name} className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] font-black text-slate-500 uppercase truncate">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Renovation Costs Analysis */}
        <div className="lg:col-span-6 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Custos de Reforma por Ativo</h3>
              <p className="text-xs text-slate-500 font-medium">Top 6 imóveis com maior investimento em obra</p>
            </div>
            <Package size={20} className="text-slate-300" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.renovationCosts}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cost" name="Custo Reforma" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Value Distribution */}
        <div className="lg:col-span-6 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Valor de Estoque por Categoria</h3>
              <p className="text-xs text-slate-500 font-medium">Distribuição financeira do capital em materiais</p>
            </div>
            <DollarSign size={20} className="text-slate-300" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.inventoryValueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Valor em Estoque" fill="#10b981" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Analysis */}
        <div className="lg:col-span-12 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Análise de Lucratividade Detalhada</h3>
              <p className="text-xs text-slate-500 font-medium">Comparativo entre Arremate, Reforma, Outros Custos e Valor de Venda</p>
            </div>
            <TrendingUp size={20} className="text-slate-300" />
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.profitabilityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="arremate" name="Arremate" stackId="a" fill="#3b82f6" />
                <Bar dataKey="reforma" name="Reforma" stackId="a" fill="#f59e0b" />
                <Bar dataKey="outros" name="Outros Custos" stackId="a" fill="#94a3b8" />
                <Bar dataKey="venda" name="Valor de Venda" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
