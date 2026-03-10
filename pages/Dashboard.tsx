
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
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
  Package,
  CheckCircle2,
  ArrowDownRight,
  MoreVertical,
  CreditCard,
  Wallet,
  PlusCircle,
  Gavel,
  HardHat
} from 'lucide-react';
import { 
  Property, 
  PropertyStatus, 
  Expense, 
  ExpenseCategory, 
  Task, 
  UserAccount, 
  InventoryItem, 
  StockMovement, 
  Quote,
  TaskStatus,
  Auction,
  Alert
} from '../types';
import { calculatePropertyMetrics, formatCurrency } from '../utils';

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#64748b'];

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/5 rounded-[40px] border border-white/10 shadow-sm p-6 lg:p-8 ${className}`}>
    {children}
  </div>
);

const Dashboard = ({ 
  properties, 
  expenses, 
  tasks = [], 
  inventory = [], 
  movements = [], 
  quotes = [],
  auctions = [],
  alerts = [],
  currentUser 
}: { 
  properties: Property[], 
  expenses: Expense[], 
  tasks?: Task[], 
  inventory?: InventoryItem[],
  movements?: StockMovement[],
  quotes?: Quote[],
  auctions?: Auction[],
  alerts?: Alert[],
  currentUser: UserAccount 
}) => {
  const navigate = useNavigate();
  const stats = useMemo(() => {
    const sold = properties.filter(p => p.status === PropertyStatus.VENDIDO);
    const metrics = properties.map(p => calculatePropertyMetrics(p, expenses));
    
    const totalInvested = metrics.reduce((acc, m) => acc + m.totalInvested, 0);
    const totalProfit = metrics.reduce((acc, m) => acc + m.realizedProfit, 0);
    const totalSaleValue = properties.filter(p => p.status === PropertyStatus.VENDIDO).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const totalAcquisition = properties.reduce((acc, p) => acc + (p.acquisitionPrice || 0), 0);
    const totalRenovation = expenses.reduce((acc, e) => acc + e.amount, 0);
    
    const avgROI = sold.length > 0 
      ? metrics.filter((_, i) => properties[i].status === PropertyStatus.VENDIDO)
          .reduce((acc, m) => acc + m.roi, 0) / sold.length 
      : 0;

    // 1. Monthly Balance Data
    const monthlyData = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' });
      const monthIndex = d.getMonth();
      const year = d.getFullYear();

      const monthExpenses = expenses.filter(e => {
        const eDate = new Date(e.date);
        return eDate.getMonth() === monthIndex && eDate.getFullYear() === year;
      }).reduce((sum, e) => sum + e.amount, 0);

      const monthIncome = properties.filter(p => {
        if (!p.saleDate || p.status !== PropertyStatus.VENDIDO) return false;
        const sDate = new Date(p.saleDate);
        return sDate.getMonth() === monthIndex && sDate.getFullYear() === year;
      }).reduce((sum, p) => sum + (p.salePrice || 0), 0);

      return {
        name: monthLabel,
        income: monthIncome,
        expenses: monthExpenses
      };
    }).reverse();

    // 2. Expense Sources (Donut Chart)
    const expenseByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const expenseSourcesData = Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // 3. Inventory Limits
    const lowStockItems = inventory.filter(i => i.currentStock <= i.minStock);
    
    // 4. Task Statistics
    const taskStats = {
      total: tasks.length,
      done: tasks.filter(t => t.status === TaskStatus.DONE).length,
      todo: tasks.filter(t => t.status === TaskStatus.TODO).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    };

    // 5. Markup de Reforma Data
    const markupData = properties.slice(0, 6).map(p => {
      const m = calculatePropertyMetrics(p, expenses);
      const renovationCost = (m.categoryBreakdown[ExpenseCategory.REFORMA] || 0) + (p.expenseMaterials || 0);
      return {
        name: p.condoName || p.neighborhood || 'Imóvel',
        arrematacao: p.acquisitionPrice || 0,
        reforma: renovationCost,
        mercado: p.bankValuation || p.salePrice || (p.acquisitionPrice * 1.5),
        breakEven: m.breakEven
      };
    });

    // 6. Pipeline Status
    const statusData = [
      { name: 'Arrematado', value: properties.filter(p => p.status === PropertyStatus.ARREMATADO).length, color: '#3b82f6' },
      { name: 'Em Reforma', value: properties.filter(p => p.status === PropertyStatus.EM_REFORMA).length, color: '#f97316' },
      { name: 'À Venda', value: properties.filter(p => p.status === PropertyStatus.A_VENDA).length, color: '#10b981' },
      { name: 'Vendido', value: properties.filter(p => p.status === PropertyStatus.VENDIDO).length, color: '#ef4444' },
    ];

    // 7. Dynamic Alerts
    const activeAlerts = [];
    if (lowStockItems.length > 0) {
      activeAlerts.push({
        id: 'low-stock',
        type: 'warning',
        title: 'Estoque Baixo',
        message: `${lowStockItems.length} itens precisam de reposição imediata.`,
        icon: Package
      });
    }
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.DONE);
    if (overdueTasks.length > 0) {
      activeAlerts.push({
        id: 'overdue-tasks',
        type: 'error',
        title: 'Tarefas Atrasadas',
        message: `${overdueTasks.length} tarefas estão com o prazo vencido.`,
        icon: Clock
      });
    }
    const upcomingAuctions = auctions.filter(a => {
      const auctionDate = new Date(a.date);
      const diff = auctionDate.getTime() - new Date().getTime();
      return diff > 0 && diff < (3 * 24 * 60 * 60 * 1000); // 3 days
    });
    if (upcomingAuctions.length > 0) {
      activeAlerts.push({
        id: 'upcoming-auctions',
        type: 'info',
        title: 'Leilões Próximos',
        message: `${upcomingAuctions.length} leilões ocorrerão nos próximos 3 dias.`,
        icon: Gavel
      });
    }

    return {
      totalInvested,
      totalProfit,
      totalSaleValue,
      totalAcquisition,
      totalRenovation,
      avgROI,
      monthlyData,
      expenseSourcesData,
      lowStockItems,
      taskStats,
      statusData,
      markupData,
      activeAlerts,
      totalProperties: properties.length
    };
  }, [properties, expenses, tasks, inventory, auctions]);

  return (
    <div className="min-h-screen bg-[#0A192F] -m-6 lg:-m-10 p-6 lg:p-10 space-y-8 animate-in fade-in duration-700 text-white overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight mb-2">Dashboard Executivo</h2>
          <p className="text-slate-400 font-medium flex items-center gap-2">
            <Clock size={16} className="text-blue-400" />
            Atualizado em {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/5 p-2 rounded-2xl border border-white/10 shadow-sm flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Building2 size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativos Totais</span>
              <span className="text-sm font-black text-white">{stats.totalProperties}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/novo')}
            className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {stats.activeAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.activeAlerts.map(alert => (
            <div key={alert.id} className={`p-4 rounded-2xl border flex items-center gap-4 ${
              alert.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
              alert.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <div className={`p-2 rounded-xl ${
                alert.type === 'warning' ? 'bg-orange-500/20' :
                alert.type === 'error' ? 'bg-rose-500/20' :
                'bg-blue-500/20'
              }`}>
                <alert.icon size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest">{alert.title}</h4>
                <p className="text-[11px] opacity-80 font-medium">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Bento Row: Property Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Stats Card */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 flex flex-col justify-between group hover:bg-white/10 transition-all cursor-default shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-blue-500/20 text-blue-400 rounded-3xl">
                <Gavel size={32} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl">Investimento</span>
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Arrematado</p>
              <h3 className="text-4xl font-black text-white tracking-tight leading-none">{formatCurrency(stats.totalAcquisition)}</h3>
              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ativos em Carteira</span>
                <span className="text-sm font-black text-blue-400">{properties.filter(p => p.status !== PropertyStatus.VENDIDO).length} Unidades</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 flex flex-col justify-between group hover:bg-white/10 transition-all cursor-default shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-orange-500/20 text-orange-400 rounded-3xl">
                <HardHat size={32} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-4 py-2 rounded-xl">Reformas</span>
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Investimento em Obras</p>
              <h3 className="text-4xl font-black text-white tracking-tight leading-none">{formatCurrency(stats.totalRenovation)}</h3>
              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custo Operacional</span>
                <span className="text-sm font-black text-orange-400">Global</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/10 p-8 rounded-[40px] border border-emerald-500/20 flex flex-col justify-between group hover:bg-emerald-500/20 transition-all cursor-default shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-3xl">
                <DollarSign size={32} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-4 py-2 rounded-xl">Vendas</span>
            </div>
            <div>
              <p className="text-[11px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">Vendas Realizadas</p>
              <h3 className="text-4xl font-black text-white tracking-tight leading-none">{formatCurrency(stats.totalSaleValue)}</h3>
              <div className="mt-6 pt-6 border-t border-emerald-500/10 flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">Lucro Líquido</span>
                <span className="text-sm font-black text-emerald-400">{formatCurrency(stats.totalProfit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Markup Chart - Prioritized */}
        <div className="lg:col-span-8 bg-white/5 p-8 rounded-[40px] border border-white/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Análise de Markup</h3>
                <p className="text-xs text-slate-500 font-medium">Comparativo de custos vs. valor de mercado</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Arrematação</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Reforma</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.markupData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                  <RechartsTooltip 
                    cursor={{ fill: '#ffffff05' }}
                    contentStyle={{ backgroundColor: '#0A192F', borderRadius: '16px', border: '1px solid #ffffff10', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="arrematacao" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={32} />
                  <Bar dataKey="reforma" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} barSize={32} />
                  <Bar dataKey="breakEven" name="Break-even" fill="#ffffff20" radius={[8, 8, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        {/* Pipeline Status Card */}
        <div className="lg:col-span-4 bg-white/5 p-8 rounded-[40px] border border-white/10 flex flex-col">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8">Status do Portfólio</h3>
          
          <div className="flex-1 space-y-8">
            {stats.statusData.map((s) => (
              <div key={s.name} className="group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-bold text-slate-300">{s.name}</span>
                  </div>
                  <span className="text-sm font-black text-white">{s.value}</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ 
                      backgroundColor: s.color, 
                      width: `${(s.value / stats.totalProperties || 1) * 100}%`,
                      boxShadow: `0 0 10px ${s.color}40`
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Ativos</span>
            <span className="text-lg font-black text-white">{stats.totalProperties}</span>
          </div>
        </div>
      </div>

      {/* Second Row: Balance & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Balance Chart */}
        <div className="lg:col-span-8 bg-white/5 p-8 rounded-[40px] border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Fluxo de Caixa</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-blue-500 rounded-full" />
                <span className="text-[10px] font-black text-slate-500 uppercase">Receita</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-orange-500 rounded-full" />
                <span className="text-[10px] font-black text-slate-500 uppercase">Despesas</span>
              </div>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                <YAxis hide />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0A192F', borderRadius: '16px', border: '1px solid #ffffff10' }}
                  formatter={(v: any) => formatCurrency(v)}
                />
                <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Sources Donut */}
        <div className="lg:col-span-4 bg-white/5 p-8 rounded-[40px] border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Distribuição de Despesas</h3>
          </div>
          <div className="h-[240px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.expenseSourcesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats.expenseSourcesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(v: any) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-white">{stats.expenseSourcesData.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {stats.expenseSourcesData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[9px] font-black text-slate-500 uppercase truncate">{item.name}</span>
                </div>
                <span className="text-xs font-black text-white">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Tasks & Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white/5 p-8 rounded-[40px] border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Gestão de Tarefas</h3>
            <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Tarefas</span>
          </div>
          <div className="flex items-end gap-10">
            <div className="flex-1">
              <div className="mb-6">
                <span className="text-6xl font-black text-white tracking-tighter">{stats.taskStats.done}</span>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest ml-4">Concluídas</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Em Aberto</span>
                  <span className="text-xl font-black text-white">{stats.taskStats.todo + stats.taskStats.inProgress}</span>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Total</span>
                  <span className="text-xl font-black text-white">{stats.taskStats.total}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 pb-2">
              {Array.from({ length: 16 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-8 h-8 rounded-lg transition-all duration-500 ${
                    i < stats.taskStats.done ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/5 border border-white/5'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white/5 p-8 rounded-[40px] border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Alertas de Estoque</h3>
            <button className="text-[10px] font-black text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Ver Todos</button>
          </div>
          <div className="space-y-6">
            {stats.lowStockItems.slice(0, 3).map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                  <span className="text-slate-300">{item.name}</span>
                  <span className="text-white">{item.currentStock} / {item.minStock} {item.unit}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                    style={{ width: `${Math.min(100, (item.currentStock / item.minStock) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.lowStockItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                <CheckCircle2 size={40} className="mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Estoque em conformidade</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

