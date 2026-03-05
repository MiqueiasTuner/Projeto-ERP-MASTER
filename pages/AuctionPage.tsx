import React, { useState, useMemo } from 'react';
import { 
  collection, addDoc, updateDoc, doc, deleteDoc, query, where, onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Auction, AuctionStatus, Bid, PropertyType, UserAccount, Property, PropertyStatus 
} from '../types';
import { 
  Plus, Search, Gavel, Calendar, MapPin, ExternalLink, 
  TrendingUp, Trash2, Edit3, CheckCircle2, XCircle, Clock,
  DollarSign, Building2, Filter, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate } from '../utils';

interface AuctionPageProps {
  auctions: Auction[];
  properties: Property[];
  currentUser: UserAccount;
}

const AuctionPage: React.FC<AuctionPageProps> = ({ auctions, properties, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuctionStatus | 'all'>('all');
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);

  const filteredAuctions = useMemo(() => {
    return auctions.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [auctions, searchTerm, statusFilter]);

  const handleSaveAuction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const auctionData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      link: formData.get('link') as string,
      date: formData.get('date') as string,
      status: (formData.get('status') as AuctionStatus) || AuctionStatus.OPEN,
      initialPrice: Number(formData.get('initialPrice')),
      myMaxBid: Number(formData.get('myMaxBid')),
      propertyType: formData.get('propertyType') as PropertyType,
      city: formData.get('city') as string,
      neighborhood: formData.get('neighborhood') as string,
      auctioneer: formData.get('auctioneer') as string,
      createdAt: new Date().toISOString(),
      bids: editingAuction?.bids || []
    };

    try {
      if (editingAuction) {
        await updateDoc(doc(db, 'auctions', editingAuction.id), auctionData as any);
      } else {
        await addDoc(collection(db, 'auctions'), auctionData);
      }
      setIsModalOpen(false);
      setEditingAuction(null);
    } catch (error) {
      console.error("Error saving auction:", error);
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedAuction || bidAmount <= 0) return;

    const newBid: Bid = {
      id: Math.random().toString(36).substr(2, 9),
      auctionId: selectedAuction.id,
      amount: bidAmount,
      date: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name
    };

    const updatedBids = [...(selectedAuction.bids || []), newBid];
    const currentBid = Math.max(...updatedBids.map(b => b.amount));

    try {
      await updateDoc(doc(db, 'auctions', selectedAuction.id), {
        bids: updatedBids,
        currentBid: currentBid
      });
      setIsBidModalOpen(false);
      setSelectedAuction(null);
      setBidAmount(0);
    } catch (error) {
      console.error("Error placing bid:", error);
    }
  };

  const handleMarkAsWon = async (auction: Auction) => {
    if (!window.confirm("Deseja marcar este leilão como ARREMATADO e criar um novo imóvel no sistema?")) return;

    try {
      // 1. Update auction status
      await updateDoc(doc(db, 'auctions', auction.id), { status: AuctionStatus.WON });

      // 2. Create property
      const propertyData: Omit<Property, 'id'> = {
        type: auction.propertyType || PropertyType.CASA,
        city: auction.city,
        neighborhood: auction.neighborhood,
        address: auction.title, // Use title as address placeholder
        sizeM2: 0,
        status: PropertyStatus.ARREMATADO,
        acquisitionDate: new Date().toISOString().split('T')[0],
        acquisitionPrice: auction.currentBid || auction.initialPrice,
        bankValuation: (auction.currentBid || auction.initialPrice) * 1.5,
        auctioneerCommission: (auction.currentBid || auction.initialPrice) * 0.05,
        images: [],
        itbiPaid: false,
        registroPaid: false
      };

      await addDoc(collection(db, 'properties'), propertyData);
      alert("Leilão arrematado com sucesso! Imóvel criado na aba de Ativos.");
    } catch (error) {
      console.error("Error marking as won:", error);
    }
  };

  const handleDeleteAuction = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este leilão?")) return;
    try {
      await deleteDoc(doc(db, 'auctions', id));
    } catch (error) {
      console.error("Error deleting auction:", error);
    }
  };

  const getStatusColor = (status: AuctionStatus) => {
    switch (status) {
      case AuctionStatus.OPEN: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case AuctionStatus.WON: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case AuctionStatus.LOST: return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case AuctionStatus.FINISHED: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Módulo de Arrematação</h2>
          <p className="text-slate-500 font-medium">Busca, lances e gestão de leilões imobiliários.</p>
        </div>
        <button 
          onClick={() => { setEditingAuction(null); setIsModalOpen(true); }}
          className="bg-slate-900 text-white p-4 px-8 rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest"
        >
          <Plus size={20} />
          <span>Novo Leilão</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por título, cidade ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-medium text-slate-600 shadow-sm"
          />
        </div>
        <div className="md:col-span-4">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600 shadow-sm appearance-none"
          >
            <option value="all">Todos os Status</option>
            {Object.values(AuctionStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Auction Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAuctions.map((auction) => (
          <motion.div 
            layout
            key={auction.id}
            className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
          >
            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(auction.status)}`}>
                  {auction.status}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { setEditingAuction(auction); setIsModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteAuction(auction.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                  {auction.title}
                </h3>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                  <MapPin size={14} />
                  <span>{auction.neighborhood}, {auction.city}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Preço Inicial</span>
                  <span className="text-sm font-black text-slate-900">{formatCurrency(auction.initialPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Lance Atual</span>
                  <span className="text-sm font-black text-blue-600">{formatCurrency(auction.currentBid || 0)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                    <Calendar size={14} />
                    <span>{formatDate(auction.date)}</span>
                  </div>
                  {auction.myMaxBid && (
                    <div className="text-slate-400 font-bold">
                      Limite: <span className="text-slate-900">{formatCurrency(auction.myMaxBid)}</span>
                    </div>
                  )}
                </div>
                {auction.link && (
                  <a 
                    href={auction.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest pt-2"
                  >
                    <ExternalLink size={14} />
                    Ver no Site do Leiloeiro
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => { setSelectedAuction(auction); setIsBidModalOpen(true); }}
                disabled={auction.status !== AuctionStatus.OPEN}
                className="flex-1 bg-white border border-slate-200 text-slate-900 p-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Gavel size={14} />
                Dar Lance
              </button>
              {auction.status === AuctionStatus.OPEN && (
                <button 
                  onClick={() => handleMarkAsWon(auction)}
                  className="bg-emerald-500 text-white p-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* New/Edit Auction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingAuction ? 'Editar Leilão' : 'Novo Leilão'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">Preencha os dados do edital.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveAuction} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título / Endereço</label>
                    <input name="title" defaultValue={editingAuction?.title} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600" />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cidade</label>
                    <input name="city" defaultValue={editingAuction?.city} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600" />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bairro</label>
                    <input name="neighborhood" defaultValue={editingAuction?.neighborhood} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data do Leilão</label>
                    <input name="date" type="date" defaultValue={editingAuction?.date} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Imóvel</label>
                    <select name="propertyType" defaultValue={editingAuction?.propertyType} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600">
                      {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preço Inicial (R$)</label>
                    <input name="initialPrice" type="number" step="0.01" defaultValue={editingAuction?.initialPrice} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Meu Lance Máximo (R$)</label>
                    <input name="myMaxBid" type="number" step="0.01" defaultValue={editingAuction?.myMaxBid} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Link do Edital / Leiloeiro</label>
                    <input name="link" type="url" defaultValue={editingAuction?.link} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Leiloeiro / Empresa</label>
                    <input name="auctioneer" defaultValue={editingAuction?.auctioneer} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 outline-none font-bold text-slate-600" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Salvar Leilão</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bid Modal */}
      <AnimatePresence>
        {isBidModalOpen && selectedAuction && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Gavel size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Registrar Lance</h3>
                <p className="text-slate-500 text-sm font-medium">{selectedAuction.title}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor do Lance (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 outline-none font-black text-2xl text-center text-blue-600"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 font-bold mt-2 text-center uppercase tracking-widest">
                    Lance Atual: {formatCurrency(selectedAuction.currentBid || 0)}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setIsBidModalOpen(false)} className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button onClick={handlePlaceBid} className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">Confirmar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuctionPage;
