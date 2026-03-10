
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Maximize, Home, Building2, Info, 
  CheckCircle2, Share2, Download, MessageSquare, Plus, X,
  Phone, Mail, User, FileText, Send
} from 'lucide-react';
import { Property, Lead, LeadStatus, UserAccount } from '../../types';
import { formatCurrency } from '../../utils';

const BrokerPropertyDetails = ({ properties, onAddLead, currentUser }: { 
  properties: Property[], 
  onAddLead: (l: Lead) => void,
  currentUser: UserAccount
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const property = properties.find(p => p.id === id);
  
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [leadFormData, setLeadFormData] = useState<Partial<Lead>>({
    name: '',
    phone: '',
    email: '',
    city: '',
    interestType: 'Compra',
    observations: ''
  });

  if (!property) return (
    <div className="py-20 text-center">
      <h3 className="text-xl font-black text-slate-900 mb-2">Imóvel não encontrado</h3>
      <button onClick={() => navigate(-1)} className="text-blue-600 font-bold hover:underline">Voltar</button>
    </div>
  );

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddLead({
      ...leadFormData,
      id: Math.random().toString(36).substr(2, 9),
      propertyId: property.id,
      brokerId: currentUser.id,
      status: LeadStatus.RECEIVED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Lead);
    setIsLeadModalOpen(false);
    setLeadFormData({
      name: '',
      phone: '',
      email: '',
      city: '',
      interestType: 'Compra',
      observations: ''
    });
    alert('Lead registrado com sucesso!');
  };

  const images = property.images.length > 0 ? property.images : ["https://picsum.photos/seed/property/1200/800"];

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-all font-black uppercase tracking-widest text-xs">
          <ArrowLeft size={18} />
          <span>Voltar ao Catálogo</span>
        </button>
        <div className="flex space-x-2">
          <button className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all shadow-sm"><Share2 size={20} /></button>
          <button className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all shadow-sm"><Download size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 relative h-[400px] sm:h-[500px] rounded-[40px] overflow-hidden shadow-2xl border border-slate-200 order-1 md:order-2">
              <img 
                src={images[activeImage]} 
                alt={property.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="bg-white/90 backdrop-blur-md text-slate-900 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl">
                  {property.type}
                </span>
                <span className="bg-emerald-500 text-white px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl">
                  {property.status}
                </span>
              </div>
            </div>
            
            <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:max-h-[500px] pb-2 md:pb-0 md:pr-2 custom-scrollbar order-2 md:order-1 shrink-0">
              {images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${activeImage === idx ? 'border-blue-500 scale-95 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">{property.title || `${property.type} em ${property.neighborhood}`}</h1>
              <div className="flex items-center text-slate-400 space-x-3">
                <MapPin size={18} />
                <span className="text-sm font-bold uppercase tracking-widest">{property.address}, {property.neighborhood}, {property.city}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-8 border-y border-slate-50">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área Total</p>
                <div className="flex items-center space-x-2 text-slate-900">
                  <Maximize size={16} className="text-blue-500" />
                  <span className="font-black">{property.sizeM2} m²</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</p>
                <div className="flex items-center space-x-2 text-slate-900">
                  <Home size={16} className="text-blue-500" />
                  <span className="font-black">{property.type}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</p>
                <div className="flex items-center space-x-2 text-slate-900">
                  <Building2 size={16} className="text-blue-500" />
                  <span className="font-black">{property.city}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor de Venda</p>
                <div className="flex items-center space-x-2 text-emerald-600">
                  <Info size={16} />
                  <span className="font-black">{formatCurrency(property.salePrice || 0)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Descrição do Imóvel</h4>
                <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {property.description || 'Nenhuma descrição detalhada disponível para este imóvel.'}
                </p>
              </div>

              {property.improvements && (
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Benfeitorias Realizadas</h4>
                  <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                    <p className="text-emerald-900 leading-relaxed font-medium whitespace-pre-wrap">
                      {property.improvements}
                    </p>
                  </div>
                </div>
              )}

              {property.locationApprox && (
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Localização Aproximada</h4>
                  <div className="flex items-center space-x-3 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <MapPin size={18} className="text-blue-500" />
                    <span className="font-medium">{property.locationApprox}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Action Card */}
          <div className="bg-[#0A192F] p-8 rounded-[40px] shadow-2xl sticky top-24">
            <h3 className="text-xl font-black text-white tracking-tight mb-2">Interessado?</h3>
            <p className="text-slate-400 font-medium mb-8 text-sm">Registre um lead para este imóvel e inicie a negociação.</p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3 text-white/80">
                <CheckCircle2 size={18} className="text-[#FFD700]" />
                <span className="text-xs font-bold uppercase tracking-widest">Reserva Prioritária</span>
              </div>
              <div className="flex items-center space-x-3 text-white/80">
                <CheckCircle2 size={18} className="text-[#FFD700]" />
                <span className="text-xs font-bold uppercase tracking-widest">Acompanhamento Real-time</span>
              </div>
              <div className="flex items-center space-x-3 text-white/80">
                <CheckCircle2 size={18} className="text-[#FFD700]" />
                <span className="text-xs font-bold uppercase tracking-widest">Suporte Comercial</span>
              </div>
            </div>

            <button 
              onClick={() => setIsLeadModalOpen(true)}
              className="w-full bg-[#FFD700] text-[#0A192F] py-5 rounded-2xl font-black text-sm hover:bg-yellow-400 transition-all flex items-center justify-center space-x-3 uppercase tracking-widest shadow-xl shadow-yellow-500/10"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Registrar Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lead Modal */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Lead</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{property.title || property.neighborhood}</p>
                </div>
                <button onClick={() => setIsLeadModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Nome do Cliente</label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        placeholder="Nome completo..."
                        className="w-full bg-slate-50 text-slate-900 pl-12 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={leadFormData.name}
                        onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Telefone</label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          required
                          placeholder="(00) 00000-0000"
                          className="w-full bg-slate-50 text-slate-900 pl-12 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                          value={leadFormData.phone}
                          onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Cidade</label>
                      <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          required
                          placeholder="Cidade do cliente..."
                          className="w-full bg-slate-50 text-slate-900 pl-12 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                          value={leadFormData.city}
                          onChange={(e) => setLeadFormData({ ...leadFormData, city: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        required
                        placeholder="email@exemplo.com"
                        className="w-full bg-slate-50 text-slate-900 pl-12 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        value={leadFormData.email}
                        onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest ml-1">Observações</label>
                    <div className="relative">
                      <FileText className="absolute left-5 top-5 text-slate-400" size={18} />
                      <textarea 
                        placeholder="Alguma informação relevante?"
                        className="w-full bg-slate-50 text-slate-900 pl-12 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium min-h-[100px]"
                        value={leadFormData.observations}
                        onChange={(e) => setLeadFormData({ ...leadFormData, observations: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsLeadModalOpen(false)}
                    className="px-6 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center space-x-2 uppercase tracking-widest"
                  >
                    <Send size={18} />
                    <span>Enviar Lead</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerPropertyDetails;
