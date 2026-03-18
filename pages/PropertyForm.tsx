
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save, X, AlertCircle, Info, Landmark, ShieldCheck, HardHat, Image as ImageIcon, Plus, Trash2, Upload, Users, DollarSign, Loader2, Globe } from 'lucide-react';
import { Property, PropertyStatus, PropertyType, CommercialStatus, OLXStatus } from '../types';
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
      <div className={`w-full ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
        <label className="block text-[8px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">{label}</label>
        <CustomDatePicker 
          selected={value ? new Date(value + 'T00:00:00') : null}
          onChange={(date) => onChange(path, date ? date.toISOString().split('T')[0] : null)}
          placeholderText="DD/MM/AAAA"
        />
      </div>
    );
  }

  return (
    <div className={`w-full ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
      <label className="block text-[8px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        {prefix && displayValue !== '' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-[10px] z-10 pointer-events-none opacity-50">
            {prefix}
          </span>
        )}
        <input 
          type={type === 'currency' ? 'text' : type} 
          placeholder={placeholder || (type === 'currency' ? 'R$ 0,00' : '')}
          className={`w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] ${prefix && displayValue !== '' ? 'pl-8' : 'px-3'} py-2.5 rounded-xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-[var(--text-muted)] text-[11px]`}
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

  const selectClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-3 py-2.5 rounded-xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium appearance-none text-[11px]";

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)]">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-card)] sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight uppercase">
            {property ? 'Editar Ativo' : 'Novo Ativo'}
          </h2>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
            {property ? `ID: ${property.id.substring(0, 8)}` : 'Preencha os dados do arremate'}
          </p>
        </div>
        <button 
          onClick={onCancel}
          className="p-2 hover:bg-[var(--bg-card-alt)] rounded-xl text-[var(--text-muted)] transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-8 pb-32">
          {errors.length > 0 && (
            <div className="bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded-r-2xl flex items-start space-x-3 animate-in slide-in-from-top-2">
              <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-rose-500 font-black text-[10px] uppercase tracking-wider mb-1">Pendências</h4>
                <ul className="text-rose-500/80 text-[10px] space-y-0.5">
                  {errors.map((err, i) => <li key={i} className="font-medium">• {err}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* NOVO DESIGN DE IMAGENS - COOL PLACE */}
          <section className="space-y-4">
            <div className="relative aspect-video rounded-[32px] overflow-hidden bg-[var(--bg-card-alt)] border border-[var(--border)] group shadow-inner">
              {formData.images && formData.images.length > 0 ? (
                <>
                  <img 
                    src={formData.images[selectedImageIndex]} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt="Preview" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <button 
                      type="button"
                      onClick={() => removeImage(selectedImageIndex)}
                      className="p-2 bg-rose-600 text-white rounded-xl shadow-lg hover:scale-110 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Trash2 size={14} /> Remover Foto
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-3">
                  <div className="w-16 h-16 bg-[var(--bg-card)] rounded-3xl flex items-center justify-center border border-[var(--border)] shadow-sm">
                    <ImageIcon size={32} strokeWidth={1.5} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Nenhuma imagem</p>
                </div>
              )}
              
              {/* Upload Overlay when dragging */}
              {isDragging && (
                <div className="absolute inset-0 bg-[var(--accent)]/20 backdrop-blur-sm border-4 border-dashed border-[var(--accent)] flex items-center justify-center z-10">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3">
                    <Upload size={32} className="text-[var(--accent)] animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-widest">Solte para enviar</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
                className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card-alt)] hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5 transition-all flex flex-col items-center justify-center gap-1 group"
              >
                <Plus size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Add</span>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files)} />
              </button>

              {formData.images?.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all relative ${selectedImageIndex === idx ? 'border-[var(--accent)] scale-95 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  {selectedImageIndex === idx && (
                    <div className="absolute inset-0 bg-[var(--accent)]/10 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ou cole um link de imagem aqui..." 
                className="flex-1 bg-[var(--bg-card-alt)] px-4 py-2.5 rounded-xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 transition-all font-medium text-[10px] text-[var(--text-main)]" 
                value={imageUrlInput} 
                onChange={(e) => setImageUrlInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
              />
              <button 
                type="button" 
                onClick={addImageUrl} 
                className="bg-[var(--accent)] text-white px-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20"
              >
                <Plus size={16} />
              </button>
            </div>
          </section>

          {/* INFO PRIMÁRIA */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-2">
              <Info size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Informações Gerais</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <InputField label="Título / Identificação" path="title" value={formData.title} onChange={handleChange} placeholder="Ex: AP 304 - Gran Vitta" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Tipo de Imóvel</label>
                  <select className={selectClass} value={formData.type} onChange={(e) => handleChange('type', e.target.value)}>
                    {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Status Operacional</label>
                  <select className={selectClass} value={formData.status} onChange={(e) => handleChange('status', e.target.value)}>
                    {Object.values(PropertyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Cidade" path="city" value={formData.city} onChange={handleChange} />
                <InputField label="Bairro / Condomínio" path="neighborhood" value={formData.neighborhood} onChange={handleChange} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Área Privativa (m²)" path="sizeM2" type="number" value={formData.sizeM2} onChange={handleChange} />
                <InputField label="Data do Arremate" path="acquisitionDate" type="date" value={formData.acquisitionDate} onChange={handleChange} />
              </div>

              <InputField label="Endereço Completo" path="address" value={formData.address} onChange={handleChange} placeholder="Rua, Número, Complemento..." />
            </div>
          </section>

          {/* FINANCEIRO */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <Landmark size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Análise Financeira</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Avaliação de Mercado" path="bankValuation" type="currency" prefix="R$" value={formData.bankValuation} onChange={handleChange} />
              <InputField label="Valor do Arremate" path="acquisitionPrice" type="currency" prefix="R$" value={formData.acquisitionPrice} onChange={handleChange} />
              <InputField label="Comissão Leiloeiro" path="auctioneerCommission" type="currency" prefix="R$" value={formData.auctioneerCommission} onChange={handleChange} />
              <InputField label="Alvo de Venda" path="salePrice" type="currency" prefix="R$" value={formData.salePrice} onChange={handleChange} />
            </div>
          </section>

          {/* JURÍDICO E TAXAS */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <ShieldCheck size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Custos Legais</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <InputField label="ITBI" path="legalItbi" type="currency" prefix="R$" value={formData.legalItbi} onChange={handleChange} />
              <InputField label="Registro / Escritura" path="legalTaxasRegistro" type="currency" prefix="R$" value={formData.legalTaxasRegistro} onChange={handleChange} />
              <InputField label="Certidões / Outros" path="legalCertidoes" type="currency" prefix="R$" value={formData.legalCertidoes} onChange={handleChange} />
              <InputField label="Impostos Acumulados" path="taxes" type="currency" prefix="R$" value={formData.taxes} onChange={handleChange} />
            </div>
          </section>

          {/* OBRA E REFORMA */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <HardHat size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Canteiro de Obras</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Budget Previsto" path="budgetReforma" type="currency" prefix="R$" value={formData.budgetReforma} onChange={handleChange} />
              <InputField label="Gasto com Materiais" path="expenseMaterials" type="currency" prefix="R$" value={formData.expenseMaterials} onChange={handleChange} />
            </div>
          </section>

          {/* COMERCIAL */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Users size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Módulo Comercial</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-card-alt)] rounded-xl border border-[var(--border)]">
                <input 
                  type="checkbox" 
                  id="availableForBrokers"
                  className="w-4 h-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  checked={formData.availableForBrokers || false}
                  onChange={(e) => handleChange('availableForBrokers', e.target.checked)}
                />
                <label htmlFor="availableForBrokers" className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest cursor-pointer">Disponível para Corretores</label>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[8px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Status de Venda</label>
                  <select className={selectClass} value={formData.commercialStatus || CommercialStatus.DISPONIVEL} onChange={(e) => handleChange('commercialStatus', e.target.value)}>
                    {Object.values(CommercialStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[8px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Descrição para Venda</label>
                  <textarea 
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-4 py-3 rounded-xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-[var(--text-muted)] min-h-[100px] text-[11px]"
                    placeholder="Destaque os pontos fortes do imóvel..."
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-card)] flex gap-3 sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 bg-[var(--bg-card-alt)] text-[var(--text-muted)] font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-[var(--border)] transition-all"
        >
          Cancelar
        </button>
        <button 
          type="button"
          disabled={isSaving}
          onClick={() => formRef.current?.requestSubmit()}
          className="flex-[2] py-4 bg-gradient-primary text-[var(--accent-text)] font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-accent hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>{uploadProgress || 'Salvando...'}</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Salvar Ativo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PropertyForm;
