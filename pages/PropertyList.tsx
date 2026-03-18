
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Building, 
  ChevronRight, 
  ChevronLeft,
  LayoutGrid, 
  Kanban as KanbanIcon, 
  ArrowRight, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  X,
  DollarSign,
  TrendingUp,
  Calendar,
  Maximize2,
  Edit3,
  FileUp,
  Loader2,
  Download,
  ExternalLink,
  MessageSquare,
  Share2,
  MoreVertical
} from 'lucide-react';
import { Property, PropertyStatus, Expense, PropertyType, AcquisitionType, UserAccount, UserRole } from '../types';
import { formatCurrency, calculatePropertyMetrics, formatDate, formatBRLMask, parseBRLToFloat } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import PropertyForm from './PropertyForm';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CommercialService } from '../src/services/CommercialService';
import CustomDatePicker from '../src/components/CustomDatePicker';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Papa from 'papaparse';
import { reportService } from '../ReportService';
import { FileDown } from 'lucide-react';

// --- Card Individual Redesenhado ---
const PropertyKanbanCard = React.memo(({ 
  property, 
  metrics, 
  onEdit,
  onView,
  onDelete,
  onMoveLeft,
  onMoveRight
}: { 
  property: Property, 
  metrics: any, 
  onEdit: () => void, 
  onView: () => void, 
  onDelete: (e: React.MouseEvent) => void, 
  onMoveLeft?: () => void, 
  onMoveRight?: () => void 
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/10 transition-all duration-300 overflow-hidden group select-none flex flex-col h-fit"
    >
      {/* Image Section */}
      <div className="h-32 overflow-hidden bg-[var(--bg-card-alt)] relative">
        {property.images && property.images.length > 0 ? (
          <img src={property.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><ImageIcon size={24} /></div>
        )}
        
        {/* Overlay Badges */}
        <div className="absolute top-3 left-3">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-white/20 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-[var(--text-main)] uppercase tracking-wider">{metrics.roi.toFixed(0)}% ROI</span>
          </div>
        </div>

        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] transition-all shadow-sm border border-white/20"
            title="Editar"
          >
            <Edit3 size={14} />
          </button>
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(e); }}
              className="p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-white/20"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 cursor-pointer" onClick={onView}>
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider shadow-sm text-white" style={{ 
              backgroundColor: 
                property.status === PropertyStatus.ARREMATADO ? 'var(--status-arrematado)' :
                property.status === PropertyStatus.EM_REFORMA ? 'var(--status-reforma)' :
                property.status === PropertyStatus.A_VENDA ? 'var(--status-venda)' : 
                property.status === PropertyStatus.VENDIDO ? 'var(--status-vendido)' : 'var(--text-muted)'
            }}>
              {property.status}
            </span>
          </div>
          <h4 className="font-black text-[var(--text-main)] text-sm truncate mb-1 tracking-tight uppercase">
            {property.title || property.neighborhood}
          </h4>
          <div className="flex items-center text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
            <MapPin size={10} className="mr-1.5 text-[var(--accent)]" /> 
            <span className="truncate">{property.city}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--border)] mb-4">
          <div>
            <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Investido</p>
            <p className="text-xs font-black text-[var(--text-main)] truncate">{formatCurrency(metrics.totalInvested)}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Área</p>
            <p className="text-xs font-black text-[var(--text-main)]">{property.sizeM2}m²</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex-1 py-3 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--accent-secondary)] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20"
          >
            <Maximize2 size={14} /> Detalhes
          </button>
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
              className={`p-3 rounded-2xl border border-[var(--border)] transition-all ${showActions ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:bg-[var(--border)]'}`}
            >
              <MoreVertical size={16} />
            </button>

            <AnimatePresence>
              {showActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                  >
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const url = `${window.location.origin}/#/publico/imovel/${property.id}`;
                        navigator.clipboard.writeText(url);
                        alert('Link do Kit de Venda copiado!');
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--bg-card-alt)] transition-colors"
                    >
                      <Share2 size={14} className="text-[var(--erp-yellow)]" /> Copiar Link
                    </button>
                    <Link 
                      to={`/publico/imovel/${property.id}`}
                      target="_blank"
                      onClick={(e) => { e.stopPropagation(); setShowActions(false); }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--bg-card-alt)] transition-colors"
                    >
                      <ExternalLink size={14} className="text-emerald-500" /> Ver Público
                    </Link>
                    <a 
                      href={CommercialService.getWhatsAppSalesKitLink(CommercialService.getCommercialProperties([property])[0] || {
                        id: property.id,
                        title: property.title || property.neighborhood || 'Imóvel',
                        address: property.address || '',
                        neighborhood: property.neighborhood || '',
                        city: property.city || '',
                        salePrice: property.salePrice || 0,
                        description: property.description || '',
                        improvements: property.improvements || '',
                        images: property.images || [],
                        commercialStatus: 'Disponível' as any
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.stopPropagation(); setShowActions(false); }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--bg-card-alt)] transition-colors"
                    >
                      <MessageSquare size={14} className="text-emerald-500" /> WhatsApp
                    </a >
                    <button 
                      onClick={async (e) => { 
                        e.stopPropagation();
                        setShowActions(false);
                        if (!property.images || property.images.length === 0) return;
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
                        }
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--bg-card-alt)] transition-colors"
                    >
                      <Download size={14} className="text-blue-500" /> Baixar Fotos
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
;

