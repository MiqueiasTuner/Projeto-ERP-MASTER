
import React, { useState, useMemo } from 'react';
import { Search, MapPin, Maximize, Home, Building2, ArrowRight, Eye, Info, Filter } from 'lucide-react';
import { Property, PropertyStatus, CommercialStatus } from '../../types';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils';
import { CommercialService } from '../../src/services/CommercialService';

const BrokerProperties = ({ properties }: { properties: Property[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('Todos');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 5000000 });

  const commercialProperties = useMemo(() => {
    return CommercialService.getCommercialProperties(properties)
      .filter(p => p.commercialStatus === CommercialStatus.DISPONIVEL);
  }, [properties]);

  const filteredProperties = commercialProperties.filter(p => {
    const matchesSearch = 
      p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesNeighborhood = neighborhoodFilter === 'Todos' || p.neighborhood === neighborhoodFilter;
    const matchesPrice = p.salePrice >= priceRange.min && p.salePrice <= priceRange.max;
    
    return matchesSearch && matchesNeighborhood && matchesPrice;
  });

  const neighborhoods: string[] = ['Todos', ...Array.from(new Set(commercialProperties.map(p => p.neighborhood)))];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-header)] tracking-tight">Vitrine de Imóveis</h2>
          <p className="text-[var(--text-muted)] font-medium">Ativos exclusivos disponíveis para sua carteira de clientes.</p>
        </div>
        <div className="bg-[var(--accent)] text-[var(--accent-text)] px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-yellow-500/20">
          <Building2 size={20} />
          <span className="text-sm font-black uppercase tracking-widest">{commercialProperties.length} Disponíveis</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border)] shadow-sm flex items-center space-x-4">
          <Search className="text-[var(--text-muted)] ml-2" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cidade, bairro ou título..."
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-main)] font-medium placeholder:text-[var(--text-muted)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border)] shadow-sm flex items-center space-x-4">
          <MapPin className="text-[var(--text-muted)]" size={18} />
          <select 
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-main)] font-medium cursor-pointer"
            value={neighborhoodFilter}
            onChange={(e) => setNeighborhoodFilter(e.target.value)}
          >
            {neighborhoods.map(n => <option key={n} value={n} className="bg-[var(--bg-card)]">{n}</option>)}
          </select>
        </div>

        <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border)] shadow-sm flex items-center space-x-4">
          <Filter className="text-[var(--text-muted)]" size={18} />
          <div className="flex-1 flex flex-col">
            <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Preço Máximo</span>
            <select 
              className="bg-transparent border-none outline-none text-[var(--text-main)] font-medium cursor-pointer text-xs"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
            >
              <option value={500000} className="bg-[var(--bg-card)]">Até R$ 500k</option>
              <option value={1000000} className="bg-[var(--bg-card)]">Até R$ 1M</option>
              <option value={2000000} className="bg-[var(--bg-card)]">Até R$ 2M</option>
              <option value={5000000} className="bg-[var(--bg-card)]">Até R$ 5M</option>
              <option value={10000000} className="bg-[var(--bg-card)]">Ilimitado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProperties.map(property => (
          <div key={property.id} className="bg-[var(--bg-card)] rounded-[40px] border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="relative h-64 overflow-hidden">
              <img 
                src={property.images[0] || "https://picsum.photos/seed/property/800/600"} 
                alt={property.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-[var(--bg-card)]/90 backdrop-blur-md text-[var(--text-header)] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-[var(--border)]">
                  {property.commercialStatus}
                </span>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-black text-[var(--text-header)] leading-tight mb-2 line-clamp-2">{property.title}</h3>
                <div className="flex items-center text-[var(--text-muted)] space-x-2">
                  <MapPin size={14} />
                  <span className="text-xs font-bold uppercase tracking-widest">{property.neighborhood}, {property.city}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)]">
                  <div className="flex items-center space-x-2 text-[var(--text-muted)] mb-1">
                    <Maximize size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Área</span>
                  </div>
                  <p className="text-sm font-black text-[var(--text-header)]">{property.salePrice > 0 ? 'Pronto' : 'Em breve'}</p>
                </div>
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)]">
                  <div className="flex items-center space-x-2 text-[var(--text-muted)] mb-1">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Valor</span>
                  </div>
                  <p className="text-sm font-black text-[var(--accent)]">{formatCurrency(property.salePrice)}</p>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-[var(--border)] flex items-center justify-between">
                <Link 
                  to={`/corretor/imovel/${property.id}`}
                  className="flex-1 bg-[var(--accent)] text-[var(--accent-text)] py-4 rounded-2xl font-black text-xs hover:opacity-90 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest"
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
            <div className="w-20 h-20 bg-[var(--bg-card)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--border)]">
              <Home size={32} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-black text-[var(--text-header)] mb-2">Nenhum imóvel encontrado</h3>
            <p className="text-[var(--text-muted)] font-medium">Tente ajustar seus filtros ou busca.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrokerProperties;
