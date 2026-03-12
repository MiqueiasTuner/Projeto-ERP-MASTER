import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, addDoc, setDoc, doc, deleteDoc, query, where, onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Auction, AuctionStatus, Bid, PropertyType, UserAccount, Property, PropertyStatus 
} from '../types';
import { 
  Plus, Search, Gavel, Calendar, MapPin, ExternalLink, 
  TrendingUp, Trash2, Edit3, CheckCircle2, XCircle, Clock,
  DollarSign, Building2, Filter, MoreVertical, FileDown, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate, formatBRLMask, parseBRLToFloat } from '../utils';
import CustomDatePicker from '../src/components/CustomDatePicker';
import { reportService } from '../ReportService';

interface AuctionPageProps {
  auctions: Auction[];
  properties: Property[];
  currentUser: UserAccount;
}

const AuctionPage: React.FC<AuctionPageProps> = ({ auctions, properties, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AuctionStatus | 'all'>('all');
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [auctionToWon, setAuctionToWon] = useState<Auction | null>(null);
  const [isProcessingWon, setIsProcessingWon] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [auctionToDelete, setAuctionToDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      await reportService.generateAuctionReport(auctions);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredAuctions = useMemo(() => {
    return auctions.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [auctions, searchTerm, statusFilter]);

  const [auctionDate, setAuctionDate] = useState<string>('');

  useEffect(() => {
    if (editingAuction) {
      setAuctionDate(editingAuction.date);
    } else {
      setAuctionDate('');
    }
  }, [editingAuction, isModalOpen]);

  const handleSaveAuction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const auctionData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      link: formData.get('link') as string,
      date: auctionDate,
      status: (formData.get('status') as AuctionStatus) || AuctionStatus.OPEN,
      initialPrice: parseBRLToFloat(formData.get('initialPrice') as string) || 0,
      myMaxBid: parseBRLToFloat(formData.get('myMaxBid') as string) || 0,
      propertyType: formData.get('propertyType') as PropertyType,
      city: formData.get('city') as string,
      neighborhood: formData.get('neighborhood') as string,
      auctioneer: formData.get('auctioneer') as string,
      createdAt: new Date().toISOString(),
      bids: editingAuction?.bids || []
    };

    try {
      if (editingAuction) {
        await setDoc(doc(db, 'auctions', editingAuction.id), auctionData as any, { merge: true });
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
      await setDoc(doc(db, 'auctions', selectedAuction.id), {
        bids: updatedBids,
        currentBid: currentBid
      }, { merge: true });
      setIsBidModalOpen(false);
      setSelectedAuction(null);
      setBidAmount(0);
    } catch (error) {
      console.error("Error placing bid:", error);
    }
  };

  const handleMarkAsWon = async () => {
    if (!auctionToWon) return;
    setIsProcessingWon(true);

    try {
      // 1. Update auction status
      await setDoc(doc(db, 'auctions', auctionToWon.id), { status: AuctionStatus.WON }, { merge: true });

      // 2. Create property
      const propertyData: Omit<Property, 'id'> = {
        title: auctionToWon.title,
        type: auctionToWon.propertyType || PropertyType.CASA,
        city: auctionToWon.city,
        neighborhood: auctionToWon.neighborhood,
        condoName: auctionToWon.title,
        address: auctionToWon.title,
        sizeM2: 0,
        status: PropertyStatus.ARREMATADO,
        acquisitionDate: new Date().toISOString().split('T')[0],
        acquisitionPrice: auctionToWon.currentBid || auctionToWon.initialPrice,
        bankValuation: (auctionToWon.currentBid || auctionToWon.initialPrice) * 1.5,
        auctioneerCommission: 0,
        images: [],
        itbiPaid: false,
        registroPaid: false
      };

      await addDoc(collection(db, 'properties'), propertyData);
      setSuccessMessage("Leilão arrematado com sucesso! Imóvel criado na aba de Ativos.");
      setTimeout(() => setSuccessMessage(null), 5000);
      setIsConfirmModalOpen(false);
      setAuctionToWon(null);
    } catch (error) {
      console.error("Error marking as won:", error);
    } finally {
      setIsProcessingWon(false);
    }
  };

  const handleDeleteAuction = async () => {
    if (!auctionToDelete) return;
    try {
      await deleteDoc(doc(db, 'auctions', auctionToDelete));
      setIsDeleteModalOpen(false);
      setAuctionToDelete(null);
    } catch (error) {
      console.error("Error deleting auction:", error);
    }
  };

  const handleUpdateStatus = async (auctionId: string, newStatus: AuctionStatus) => {
    try {
      await setDoc(doc(db, 'auctions', auctionId), { status: newStatus }, { merge: true });
    } catch (error) {
      console.error("Error updating auction status:", error);
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

  const inputClass = "w-full bg-slate-50 text-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  return (
    <div ref={pageRef} className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Módulo de Arrematação</h2>
          <p className="text-slate-500 font-medium">Busca, lances e gestão de leilões imobiliários.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="bg-white text-slate-700 px-6 py-4 rounded-2xl font-black text-sm border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
            <span>{isExporting ? 'Exportando...' : 'PDF'}</span>
          </button>
          <button 
            onClick={() => { setEditingAuction(null); setIsModalOpen(true); }}
            className="bg-slate-900 text-white p-4 px-8 rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest"
          >
            <Plus size={20} />
            <span>Novo Leilão</span>
          </button>
        </div>
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
                <div className="relative group/status">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(auction.status)} cursor-pointer`}>
                    {auction.status}
                  </span>
                  <div className="absolute top-full left-0 mt-1 hidden group-hover/status:block z-10 bg-white border border-slate-200 rounded-xl shadow-xl p-1 min-w-[140px]">
                    {Object.values(AuctionStatus).map(s => (
                      <button
                        key={s}
                        onClick={() => handleUpdateStatus(auction.id, s)}
                        className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${auction.status === s ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        Mudar para {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { setEditingAuction(auction); setIsModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => { setAuctionToDelete(auction.id); setIsDeleteModalOpen(true); }}
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
                  onClick={() => { setAuctionToWon(auction); setIsConfirmModalOpen(true); }}
                  className="bg-emerald-500 text-white p-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* New/Edit Auction Drawer */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999]">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setIsModalOpen(false); setEditingAuction(null); }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {editingAuction ? 'Editar Leilão' : 'Novo Leilão'}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium">Preencha os dados do edital.</p>
                  </div>
                  <button 
                    onClick={() => { setIsModalOpen(false); setEditingAuction(null); }} 
                    className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                <form onSubmit={handleSaveAuction} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Título / Endereço</label>
                      <input name="title" defaultValue={editingAuction?.title} required className={inputClass} placeholder="Ex: Apartamento em Moema - 2 Quartos" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                      <input name="city" defaultValue={editingAuction?.city} required className={inputClass} placeholder="Ex: São Paulo" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                      <input name="neighborhood" defaultValue={editingAuction?.neighborhood} required className={inputClass} placeholder="Ex: Moema" />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Leilão</label>
                      <CustomDatePicker 
                        selected={auctionDate ? new Date(auctionDate + 'T00:00:00') : null}
                        onChange={(date) => setAuctionDate(date ? date.toISOString().split('T')[0] : '')}
                        placeholderText="DD/MM/AAAA"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Imóvel</label>
                      <select name="propertyType" defaultValue={editingAuction?.propertyType} className={inputClass}>
                        {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Status do Leilão</label>
                      <select name="status" defaultValue={editingAuction?.status || AuctionStatus.OPEN} className={inputClass}>
                        {Object.values(AuctionStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Inicial (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                        <input 
                          name="initialPrice" 
                          type="text" 
                          defaultValue={formatBRLMask(editingAuction?.initialPrice)} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseBRLToFloat(e.target.value);
                            e.target.value = formatBRLMask(val);
                          }}
                          required 
                          className={`${inputClass} pl-10`}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Meu Lance Máximo (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                        <input 
                          name="myMaxBid" 
                          type="text" 
                          defaultValue={formatBRLMask(editingAuction?.myMaxBid)} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseBRLToFloat(e.target.value);
                            e.target.value = formatBRLMask(val);
                          }}
                          className={`${inputClass} pl-10`}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Link do Edital / Leiloeiro</label>
                      <input name="link" type="url" defaultValue={editingAuction?.link} className={inputClass} placeholder="https://..." />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Leiloeiro / Empresa</label>
                      <input name="auctioneer" defaultValue={editingAuction?.auctioneer} className={inputClass} placeholder="Ex: Zukerman Leilões" />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8 sticky bottom-0 bg-white border-t border-slate-100 -mx-8 px-8 pb-4">
                    <button 
                      type="button" 
                      onClick={() => { setIsModalOpen(false); setEditingAuction(null); }} 
                      className="flex-1 px-8 py-4 bg-white text-slate-400 hover:text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-8 py-4 bg-[#0A192F] text-[#FFD700] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg shadow-slate-900/20"
                    >
                      Salvar Leilão
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Success Message Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-3"
          >
            <CheckCircle2 size={20} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Won Modal */}
      {createPortal(
        <AnimatePresence>
          {isConfirmModalOpen && auctionToWon && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Confirmar Arrematação</h3>
                  <p className="text-slate-500 text-sm font-medium">
                    Deseja marcar "{auctionToWon.title}" como arrematado? Isso criará um novo imóvel no sistema.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => { setIsConfirmModalOpen(false); setAuctionToWon(null); }} 
                    disabled={isProcessingWon}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleMarkAsWon} 
                    disabled={isProcessingWon}
                    className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingWon ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Confirm Modal */}
      {createPortal(
        <AnimatePresence>
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir Leilão</h3>
                  <p className="text-slate-500 text-sm font-medium">Tem certeza que deseja excluir este leilão? Esta ação não pode ser desfeita.</p>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => { setIsDeleteModalOpen(false); setAuctionToDelete(null); }} className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button onClick={handleDeleteAuction} className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">Excluir</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Bid Modal */}
      {createPortal(
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
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400 font-black text-2xl z-10">R$</span>
                      <input 
                        type="text" 
                        value={formatBRLMask(bidAmount)}
                        onChange={(e) => setBidAmount(parseBRLToFloat(e.target.value) || 0)}
                        className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 outline-none font-black text-2xl text-center text-blue-600"
                        autoFocus
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
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
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default AuctionPage;
