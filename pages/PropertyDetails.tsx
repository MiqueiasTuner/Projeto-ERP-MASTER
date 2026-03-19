
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  ExternalLink,
  X,
  DollarSign,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  FileDown,
  Edit
} from 'lucide-react';
import { Property, Expense, ExpenseCategory, PropertyStatus, PropertyLog, Task, UserAccount, UserRole } from '../types';
import { calculatePropertyMetrics, formatCurrency, formatBRLMask, parseBRLToFloat, formatDate } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from '../src/components/CustomDatePicker';
import { reportService } from '../ReportService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { MessageSquare, Download, Share2 } from 'lucide-react';
import { CommercialService } from '../src/services/CommercialService';

interface PropertyDetailsProps {
  propertyId?: string;
  properties: Property[];
  expenses: Expense[];
  logs: PropertyLog[];
  tasks?: Task[];
  onAddExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteProperty: (id: string) => void;
  onEdit?: (p: Property) => void;
  onCancel?: () => void;
  currentUser: UserAccount;
}

const PropertyDetails = ({ propertyId, properties, expenses, logs, tasks = [], onAddExpense, onDeleteExpense, onDeleteProperty, onEdit, onCancel, currentUser }: PropertyDetailsProps) => {
  const { id: paramId } = useParams();
  const id = propertyId || paramId;
  const navigate = useNavigate();
  const isBroker = currentUser.role === UserRole.BROKER;
  const [activeTab, setActiveTab] = useState<'financeiro' | 'despesas' | 'timeline' | 'detalhes'>(isBroker ? 'detalhes' : 'financeiro');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDownloadingImages, setIsDownloadingImages] = useState(false);

  const [newExpData, setNewExpData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: ExpenseCategory.REFORMA,
    description: '',
    amount: 0
  });

  const property = properties.find(p => p.id === id);

  // Auto-play for carousel
  useEffect(() => {
    if (!property || property.images.length <= 1 || isLightboxOpen) return;
    
    const interval = setInterval(() => {
      setActiveImage(prev => (prev + 1) % property.images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [property, isLightboxOpen]);
  const propertyExpenses = expenses.filter(e => e.propertyId === id);
  
  // Merge logs and tasks for timeline
  const propertyLogs = logs.filter(l => l.propertyId === id);
  const propertyTasks = tasks.filter(t => t.linkedPropertyId === id);
  
  const timelineItems = useMemo(() => {
    const combined = [
      ...propertyLogs.map(l => ({ 
        type: 'log', 
        data: l, 
        date: new Date(l.timestamp),
        title: l.action,
        description: l.details,
        user: l.userName
      })),
      ...propertyTasks.map(t => ({ 
        type: 'task', 
        data: t, 
        date: new Date(t.createdAt || new Date().toISOString()),
        title: `Tarefa: ${t.title}`,
        description: t.description,
        user: t.assigneeName
      }))
    ];
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [propertyLogs, propertyTasks]);
  
  const metrics = useMemo(() => property ? calculatePropertyMetrics(property, propertyExpenses) : null, [property, propertyExpenses]);

  const exportToPdf = async () => {
    if (!property || !metrics) return;
    setIsGeneratingPdf(true);
    try {
      await reportService.generatePropertyDetailReport(property, propertyExpenses);
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadImages = async () => {
    if (!property || !property.images || property.images.length === 0) return;
    setIsDownloadingImages(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("fotos");
      const title = property.title || property.neighborhood || 'imovel';
      
      const downloadPromises = property.images.map(async (url, index) => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
          folder?.file(`foto-${index + 1}.${extension}`, blob);
        } catch (error) {
          console.error(`Error downloading image ${index}:`, error);
        }
      });

      await Promise.all(downloadPromises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `fotos-${title.replace(/\s+/g, '-').toLowerCase()}.zip`);
    } catch (error) {
      console.error("Error creating zip", error);
      alert("Erro ao baixar imagens.");
    } finally {
      setIsDownloadingImages(false);
    }
  };

  const handleShare = async () => {
    if (!property) return;
    const url = `${window.location.origin}/#/publico/imovel/${property.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title || 'Imóvel Sintese ERP',
          text: `Confira este imóvel: ${property.title}`,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado para a área de transferência!');
    }
  };

  const getWhatsAppKitLink = () => {
    if (!property) return '#';
    const commercialProperty = CommercialService.getCommercialProperties([property])[0];
    if (!commercialProperty) {
      // Fallback if not marked as available for brokers
      const publicLink = `${window.location.origin}/#/publico/imovel/${property.id}`;
      const message = encodeURIComponent(
        `Segue dados do imóvel:\n\n` +
        `*${(property.title || property.neighborhood || 'Imóvel').toUpperCase()}*\n\n` +
        `Localização: ${property.neighborhood}, ${property.city}\n` +
        `Valor: R$ ${(property.salePrice || 0).toLocaleString('pt-BR')}\n\n` +
        `Confira fotos e detalhes no link abaixo:\n${publicLink}`
      );
      return `https://wa.me/?text=${message}`;
    }
    return CommercialService.getWhatsAppSalesKitLink(commercialProperty);
  };

  if (!property || !metrics) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">Imóvel não encontrado.</div>;

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpData.description || newExpData.amount <= 0) {
      alert('Por favor, preencha a descrição e um valor válido.');
      return;
    }

    onAddExpense({
      id: editingExpense ? editingExpense.id : Math.random().toString(36).substr(2, 9),
      propertyId: id!,
      category: newExpData.category,
      description: newExpData.description,
      amount: newExpData.amount,
      date: newExpData.date,
      userId: editingExpense ? editingExpense.userId : 'u1',
      userName: editingExpense ? editingExpense.userName : 'Diretoria Master',
      attachments: editingExpense ? editingExpense.attachments : []
    });

    setNewExpData({
      date: new Date().toISOString().split('T')[0],
      category: ExpenseCategory.REFORMA,
      description: '',
      amount: 0
    });
    setEditingExpense(null);
    setIsExpenseModalOpen(false);
  };

  const handleEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setNewExpData({
      date: exp.date,
      category: exp.category,
      description: exp.description,
      amount: exp.amount
    });
    setIsExpenseModalOpen(true);
  };

  const inputClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-[var(--text-muted)]";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onCancel ? onCancel() : navigate('/imoveis')} 
            className="p-3.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border)] transition-all shadow-sm"
          >
            <ArrowLeft size={20} className="text-[var(--text-muted)]" />
          </button>
          <div className="min-w-0">
            {property.address && (
              <div className="mb-2">
                <span className="bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-yellow-500/20 shadow-sm inline-block max-w-full truncate">
                  {property.address}
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight truncate">
                {property.title || property.condoName || property.neighborhood}
              </h2>
              <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                property.status === PropertyStatus.VENDIDO ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20'
              }`}>
                {property.status}
              </span>
            </div>
            <div className="flex items-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">
              <MapPin size={12} className="mr-1.5" /> {property.city} • {property.type}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isBroker && (
            <>
              <button 
                onClick={() => onDeleteProperty(property.id)}
                className="inline-flex items-center justify-center gap-2 text-rose-500 hover:text-white hover:bg-rose-600 font-black text-xs uppercase tracking-widest bg-[var(--bg-card)] px-6 py-3 rounded-2xl border border-[var(--border)] transition-all shadow-sm"
              >
                Excluir <Trash2 size={14} />
              </button>
              <button 
                onClick={exportToPdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center justify-center gap-2 text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] font-black text-xs uppercase tracking-widest bg-[var(--bg-card)] px-6 py-3 rounded-2xl border border-[var(--border)] transition-all shadow-sm disabled:opacity-50"
              >
                {isGeneratingPdf ? 'Gerando...' : 'Relatório PDF'} <FileDown size={14} />
              </button>
              
              <button 
                onClick={() => onEdit ? onEdit(property) : navigate(`/editar/${property.id}`)}
                className="inline-flex items-center justify-center gap-2 bg-gradient-primary text-[var(--accent-text)] font-black text-xs uppercase tracking-widest px-6 py-3 rounded-2xl transition-all shadow-accent"
              >
                Editar Cadastro <Edit size={14} />
              </button>
            </>
          )}

          <div className="relative group/actions">
            <button className="p-3 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-header)] rounded-2xl transition-all shadow-sm">
              <Plus size={20} />
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden">
              <button 
                onClick={handleShare}
                className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--accent)] flex items-center gap-3 border-b border-[var(--border)]"
              >
                <Share2 size={14} /> Compartilhar Link
              </button>
              <button 
                onClick={handleDownloadImages}
                disabled={isDownloadingImages}
                className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-blue-500 flex items-center gap-3 border-b border-[var(--border)]"
              >
                <Download size={14} /> Baixar Fotos (ZIP)
              </button>
              <Link 
                to={`/publico/imovel/${property.id}`}
                target="_blank"
                className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-emerald-600 flex items-center gap-3 border-b border-[var(--border)]"
              >
                <ExternalLink size={14} /> Ver Kit Online
              </Link>
              <a 
                href={getWhatsAppKitLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-emerald-500 flex items-center gap-3"
              >
                <MessageSquare size={14} /> Kit WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {property.images && property.images.length > 0 ? (
            <div className="relative h-[350px] md:h-[550px] rounded-[40px] md:rounded-[56px] overflow-hidden shadow-2xl border border-[var(--border)] group cursor-pointer"
                 onClick={() => setIsLightboxOpen(true)}>
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeImage}
                  src={property.images[activeImage]} 
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover" 
                  alt="Destaque" 
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl text-white border border-white/10">
                  <Maximize2 size={24} />
                </div>
              </div>

              <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 pr-8">
                {property.address && (
                  <span className="inline-block bg-yellow-600/80 backdrop-blur-md text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 border border-white/20">
                    {property.address}
                  </span>
                )}
                <p className="text-white font-black text-2xl md:text-4xl tracking-tight leading-tight">
                  {property.title || property.condoName || property.neighborhood}
                </p>
              </div>

              {/* Carousel Controls */}
              {property.images.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImage((prev) => (prev === 0 ? property.images!.length - 1 : prev - 1));
                    }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-2xl border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImage((prev) => (prev === property.images!.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-2xl border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="h-64 bg-[var(--bg-card-alt)] rounded-[40px] flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border)]">
              <ImageIcon size={48} strokeWidth={1} className="mb-4" />
              <p className="font-black uppercase tracking-[0.2em] text-[10px]">Sem fotos cadastradas</p>
            </div>
          )}

          {/* Dados da Venda (Se Vendido) */}
          {property.status === PropertyStatus.VENDIDO && !isBroker && (
            <div className="bg-emerald-500/5 p-8 rounded-[32px] border border-emerald-500/10 shadow-sm animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 mb-6 text-emerald-600 dark:text-emerald-400">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-widest">Dados da Venda</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1">Valor de Venda</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(property.salePrice || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1">Data da Venda</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{property.saleDate ? formatDate(property.saleDate) : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1">Corretor / Imobiliária</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{property.brokerName || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1">Lucro Estimado</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency((property.salePrice || 0) - metrics.totalInvested)}</p>
                </div>
              </div>
              {property.saleNotes && (
                <div className="mt-6 pt-6 border-t border-emerald-500/10">
                  <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-2">Observações da Venda</p>
                  <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">{property.saleNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Thumbnail Carousel - Moved here for better layout */}
          {property.images.length > 0 && (
            <div className="bg-gradient-card p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Galeria ({property.images.length})</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveImage(prev => (prev - 1 + property.images.length) % property.images.length)}
                    className="p-1.5 rounded-lg bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button 
                    onClick={() => setActiveImage(prev => (prev + 1) % property.images.length)}
                    className="p-1.5 rounded-lg bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                {property.images.map((img, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveImage(idx)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 snap-start ${activeImage === idx ? 'border-yellow-600 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="Thumbnail" referrerPolicy="no-referrer" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Metrics Sidebar */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gradient-card p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-500/10 text-yellow-600 rounded-xl"><DollarSign size={18} /></div>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{isBroker ? 'Valor de Venda' : 'Capital Alocado'}</p>
              </div>
              <p className="text-2xl font-black text-[var(--text-main)] tracking-tight">{formatCurrency(isBroker ? (property.salePrice || 0) : metrics.totalInvested)}</p>
            </div>
            <div className="bg-gradient-card p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">{isBroker ? <ImageIcon size={18} /> : <TrendingUp size={18} />}</div>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{isBroker ? 'Tipo de Imóvel' : 'Resultado Real'}</p>
              </div>
              <p className={`text-2xl font-black tracking-tight ${!isBroker && metrics.realizedProfit >= 0 ? 'text-emerald-600' : isBroker ? 'text-[var(--text-main)]' : 'text-rose-600'}`}>
                {isBroker ? property.type : (property.salePrice ? formatCurrency(metrics.realizedProfit) : 'Pendente')}
              </p>
            </div>
            <div className="bg-gradient-card p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[var(--text-main)] text-[var(--bg-main)] rounded-xl">{isBroker ? <MapPin size={18} /> : <BarChart3 size={18} />}</div>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{isBroker ? 'Área Total' : 'ROI Operacional'}</p>
              </div>
              <p className={`text-2xl font-black tracking-tight ${!isBroker && metrics.roi >= 0 ? 'text-emerald-600' : isBroker ? 'text-[var(--text-main)]' : 'text-rose-600'}`}>
                {isBroker ? `${property.sizeM2} m²` : (property.salePrice ? `${metrics.roi.toFixed(1)}%` : '---')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-card rounded-[40px] border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
        <div className="flex overflow-x-auto bg-[var(--bg-card-alt)] border-b border-[var(--border)] no-scrollbar">
          {(isBroker ? (['detalhes'] as const) : (['financeiro', 'despesas', 'timeline'] as const)).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 md:px-12 py-6 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex-1 lg:flex-none ${
                activeTab === tab ? 'text-yellow-600 border-b-4 border-yellow-600 bg-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {tab === 'detalhes' ? 'Características' : tab}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-10">
          {activeTab === 'detalhes' && isBroker && (
            <div className="animate-in slide-in-from-bottom-2 space-y-10">
              <div className="bg-[var(--bg-header)] p-8 md:p-10 rounded-[40px] text-[var(--text-header)]">
                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-8 opacity-50">Informações do Imóvel</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                  {[
                    { label: 'Valor de Venda', val: property.salePrice },
                    { label: 'CEP', val: property.cep, format: false },
                    { label: 'Quartos', val: property.rooms, format: false },
                    { label: 'Banheiros', val: property.bathrooms, format: false },
                    { label: 'Vagas Garagem', val: property.garageSpaces, format: false },
                    { label: 'Condomínio (Mensal)', val: property.monthlyCondo },
                    { label: 'IPTU (Mensal)', val: property.monthlyIptu },
                    { label: 'Área Privativa', val: property.sizeM2 ? `${property.sizeM2} m²` : null, format: false },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                      <span className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px] opacity-70">{item.label}:</span>
                      <span className="font-black text-[var(--text-header)]">{item.format === false ? (item.val || '---') : formatCurrency(item.val as number)}</span>
                    </div>
                  ))}
                </div>

                {(property.features?.length || 0) > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <h4 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 opacity-50">Características do Imóvel</h4>
                    <div className="flex flex-wrap gap-2">
                      {property.features?.map(f => (
                        <span key={f} className="px-2 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-white/70 border border-white/10">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(property.complexFeatures?.length || 0) > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 opacity-50">Características do Condomínio</h4>
                    <div className="flex flex-wrap gap-2">
                      {property.complexFeatures?.map(f => (
                        <span key={f} className="px-2 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-white/70 border border-white/10">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'financeiro' && !isBroker && (
            <div className="animate-in slide-in-from-bottom-2 space-y-10">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-20">
                <div className="space-y-8">
                  <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Breakdown de Investimento</h4>
                  <div className="space-y-6">
                    {Object.entries(metrics.categoryBreakdown).map(([cat, val]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest">
                          <span className="text-[var(--text-muted)]">{cat}</span>
                          <span className="text-[var(--text-main)]">{formatCurrency(val as number)}</span>
                        </div>
                        <div className="w-full bg-[var(--bg-card-alt)] h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-yellow-600 h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${metrics.totalInvested > 0 ? ((val as number) / metrics.totalInvested) * 100 : 0}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[var(--bg-header)] p-8 md:p-10 rounded-[40px] text-[var(--text-header)] flex flex-col justify-center">
                  <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-8 opacity-50">Dados de Aquisição e Custos</h4>
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
                      { label: 'CEP', val: property.cep, format: false },
                      { label: 'Quartos', val: property.rooms, format: false },
                      { label: 'Banheiros', val: property.bathrooms, format: false },
                      { label: 'Vagas Garagem', val: property.garageSpaces, format: false },
                      { label: 'Condomínio (Mensal)', val: property.monthlyCondo },
                      { label: 'IPTU (Mensal)', val: property.monthlyIptu },
                      { label: 'Data Arremate', val: property.acquisitionDate ? formatDate(property.acquisitionDate) : null, format: false },
                      { label: 'Data Venda', val: property.saleDate ? formatDate(property.saleDate) : null, format: false },
                      { label: 'Área Privativa', val: property.sizeM2 ? `${property.sizeM2} m²` : null, format: false },
                      { label: 'Custo por m²', val: metrics.costPerM2 },
                      { label: 'Break-even (Venda)', val: metrics.breakEven }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px] opacity-70">{item.label}:</span>
                        <span className="font-black text-[var(--text-header)]">{item.format === false ? (item.val || '---') : formatCurrency(item.val as number)}</span>
                      </div>
                    ))}
                    <div className="pt-8 mt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <span className="text-yellow-400 font-black text-xs uppercase tracking-widest">Total Alocado (Geral):</span>
                      <span className="text-3xl font-black text-yellow-400">
                        {formatCurrency(metrics.totalInvested)}
                      </span>
                    </div>
                  </div>

                  {(property.features?.length || 0) > 0 && (
                    <div className="mt-8 pt-8 border-t border-white/10">
                      <h4 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 opacity-50">Características do Imóvel</h4>
                      <div className="flex flex-wrap gap-2">
                        {property.features?.map(f => (
                          <span key={f} className="px-2 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-white/70 border border-white/10">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(property.complexFeatures?.length || 0) > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h4 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 opacity-50">Características do Condomínio</h4>
                      <div className="flex flex-wrap gap-2">
                        {property.complexFeatures?.map(f => (
                          <span key={f} className="px-2 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-white/70 border border-white/10">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'despesas' && (
            <div className="animate-in slide-in-from-bottom-2 space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Lançamentos Financeiros</h4>
                <button 
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="w-full sm:w-auto bg-[var(--bg-header)] text-[var(--text-header)] px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl"
                >
                  <Plus size={16} strokeWidth={3} /> Novo Gasto
                </button>
              </div>
              
              <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
                <div className="min-w-[700px] inline-block w-full align-middle">
                  <div className="border border-[var(--border)] rounded-[24px] overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-[var(--bg-card-alt)] text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                        <tr>
                          <th className="py-6 px-8">Data</th>
                          <th className="py-6 px-8">Categoria</th>
                          <th className="py-6 px-8">Descrição</th>
                          <th className="py-6 px-8 text-right">Valor</th>
                          <th className="py-6 px-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {propertyExpenses.map((exp) => (
                          <tr key={exp.id} className="group hover:bg-[var(--bg-card-alt)] transition-colors">
                            <td className="py-6 px-8 text-xs font-bold text-[var(--text-muted)]">{formatDate(exp.date)}</td>
                            <td className="py-6 px-8">
                              <span className="text-[9px] font-black uppercase px-3 py-1.5 bg-[var(--bg-card-alt)] rounded-lg text-[var(--text-muted)] tracking-widest border border-[var(--border)]">{exp.category}</span>
                            </td>
                            <td className="py-6 px-8 text-sm font-black text-[var(--text-main)] tracking-tight">{exp.description}</td>
                            <td className="py-6 px-8 text-base font-black text-[var(--text-main)] text-right">{formatCurrency(exp.amount)}</td>
                            <td className="py-6 px-8 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditExpense(exp)} className="p-2.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border)]"><Edit size={16} /></button>
                                <button onClick={() => onDeleteExpense(exp.id)} className="p-2.5 text-[var(--text-muted)] hover:text-rose-600 transition-all bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border)]"><Trash2 size={16} /></button>
                              </div>
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
              <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] text-center mb-12">Logs de Governança</h4>
              <div className="relative border-l-4 border-[var(--border)] ml-4 md:ml-8 pl-8 md:pl-12 space-y-12">
                {timelineItems.length > 0 ? (
                  timelineItems.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[48px] md:-left-[60px] top-1 w-10 h-10 rounded-2xl border-4 flex items-center justify-center shadow-lg z-10 ${
                        item.type === 'log' ? 'bg-[var(--bg-card)] border-[var(--border)]' : 'bg-[var(--accent)]/10 border-[var(--accent)]/20'
                      }`}>
                        {item.type === 'log' ? <Clock size={16} className="text-[var(--text-main)]" /> : <CheckCircle2 size={16} className="text-[var(--accent)]" />}
                      </div>
                      <div className={`p-6 rounded-[28px] border relative ${
                        item.type === 'log' ? 'bg-[var(--bg-card-alt)] border-[var(--border)]' : 'bg-[var(--bg-card)] border-yellow-500/20 shadow-sm'
                      }`}>
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <span className="text-sm font-black text-[var(--text-main)] tracking-tight leading-none">{item.title}</span>
                            <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{item.date.toLocaleString()}</span>
                         </div>
                         <div className="flex flex-wrap items-center gap-3">
                            {item.user && (
                              <div className="flex items-center text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                                 <User size={12} className="mr-2 text-yellow-600" /> {isBroker ? 'Equipe Sintese' : item.user}
                              </div>
                            )}
                            {item.type === 'log' && (item.data as PropertyLog).fromStatus && (
                              <div className="flex items-center text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest bg-[var(--bg-card-alt)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                                 {(item.data as PropertyLog).fromStatus} <ArrowRight size={10} className="mx-2 text-[var(--text-muted)] opacity-30" /> {(item.data as PropertyLog).toStatus}
                              </div>
                            )}
                         </div>
                         {item.description && (
                            <div className="mt-3 text-xs text-[var(--text-muted)] font-medium bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)]">
                              {item.description}
                            </div>
                         )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum registro encontrado</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {isExpenseModalOpen && (
            <div className="fixed inset-0 z-[9999]">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExpenseModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 right-0 w-full max-w-md bg-[var(--bg-card)] shadow-2xl flex flex-col"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{editingExpense ? 'Editar Gasto' : 'Novo Gasto'}</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">{editingExpense ? 'Atualize os dados da despesa.' : 'Registre despesas do imóvel.'}</p>
                  </div>
                  <button 
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleAddExpenseSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Data</label>
                    <CustomDatePicker 
                      selected={newExpData.date ? new Date(newExpData.date + 'T00:00:00') : null}
                      onChange={(date) => setNewExpData({...newExpData, date: date ? date.toISOString().split('T')[0] : ''})}
                      placeholderText="DD/MM/AAAA"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Categoria</label>
                    <select className={inputClass} value={newExpData.category} onChange={(e) => setNewExpData({...newExpData, category: e.target.value as ExpenseCategory})}>
                      {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Descrição</label>
                    <input type="text" placeholder="Pintura, Taxas, etc..." className={inputClass} value={newExpData.description} onChange={(e) => setNewExpData({...newExpData, description: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Valor Total</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-sm">R$</span>
                      <input type="text" placeholder="0,00" className={inputClass + " pl-12"} value={formatBRLMask(newExpData.amount)}
                        onChange={(e) => {
                          const numeric = e.target.value.replace(/\D/g, '');
                          setNewExpData({...newExpData, amount: parseBRLToFloat(numeric) || 0});
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-8 flex gap-4 sticky bottom-0 bg-[var(--bg-card)] border-t border-[var(--border)] -mx-8 px-8 pb-4">
                    <button 
                      type="button" 
                      onClick={() => setIsExpenseModalOpen(false)} 
                      className="flex-1 px-8 py-4 bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-black text-xs uppercase tracking-widest border border-[var(--border)] transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-8 py-4 bg-[var(--text-main)] text-[var(--bg-main)] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[var(--accent)] transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                    >
                      {editingExpense ? <Edit size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />} {editingExpense ? 'Salvar' : 'Lançar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Lightbox Modal */}
      {createPortal(
        <AnimatePresence>
          {isLightboxOpen && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl">
              <motion.button 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setIsLightboxOpen(false)}
                className="absolute top-8 right-8 p-4 text-white hover:bg-white/10 rounded-full transition-all z-50"
              >
                <X size={32} />
              </motion.button>

              <div className="relative w-full h-full flex items-center justify-center p-4 md:p-20">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={activeImage}
                    src={property.images![activeImage]}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl"
                    alt="Expanded"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>

                {property.images!.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActiveImage((prev) => (prev === 0 ? property.images!.length - 1 : prev - 1))}
                      className="absolute left-4 md:left-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10"
                    >
                      <ChevronLeft size={40} />
                    </button>
                    <button 
                      onClick={() => setActiveImage((prev) => (prev === property.images!.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 md:right-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10"
                    >
                      <ChevronRight size={40} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[80vw] p-4 no-scrollbar">
                  {property.images!.map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${activeImage === idx ? 'border-yellow-500 scale-110' : 'border-transparent opacity-40'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt="Nav" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
