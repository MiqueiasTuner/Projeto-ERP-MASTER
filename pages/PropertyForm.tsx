
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  X, 
  Plus, 
  Camera, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  AlertCircle,
  Building2,
  MapPin,
  Maximize2,
  Calendar,
  DollarSign,
  Info,
  CheckCircle2,
  Layout,
  ArrowRight,
  Image as ImageIcon,
  Landmark,
  ShieldCheck,
  HardHat,
  Users,
  Globe,
  Loader2,
  Upload
} from 'lucide-react';
import { Property, PropertyStatus, PropertyType, CommercialStatus, OLXStatus, AcquisitionType } from '../types';
import { formatBRLMask, parseBRLToFloat } from '../utils';
import CustomDatePicker from '../src/components/CustomDatePicker';
import { uploadImage } from '../lib/storageService';

interface InputFieldProps {
  label: string;
  path: string;
  type?: 'text' | 'number' | 'date' | 'currency';
  prefix?: string;
  placeholder?: string;
  value: any;
  onChange: (path: string, value: any) => void;
  fullWidth?: boolean;
}

const InputField = ({ label, path, type = 'text', prefix, placeholder, value, onChange, fullWidth }: InputFieldProps) => {
  const displayValue = type === 'currency' ? formatBRLMask(value) : (value === undefined || value === null ? '' : value);

  if (type === 'date') {
    return (
      <div className={`w-full ${fullWidth ? 'md:col-span-2' : ''}`}>
        <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-80">{label}</label>
        <div className="relative group transition-all duration-300">
          <CustomDatePicker 
            selected={value ? new Date(value + 'T00:00:00') : null}
            onChange={(date) => onChange(path, date ? date.toISOString().split('T')[0] : null)}
            placeholderText="DD/MM/AAAA"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${fullWidth ? 'md:col-span-2' : ''}`}>
      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-80">{label}</label>
      <div className="relative group">
        {prefix && displayValue !== '' && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-[11px] z-10 pointer-events-none opacity-40">
            {prefix}
          </span>
        )}
        <input 
          type={type === 'currency' ? 'text' : type} 
          placeholder={placeholder || (type === 'currency' ? 'R$ 0,00' : '')}
          className={`w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] ${prefix && displayValue !== '' ? 'pl-10' : 'px-4'} py-3.5 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/5 focus:border-[var(--accent)]/50 transition-all duration-300 font-medium placeholder:text-[var(--text-muted)]/50 text-[13px] shadow-sm hover:border-[var(--border-hover)]`}
          value={displayValue}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const rawValue = e.target.value;
            if (type === 'currency') {
              onChange(path, parseBRLToFloat(rawValue));
            } else if (type === 'number') {
              const num = parseFloat(rawValue);
              onChange(path, isNaN(num) ? null : num);
            } else {
              onChange(path, rawValue === '' ? null : rawValue);
            }
          }}
        />
      </div>
    </div>
  );
};

interface PropertyFormProps {
  property?: Property | null;
  onSave: (p: Property) => Promise<void>;
  onCancel: () => void;
}

const PropertyForm = ({ property, onSave, onCancel }: PropertyFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [formData, setFormData] = useState<Partial<Property>>({
    status: PropertyStatus.ARREMATADO,
    type: PropertyType.APARTAMENTO,
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionType: AcquisitionType.LEILAO_JUDICIAL,
    images: []
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (property) {
      setFormData({ ...property });
      setSelectedImageIndex(0);
    } else {
      setFormData({
        status: PropertyStatus.ARREMATADO,
        type: PropertyType.APARTAMENTO,
        acquisitionType: AcquisitionType.LEILAO_JUDICIAL,
        acquisitionDate: new Date().toISOString().split('T')[0],
        images: []
      });
    }
  }, [property]);

  const handleChange = (path: string, value: any) => {
    setFormData(prev => ({ ...prev, [path]: value }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setFormData(prev => {
          const newImages = [...(prev.images || []), base64];
          if (newImages.length === 1) setSelectedImageIndex(0);
          return { ...prev, images: newImages };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const addImageUrl = () => {
    if (!imageUrlInput) return;
    setFormData(prev => {
      const newImages = [...(prev.images || []), imageUrlInput];
      if (newImages.length === 1) setSelectedImageIndex(0);
      return { ...prev, images: newImages };
    });
    setImageUrlInput('');
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = (prev.images || []).filter((_, i) => i !== index);
      if (selectedImageIndex >= newImages.length) {
        setSelectedImageIndex(Math.max(0, newImages.length - 1));
      }
      return { ...prev, images: newImages };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const newErrors: string[] = [];
    if (!formData.neighborhood || formData.neighborhood.trim().length < 2) newErrors.push('O Bairro/Condomínio é obrigatório.');
    if (!formData.city || formData.city.trim().length < 2) newErrors.push('A Cidade é obrigatória.');
    
    if (newErrors.length > 0) { 
      setErrors(newErrors); 
      return; 
    }

    setIsSaving(true);
    setUploadProgress('Processando imagens...');
    
    try {
      const propertyId = formData.id || crypto.randomUUID();
      
      const finalImages = await Promise.all((formData.images || []).map(async (img, index) => {
        if (img.startsWith('data:')) {
          setUploadProgress(`Enviando imagem ${index + 1}...`);
          const path = `properties/${propertyId}/${Date.now()}-${index}.jpg`;
          try {
            return await uploadImage(img, path);
          } catch (err) {
            console.error("Error uploading image:", err);
            return img;
          }
        }
        return img;
      }));

      setUploadProgress('Salvando dados...');
      
      const finalPropertyData = { 
        ...formData, 
        id: propertyId, 
        images: finalImages 
      } as Property;

      await onSave(finalPropertyData);
    } catch (error) {
      console.error("Error saving property:", error);
      setErrors(['Erro ao salvar o imóvel. Por favor, tente novamente.']);
    } finally {
      setIsSaving(false);
      setUploadProgress('');
    }
  };

  const selectClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-4 py-3.5 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/5 focus:border-[var(--accent)]/50 transition-all duration-300 font-medium appearance-none text-[13px] shadow-sm hover:border-[var(--border-hover)]";

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)]">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-card)] sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-slate-900/80">
        <div>
          <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight uppercase">
            {property ? 'Editar Imóvel' : 'Novo Imóvel'}
          </h2>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1 opacity-60">
            {property ? `ID: ${property.id.substring(0, 8)}` : 'Preencha os dados do arremate'}
          </p>
        </div>
        <button 
          onClick={onCancel}
          className="p-2.5 hover:bg-[var(--bg-card-alt)] rounded-2xl text-[var(--text-muted)] transition-all duration-300 hover:rotate-90"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-10 pb-32 max-w-4xl mx-auto">
          {errors.length > 0 && (
            <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl flex items-start space-x-3 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-rose-500/10 p-1.5 rounded-lg">
                <AlertCircle className="text-rose-500 shrink-0" size={18} />
              </div>
              <div>
                <h4 className="text-rose-500 font-black text-[10px] uppercase tracking-wider mb-1">Pendências Identificadas</h4>
                <ul className="text-rose-500/80 text-[10px] space-y-1">
                  {errors.map((err, i) => <li key={i} className="font-semibold flex items-center gap-2"><div className="w-1 h-1 bg-rose-500 rounded-full" /> {err}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* NOVO DESIGN DE IMAGENS - COOL PLACE */}
          <section className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <ImageIcon size={16} className="opacity-70" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Galeria de Mídia</h3>
              </div>
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-card-alt)] px-2 py-1 rounded-lg">
                {formData.images?.length || 0} Fotos
              </span>
            </div>

            <div className="relative aspect-[16/9] rounded-[40px] overflow-hidden bg-[var(--bg-card-alt)] border border-[var(--border)] group shadow-2xl transition-all duration-500 hover:shadow-[var(--accent)]/5">
              {formData.images && formData.images.length > 0 ? (
                <>
                  <img 
                    src={formData.images[selectedImageIndex]} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    alt="Preview" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-between p-8">
                    <button 
                      type="button"
                      onClick={() => removeImage(selectedImageIndex)}
                      className="p-3 bg-rose-600/90 backdrop-blur-md text-white rounded-2xl shadow-2xl hover:bg-rose-600 hover:scale-105 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Trash2 size={16} /> Remover Foto
                    </button>
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                      <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Visualizando {selectedImageIndex + 1} de {formData.images.length}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4 cursor-pointer hover:bg-[var(--accent)]/5 transition-colors duration-500"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
                >
                  <div className="w-24 h-24 bg-[var(--bg-card)] rounded-[32px] flex items-center justify-center border border-[var(--border)] shadow-xl group-hover:scale-110 transition-transform duration-500">
                    <Upload size={40} strokeWidth={1.5} className="text-[var(--accent)]" />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-main)] mb-1">Arraste suas fotos aqui</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Ou clique para selecionar arquivos</p>
                  </div>
                </div>
              )}
              
              {/* Upload Overlay when dragging */}
              {isDragging && (
                <div className="absolute inset-0 bg-[var(--accent)]/10 backdrop-blur-md border-4 border-dashed border-[var(--accent)]/50 flex items-center justify-center z-30 animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 scale-110 transition-transform">
                    <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center">
                      <Upload size={40} className="text-[var(--accent)] animate-bounce" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">Solte para enviar</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar scroll-smooth">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
                className="flex-shrink-0 w-24 h-24 rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card-alt)] hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5 transition-all duration-300 flex flex-col items-center justify-center gap-2 group shadow-sm"
              >
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  <Plus size={20} className="text-[var(--accent)]" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Upload</span>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files)} />
              </button>

              {formData.images?.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`flex-shrink-0 w-24 h-24 rounded-3xl overflow-hidden border-2 transition-all duration-300 relative group shadow-md ${selectedImageIndex === idx ? 'border-[var(--accent)] scale-95 ring-4 ring-[var(--accent)]/10' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  {selectedImageIndex === idx && (
                    <div className="absolute inset-0 bg-[var(--accent)]/10 flex items-center justify-center">
                      <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse shadow-[0_0_10px_var(--accent)]" />
                    </div>
                  )}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/50 backdrop-blur-md p-1 rounded-lg text-white">
                      <Trash2 size={10} onClick={(e) => { e.stopPropagation(); removeImage(idx); }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 p-1 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border)] shadow-inner">
              <div className="flex items-center pl-4 text-[var(--text-muted)]">
                <Globe size={14} className="opacity-50" />
              </div>
              <input 
                type="text" 
                placeholder="Ou cole um link de imagem externa aqui..." 
                className="flex-1 bg-transparent px-2 py-3 outline-none font-medium text-[11px] text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40" 
                value={imageUrlInput} 
                onChange={(e) => setImageUrlInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
              />
              <button 
                type="button" 
                onClick={addImageUrl} 
                className="bg-[var(--accent)] text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-95 flex items-center gap-2"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </section>

          {/* INFO PRIMÁRIA */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-2">
              <div className="p-1.5 bg-[var(--accent)]/10 rounded-lg">
                <Info size={14} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Informações Gerais</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <div className="md:col-span-2">
                <InputField label="Título / Identificação" path="title" value={formData.title} onChange={handleChange} placeholder="Ex: AP 304 - Gran Vitta" />
              </div>
              
              <div>
                <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-70">Tipo de Aquisição</label>
                <div className="relative">
                  <select className={selectClass} value={formData.acquisitionType || AcquisitionType.LEILAO_JUDICIAL} onChange={(e) => handleChange('acquisitionType', e.target.value)}>
                    {Object.values(AcquisitionType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] opacity-50">
                    <Plus size={14} className="rotate-45" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-70">Tipo de Imóvel</label>
                <div className="relative">
                  <select className={selectClass} value={formData.type} onChange={(e) => handleChange('type', e.target.value)}>
                    {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] opacity-50">
                    <Plus size={14} className="rotate-45" />
                  </div>
                </div>
              </div>
              
              <InputField label="Cidade" path="city" value={formData.city} onChange={handleChange} />
              <InputField label="Bairro" path="neighborhood" value={formData.neighborhood} onChange={handleChange} />

              <InputField label="Bairro/Condomínio 2" path="neighborhood2" value={formData.neighborhood2} onChange={handleChange} />
              <InputField label="Nome do Condomínio" path="condoName" value={formData.condoName} onChange={handleChange} />

              <InputField label="Imobiliária" path="realEstateAgency" value={formData.realEstateAgency} onChange={handleChange} />
              <InputField label="CEP" path="cep" value={formData.cep} onChange={handleChange} />

              <InputField label="Área Privativa (m²)" path="sizeM2" type="number" value={formData.sizeM2} onChange={handleChange} />
              <InputField label="Data do Arremate" path="acquisitionDate" type="date" value={formData.acquisitionDate} onChange={handleChange} />

              <div className="md:col-span-2 grid grid-cols-3 gap-6">
                <InputField label="Quartos" path="rooms" type="number" value={formData.rooms} onChange={handleChange} />
                <InputField label="Banheiros" path="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} />
                <InputField label="Vagas" path="garageSpaces" type="number" value={formData.garageSpaces} onChange={handleChange} />
              </div>

              <div className="md:col-span-2">
                <InputField label="Endereço Completo" path="address" value={formData.address} onChange={handleChange} placeholder="Rua, Número, Complemento..." />
              </div>
            </div>
          </section>

          {/* FINANCEIRO */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Landmark size={14} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Análise Financeira</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <InputField label="Avaliação de Mercado" path="bankValuation" type="currency" prefix="R$" value={formData.bankValuation} onChange={handleChange} />
              <InputField label="Valor do Arremate" path="acquisitionPrice" type="currency" prefix="R$" value={formData.acquisitionPrice} onChange={handleChange} />
              <InputField label="Comissão Leiloeiro" path="auctioneerCommission" type="currency" prefix="R$" value={formData.auctioneerCommission} onChange={handleChange} />
              <InputField label="Alvo de Venda" path="salePrice" type="currency" prefix="R$" value={formData.salePrice} onChange={handleChange} />
              <div className="md:col-span-2">
                <InputField label="Outros Custos" path="otherCosts" type="currency" prefix="R$" value={formData.otherCosts} onChange={handleChange} />
              </div>
            </div>
          </section>

          {/* JURÍDICO E TAXAS */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <ShieldCheck size={14} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Custos Legais</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <InputField label="Escritura" path="legalEscritura" type="currency" prefix="R$" value={formData.legalEscritura} onChange={handleChange} />
              <InputField label="ITBI" path="legalItbi" type="currency" prefix="R$" value={formData.legalItbi} onChange={handleChange} />
              <InputField label="Registro / Taxas" path="legalTaxasRegistro" type="currency" prefix="R$" value={formData.legalTaxasRegistro} onChange={handleChange} />
              <InputField label="Certidões" path="legalCertidoes" type="currency" prefix="R$" value={formData.legalCertidoes} onChange={handleChange} />
              <div className="md:col-span-2">
                <InputField label="Impostos (R$)" path="taxes" type="currency" prefix="R$" value={formData.taxes} onChange={handleChange} />
              </div>
            </div>
          </section>

          {/* DESPESAS PRÉ-VENDA */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <div className="p-1.5 bg-rose-500/10 rounded-lg">
                <DollarSign size={14} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Despesas Pré-Venda</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <InputField label="Desp. Condomínio" path="expenseCondo" type="currency" prefix="R$" value={formData.expenseCondo} onChange={handleChange} />
              <InputField label="Desp. IPTU" path="expenseIptu" type="currency" prefix="R$" value={formData.expenseIptu} onChange={handleChange} />
              <div className="md:col-span-2">
                <InputField label="Pós-Arremate (Geral)" path="expensePostAcquisition" type="currency" prefix="R$" value={formData.expensePostAcquisition} onChange={handleChange} />
              </div>
            </div>
          </section>

          {/* OBRA E REFORMA */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <div className="p-1.5 bg-orange-500/10 rounded-lg">
                <HardHat size={14} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Canteiro de Obras</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <InputField label="Budget Previsto" path="budgetReforma" type="currency" prefix="R$" value={formData.budgetReforma} onChange={handleChange} />
              <InputField label="Gasto com Materiais" path="expenseMaterials" type="currency" prefix="R$" value={formData.expenseMaterials} onChange={handleChange} />
            </div>
          </section>

          {/* COMERCIAL */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <div className="p-1.5 bg-purple-500/10 rounded-lg">
                <Users size={14} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Módulo Comercial</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-80">Status Operacional</label>
                <div className="relative">
                  <select className={selectClass} value={formData.status} onChange={(e) => handleChange('status', e.target.value)}>
                    {Object.values(PropertyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] opacity-50">
                    <Plus size={14} className="rotate-45" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-80">Status de Venda</label>
                <div className="relative">
                  <select className={selectClass} value={formData.commercialStatus || CommercialStatus.DISPONIVEL} onChange={(e) => handleChange('commercialStatus', e.target.value)}>
                    {Object.values(CommercialStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] opacity-50">
                    <Plus size={14} className="rotate-45" />
                  </div>
                </div>
              </div>

              <InputField label="Condomínio (Mensal)" path="monthlyCondo" type="currency" prefix="R$" value={formData.monthlyCondo} onChange={handleChange} />
              <InputField label="IPTU (Mensal)" path="monthlyIptu" type="currency" prefix="R$" value={formData.monthlyIptu} onChange={handleChange} />

              <InputField label="Corretagem (R$)" path="brokerage" type="currency" prefix="R$" value={formData.brokerage} onChange={handleChange} />
              <InputField label="Imposto Venda (R$)" path="salesTax" type="currency" prefix="R$" value={formData.salesTax} onChange={handleChange} />
              <div className="md:col-span-2">
                <InputField label="IR (R$)" path="expenseIR" type="currency" prefix="R$" value={formData.expenseIR} onChange={handleChange} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-80">Status OLX</label>
                <div className="relative">
                  <select className={selectClass} value={formData.olxStatus || OLXStatus.NONE} onChange={(e) => handleChange('olxStatus', e.target.value)}>
                    {Object.values(OLXStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] opacity-50">
                    <Globe size={14} />
                  </div>
                </div>
              </div>
              <InputField label="Link OLX" path="olxLink" value={formData.olxLink} onChange={handleChange} placeholder="https://www.olx.com.br/..." />
            </div>

              {formData.status === PropertyStatus.VENDIDO && (
                <div className="p-6 bg-emerald-500/5 rounded-[32px] border border-emerald-500/10 space-y-6">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 size={16} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Dados da Venda</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="Data da Venda" path="saleDate" type="date" value={formData.saleDate} onChange={handleChange} />
                    <InputField label="Corretor Responsável" path="brokerName" value={formData.brokerName} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-70">Notas da Venda</label>
                      <textarea 
                        className="w-full bg-white dark:bg-slate-900 text-[var(--text-main)] px-5 py-4 rounded-[24px] border border-[var(--border)] outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 transition-all duration-300 font-medium placeholder:text-[var(--text-muted)]/40 min-h-[80px] text-[12px]"
                        placeholder="Detalhes sobre a negociação, condições de pagamento..."
                        value={formData.saleNotes || ''}
                        onChange={(e) => handleChange('saleNotes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 p-5 bg-[var(--bg-card-alt)] rounded-[24px] border border-[var(--border)] transition-all hover:border-[var(--accent)]/30 group">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    id="availableForBrokers"
                    className="peer w-6 h-6 rounded-lg border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]/20 transition-all cursor-pointer appearance-none bg-white dark:bg-slate-800 border-2"
                    checked={formData.availableForBrokers || false}
                    onChange={(e) => handleChange('availableForBrokers', e.target.checked)}
                  />
                  <div className="absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity text-[var(--accent)]">
                    <Plus size={16} className="rotate-45" />
                  </div>
                </div>
                <label htmlFor="availableForBrokers" className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.1em] cursor-pointer select-none">Disponibilizar para Corretores Externos</label>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-70">Descrição para Venda</label>
                  <textarea 
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-[24px] border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/5 focus:border-[var(--accent)]/50 transition-all duration-300 font-medium placeholder:text-[var(--text-muted)]/40 min-h-[140px] text-[12px] shadow-sm hover:border-[var(--border-hover)]"
                    placeholder="Destaque os pontos fortes do imóvel, localização e diferenciais..."
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest ml-1 opacity-70">Melhorias Realizadas</label>
                  <textarea 
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-4 rounded-[24px] border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/5 focus:border-[var(--accent)]/50 transition-all duration-300 font-medium placeholder:text-[var(--text-muted)]/40 min-h-[100px] text-[12px] shadow-sm hover:border-[var(--border-hover)]"
                    placeholder="Liste as melhorias e reformas feitas..."
                    value={formData.improvements || ''}
                    onChange={(e) => handleChange('improvements', e.target.value)}
                  />
                </div>
              </div>
            </section>
          </form>
        </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-card)] flex gap-4 sticky bottom-0 z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 bg-[var(--bg-card-alt)] text-[var(--text-muted)] font-black text-[10px] uppercase tracking-[0.2em] rounded-[20px] hover:bg-[var(--border)] transition-all active:scale-95"
        >
          Cancelar
        </button>
        <button 
          type="button"
          disabled={isSaving}
          onClick={() => formRef.current?.requestSubmit()}
          className="flex-[2] py-4 bg-gradient-primary text-[var(--accent-text)] font-black text-[10px] uppercase tracking-[0.2em] rounded-[20px] shadow-accent hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98]"
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>{uploadProgress || 'Processando...'}</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Salvar Imóvel</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PropertyForm;
