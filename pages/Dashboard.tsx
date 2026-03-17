
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
  HardHat,
  FileDown,
  Loader2
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
import { reportService } from '../ReportService';
import { motion } from 'motion/react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1', '#EC4899'];

const Card = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`bg-[var(--bg-card)] rounded-[var(--radius)] border border-[var(--border)] shadow-sm p-4 lg:p-6 ${className}`}
  >
    {children}
  </motion.div>
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
  const [isExporting, setIsExporting] = React.useState(false);
  const pageRef = React.useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      await reportService.generateDashboardReport('dashboard-content');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const stats = useMemo(() => {
    const props = properties || [];
    const exps = expenses || [];
    const sold = props.filter(p => p.status === PropertyStatus.VENDIDO);
    const metrics = props.map(p => calculatePropertyMetrics(p, exps));
    
    const totalInvested = metrics.reduce((acc, m) => acc + m.totalInvested, 0);
    const totalProfit = metrics.reduce((acc, m) => acc + m.realizedProfit, 0);
    const totalSaleValue = props.filter(p => p.status === PropertyStatus.VENDIDO).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const totalAcquisition = props.reduce((acc, p) => acc + (p.acquisitionPrice || 0), 0);
    const totalRenovation = exps.reduce((acc, e) => acc + e.amount, 0);
    
    const avgROI = sold.length > 0 
      ? metrics.filter((_, i) => props[i].status === PropertyStatus.VENDIDO)
          .reduce((acc, m) => acc + m.roi, 0) / sold.length 
      : 0;

    // 1. Monthly Balance Data
    const monthlyData = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' });
      const monthIndex = d.getMonth();
      const year = d.getFullYear();

      const monthExpenses = exps.filter(e => {
        const eDate = new Date(e.date);
        return eDate.getMonth() === monthIndex && eDate.getFullYear() === year;
      }).reduce((sum, e) => sum + e.amount, 0);

      const monthIncome = props.filter(p => {
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
    const expenseByCategory = exps.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const expenseSourcesData = Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // 3. Inventory Limits
    const lowStockItems = (inventory || []).filter(i => i.currentStock <= i.minStock);
    
    // 4. Task Statistics
    const taskStats = {
      total: (tasks || []).length,
      done: (tasks || []).filter(t => t.status === TaskStatus.DONE).length,
      todo: (tasks || []).filter(t => t.status === TaskStatus.TODO).length,
      inProgress: (tasks || []).filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    };

    // 5. Markup de Reforma Data
    const markupData = props.slice(0, 6).map(p => {
      const m = calculatePropertyMetrics(p, exps);
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
      { name: 'Arrematado', value: props.filter(p => p.status === PropertyStatus.ARREMATADO).length, color: '#8B5CF6' },
      { name: 'Em Reforma', value: props.filter(p => p.status === PropertyStatus.EM_REFORMA).length, color: '#F59E0B' },
      { name: 'À Venda', value: props.filter(p => p.status === PropertyStatus.A_VENDA).length, color: '#3B82F6' },
      { name: 'Vendido', value: props.filter(p => p.status === PropertyStatus.VENDIDO).length, color: '#10B981' },
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
    const overdueTasks = (tasks || []).filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.DONE);
    if (overdueTasks.length > 0) {
      activeAlerts.push({
        id: 'overdue-tasks',
        type: 'error',
        title: 'Tarefas Atrasadas',
        message: `${overdueTasks.length} tarefas estão com o prazo vencido.`,
        icon: Clock
      });
    }
    const upcomingAuctions = (auctions || []).filter(a => {
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
      totalProperties: props.length
    };
  }, [properties, expenses, tasks, inventory, auctions]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="dashboard-content" 
      ref={pageRef} 
      className="min-h-screen bg-[var(--bg-header)] -m-6 lg:-m-10 p-4 lg:p-6 space-y-6 text-[var(--text-header)] overflow-x-hidden"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-[var(--text-header)] tracking-tight mb-2">Dashboard Executivo</h2>
          <p className="text-[var(--text-muted)] font-medium flex items-center gap-2">
            <Clock size={16} className="text-[var(--accent)]" />
            Atualizado em {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="bg-[var(--bg-card)] text-[var(--text-header)] px-6 py-4 rounded-[var(--radius)] font-black text-sm border border-[var(--border)] flex items-center gap-2 hover:bg-[var(--bg-card-alt)] transition-all shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
            <span>{isExporting ? 'Exportando...' : 'PDF'}</span>
          </button>
          <div className="bg-[var(--bg-card)] p-2 rounded-[var(--radius)] border border-[var(--border)] shadow-sm flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)]">
              <Building2 size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Ativos Totais</span>
              <span className="text-sm font-black text-[var(--text-header)]">{stats.totalProperties}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/novo')}
            className="bg-[var(--accent)] text-[var(--accent-text)] p-4 rounded-[var(--radius)] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 transition-all"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {stats.activeAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.activeAlerts.map(alert => (
            <div key={alert.id} className={`p-4 rounded-[var(--radius)] border flex items-center gap-4 ${
              alert.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
              alert.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]'
            }`}>
              <div className={`p-2 rounded-[var(--radius)] ${
                alert.type === 'warning' ? 'bg-orange-500/20' :
                alert.type === 'error' ? 'bg-rose-500/20' :
                'bg-[var(--accent)]/20'
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
          <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] flex flex-col justify-between group hover:bg-[var(--bg-card-alt)] transition-all cursor-default">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-[var(--radius)]">
                <Gavel size={28} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-[var(--radius)]">Investimento</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest mb-1">Total Arrematado</p>
              <h3 className="text-3xl font-black text-[var(--text-header)] tracking-tight leading-none">{formatCurrency(stats.totalAcquisition)}</h3>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Ativos em Carteira</span>
                <span className="text-xs font-black text-[var(--accent)]">{properties.filter(p => p.status !== PropertyStatus.VENDIDO).length} Unidades</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] flex flex-col justify-between group hover:bg-[var(--bg-card-alt)] transition-all cursor-default">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] rounded-[var(--radius)]">
                <HardHat size={28} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10 px-3 py-1.5 rounded-[var(--radius)]">Reformas</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--accent-secondary)] uppercase tracking-widest mb-1">Investimento em Obras</p>
              <h3 className="text-3xl font-black text-[var(--text-header)] tracking-tight leading-none">{formatCurrency(stats.totalRenovation)}</h3>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Custo Operacional</span>
                <span className="text-xs font-black text-[var(--accent-secondary)]">Global</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] flex flex-col justify-between group hover:bg-[var(--bg-card-alt)] transition-all cursor-default">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-[var(--radius)]">
                <DollarSign size={28} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-[var(--radius)]">Vendas</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--accent)]/60 uppercase tracking-widest mb-1">Vendas Realizadas</p>
              <h3 className="text-3xl font-black text-[var(--text-header)] tracking-tight leading-none">{formatCurrency(stats.totalSaleValue)}</h3>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Lucro Líquido</span>
                <span className="text-xs font-black text-[var(--accent)]">{formatCurrency(stats.totalProfit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Markup Chart - Prioritized */}
        <div className="lg:col-span-8 bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xs font-black text-[var(--text-header)] uppercase tracking-widest">Análise de Markup</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Comparativo de custos vs. valor de mercado</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">Arrematação</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-secondary)]" />
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">Reforma</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.markupData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                  <RechartsTooltip 
                    cursor={{ fill: 'var(--bg-card-alt)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-header)', borderRadius: '4px', border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                    itemStyle={{ color: 'var(--text-header)', fontSize: '12px', fontWeight: 600 }}
                    labelStyle={{ color: 'var(--text-header)', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="arrematacao" stackId="a" fill="var(--accent)" radius={[0, 0, 0, 0]} barSize={32} />
                  <Bar dataKey="reforma" stackId="a" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="breakEven" name="Break-even" fill="var(--border)" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        {/* Pipeline Status Card */}
        <div className="lg:col-span-4 bg-[var(--bg-card)] p-5 rounded-[var(--radius)] border border-[var(--border)] flex flex-col">
          <h3 className="text-xs font-black text-[var(--text-header)] uppercase tracking-widest mb-6">Status do Portfólio</h3>
          
          <div className="flex-1 space-y-6">
            {stats.statusData.map((s) => (
              <div key={s.name} className="group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-bold text-[var(--text-muted)]">{s.name}</span>
                  </div>
                  <span className="text-sm font-black text-[var(--text-header)]">{s.value}</span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-card-alt)] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ 
                      backgroundColor: s.color, 
                      width: `${(s.value / stats.totalProperties || 1) * 100}%`,
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Ativos</span>
            <span className="text-lg font-black text-[var(--text-header)]">{stats.totalProperties}</span>
          </div>
        </div>
      </div>

      {/* Second Row: Balance & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Balance Chart */}
        <div className="lg:col-span-8 bg-[var(--bg-card)] p-8 rounded-[var(--radius)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Fluxo de Caixa</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-[var(--accent)] rounded-full" />
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase">Receita</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-[var(--accent-secondary)] rounded-full" />
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase">Despesas</span>
              </div>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} />
                <YAxis hide />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-header)', borderRadius: '4px', border: '1px solid var(--border)' }}
                  formatter={(v: any) => formatCurrency(v)}
                />
                <Area type="monotone" dataKey="income" stroke="var(--accent)" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" stroke="var(--accent-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Sources Donut */}
        <div className="lg:col-span-4 bg-[var(--bg-card)] p-8 rounded-[var(--radius)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Distribuição de Despesas</h3>
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
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-header)', borderRadius: '4px', border: '1px solid var(--border)' }}
                  itemStyle={{ color: 'var(--text-header)', fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--text-header)', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}
                  formatter={(v: any) => formatCurrency(v)} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-[var(--text-header)]">{stats.expenseSourcesData.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {stats.expenseSourcesData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase truncate">{item.name}</span>
                </div>
                <span className="text-xs font-black text-[var(--text-header)]">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Tasks & Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[var(--bg-card)] p-8 rounded-[var(--radius)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Gestão de Tarefas</h3>
            <span className="text-[10px] font-black text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1 rounded-full uppercase tracking-widest">Tarefas</span>
          </div>
          <div className="flex items-end gap-10">
            <div className="flex-1">
              <div className="mb-6">
                <span className="text-6xl font-black text-[var(--text-header)] tracking-tighter">{stats.taskStats.done}</span>
                <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-4">Concluídas</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--bg-card-alt)] rounded-[var(--radius)] border border-[var(--border)]">
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase block mb-1">Em Aberto</span>
                  <span className="text-xl font-black text-[var(--text-header)]">{stats.taskStats.todo + stats.taskStats.inProgress}</span>
                </div>
                <div className="p-4 bg-[var(--bg-card-alt)] rounded-[var(--radius)] border border-[var(--border)]">
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase block mb-1">Total</span>
                  <span className="text-xl font-black text-[var(--text-header)]">{stats.taskStats.total}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 pb-2">
              {Array.from({ length: 16 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-8 h-8 rounded-sm transition-all duration-500 ${
                    i < stats.taskStats.done ? 'bg-[var(--accent)]' : 'bg-[var(--bg-card-alt)] border border-[var(--border)]'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[var(--bg-card)] p-8 rounded-[var(--radius)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Alertas de Estoque</h3>
            <button className="text-[10px] font-black text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10 px-3 py-1 rounded-full uppercase tracking-widest">Ver Todos</button>
          </div>
          <div className="space-y-6">
            {stats.lowStockItems.slice(0, 3).map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                  <span className="text-[var(--text-muted)]">{item.name}</span>
                  <span className="text-[var(--text-header)]">{item.currentStock} / {item.minStock} {item.unit}</span>
                </div>
                <div className="h-2 bg-[var(--bg-card-alt)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent-secondary)] rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (item.currentStock / item.minStock) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.lowStockItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-10">
                <CheckCircle2 size={40} className="mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Estoque em conformidade</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;

