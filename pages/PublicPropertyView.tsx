import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, BedDouble, Bath, Car, Maximize, 
  CheckCircle2, MessageCircle, Share2, ChevronLeft, 
  ChevronRight, Home, Info, Calendar, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface PublicPropertyViewProps {
  properties: Property[];
}

const PublicPropertyView: React.FC<PublicPropertyViewProps> = ({ properties }) => {
  const { id } = useParams<{ id: string }>();
  const property = useMemo(() => properties.find(p => p.id === id), [properties, id]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <Home size={48} className="text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Imóvel não encontrado</h1>
        <p className="text-slate-500 mb-6">O link pode estar quebrado ou o imóvel não está mais disponível.</p>
        <Link to="/" className="px-6 py-2 bg-yellow-500 text-white rounded-full font-bold hover:bg-yellow-600 transition-colors">
          Voltar ao Início
        </Link>
      </div>
    );
  }

  const images = property.images && property.images.length > 0 
    ? property.images 
    : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"];

  const whatsappNumber = "556493126250";
  const whatsappMessage = encodeURIComponent(`Olá Jane, vi o imóvel "${property.title}" no site e gostaria de mais informações.`);
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-yellow-200">
      {/* Hero Section with Image Gallery */}
      <section className="relative h-[70vh] lg:h-[85vh] bg-slate-900 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeImageIndex}
            src={images[activeImageIndex]}
            alt={property.title}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Gallery Controls */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all z-10"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all z-10"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                {property.type || 'Imóvel'}
              </span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                {property.status}
              </span>
            </div>
            <h1 className="text-4xl lg:text-7xl font-black text-white mb-4 tracking-tighter leading-none">
              {property.title}
            </h1>
            <div className="flex items-center text-white/80 gap-2 mb-8">
              <MapPin size={18} className="text-yellow-500" />
              <span className="text-sm lg:text-lg font-medium">
                {property.neighborhood}, {property.city}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-20">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Key Features Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="flex flex-col items-center text-center gap-2">
              <BedDouble className="text-yellow-600" size={24} />
              <span className="text-xl font-black">{property.rooms || 0}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quartos</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Bath className="text-yellow-600" size={24} />
              <span className="text-xl font-black">{property.bathrooms || 0}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banheiros</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Car className="text-yellow-600" size={24} />
              <span className="text-xl font-black">{property.garageSpaces || 0}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vagas</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Maximize className="text-yellow-600" size={24} />
              <span className="text-xl font-black">{property.sizeM2 || 0}m²</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Área Total</span>
            </div>
          </div>

          {/* Description */}
          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
              <Info className="text-yellow-500" size={24} />
              Sobre o Imóvel
            </h2>
            <div className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
              {property.description || "Nenhuma descrição disponível para este imóvel."}
            </div>
          </section>

          {/* Features & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {property.features && property.features.length > 0 && (
              <section>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Destaques</h3>
                <div className="grid grid-cols-1 gap-3">
                  {property.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-slate-700 font-medium">
                      <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {property.improvements && (
              <section>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Benfeitorias</h3>
                <div className="text-slate-700 font-medium leading-relaxed">
                  {property.improvements}
                </div>
              </section>
            )}
          </div>

          {/* Complex Features */}
          {property.complexFeatures && property.complexFeatures.length > 0 && (
            <section className="p-8 bg-slate-900 rounded-3xl text-white">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-yellow-500 mb-6">Infraestrutura do Condomínio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property.complexFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-white/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    {feat}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Sticky Sidebar */}
        <div className="space-y-8">
          <div className="sticky top-24 space-y-6">
            
            {/* Price Card */}
            <div className="p-8 bg-white rounded-3xl border-2 border-slate-100 shadow-xl shadow-slate-200/50">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Valor de Venda</span>
              <div className="text-4xl font-black text-slate-900 mb-6">
                {property.salePrice ? formatCurrency(property.salePrice) : 'Sob consulta'}
              </div>
              
              <div className="space-y-4">
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <MessageCircle size={20} />
                  Falar com Jane
                </a>
                
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copiado para a área de transferência!");
                  }}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
                >
                  <Share2 size={20} />
                  Compartilhar
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disponível desde</p>
                  <p className="font-bold text-slate-700">{formatDate(property.acquisitionDate || new Date().toISOString())}</p>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <MapPin size={16} />
                Localização
              </h3>
              <p className="text-slate-700 font-bold mb-2">{property.address}</p>
              <p className="text-slate-500 text-sm">{property.neighborhood}, {property.city}</p>
              {property.locationApprox && (
                <div className="mt-4 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                  <p className="text-xs text-yellow-700 font-medium">
                    {property.locationApprox}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-20 px-6 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white p-2 rounded-xl">
              <Home className="text-slate-900" size={24} />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter">
              Sintese<span className="text-yellow-500">ERP</span>
            </span>
          </div>
          <p className="text-slate-400 max-w-md mb-12">
            Encontre o imóvel dos seus sonhos com a transparência e agilidade que você merece.
          </p>
          <div className="flex gap-6">
            <a href={whatsappLink} className="text-white/60 hover:text-white transition-colors">WhatsApp</a>
            <a href="#" className="text-white/60 hover:text-white transition-colors">Instagram</a>
            <a href="#" className="text-white/60 hover:text-white transition-colors">Facebook</a>
          </div>
          <div className="mt-20 pt-8 border-t border-white/5 w-full">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
              © 2026 Sintese ERP. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicPropertyView;
