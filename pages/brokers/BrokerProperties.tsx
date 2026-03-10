
import React, { useState } from 'react';
import { Search, MapPin, Maximize, Home, Building2, ArrowRight, Eye, Info } from 'lucide-react';
import { Property, PropertyStatus } from '../../types';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils';

const BrokerProperties = ({ properties }: { properties: Property[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');

  const availableProperties = properties.filter(p => 
    p.availableForBrokers && 
    (p.status === PropertyStatus.A_VENDA || p.status === PropertyStatus.EM_REFORMA)
  );

  const filteredProperties = availableProperties.filter(p => {
    const matchesSearch = 
      p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'Todos' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = ['Todos', ...new Set(availableProperties.map(p => p.type))];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Catálogo de Imóveis</h2>
        <p className="text-slate-500 font-medium">Explore os ativos disponíveis para venda e gere novos leads.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <Search className="text-slate-400 ml-2" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cidade, bairro ou título..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 font-medium placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <select 
            className="bg-transparent border-none outline-none text-slate-900 font-medium cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProperties.map(property => (
          <div key={property.id} className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="relative h-64 overflow-hidden">
              <img 
                src={property.images[0] || "https://picsum.photos/seed/property/800/600"} 
                alt={property.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {property.type}
                </span>
                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                  property.status === PropertyStatus.A_VENDA ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {property.status}
                </span>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 line-clamp-2">{property.title || `${property.type} em ${property.neighborhood}`}</h3>
                <div className="flex items-center text-slate-400 space-x-2">
                  <MapPin size={14} />
                  <span className="text-xs font-bold uppercase tracking-widest">{property.neighborhood}, {property.city}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-2 text-slate-400 mb-1">
                    <Maximize size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Área</span>
                  </div>
                  <p className="text-sm font-black text-slate-900">{property.sizeM2} m²</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-2 text-slate-400 mb-1">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Valor</span>
                  </div>
                  <p className="text-sm font-black text-emerald-600">{formatCurrency(property.salePrice || 0)}</p>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <Link 
                  to={`/corretor/imovel/${property.id}`}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
                >
                  <span>Ver Ficha Comercial</span>
                  <ArrowRight size={16} strokeWidth={3} />
                </Link>
              </div>
            </div>
          </div>
        ))}
        {filteredProperties.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Nenhum imóvel encontrado</h3>
            <p className="text-slate-500 font-medium">Tente ajustar seus filtros ou busca.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrokerProperties;
