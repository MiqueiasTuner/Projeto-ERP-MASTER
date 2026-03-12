
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save, X, AlertCircle, Info, Landmark, ShieldCheck, HardHat, Image as ImageIcon, Plus, Trash2, Upload, Users, DollarSign } from 'lucide-react';
import { Property, PropertyStatus, PropertyType } from '../types';
import { formatBRLMask, parseBRLToFloat } from '../utils';
import CustomDatePicker from '../src/components/CustomDatePicker';

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
      <div className={`flex-1 min-w-[240px] ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">{label}</label>
        <CustomDatePicker 
          selected={value ? new Date(value + 'T00:00:00') : null}
          onChange={(date) => onChange(path, date ? date.toISOString().split('T')[0] : null)}
          placeholderText="DD/MM/AAAA"
        />
      </div>
    );
  }

  return (
    <div className={`flex-1 min-w-[240px] ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
      <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        {prefix && displayValue !== '' && (
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm z-10 pointer-events-none">
            {prefix}
          </span>
        )}
        <input 
          type={type === 'currency' ? 'text' : type} 
          placeholder={placeholder || (type === 'currency' ? 'R$ 0,00' : '')}
          className={`w-full bg-slate-50 text-slate-900 ${prefix && displayValue !== '' ? 'pl-12' : 'px-5'} py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400`}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];
    
    // Apenas validações críticas de identificação permanecem obrigatórias
    if (!formData.neighborhood || formData.neighborhood.trim().length < 2) newErrors.push('O Bairro/Condomínio é obrigatório.');
    if (!formData.city || formData.city.trim().length < 2) newErrors.push('A Cidade é obrigatória.');
    
    if (newErrors.length > 0) { 
      setErrors(newErrors); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
      return; 
    }
    
    onSave({ 
      ...formData, 
      id: formData.id || Math.random().toString(36).substr(2, 9), 
      images: formData.images || [] 
    } as Property);
    navigate('/imoveis');
  };

  const selectClass = "w-full bg-slate-50 text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium appearance-none";

  return (
    <>
      <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">{id ? 'Ficha do Ativo' : 'Novo Arremate'}</h2>
          <p className="text-slate-500 font-medium text-sm sm:text-base">Preencha os dados conforme as etapas de arremate e reforma.</p>
        </div>
        <button type="button" onClick={() => navigate(-1)} className="self-end sm:self-start p-3 sm:p-4 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all border border-slate-200 shadow-sm"><X size={24} /></button>
      </div>

      {errors.length > 0 && (
        <div className="mb-10 bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-3xl flex items-start space-x-4 shadow-xl animate-in slide-in-from-top-2">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={24} />
          <div>
            <h4 className="text-rose-900 font-black text-sm uppercase tracking-wider mb-1">Pendências Obrigatórias</h4>
            <ul className="list-disc list-inside text-rose-700 text-xs sm:text-sm space-y-1">
              {errors.map((err, i) => <li key={i} className="font-medium">{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 sm:space-y-12">
        {/* GALERIA */}
        <section className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center space-x-3 text-blue-600 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-50 rounded-2xl"><ImageIcon size={20} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Galeria de Fotos</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[32px] p-8 sm:p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${isDragging ? 'border-blue-500 bg-blue-50 scale-[0.98]' : 'border-slate-100 bg-slate-50/50 hover:border-blue-400 hover:bg-slate-50'}`}
            >
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files)} />
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Upload size={28} strokeWidth={2.5} /></div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 mb-2">Upload</h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Fotos do canteiro ou laudo</p>
            </div>
            <div className="flex flex-col justify-center space-y-6">
              <div className="p-6 sm:p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Adicionar por Link</label>
                <div className="flex gap-2 sm:gap-4">
                  <input type="text" placeholder="https://..." className="flex-1 bg-white px-4 sm:px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder:text-slate-400 text-sm" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} />
                  <button type="button" onClick={addImageUrl} className="bg-slate-900 text-white px-5 sm:px-6 rounded-2xl font-bold hover:bg-slate-800 transition-all"><Plus size={20} /></button>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {(formData.images || []).map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-2xl sm:rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
                <img src={img} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={() => removeImage(idx)} className="p-3 bg-rose-600 text-white rounded-xl shadow-xl hover:scale-110 active:scale-95 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DESTAQUE COMERCIAL */}
        <section className="bg-emerald-50 p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-emerald-100 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b border-emerald-200/50 pb-4">
            <div className="flex items-center space-x-3 text-emerald-700">
              <div className="p-2.5 bg-emerald-100 rounded-2xl"><DollarSign size={20} strokeWidth={2.5} /></div>
              <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Destaque Comercial</h3>
            </div>
            <div className="hidden sm:block">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-3 py-1 rounded-full">Valor de Mercado</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
            <div className="sm:col-span-2 bg-white p-8 rounded-[32px] border border-emerald-200/30 shadow-inner">
               <label className="block text-[11px] font-black text-emerald-600 mb-3 uppercase tracking-widest ml-1">Valor de Venda Alvo (Destaque)</label>
               <div className="relative">
                 <span className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-2xl z-10">R$</span>
                 <input 
                   type="text"
                   className="w-full bg-emerald-50/30 text-emerald-700 pl-16 pr-8 py-6 rounded-[24px] border border-emerald-100 outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-black text-3xl sm:text-4xl placeholder:text-emerald-200"
                   placeholder="0,00"
                   value={formatBRLMask(formData.salePrice)}
                   onChange={(e) => handleChange('salePrice', parseBRLToFloat(e.target.value))}
                   onFocus={(e) => e.target.select()}
                 />
               </div>
               <p className="mt-4 text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                 <Info size={12} /> Este valor será usado para cálculos de ROI e exibição para corretores.
               </p>
            </div>
          </div>
        </section>

        {/* INFO */}
        <section className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center space-x-3 text-blue-600 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-50 rounded-2xl"><Info size={20} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Informações Primárias</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
            <InputField label="Título Identificador (Etiqueta)" path="title" type="text" placeholder="Ex: AP - Gran Vitta Valley - Bloco 04 Apto 203" value={formData.title} onChange={handleChange} fullWidth />
            <div><label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Tipo de Ativo</label><div className="relative"><select className={selectClass} value={formData.type} onChange={(e) => handleChange('type', e.target.value)}>{Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
            <div><label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Status Operacional</label><div className="relative"><select className={selectClass} value={formData.status} onChange={(e) => handleChange('status', e.target.value)}>{Object.values(PropertyStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
            <InputField label="Cidade" path="city" type="text" placeholder="Ex: São Paulo" value={formData.city} onChange={handleChange} />
            <InputField label="Bairro ou Condomínio" path="neighborhood" type="text" placeholder="Ex: Moema" value={formData.neighborhood} onChange={handleChange} />
            <InputField label="Bairro/Condom2" path="neighborhood2" type="text" placeholder="Ex: Complemento..." value={formData.neighborhood2} onChange={handleChange} />
            <InputField label="Nome do Condomínio" path="condoName" type="text" placeholder="Ex: Ed. Solar..." value={formData.condoName} onChange={handleChange} />
            <InputField label="Imobiliária" path="realEstateAgency" type="text" placeholder="Ex: Lopes..." value={formData.realEstateAgency} onChange={handleChange} />
            <InputField label="Endereço" path="address" type="text" placeholder="Av. das Nações..." value={formData.address} onChange={handleChange} fullWidth />
            <InputField label="Área Privativa (m²)" path="sizeM2" type="number" value={formData.sizeM2} onChange={handleChange} />
            <InputField label="Data do Arremate" path="acquisitionDate" type="date" value={formData.acquisitionDate} onChange={handleChange} />
          </div>
        </section>

        {/* FINANCEIRO */}
        <section className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center space-x-3 text-blue-600 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-50 rounded-2xl"><Landmark size={20} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Valores de Entrada</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
            <InputField label="Avaliação Mercado" path="bankValuation" type="currency" prefix="R$" value={formData.bankValuation} onChange={handleChange} />
            <InputField label="Valor Arremate" path="acquisitionPrice" type="currency" prefix="R$" value={formData.acquisitionPrice} onChange={handleChange} />
            <InputField label="Comissão Leilão" path="auctioneerCommission" type="currency" prefix="R$" value={formData.auctioneerCommission} onChange={handleChange} />
          </div>
        </section>

        {/* JURÍDICO */}
        <section className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center space-x-3 text-blue-600 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-50 rounded-2xl"><ShieldCheck size={20} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Jurídico e Legal</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
            <InputField label="Escritura" path="legalEscritura" type="currency" prefix="R$" value={formData.legalEscritura} onChange={handleChange} />
            <InputField label="ITBI" path="legalItbi" type="currency" prefix="R$" value={formData.legalItbi} onChange={handleChange} />
            <InputField label="Registro" path="legalTaxasRegistro" type="currency" prefix="R$" value={formData.legalTaxasRegistro} onChange={handleChange} />
            <InputField label="Certidões" path="legalCertidoes" type="currency" prefix="R$" value={formData.legalCertidoes} onChange={handleChange} />
            <InputField label="Impostos" path="taxes" type="currency" prefix="R$" value={formData.taxes} onChange={handleChange} />
          </div>
        </section>

        {/* DESPESAS RECORRENTES */}
        <section className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center space-x-3 text-blue-600 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-50 rounded-2xl"><Landmark size={20} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Despesas Recorrentes (Pré-Venda)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
            <InputField label="Desp. Condomínio" path="expenseCondo" type="currency" prefix="R$" value={formData.expenseCondo} onChange={handleChange} />
            <InputField label="Desp. IPTU" path="expenseIptu" type="currency" prefix="R$" value={formData.expenseIptu} onChange={handleChange} />
            <InputField label="IPTU/Cond. Pós-Arremate" path="expensePostAcquisition" type="currency" prefix="R$" value={formData.expensePostAcquisition} onChange={handleChange} />
          </div>
        </section>

        {/* PROJEÇÃO */}
        <section className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center space-x-3 text-blue-600 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-50 rounded-2xl"><HardHat size={20} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Obra e Projeção</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
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
        <section className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center space-x-3 text-emerald-600 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-emerald-50 rounded-2xl"><Users size={20} strokeWidth={2.5} /></div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Módulo de Corretores</h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <input 
                type="checkbox" 
                id="availableForBrokers"
                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.availableForBrokers || false}
                onChange={(e) => handleChange('availableForBrokers', e.target.checked)}
              />
              <label htmlFor="availableForBrokers" className="text-sm font-bold text-slate-700 cursor-pointer">Disponível para Corretores</label>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="flex-1">
                <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Descrição Comercial</label>
                <textarea 
                  className="w-full bg-slate-50 text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400 min-h-[120px]"
                  placeholder="Descrição completa para os corretores..."
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Benfeitorias Realizadas</label>
                <textarea 
                  className="w-full bg-slate-50 text-slate-900 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400 min-h-[100px]"
                  placeholder="Liste as melhorias feitas no imóvel..."
                  value={formData.improvements || ''}
                  onChange={(e) => handleChange('improvements', e.target.value)}
                />
              </div>
              <InputField label="Localização Aproximada" path="locationApprox" type="text" placeholder="Ex: Próximo ao metrô Moema" value={formData.locationApprox} onChange={handleChange} fullWidth />
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
          className="hidden sm:flex bg-white/90 backdrop-blur-xl border border-slate-200 px-8 py-4 rounded-[24px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all shadow-2xl hover:bg-white items-center gap-2"
        >
          <X size={18} />
          <span>Descartar</span>
        </button>
        <button 
          type="button"
          onClick={() => {
            if (formRef.current) formRef.current.requestSubmit();
          }}
          className="bg-blue-600 text-white px-8 sm:px-12 py-5 rounded-[24px] font-black text-sm sm:text-base shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center space-x-3 uppercase tracking-widest border border-blue-500/20"
        >
          <Save size={22} strokeWidth={2.5} />
          <span>Salvar Ativo</span>
        </button>
      </motion.div>
    </>
  );
};

export default PropertyForm;
