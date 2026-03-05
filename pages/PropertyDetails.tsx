
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  MapPin,
  History,
  User,
  Clock,
  ArrowRight,
  Image as ImageIcon,
  ExternalLink,
  X,
  DollarSign,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { Property, Expense, ExpenseCategory, PropertyStatus, PropertyLog, Task } from '../types';
import { calculatePropertyMetrics, formatCurrency, formatBRLMask, parseBRLToFloat, formatDate } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PropertyDetailsProps {
  properties: Property[];
  expenses: Expense[];
  logs: PropertyLog[];
  tasks?: Task[];
  onAddExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteProperty: (id: string) => void;
}

const PropertyDetails = ({ properties, expenses, logs, tasks = [], onAddExpense, onDeleteExpense, onDeleteProperty }: PropertyDetailsProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'financeiro' | 'despesas' | 'timeline'>('financeiro');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [newExpData, setNewExpData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: ExpenseCategory.REFORMA,
    description: '',
    amount: 0
  });

  const property = properties.find(p => p.id === id);
  const propertyExpenses = expenses.filter(e => e.propertyId === id);
  
  // Merge logs and tasks for timeline
  const propertyLogs = logs.filter(l => l.propertyId === id);
  const propertyTasks = tasks.filter(t => t.linkedPropertyId === id);
  
  const timelineItems = useMemo(() => {
    const combined = [
      ...propertyLogs.map(l => ({ type: 'log', data: l, date: new Date(l.timestamp) })),
      ...propertyTasks.map(t => ({ type: 'task', data: t, date: new Date(t.createdAt || new Date().toISOString()) })) // Assuming tasks have createdAt, if not use fallback
    ];
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [propertyLogs, propertyTasks]);
  
  const metrics = useMemo(() => property ? calculatePropertyMetrics(property, propertyExpenses) : null, [property, propertyExpenses]);

  const exportToPdf = async () => {
    if (!property || !metrics) return;
    setIsGeneratingPdf(true);
    
    const element = document.getElementById('property-report-content');
    if (!element) return;

    try {
      // Temporarily show the hidden report
      element.style.display = 'block';
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      element.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_${property.neighborhood.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!property || !metrics) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">Imóvel não encontrado.</div>;

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpData.description || newExpData.amount <= 0) {
      alert('Por favor, preencha a descrição e um valor válido.');
      return;
    }

    onAddExpense({
      id: Math.random().toString(36).substr(2, 9),
      propertyId: id!,
      category: newExpData.category,
      description: newExpData.description,
      amount: newExpData.amount,
      date: newExpData.date,
      userId: 'u1',
      userName: 'Diretoria Master',
      attachments: []
    });

    setNewExpData({
      date: new Date().toISOString().split('T')[0],
      category: ExpenseCategory.REFORMA,
      description: '',
      amount: 0
    });
    setIsExpenseModalOpen(false);
  };

  const inputClass = "w-full bg-slate-50 text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/imoveis')} 
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">{property.neighborhood}</h2>
              <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                property.status === PropertyStatus.VENDIDO ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              }`}>
                {property.status}
              </span>
            </div>
            <div className="flex items-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <MapPin size={12} className="mr-1.5" /> {property.city} • {property.type}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onDeleteProperty(property.id)}
            className="inline-flex items-center justify-center gap-2 text-rose-500 hover:text-white hover:bg-rose-600 font-black text-xs uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border border-slate-200 transition-all shadow-sm"
          >
            Excluir <Trash2 size={14} />
          </button>
          <button 
            onClick={exportToPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center justify-center gap-2 text-blue-600 hover:text-white hover:bg-blue-600 font-black text-xs uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border border-slate-200 transition-all shadow-sm disabled:opacity-50"
          >
            {isGeneratingPdf ? 'Gerando...' : 'Relatório PDF'} <FileDown size={14} />
          </button>
          <button 
            onClick={() => navigate(`/editar/${property.id}`)}
            className="inline-flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 font-black text-xs uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border border-slate-200 transition-all shadow-sm"
          >
            Editar Cadastro <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {property.images && property.images.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 relative h-64 md:h-[450px] rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl border border-slate-200 group">
            <img 
              src={property.images[activeImage]} 
              className="w-full h-full object-cover transition-transform duration-1000" 
              alt="Destaque" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 pr-6">
              <p className="text-white font-black text-xl md:text-3xl tracking-tight leading-tight">{property.neighborhood}</p>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1">{property.address}</p>
            </div>
          </div>
          <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto pb-4 lg:pb-0 pr-2 scrollbar-hide">
            {property.images.map((img, idx) => (
              <button 
                key={idx} 
                onClick={() => setActiveImage(idx)}
                className={`relative w-24 h-24 lg:w-full lg:h-28 rounded-[24px] overflow-hidden border-4 transition-all shrink-0 ${activeImage === idx ? 'border-blue-600 scale-95 shadow-lg' : 'border-white opacity-60 hover:opacity-100'}`}
              >
                <img src={img} className="w-full h-full object-cover" alt="Thumbnail" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-64 bg-slate-100 rounded-[40px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
          <ImageIcon size={48} strokeWidth={1} className="mb-4" />
          <p className="font-black uppercase tracking-[0.2em] text-[10px]">Sem fotos cadastradas</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={20} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capital Alocado</p>
          </div>
          <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(metrics.totalInvested)}</p>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={20} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado Real</p>
          </div>
          <p className={`text-2xl md:text-3xl font-black tracking-tight ${metrics.realizedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {property.salePrice ? formatCurrency(metrics.realizedProfit) : 'Pendente de Venda'}
          </p>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl"><BarChart3 size={20} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ROI Operacional</p>
          </div>
          <p className={`text-2xl md:text-3xl font-black tracking-tight ${metrics.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {property.salePrice ? `${metrics.roi.toFixed(1)}%` : '---'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex overflow-x-auto bg-slate-50/50 border-b border-slate-100 no-scrollbar">
          {(['financeiro', 'despesas', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 md:px-12 py-6 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex-1 lg:flex-none ${
                activeTab === tab ? 'text-blue-600 border-b-4 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-10">
          {activeTab === 'financeiro' && (
            <div className="animate-in slide-in-from-bottom-2 space-y-10">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-20">
                <div className="space-y-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Breakdown de Investimento</h4>
                  <div className="space-y-6">
                    {Object.entries(metrics.categoryBreakdown).map(([cat, val]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest">
                          <span className="text-slate-500">{cat}</span>
                          <span className="text-slate-900">{formatCurrency(val as number)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${metrics.totalInvested > 0 ? ((val as number) / metrics.totalInvested) * 100 : 0}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900 p-8 md:p-10 rounded-[40px] text-white flex flex-col justify-center">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Dados de Aquisição e Custos</h4>
                  <div className="space-y-5">
                    {[
                      { label: 'Valor de Lance', val: property.acquisitionPrice },
                      { label: 'Comissão do Leilão', val: property.auctioneerCommission },
                      { label: 'Escritura', val: property.legalEscritura },
                      { label: 'ITBI', val: property.legalItbi },
                      { label: 'Taxas de Registro', val: property.legalTaxasRegistro },
                      { label: 'Certidões', val: property.legalCertidoes },
                      { label: 'Impostos', val: property.taxes },
                      { label: 'Desp. Condomínio', val: property.expenseCondo },
                      { label: 'Desp. IPTU', val: property.expenseIptu },
                      { label: 'Pós-Arremate', val: property.expensePostAcquisition },
                      { label: 'Materiais Reforma', val: property.expenseMaterials },
                      { label: 'Outros Custos', val: property.otherCosts },
                      { label: 'Data Arremate', val: property.acquisitionDate ? formatDate(property.acquisitionDate) : null, format: false },
                      { label: 'Data Venda', val: property.saleDate ? formatDate(property.saleDate) : null, format: false },
                      { label: 'Área Privativa', val: property.sizeM2 ? `${property.sizeM2} m²` : null, format: false },
                      { label: 'Custo por m²', val: metrics.costPerM2 },
                      { label: 'Break-even (Venda)', val: metrics.breakEven }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{item.label}:</span>
                        <span className="font-black text-white">{item.format === false ? (item.val || '---') : formatCurrency(item.val as number)}</span>
                      </div>
                    ))}
                    <div className="pt-8 mt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <span className="text-blue-400 font-black text-xs uppercase tracking-widest">Total Alocado (Geral):</span>
                      <span className="text-3xl font-black text-blue-400">
                        {formatCurrency(metrics.totalInvested)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'despesas' && (
            <div className="animate-in slide-in-from-bottom-2 space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lançamentos Financeiros</h4>
                <button 
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl"
                >
                  <Plus size={16} strokeWidth={3} /> Novo Gasto
                </button>
              </div>
              
              <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
                <div className="min-w-[700px] inline-block w-full align-middle">
                  <div className="border border-slate-100 rounded-[24px] overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <tr>
                          <th className="py-6 px-8">Data</th>
                          <th className="py-6 px-8">Categoria</th>
                          <th className="py-6 px-8">Descrição</th>
                          <th className="py-6 px-8 text-right">Valor</th>
                          <th className="py-6 px-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {propertyExpenses.map((exp) => (
                          <tr key={exp.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="py-6 px-8 text-xs font-bold text-slate-500">{formatDate(exp.date)}</td>
                            <td className="py-6 px-8">
                              <span className="text-[9px] font-black uppercase px-3 py-1.5 bg-slate-100 rounded-lg text-slate-500 tracking-widest">{exp.category}</span>
                            </td>
                            <td className="py-6 px-8 text-sm font-black text-slate-800 tracking-tight">{exp.description}</td>
                            <td className="py-6 px-8 text-base font-black text-slate-900 text-right">{formatCurrency(exp.amount)}</td>
                            <td className="py-6 px-8 text-right">
                              <button onClick={() => onDeleteExpense(exp.id)} className="p-2.5 text-slate-300 hover:text-rose-600 transition-all bg-white rounded-xl shadow-sm"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                        {propertyExpenses.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-20 text-center text-slate-300 italic font-medium">Sem lançamentos registrados.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="animate-in slide-in-from-bottom-2 max-w-2xl mx-auto py-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-12">Logs de Governança</h4>
              <div className="relative border-l-4 border-slate-100 ml-4 md:ml-8 pl-8 md:pl-12 space-y-12">
                {timelineItems.length > 0 ? (
                  timelineItems.map((item, idx) => {
                    if (item.type === 'log') {
                      const log = item.data as PropertyLog;
                      return (
                        <div key={`log-${log.id}`} className="relative">
                          <div className="absolute -left-[48px] md:-left-[60px] top-1 w-10 h-10 rounded-2xl bg-white border-4 border-slate-100 flex items-center justify-center shadow-lg z-10">
                            <Clock size={16} className="text-slate-900" />
                          </div>
                          <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 relative">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <span className="text-sm font-black text-slate-900 tracking-tight leading-none">{log.action}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</span>
                             </div>
                             <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center text-[9px] text-slate-500 font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                                   <User size={12} className="mr-2 text-blue-600" /> {log.userName}
                                </div>
                                {log.fromStatus && (
                                  <div className="flex items-center text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-3 py-1.5 rounded-xl">
                                     {log.fromStatus} <ArrowRight size={10} className="mx-2 text-slate-300" /> {log.toStatus}
                                  </div>
                                )}
                                {log.details && (
                                  <div className="w-full mt-2 text-xs text-slate-500 font-medium bg-white p-3 rounded-xl border border-slate-100">
                                    {log.details}
                                  </div>
                                )}
                             </div>
                          </div>
                        </div>
                      );
                    } else {
                      const task = item.data as Task;
                      return (
                        <div key={`task-${task.id}`} className="relative">
                          <div className="absolute -left-[48px] md:-left-[60px] top-1 w-10 h-10 rounded-2xl bg-blue-50 border-4 border-blue-100 flex items-center justify-center shadow-lg z-10">
                            <CheckCircle2 size={16} className="text-blue-600" />
                          </div>
                          <div className="bg-white p-6 rounded-[28px] border-2 border-blue-50 relative shadow-sm">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <span className="text-sm font-black text-slate-900 tracking-tight leading-none">Tarefa: {task.title}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(task.createdAt || '').toLocaleString()}</span>
                             </div>
                             <div className="flex flex-wrap items-center gap-3">
                                <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                  task.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                  {task.status}
                                </div>
                                <div className="flex items-center text-[9px] text-slate-500 font-black uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                   <User size={12} className="mr-2 text-slate-400" /> {task.assigneeName || 'Sem responsável'}
                                </div>
                             </div>
                             {task.description && (
                                <div className="mt-3 text-xs text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  {task.description}
                                </div>
                             )}
                          </div>
                        </div>
                      );
                    }
                  })
                ) : (
                  <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs py-10">
                    Nenhum registro encontrado.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpenseModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpenseModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[110] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Gasto</h3>
                  <p className="text-slate-500 text-sm font-medium">Registre despesas do imóvel.</p>
                </div>
                <button 
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddExpenseSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                  <input type="date" className={inputClass} value={newExpData.date} onChange={(e) => setNewExpData({...newExpData, date: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                  <select className={inputClass} value={newExpData.category} onChange={(e) => setNewExpData({...newExpData, category: e.target.value as ExpenseCategory})}>
                    {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                  <input type="text" placeholder="Pintura, Taxas, etc..." className={inputClass} value={newExpData.description} onChange={(e) => setNewExpData({...newExpData, description: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Total</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">R$</span>
                    <input type="text" placeholder="0,00" className={inputClass + " pl-12"} value={formatBRLMask(newExpData.amount)}
                      onChange={(e) => {
                        const numeric = e.target.value.replace(/\D/g, '');
                        setNewExpData({...newExpData, amount: parseBRLToFloat(numeric) || 0});
                      }}
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsExpenseModalOpen(false)} 
                    className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} strokeWidth={3} /> Lançar
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden PDF Report Template */}
      <div id="property-report-content" style={{ display: 'none', width: '800px', padding: '40px', background: 'white' }}>
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Relatório Analítico de Ativo</h1>
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sintese ERP • Gestão de Ativos</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Gerado em: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>Dados do Imóvel</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', fontSize: '12px' }}>
              <span style={{ fontWeight: 'bold', color: '#64748b' }}>Bairro:</span> <span>{property.neighborhood}</span>
              <span style={{ fontWeight: 'bold', color: '#64748b' }}>Cidade:</span> <span>{property.city}</span>
              <span style={{ fontWeight: 'bold', color: '#64748b' }}>Tipo:</span> <span>{property.type}</span>
              <span style={{ fontWeight: 'bold', color: '#64748b' }}>Status:</span> <span>{property.status}</span>
              <span style={{ fontWeight: 'bold', color: '#64748b' }}>Endereço:</span> <span>{property.address}</span>
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '15px' }}>Resumo Financeiro</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Total Alocado</p>
                <p style={{ fontSize: '16px', fontWeight: '900' }}>{formatCurrency(metrics.totalInvested)}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>ROI Estimado</p>
                <p style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>{metrics.roi.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>Detalhamento de Despesas</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Data</th>
                <th style={{ padding: '10px' }}>Categoria</th>
                <th style={{ padding: '10px' }}>Descrição</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {propertyExpenses.map(exp => (
                <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>{formatDate(exp.date)}</td>
                  <td style={{ padding: '10px' }}>{exp.category}</td>
                  <td style={{ padding: '10px' }}>{exp.description}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(exp.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>Histórico de Governança</h2>
          <div style={{ fontSize: '11px' }}>
            {propertyLogs.slice(0, 10).map(log => (
              <div key={log.id} style={{ marginBottom: '10px', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold' }}>{log.action}</span>
                  <span style={{ color: '#64748b' }}>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p style={{ margin: 0, color: '#475569' }}>{log.details || `Alteração realizada por ${log.userName}`}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