interface KanbanColumnProps {
  status: PropertyStatus;
  items: Property[];
  expenses: Expense[];
  onEdit: (property: Property) => void;
  onView: (id: string) => void;
  onDeleteProperty: (id: string) => void;
  onMoveProperty: (id: string, direction: 'left' | 'right') => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  status, 
  items, 
  expenses, 
  onEdit,
  onView,
  onDeleteProperty,
  onMoveProperty
}) => {
  const totalValue = useMemo(() => {
    return items.reduce((acc, p) => acc + calculatePropertyMetrics(p, expenses).totalInvested, 0);
  }, [items, expenses]);

  const statuses = Object.values(PropertyStatus) as PropertyStatus[];
  const currentIndex = statuses.indexOf(status);

  return (
    <div 
      className="flex flex-col w-[300px] flex-shrink-0 rounded-[24px] p-3 transition-all duration-300 bg-[var(--bg-card-alt)]/40 border border-[var(--border)]/50"
    >
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex flex-col">
          <h3 className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.15em] mb-1">
            {status}
          </h3>
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            {items.length} Ativos • {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="w-2 h-2 rounded-full" style={{ 
          backgroundColor: 
            status === PropertyStatus.ARREMATADO ? 'var(--status-arrematado)' :
            status === PropertyStatus.EM_REFORMA ? 'var(--status-reforma)' :
            status === PropertyStatus.A_VENDA ? 'var(--status-venda)' : 
            status === PropertyStatus.VENDIDO ? 'var(--status-vendido)' : 'var(--text-muted)'
        }} />
      </div>
      
      <div className="space-y-4">
        {items.map(p => (
          <PropertyKanbanCard 
            key={p.id}
            property={p}
            metrics={calculatePropertyMetrics(p, expenses)}
            onEdit={() => onEdit(p)}
            onView={() => onView(p.id)}
            onDelete={(e) => {
              e.stopPropagation();
              onDeleteProperty(p.id);
            }}
            onMoveLeft={currentIndex > 0 ? () => onMoveProperty(p.id, 'left') : undefined}
            onMoveRight={currentIndex < statuses.length - 1 ? () => onMoveProperty(p.id, 'right') : undefined}
          />
        ))}
        
        {items.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border)] rounded-[24px] bg-[var(--bg-card)]/30">
            <Building size={24} className="mb-2 opacity-20" />
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface PropertyListProps {
  properties: Property[];
  expenses: Expense[];
  onUpdateStatus: (id: string, status: PropertyStatus) => void;
  onDeleteProperty: (id: string) => void;
  addLog?: (log: any) => Promise<void>;
  currentUser: UserAccount;
}

const PropertyList = ({ properties, expenses, onUpdateStatus, onDeleteProperty, addLog, currentUser }: PropertyListProps) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal States
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);
  const [isAskingPriceModalOpen, setIsAskingPriceModalOpen] = useState(false);
  const [targetProperty, setTargetProperty] = useState<Property | null>(null);
  const [saleData, setSaleData] = useState({
    salePrice: 0,
    saleDate: new Date().toISOString().split('T')[0],
    brokerName: '',
    saleNotes: ''
  });

  const filteredProperties = useMemo(() => {
    const s = search.toLowerCase();
    return properties.filter(p => 
      p.neighborhood.toLowerCase().includes(s) || 
      p.city.toLowerCase().includes(s) ||
      (p.condoName?.toLowerCase().includes(s)) ||
      (p.realEstateAgency?.toLowerCase().includes(s)) ||
      (p.neighborhood2?.toLowerCase().includes(s))
    );
  }, [properties, search]);

  const handleViewDetails = useCallback((id: string) => navigate(`/imovel/${id}`), [navigate]);

  const handleMoveProperty = async (id: string, direction: 'left' | 'right') => {
    const property = properties.find(p => p.id === id);
    if (!property) return;

    const statuses = Object.values(PropertyStatus) as PropertyStatus[];
    const currentIndex = statuses.indexOf(property.status);
    const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < statuses.length) {
      const newStatus = statuses[nextIndex];
      
      if (newStatus === PropertyStatus.VENDIDO) {
        setTargetProperty(property);
        setSaleData({
          salePrice: property.salePrice || 0,
          saleDate: new Date().toISOString().split('T')[0],
          brokerName: property.brokerName || '',
          saleNotes: property.saleNotes || ''
        });
        setIsSoldModalOpen(true);
      } else if (newStatus === PropertyStatus.A_VENDA) {
        setTargetProperty(property);
        setSaleData({
          ...saleData,
          salePrice: property.salePrice || 0
        });
        setIsAskingPriceModalOpen(true);
      } else {
        await onUpdateStatus(id, newStatus);
        if (addLog) {
          await addLog({
            propertyId: id,
            action: 'Alteração de Status',
            fromStatus: property.status,
            toStatus: newStatus,
            details: `Imóvel movido para ${newStatus} via setas de navegação.`
          });
        }
      }
    }
  };

  const handleConfirmSale = async () => {
    if (!targetProperty) return;

    try {
      await setDoc(doc(db, 'properties', targetProperty.id), {
        status: PropertyStatus.VENDIDO,
        salePrice: saleData.salePrice,
        saleDate: saleData.saleDate,
        brokerName: saleData.brokerName,
        saleNotes: saleData.saleNotes
      }, { merge: true });

      if (addLog) {
        await addLog({
          propertyId: targetProperty.id,
          action: 'Venda Realizada',
          fromStatus: targetProperty.status,
          toStatus: PropertyStatus.VENDIDO,
          details: `Venda registrada: ${formatCurrency(saleData.salePrice)} em ${formatDate(saleData.saleDate)}. Corretor: ${saleData.brokerName}`
        });
      }

      setIsSoldModalOpen(false);
      setTargetProperty(null);
      setSaleData({ salePrice: 0, saleDate: new Date().toISOString().split('T')[0], brokerName: '', saleNotes: '' });
    } catch (error) {
      console.error("Error confirming sale:", error);
    }
  };

  const handleConfirmAskingPrice = async () => {
    if (!targetProperty) return;

    try {
      await setDoc(doc(db, 'properties', targetProperty.id), {
        status: PropertyStatus.A_VENDA,
        salePrice: saleData.salePrice
      }, { merge: true });

      if (addLog) {
        await addLog({
          propertyId: targetProperty.id,
          action: 'Colocado à Venda',
          fromStatus: targetProperty.status,
          toStatus: PropertyStatus.A_VENDA,
          details: `Imóvel colocado à venda por ${formatCurrency(saleData.salePrice)}`
        });
      }

      setIsAskingPriceModalOpen(false);
      setTargetProperty(null);
      setSaleData({ salePrice: 0, saleDate: new Date().toISOString().split('T')[0], brokerName: '', saleNotes: '' });
    } catch (error) {
      console.error("Error setting asking price:", error);
    }
  };

  const handleSaveProperty = async (updatedProperty: Property) => {
    try {
      await setDoc(doc(db, 'properties', updatedProperty.id), updatedProperty as any, { merge: true });
      setEditingProperty(null);
    } catch (error) {
      console.error("Error updating property:", error);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      'Titulo', 'Tipo', 'TipoAquisicao', 'Cidade', 'Bairro', 'Bairro2', 
      'Condominio', 'Imobiliaria', 'Endereco', 'Area', 'Status', 
      'DataAquisicao', 'ValorAvaliacao', 'ValorAquisicao', 'ComissaoLeiloeiro'
    ];
    const csvContent = headers.join(',') + '\n' + 
      'Exemplo Imovel,Apartamento,Leilão Judicial,São Paulo,Centro,Bela Vista,Condominio Master,Imobiliaria X,Rua Exemplo 123,55,Arrematado,2024-01-01,500000,300000,15000';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_imoveis.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const exportToPDF = async () => {
    setIsExportingPdf(true);
    try {
      await reportService.generatePropertyReport(properties, expenses);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const importedProperties: Property[] = results.data.map((row: any) => {
            const id = crypto.randomUUID();
            return {
              id,
              title: row.Titulo || row.title || '',
              type: (row.Tipo || row.type || PropertyType.APARTAMENTO) as PropertyType,
              acquisitionType: (row.TipoAquisicao || row.acquisitionType || AcquisitionType.LEILAO_JUDICIAL) as AcquisitionType,
              city: row.Cidade || row.city || '',
              neighborhood: row.Bairro || row.neighborhood || '',
              neighborhood2: row.Bairro2 || row.neighborhood2 || '',
              condoName: row.Condominio || row.condoName || '',
              realEstateAgency: row.Imobiliaria || row.realEstateAgency || '',
              address: row.Endereco || row.address || '',
              sizeM2: parseFloat(row.Area || row.sizeM2) || 0,
              status: (row.Status || row.status || PropertyStatus.ARREMATADO) as PropertyStatus,
              acquisitionDate: row.DataAquisicao || row.acquisitionDate || new Date().toISOString().split('T')[0],
              bankValuation: parseFloat(row.ValorAvaliacao || row.bankValuation) || 0,
              acquisitionPrice: parseFloat(row.ValorAquisicao || row.acquisitionPrice) || 0,
              auctioneerCommission: parseFloat(row.ComissaoLeiloeiro || row.auctioneerCommission) || 0,
              images: [],
              itbiPaid: false,
              registroPaid: false
            };
          });

          for (const prop of importedProperties) {
            await setDoc(doc(collection(db, 'properties'), prop.id), prop);
            if (addLog) {
              await addLog({
                propertyId: prop.id,
                action: 'Importação CSV',
                toStatus: prop.status,
                details: `Imóvel importado via arquivo CSV.`
              });
            }
          }
          alert(`${importedProperties.length} imóveis importados com sucesso!`);
        } catch (error) {
          console.error("Erro ao importar CSV:", error);
          alert("Erro ao processar o arquivo CSV. Verifique o formato.");
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error("Erro no PapaParse:", error);
        setIsImporting(false);
        alert("Erro ao ler o arquivo CSV.");
      }
    });
  };

  const handleEditProperty = useCallback((p: Property) => navigate(`/editar/${p.id}`), [navigate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-[var(--text-main)] tracking-tight">
            {currentUser.role === UserRole.BROKER ? 'Imóveis Disponíveis' : 'Ativos Operacionais'}
          </h2>
          <p className="text-[var(--text-muted)] font-medium">
            {currentUser.role === UserRole.BROKER ? 'Confira os imóveis disponíveis para comercialização.' : 'Controle de portfólio e pipeline de obras.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
           <input 
             type="file" 
             accept=".csv" 
             className="hidden" 
             ref={fileInputRef} 
             onChange={handleImportCSV} 
           />
           {currentUser.role !== UserRole.BROKER && (
             <>
               <button 
                 onClick={exportToPDF}
                 disabled={isExportingPdf}
                 className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] p-4 rounded-[28px] font-black hover:bg-[var(--bg-card-alt)] transition-all flex items-center justify-center shadow-sm order-5 sm:order-0"
                 title="Exportar Relatório PDF"
               >
                 {isExportingPdf ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
               </button>
               <button 
                 onClick={downloadCSVTemplate}
                 className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] p-4 rounded-[28px] font-black hover:bg-[var(--bg-card-alt)] transition-all flex items-center justify-center shadow-sm order-4 sm:order-1"
                 title="Baixar Template CSV"
               >
                 <Download size={20} />
               </button>
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isImporting}
                 className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] px-6 py-4 rounded-[28px] font-black hover:bg-[var(--bg-card-alt)] transition-all flex items-center justify-center space-x-3 shadow-sm order-3 sm:order-2 disabled:opacity-50"
               >
                 {isImporting ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
                 <span>{isImporting ? 'Importando...' : 'Importar CSV'}</span>
               </button>
             </>
           )}
           <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[22px] p-1.5 flex shadow-sm order-2 sm:order-3">
              <button onClick={() => setViewMode('kanban')} className={`flex-1 sm:flex-none p-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest ${viewMode === 'kanban' ? 'bg-[var(--bg-header)] text-[var(--text-header)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                <KanbanIcon size={18} /> <span>Kanban</span>
              </button>
              <button onClick={() => setViewMode('grid')} className={`flex-1 sm:flex-none p-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest ${viewMode === 'grid' ? 'bg-[var(--bg-header)] text-[var(--text-header)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                <LayoutGrid size={18} /> <span>Grade</span>
              </button>
           </div>
           {currentUser.role !== UserRole.BROKER && (
             <Link to="/novo" className="bg-[var(--accent)] text-[var(--accent-text)] px-8 py-4 rounded-[28px] font-black hover:opacity-90 transition-all flex items-center justify-center space-x-3 shadow-2xl shadow-[var(--accent)]/20 order-1 sm:order-2 active:scale-95">
              <Plus size={22} strokeWidth={3} /> <span>Novo Ativo</span>
             </Link>
           )}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] p-4 rounded-[28px] border border-[var(--border)] shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por condomínio, bairro ou cidade..." 
            className="w-full pl-14 pr-6 py-4.5 bg-[var(--bg-card-alt)] text-[var(--text-main)] border border-[var(--border)] rounded-[20px] focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none font-medium placeholder:text-[var(--text-muted)] transition-all text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar -mx-6 px-6">
          {(Object.values(PropertyStatus) as PropertyStatus[]).map(status => (
            <KanbanColumn 
              key={status}
              status={status}
              items={filteredProperties.filter(p => p.status === status)}
              expenses={expenses}
              onEdit={handleEditProperty}
              onView={handleViewDetails}
              onDeleteProperty={onDeleteProperty}
              onMoveProperty={handleMoveProperty}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start">
          {filteredProperties.map(p => {
            const metrics = calculatePropertyMetrics(p, expenses);
            return (
              <div key={p.id} className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border)] shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative flex flex-col h-fit">
                {currentUser.role !== UserRole.BROKER && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteProperty(p.id); }}
                    className="absolute top-5 right-5 z-10 p-2.5 bg-[var(--bg-card)]/90 backdrop-blur rounded-xl text-rose-500 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-rose-600 hover:text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div onClick={() => handleViewDetails(p.id)} className="cursor-pointer flex flex-col">
                  <div className="h-52 relative overflow-hidden bg-[var(--bg-card-alt)]">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                        <ImageIcon size={40} />
                      </div>
                    )}
                    <div className="absolute top-5 left-5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/10" style={{ 
                        backgroundColor: 
                          p.status === PropertyStatus.ARREMATADO ? 'var(--status-arrematado)' :
                          p.status === PropertyStatus.EM_REFORMA ? 'var(--status-reforma)' :
                          p.status === PropertyStatus.A_VENDA ? 'var(--status-venda)' : 
                          p.status === PropertyStatus.VENDIDO ? 'var(--status-vendido)' : 'var(--bg-header)'
                      }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col">
                    {p.address && (
                      <div className="mb-3">
                        <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-[var(--accent)]/20 shadow-sm">
                          {p.address}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-[var(--text-main)] truncate flex-1 tracking-tight text-xl">
                        {p.title || p.condoName || p.neighborhood}
                      </h3>
                      <div className="text-emerald-600 font-black text-base ml-2">{metrics.roi.toFixed(0)}%</div>
                    </div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-6">
                      {p.city} {p.neighborhood2 ? `• ${p.neighborhood2}` : ''}
                    </p>
                    <div className="flex justify-between items-end border-t border-[var(--border)] pt-6 mt-6">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Capital Alocado</p>
                        <p className="font-black text-[var(--text-main)] text-lg truncate">{formatCurrency(metrics.totalInvested)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditProperty(p); }}
                          className="p-3 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-2xl transition-all"
                          title="Editar Cadastro"
                        >
                          <Edit3 size={20} />
                        </button>
                        <div className="bg-[var(--bg-header)] text-[var(--text-header)] p-3 rounded-2xl group-hover:bg-yellow-500 group-hover:text-black transition-all">
                          <ArrowRight size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Property Drawer - REMOVED as per user request to navigate to edit page */}

      {/* Sold Modal */}
      <AnimatePresence>
        {isSoldModalOpen && targetProperty && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--bg-header)]/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] rounded-[40px] w-full max-w-lg p-10 shadow-2xl border border-[var(--border)]"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <DollarSign size={40} />
                </div>
                <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Confirmar Venda</h3>
                <p className="text-[var(--text-muted)] font-medium mt-2">Registre os detalhes da transação final.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Valor de Venda Real (R$)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black">R$</span>
                    <input 
                      type="text"
                      className="w-full bg-[var(--bg-card-alt)] pl-12 pr-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-black text-xl text-emerald-600"
                      value={formatBRLMask(saleData.salePrice)}
                      onChange={(e) => setSaleData({...saleData, salePrice: parseBRLToFloat(e.target.value) || 0})}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Data da Venda</label>
                    <CustomDatePicker 
                      selected={saleData.saleDate ? new Date(saleData.saleDate + 'T00:00:00') : null}
                      onChange={(date) => setSaleData({...saleData, saleDate: date ? date.toISOString().split('T')[0] : ''})}
                      placeholderText="DD/MM/AAAA"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Corretor Responsável</label>
                    <input 
                      type="text"
                      className="w-full bg-[var(--bg-card-alt)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-medium text-sm text-[var(--text-main)]"
                      placeholder="Nome do corretor"
                      value={saleData.brokerName}
                      onChange={(e) => setSaleData({...saleData, brokerName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Observações da Venda</label>
                  <textarea 
                    className="w-full bg-[var(--bg-card-alt)] px-5 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-medium text-sm h-24 resize-none text-[var(--text-main)]"
                    placeholder="Detalhes adicionais..."
                    value={saleData.saleNotes}
                    onChange={(e) => setSaleData({...saleData, saleNotes: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsSoldModalOpen(false)} 
                    className="flex-1 px-8 py-5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[24px] font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmSale}
                    className="flex-1 px-8 py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20"
                  >
                    Confirmar Venda
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Asking Price Modal */}
      <AnimatePresence>
        {isAskingPriceModalOpen && targetProperty && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--bg-header)]/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] rounded-[40px] w-full max-w-lg p-10 shadow-2xl border border-[var(--border)]"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-yellow-500/10 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <TrendingUp size={40} />
                </div>
                <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Colocar à Venda</h3>
                <p className="text-[var(--text-muted)] font-medium mt-2">Defina o valor de anúncio do imóvel.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Valor de Venda Pretendido (R$)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black">R$</span>
                    <input 
                      type="text"
                      className="w-full bg-[var(--bg-card-alt)] pl-12 pr-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-black text-xl text-yellow-600"
                      value={formatBRLMask(saleData.salePrice)}
                      onChange={(e) => setSaleData({...saleData, salePrice: parseBRLToFloat(e.target.value) || 0})}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsAskingPriceModalOpen(false)} 
                    className="flex-1 px-8 py-5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[24px] font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmAskingPrice}
                    className="flex-1 px-8 py-5 bg-yellow-500 text-black rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20"
                  >
                    Confirmar Valor
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyList;
