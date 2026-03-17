
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
  // Se for moeda, usa a máscara. Se o valor for null/undefined, a máscara retornará string vazia.
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
          className={`w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] ${prefix && displayValue !== '' ? 'pl-8' : 'px-3'} py-2 rounded-xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-medium placeholder:text-[var(--text-muted)] text-[11px]`}
          value={displayValue}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const rawValue = e.target.value;
            if (type === 'currency') {
              // Se o campo for limpo, parseBRLToFloat retorna null
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

const PropertyForm = ({ properties, onSave, onCancel }: { properties?: Property[], onSave: (p: Property) => void, onCancel?: () => void }) => {
  const navigate = useNavigate();
  const { id } = useParams();
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
  const [isPublishingOLX, setIsPublishingOLX] = useState(false);

  useEffect(() => {
    if (id && properties) {
      const existing = properties.find(p => p.id === id);
      if (existing) {
        setFormData({ ...existing });
      }
    }
  }, [id, properties]);


  const handleChange = (path: string, value: any) => {
    setFormData(prev => ({ ...prev, [path]: value }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setFormData(prev => ({ ...prev, images: [...(prev.images || []), base64] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const addImageUrl = () => {
    if (!imageUrlInput) return;
    setFormData(prev => ({ ...prev, images: [...(prev.images || []), imageUrlInput] }));
    setImageUrlInput('');
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isPublishingOLX) return;

    const newErrors: string[] = [];
    
    // Apenas validações críticas de identificação permanecem obrigatórias
    if (!formData.neighborhood || formData.neighborhood.trim().length < 2) newErrors.push('O Bairro/Condomínio é obrigatório.');
    if (!formData.city || formData.city.trim().length < 2) newErrors.push('A Cidade é obrigatória.');
    
    if (newErrors.length > 0) { 
      setErrors(newErrors); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
      return; 
    }

    setIsSaving(true);
    setUploadProgress('Processando imagens...');
    
    try {
      const propertyId = formData.id || Math.random().toString(36).substr(2, 9);
      
      // Upload local images (base64) to Firebase Storage
      const finalImages = await Promise.all((formData.images || []).map(async (img, index) => {
        if (img.startsWith('data:')) {
          setUploadProgress(`Enviando imagem ${index + 1}...`);
          const path = `properties/${propertyId}/${Date.now()}-${index}.jpg`;
          try {
            return await uploadImage(img, path);
          } catch (err) {
            console.error("Error uploading image:", err);
            return img; // Fallback to base64 if upload fails (though not ideal)
          }
        }
        return img;
      }));

      setUploadProgress('Salvando dados...');
      
      let finalPropertyData = { 
        ...formData, 
        id: propertyId, 
        images: finalImages 
      } as Property;

      // OLX Integration is currently in development (Coming Soon)
      /*
      if (formData.olx?.status === OLXStatus.PENDING) {
        setIsPublishingOLX(true);
        setUploadProgress('Publicando na OLX...');
        try {
          const olxResult = await OLXService.publish(finalPropertyData);
          finalPropertyData.olx = olxResult;
        } catch (err) {
          console.error("OLX Publish error:", err);
          finalPropertyData.olx = {
            status: OLXStatus.REJECTED,
            errorMessage: 'Erro na comunicação com a API da OLX.',
            lastSync: new Date().toISOString()
          };
        }
      }
      */
      
      await onSave(finalPropertyData);
      
      navigate('/imoveis');
    } catch (error) {
      console.error("Error saving property:", error);
      setErrors(['Erro ao salvar o imóvel. Por favor, tente novamente.']);
    } finally {
      setIsSaving(false);
      setUploadProgress('');
    }
  };

  const selectClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-medium appearance-none text-[11px]";

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] tracking-tight mb-2">{id ? 'Ficha do Ativo' : 'Novo Arremate'}</h2>
          <p className="text-[var(--text-muted)] font-medium text-sm sm:text-base">Preencha os dados conforme as etapas de arremate e reforma.</p>
        </div>
        <button type="button" onClick={() => navigate(-1)} className="self-end sm:self-start p-3 sm:p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl transition-all border border-[var(--border)] shadow-sm"><X size={24} /></button>
      </div>

      {errors.length > 0 && (
        <div className="mb-10 bg-rose-500/10 border-l-4 border-rose-500 p-6 rounded-r-3xl flex items-start space-x-4 shadow-xl animate-in slide-in-from-top-2">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={24} />
          <div>
            <h4 className="text-rose-500 font-black text-sm uppercase tracking-wider mb-1">Pendências Obrigatórias</h4>
            <ul className="list-disc list-inside text-rose-500/80 text-xs sm:text-sm space-y-1">
              {errors.map((err, i) => <li key={i} className="font-medium">{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 sm:space-y-12">
        {/* GALERIA - OTIMIZADA */}
        <section className="bg-[var(--bg-card)] p-3 sm:p-4 rounded-[24px] border border-[var(--border)] shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div className="flex items-center space-x-2 text-yellow-600">
              <div className="p-1.5 bg-yellow-500/10 rounded-lg"><ImageIcon size={14} /></div>
              <h3 className="font-black uppercase tracking-widest text-[9px]">Galeria de Fotos</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${isDragging ? 'border-yellow-500 bg-yellow-500/10' : 'border-[var(--border)] bg-[var(--bg-card-alt)] hover:border-yellow-400'}`}
            >
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files)} />
              <div className="w-8 h-8 bg-yellow-500/10 text-yellow-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Upload size={16} /></div>
              <h4 className="text-xs font-black text-[var(--text-main)]">Upload</h4>
              <p className="text-[9px] text-[var(--text-muted)] font-medium">Fotos do canteiro ou laudo</p>
            </div>
            <div className="flex flex-col justify-center space-y-3">
              <div className="p-3 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border)]">
                <label className="block text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Adicionar por Link</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="https://..." className="flex-1 bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border)] outline-none focus:ring-2 focus:ring-yellow-500/10 transition-all font-medium placeholder:text-[var(--text-muted)] text-[11px] text-[var(--text-main)]" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} />
                  <button type="button" onClick={addImageUrl} className="bg-[var(--bg-header)] text-[var(--text-header)] px-3 rounded-xl font-bold hover:opacity-90 transition-all"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 sm:gap-2">
            {(formData.images || []).map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
                <img src={img} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={() => removeImage(idx)} className="p-1.5 bg-rose-600 text-white rounded-lg shadow-xl hover:scale-110 active:scale-95 transition-all"><Trash2 size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DESTAQUE COMERCIAL - OTIMIZADO */}
        <section className="bg-emerald-500/5 p-4 rounded-[24px] border border-emerald-500/20 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <div className="flex items-center space-x-2 text-emerald-600">
              <div className="p-1 bg-emerald-500/20 rounded-lg"><DollarSign size={14} /></div>
              <h3 className="font-black uppercase tracking-widest text-[9px]">Destaque Comercial</h3>
            </div>
            <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">Valor de Mercado</span>
          </div>
          <div className="bg-[var(--bg-card)] p-3 rounded-2xl border border-emerald-500/10 shadow-inner">
             <label className="block text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 ml-1">Valor de Venda Alvo</label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50 font-black text-base z-10">R$</span>
               <input 
                 type="text"
                 className="w-full bg-emerald-500/5 text-emerald-600 pl-10 pr-3 py-2 rounded-xl border border-emerald-500/10 outline-none focus:border-emerald-500 transition-all font-black text-lg placeholder:text-emerald-500/20"
                 placeholder="0,00"
                 value={formatBRLMask(formData.salePrice)}
                 onChange={(e) => handleChange('salePrice', parseBRLToFloat(e.target.value))}
               />
             </div>
          </div>
        </section>

        {/* HUB DE MULTIVENDA - OLX (OTIMIZADO) */}
        <section className="bg-orange-500/5 p-4 rounded-[24px] border border-orange-500/20 shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-3 right-[-35px] bg-orange-500 text-white text-[7px] font-black uppercase tracking-widest py-0.5 w-[120px] text-center rotate-45 shadow-lg z-10">
            Em Breve
          </div>
          
          <div className="flex items-center space-x-2 text-orange-600">
            <div className="p-1 bg-orange-500/20 rounded-lg"><Globe size={14} /></div>
            <h3 className="font-black uppercase tracking-widest text-[9px]">Hub de Multivenda: OLX</h3>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-xl border border-orange-500/10 opacity-60 grayscale-[0.5]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10 text-orange-600">
                <Upload size={16} />
              </div>
              <div>
                <h4 className="font-black text-[var(--text-main)] text-[10px]">Publicar na OLX</h4>
                <p className="text-[8px] text-[var(--text-muted)] font-medium">Em homologação técnica.</p>
              </div>
            </div>
            <div className="w-10 h-5 rounded-full p-1 bg-[var(--bg-card-alt)]">
              <div className="w-3 h-3 bg-white/50 rounded-full shadow-md" />
            </div>
          </div>
        </section>

        {/* INFO - OTIMIZADO */}
        <section className="bg-[var(--bg-card)] p-3 sm:p-4 rounded-[24px] border border-[var(--border)] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-yellow-600 border-b border-[var(--border)] pb-2">
            <div className="p-1 bg-yellow-500/10 rounded-lg"><Info size={12} /></div>
            <h3 className="font-black uppercase tracking-widest text-[8px]">Informações Primárias</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            <InputField label="Título (Etiqueta)" path="title" type="text" placeholder="Ex: AP - Gran Vitta..." value={formData.title} onChange={handleChange} fullWidth />
            <div><label className="block text-[8px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Tipo</label><div className="relative"><select className={selectClass} value={formData.type} onChange={(e) => handleChange('type', e.target.value)}>{Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
            <div><label className="block text-[8px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Status</label><div className="relative"><select className={selectClass} value={formData.status} onChange={(e) => handleChange('status', e.target.value)}>{Object.values(PropertyStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
            <InputField label="Cidade" path="city" type="text" value={formData.city} onChange={handleChange} />
            <InputField label="Bairro" path="neighborhood" type="text" value={formData.neighborhood} onChange={handleChange} />
            <InputField label="Área (m²)" path="sizeM2" type="number" value={formData.sizeM2} onChange={handleChange} />
            <InputField label="Data Arremate" path="acquisitionDate" type="date" value={formData.acquisitionDate} onChange={handleChange} />
            <InputField label="Endereço" path="address" type="text" placeholder="Av. das Nações..." value={formData.address} onChange={handleChange} fullWidth />
          </div>
        </section>

        {/* FINANCEIRO */}
        <section className="bg-[var(--bg-card)] p-3 sm:p-4 rounded-[24px] border border-[var(--border)] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-yellow-600 border-b border-[var(--border)] pb-2">
            <div className="p-1 bg-yellow-500/10 rounded-lg"><Landmark size={14} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-widest text-[8px]">Valores de Entrada</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InputField label="Avaliação Mercado" path="bankValuation" type="currency" prefix="R$" value={formData.bankValuation} onChange={handleChange} />
            <InputField label="Valor Arremate" path="acquisitionPrice" type="currency" prefix="R$" value={formData.acquisitionPrice} onChange={handleChange} />
            <InputField label="Comissão Leilão" path="auctioneerCommission" type="currency" prefix="R$" value={formData.auctioneerCommission} onChange={handleChange} />
          </div>
        </section>

        {/* JURÍDICO */}
        <section className="bg-[var(--bg-card)] p-3 sm:p-4 rounded-[24px] border border-[var(--border)] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-yellow-600 border-b border-[var(--border)] pb-2">
            <div className="p-1 bg-yellow-500/10 rounded-lg"><ShieldCheck size={14} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-widest text-[8px]">Jurídico e Legal</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InputField label="Escritura" path="legalEscritura" type="currency" prefix="R$" value={formData.legalEscritura} onChange={handleChange} />
            <InputField label="ITBI" path="legalItbi" type="currency" prefix="R$" value={formData.legalItbi} onChange={handleChange} />
            <InputField label="Registro" path="legalTaxasRegistro" type="currency" prefix="R$" value={formData.legalTaxasRegistro} onChange={handleChange} />
            <InputField label="Certidões" path="legalCertidoes" type="currency" prefix="R$" value={formData.legalCertidoes} onChange={handleChange} />
            <InputField label="Impostos" path="taxes" type="currency" prefix="R$" value={formData.taxes} onChange={handleChange} />
          </div>
        </section>

        {/* DESPESAS RECORRENTES */}
        <section className="bg-[var(--bg-card)] p-3 sm:p-4 rounded-[24px] border border-[var(--border)] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-yellow-600 border-b border-[var(--border)] pb-2">
            <div className="p-1 bg-yellow-500/10 rounded-lg"><Landmark size={14} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-widest text-[8px]">Despesas Recorrentes (Pré-Venda)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InputField label="Desp. Condomínio" path="expenseCondo" type="currency" prefix="R$" value={formData.expenseCondo} onChange={handleChange} />
            <InputField label="Desp. IPTU" path="expenseIptu" type="currency" prefix="R$" value={formData.expenseIptu} onChange={handleChange} />
            <InputField label="IPTU/Cond. Pós-Arremate" path="expensePostAcquisition" type="currency" prefix="R$" value={formData.expensePostAcquisition} onChange={handleChange} />
          </div>
        </section>

        {/* PROJEÇÃO */}
        <section className="bg-[var(--bg-card)] p-3 sm:p-4 rounded-[24px] border border-[var(--border)] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-yellow-600 border-b border-[var(--border)] pb-2">
            <div className="p-1 bg-yellow-500/10 rounded-lg"><HardHat size={14} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-widest text-[8px]">Obra e Projeção</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InputField label="Budget Obra" path="budgetReforma" type="currency" prefix="R$" value={formData.budgetReforma} onChange={handleChange} />
            <InputField label="Materiais Reforma" path="expenseMaterials" type="currency" prefix="R$" value={formData.expenseMaterials} onChange={handleChange} />
            <InputField label="Alvo de Venda" path="salePrice" type="currency" prefix="R$" value={formData.salePrice} onChange={handleChange} />
            <InputField label="Data da Venda" path="saleDate" type="date" value={formData.saleDate} onChange={handleChange} />
            <InputField label="Imposto de Renda (IR)" path="expenseIR" type="currency" prefix="R$" value={formData.expenseIR} onChange={handleChange} />
            <InputField label="Corretagem" path="brokerage" type="currency" prefix="R$" value={formData.brokerage} onChange={handleChange} />
            <InputField label="Taxas Venda" path="salesTax" type="currency" prefix="R$" value={formData.salesTax} onChange={handleChange} />
            <InputField label="Outros Custos" path="otherCosts" type="currency" prefix="R$" value={formData.otherCosts} onChange={handleChange} />
          </div>
        </section>

        {/* MÓDULO CORRETORES */}
        <section className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-[24px] border border-[var(--border)] shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-emerald-600 border-b border-[var(--border)] pb-2">
            <div className="p-1 bg-emerald-500/10 rounded-lg"><Users size={14} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-widest text-[8px]">Módulo de Corretores</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-[var(--bg-card-alt)] rounded-xl border border-[var(--border)]">
              <input 
                type="checkbox" 
                id="availableForBrokers"
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.availableForBrokers || false}
                onChange={(e) => handleChange('availableForBrokers', e.target.checked)}
              />
              <label htmlFor="availableForBrokers" className="text-xs font-bold text-[var(--text-main)] cursor-pointer">Disponível para Corretores</label>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex-1">
                <label className="block text-[9px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Descrição Comercial</label>
                <textarea 
                  className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-4 py-3 rounded-xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium placeholder:text-[var(--text-muted)] min-h-[100px] text-xs"
                  placeholder="Descrição completa para os corretores..."
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[9px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Benfeitorias Realizadas</label>
                <textarea 
                  className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-4 py-3 rounded-xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium placeholder:text-[var(--text-muted)] min-h-[80px] text-xs"
                  placeholder="Liste as melhorias feitas no imóvel..."
                  value={formData.improvements || ''}
                  onChange={(e) => handleChange('improvements', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-widest ml-1">Status Comercial</label>
                <div className="relative">
                  <select 
                    className={selectClass} 
                    value={formData.commercialStatus || CommercialStatus.DISPONIVEL} 
                    onChange={(e) => handleChange('commercialStatus', e.target.value)}
                  >
                    {Object.values(CommercialStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <InputField label="Localização Aproximada" path="locationApprox" type="text" placeholder="Ex: Próximo ao metrô Moema" value={formData.locationApprox} onChange={handleChange} />
            </div>
          </div>
        </section>

      </form>

      </div>

      {/* Floating Action Bar - Moved outside to avoid transform issues */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', damping: 20 }}
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-[100] flex items-center gap-4"
      >
        <button 
          type="button" 
          onClick={() => onCancel ? onCancel() : navigate(-1)}
          className="hidden sm:flex bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border)] px-8 py-4 rounded-[24px] font-black text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest transition-all shadow-2xl hover:bg-[var(--bg-card)] items-center gap-2"
        >
          <X size={18} />
          <span>Descartar</span>
        </button>
        <button 
          type="button"
          disabled={isSaving}
          onClick={() => {
            if (formRef.current) formRef.current.requestSubmit();
          }}
          className="bg-yellow-500 text-black px-8 sm:px-12 py-5 rounded-[24px] font-black text-sm sm:text-base shadow-[0_20px_50px_rgba(234,179,8,0.4)] hover:bg-yellow-600 hover:-translate-y-1 active:translate-y-0 transition-all flex flex-col items-center justify-center space-y-1 uppercase tracking-widest border border-yellow-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            {isSaving ? <Loader2 size={22} className="animate-spin" /> : <Save size={22} strokeWidth={2.5} />}
            <span>{isSaving ? 'Salvando...' : 'Salvar Ativo'}</span>
          </div>
          {uploadProgress && <span className="text-[10px] font-bold opacity-80 lowercase">{uploadProgress}</span>}
        </button>
      </motion.div>
    </>
  );
};

export default PropertyForm;
