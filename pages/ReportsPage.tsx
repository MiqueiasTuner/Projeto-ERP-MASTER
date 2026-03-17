
import React, { useMemo, useRef, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { FileDown, TrendingUp, DollarSign, Package, MapPin, Calendar, Building2, PieChart as PieChartIcon, Gavel, HardHat, Loader2, Search, ArrowRight, Info, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { 
  Property, Expense, InventoryItem, PropertyStatus, ExpenseCategory, 
  Task, TaskStatus, Auction, AuctionStatus, Broker, Lead, LeadStatus 
} from '../types';
import { calculatePropertyMetrics, formatCurrency, formatDate } from '../utils';
import { reportService } from '../ReportService';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#eab308', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card)] p-4 rounded-2xl shadow-2xl border border-[var(--border)]">
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-black text-[var(--text-header)]">
              {entry.name}: {typeof entry.value === 'number' && entry.name.toLowerCase().includes('roi') ? `${entry.value.toFixed(1)}%` : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ReportsPage = ({ 
  properties, 
  expenses, 
  inventory,
  tasks = [],
  auctions = [],
  brokers = [],
  leads = []
}: { 
  properties: Property[], 
  expenses: Expense[], 
  inventory: InventoryItem[],
  tasks?: Task[],
  auctions?: Auction[],
  brokers?: Broker[],
  leads?: Lead[]
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'ytd'>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');

  const filteredData = useMemo(() => {
    let props = [...properties];
    if (propertyTypeFilter !== 'all') {
      props = props.filter(p => p.type === propertyTypeFilter);
    }
    
    // Date filtering logic could be added here if needed for all charts
    return props;
  }, [properties, propertyTypeFilter]);

  const selectedProperty = useMemo(() => 
    properties.find(p => p.id === selectedPropertyId),
  [properties, selectedPropertyId]);

  const propertyExpenses = useMemo(() => 
    expenses.filter(e => e.propertyId === selectedPropertyId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [expenses, selectedPropertyId]);

  const propertyMetrics = useMemo(() => 
    selectedProperty ? calculatePropertyMetrics(selectedProperty, expenses) : null,
  [selectedProperty, expenses]);

  const filteredProperties = useMemo(() => 
    properties.filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.condoName?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  [properties, searchTerm]);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      await reportService.generatePropertyReport(properties, expenses);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const metrics = useMemo(() => {
    const propertyData = filteredData.map(p => ({
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
      value: filteredData.filter(p => p.status === status).length
    }));

    const cityGroups = filteredData.reduce((acc: any, p) => {
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

    // Task Stats
    const taskStats = Object.values(TaskStatus).map(status => ({
      name: status,
      value: tasks.filter(t => t.status === status).length
    }));

    // Auction Stats
    const auctionStats = Object.values(AuctionStatus).map(status => ({
      name: status,
      value: auctions.filter(a => a.status === status).length
    }));

    // Broker Performance
    const brokerLeads = brokers.map(b => ({
      name: b.name,
      leads: leads.filter(l => l.brokerId === b.id).length,
      vendas: leads.filter(l => l.brokerId === b.id && l.status === LeadStatus.SOLD).length
    })).sort((a, b) => b.leads - a.leads).slice(0, 8);

    return { 
      totalInvested, 
      roiByCity, 
      statusDist, 
      avgROI, 
      avgLeadTime, 
      renovationCosts, 
      inventoryValueData, 
      profitabilityData,
      taskStats,
      auctionStats,
      brokerLeads
    };
  }, [filteredData, expenses, inventory, tasks, auctions, brokers, leads]);

  return (
    <div ref={reportRef} className="space-y-8 animate-in fade-in duration-700 pb-20 text-[var(--text-main)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-[var(--text-header)] tracking-tight mb-2">Relatórios Analíticos</h2>
          <p className="text-[var(--text-muted)] font-medium flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--accent)]" />
            Inteligência de dados para maximização de ROI
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
            className="bg-[var(--bg-card)] text-[var(--text-header)] border border-[var(--border)] px-4 py-3 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none"
          >
            <option value="all">Todos os Tipos</option>
            <option value="Apartamento">Apartamentos</option>
            <option value="Casa">Casas</option>
            <option value="Terreno">Terrenos</option>
            <option value="Comercial">Comerciais</option>
          </select>
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-3 bg-[var(--text-header)] text-[var(--bg-header)] px-8 py-4 rounded-[24px] text-sm font-black uppercase tracking-widest hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm flex flex-col justify-between group hover:border-[var(--accent)] transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-[var(--accent)]/10 text-[var(--accent)] rounded-3xl">
              <Gavel size={32} />
            </div>
            <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest bg-[var(--accent)]/10 px-3 py-1 rounded-full">Investimento</span>
          </div>
          <div>
            <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Arrematado</p>
            <p className="text-3xl font-black text-[var(--text-header)]">{formatCurrency(filteredData.reduce((acc, p) => acc + (p.acquisitionPrice || 0), 0))}</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm flex flex-col justify-between group hover:border-orange-500/30 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-orange-500/10 text-orange-500 rounded-3xl">
              <HardHat size={32} />
            </div>
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full">Obras</span>
          </div>
          <div>
            <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total em Reformas</p>
            <p className="text-3xl font-black text-[var(--text-header)]">{formatCurrency(expenses.reduce((acc, e) => acc + e.amount, 0))}</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm flex flex-col justify-between group hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-3xl">
              <DollarSign size={32} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">Vendas</span>
          </div>
          <div>
            <p className="text-[11px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Vendas Realizadas</p>
            <p className="text-3xl font-black text-[var(--text-header)]">{formatCurrency(filteredData.filter(p => p.status === PropertyStatus.VENDIDO).reduce((acc, p) => acc + (p.salePrice || 0), 0))}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
          <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl w-fit mb-4">
            <DollarSign size={24} />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Capital Alocado</p>
          <p className="text-2xl font-black text-[var(--text-header)]">{formatCurrency(metrics.totalInvested)}</p>
        </div>
        <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl w-fit mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">ROI Médio Líquido</p>
          <p className="text-2xl font-black text-[var(--text-header)]">{metrics.avgROI.toFixed(1)}%</p>
        </div>
        <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl w-fit mb-4">
            <Calendar size={24} />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Giro Médio (Dias)</p>
          <p className="text-2xl font-black text-[var(--text-header)]">{metrics.avgLeadTime} Dias</p>
        </div>
        <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl w-fit mb-4">
            <Building2 size={24} />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Ativos Filtrados</p>
          <p className="text-2xl font-black text-[var(--text-header)]">{filteredData.length}</p>
        </div>
      </div>

      {/* Property Selection & Detailed Report */}
      <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Relatório Detalhado por Imóvel</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">Selecione um ativo para visualizar o extrato financeiro completo</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <input
              type="text"
              placeholder="Buscar por título, bairro ou condomínio..."
              className="block w-full pl-10 pr-10 py-3 bg-[var(--bg-card-alt)] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-muted)] text-[var(--text-header)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-header)]"
              >
                <X size={16} />
              </button>
            )}
            
            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchTerm && filteredProperties.length > 0 && !selectedPropertyId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
                >
                  {filteredProperties.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPropertyId(p.id);
                        setSearchTerm('');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[var(--bg-card-alt)] flex items-center justify-between group transition-colors border-b border-[var(--border)] last:border-0"
                    >
                      <div>
                        <p className="text-sm font-bold text-[var(--text-header)]">{p.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{p.neighborhood} • {p.condoName}</p>
                      </div>
                      <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-header)] transition-colors" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected Property Report */}
        <AnimatePresence mode="wait">
          {selectedProperty && propertyMetrics ? (
            <motion.div
              key={selectedProperty.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pt-8 border-t border-[var(--border)]"
            >
              {/* Property Header Info */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card-alt)] flex items-center justify-center text-[var(--text-muted)]">
                    <Building2 size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-xl font-black text-[var(--text-header)]">{selectedProperty.title}</h4>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        selectedProperty.status === PropertyStatus.VENDIDO 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {selectedProperty.status}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] font-medium">{selectedProperty.city} - {selectedProperty.neighborhood} • {selectedProperty.condoName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={async () => {
                      setIsExporting(true);
                      try {
                        await reportService.generatePropertyDetailReport(selectedProperty, expenses);
                      } catch (error) {
                        console.error('Erro ao exportar dossiê:', error);
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    disabled={isExporting}
                    className="px-4 py-2 bg-[var(--text-header)] text-[var(--bg-header)] rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                    Exportar Dossiê
                  </button>
                  <button 
                    onClick={() => setSelectedPropertyId(null)}
                    className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-header)] flex items-center gap-2 transition-colors"
                  >
                    <X size={16} />
                    Limpar Seleção
                  </button>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-card-alt)] p-5 rounded-3xl border border-[var(--border)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Investido</p>
                  <p className="text-xl font-black text-[var(--text-header)]">{formatCurrency(propertyMetrics.totalInvested)}</p>
                </div>
                <div className="bg-[var(--bg-card-alt)] p-5 rounded-3xl border border-[var(--border)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Lucro Realizado</p>
                  <p className={`text-xl font-black ${propertyMetrics.realizedProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(propertyMetrics.realizedProfit)}
                  </p>
                </div>
                <div className="bg-[var(--bg-card-alt)] p-5 rounded-3xl border border-[var(--border)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">ROI do Ativo</p>
                  <p className="text-xl font-black text-[var(--text-header)]">{propertyMetrics.roi.toFixed(1)}%</p>
                </div>
                <div className="bg-[var(--bg-card-alt)] p-5 rounded-3xl border border-[var(--border)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Preço de Venda</p>
                  <p className="text-xl font-black text-[var(--text-header)]">{selectedProperty.salePrice ? formatCurrency(selectedProperty.salePrice) : 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cost Breakdown Chart */}
                <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border)]">
                  <h5 className="text-xs font-black text-[var(--text-header)] uppercase tracking-widest mb-6 flex items-center gap-2">
                    <PieChartIcon size={16} className="text-[var(--text-muted)]" />
                    Composição de Custos
                  </h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Arremate', value: selectedProperty.acquisitionPrice },
                            { name: 'Reforma', value: (propertyMetrics.categoryBreakdown[ExpenseCategory.REFORMA] || 0) + (selectedProperty.expenseMaterials || 0) },
                            { name: 'Legal/Doc', value: propertyMetrics.categoryBreakdown[ExpenseCategory.LEGAL] || 0 },
                            { name: 'Impostos', value: propertyMetrics.categoryBreakdown[ExpenseCategory.IMPOSTOS] || 0 },
                            { name: 'Outros', value: propertyMetrics.totalInvested - selectedProperty.acquisitionPrice - ((propertyMetrics.categoryBreakdown[ExpenseCategory.REFORMA] || 0) + (selectedProperty.expenseMaterials || 0)) - (propertyMetrics.categoryBreakdown[ExpenseCategory.LEGAL] || 0) - (propertyMetrics.categoryBreakdown[ExpenseCategory.IMPOSTOS] || 0) }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {COLORS.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      { name: 'Arremate', value: selectedProperty.acquisitionPrice, color: COLORS[0] },
                      { name: 'Reforma', value: (propertyMetrics.categoryBreakdown[ExpenseCategory.REFORMA] || 0) + (selectedProperty.expenseMaterials || 0), color: COLORS[1] },
                      { name: 'Legal/Doc', value: propertyMetrics.categoryBreakdown[ExpenseCategory.LEGAL] || 0, color: COLORS[2] },
                      { name: 'Impostos', value: propertyMetrics.categoryBreakdown[ExpenseCategory.IMPOSTOS] || 0, color: COLORS[3] },
                      { name: 'Outros', value: propertyMetrics.totalInvested - selectedProperty.acquisitionPrice - ((propertyMetrics.categoryBreakdown[ExpenseCategory.REFORMA] || 0) + (selectedProperty.expenseMaterials || 0)) - (propertyMetrics.categoryBreakdown[ExpenseCategory.LEGAL] || 0) - (propertyMetrics.categoryBreakdown[ExpenseCategory.IMPOSTOS] || 0), color: COLORS[4] }
                    ].filter(d => d.value > 0).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{item.name}: {formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expense Timeline */}
                <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border)]">
                  <h5 className="text-xs font-black text-[var(--text-header)] uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Clock size={16} className="text-[var(--text-muted)]" />
                    Linha do Tempo de Despesas
                  </h5>
                  <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                    {propertyExpenses.length > 0 ? (
                      propertyExpenses.map((expense, i) => (
                        <div key={expense.id} className="flex items-start gap-4 group">
                          <div className="mt-1.5 w-2 h-2 rounded-full bg-[var(--border)] group-hover:bg-[var(--accent)] transition-colors" />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-[var(--text-header)]">{expense.description}</p>
                              <p className="text-sm font-black text-[var(--text-header)]">{formatCurrency(expense.amount)}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{formatDate(expense.date)}</span>
                              <span className="text-[10px] px-2 py-0.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] rounded-full font-bold uppercase">{expense.category}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-12">
                        <Info size={32} className="mb-2 opacity-20" />
                        <p className="text-sm font-medium">Nenhuma despesa registrada</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Details Footer */}
              <div className="bg-[var(--bg-card-alt)] text-[var(--text-header)] p-8 rounded-[32px] border border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    selectedProperty.status === PropertyStatus.VENDIDO ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {selectedProperty.status === PropertyStatus.VENDIDO ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Status Atual do Ativo</p>
                    <h6 className="text-lg font-black uppercase tracking-wider">{selectedProperty.status}</h6>
                  </div>
                </div>
                
                <div className="flex gap-8">
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Data Aquisição</p>
                    <p className="font-bold">{selectedProperty.acquisitionDate ? formatDate(selectedProperty.acquisitionDate) : 'N/A'}</p>
                  </div>
                  {selectedProperty.saleDate && (
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Data Venda</p>
                      <p className="font-bold">{formatDate(selectedProperty.saleDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border)] rounded-[32px]">
              <Info size={48} className="mb-4 opacity-10" />
              <p className="text-sm font-medium">Selecione um imóvel para ver o relatório financeiro detalhado</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ROI by City */}
        <div className="lg:col-span-8 bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Performance por Praça (ROI)</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">Rentabilidade média por cidade de atuação</p>
            </div>
            <MapPin size={20} className="text-[var(--text-muted)]" />
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.roiByCity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} unit="%" />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} width={100} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-card-alt)' }} />
                <Bar dataKey="roi" name="ROI Médio" fill="var(--accent)" radius={[0, 8, 8, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="lg:col-span-4 bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Pipeline de Ativos</h3>
            <PieChartIcon size={20} className="text-[var(--text-muted)]" />
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
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total</span>
              <span className="text-3xl font-black text-[var(--text-header)]">{filteredData.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {metrics.statusDist.map((item, index) => (
              <div key={item.name} className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase truncate">{item.name}</span>
                </div>
                <span className="text-sm font-black text-[var(--text-header)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Performance */}
        <div className="lg:col-span-6 bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Histórico de Tarefas</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">Distribuição de tarefas por status</p>
            </div>
            <CheckCircle2 size={20} className="text-[var(--text-muted)]" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.taskStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Tarefas" fill="#8b5cf6" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Auction Analysis */}
        <div className="lg:col-span-6 bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Análise de Leilões</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">Status dos leilões monitorados</p>
            </div>
            <Gavel size={20} className="text-[var(--text-muted)]" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.auctionStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metrics.auctionStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Broker Performance */}
        <div className="lg:col-span-12 bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Performance de Corretores</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">Leads e Vendas por corretor (Top 8)</p>
            </div>
            <TrendingUp size={20} className="text-[var(--text-muted)]" />
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.brokerLeads}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="leads" name="Leads" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="vendas" name="Vendas" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
