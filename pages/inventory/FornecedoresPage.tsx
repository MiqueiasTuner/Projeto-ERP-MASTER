
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Papa from 'papaparse';
import { Truck, Plus, Search, Trash2, Edit, Phone, FileText, X, XCircle, FileUp, FileDown, Loader2 } from 'lucide-react';
import { Supplier, UserAccount } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FornecedoresPageProps {
  suppliers: Supplier[];
  onAddSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  currentUser: UserAccount;
}

const FornecedoresPage = ({ suppliers, onAddSupplier, onDeleteSupplier, currentUser }: FornecedoresPageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    if (!pageRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC',
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const style = styleTags[i];
            if (style.innerHTML.includes('oklch')) {
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, '#000');
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgScaledWidth, imgScaledHeight);
      pdf.save(`relatorio-fornecedores-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedSuppliers = results.data.map((row: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: row.nome || row.name || '',
          cnpj: row.cnpj || '',
          category: row.categoria || row.category || 'Geral',
          phone: row.telefone || row.phone || '',
        }));

        importedSuppliers.forEach(s => {
          if (s.name) onAddSupplier(s as Supplier);
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert(`${importedSuppliers.length} fornecedores importados com sucesso!`);
      },
      error: (error) => {
        console.error("CSV Error:", error);
        alert("Erro ao processar CSV. Verifique o formato.");
      }
    });
  };

  const filteredSuppliers = (suppliers || []).filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.cnpj?.includes(searchTerm) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newSupplier: Supplier = {
      id: editingSupplier?.id || Math.random().toString(36).substr(2, 9),
      organizationId: currentUser.organizationId || '',
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      cnpj: (form.elements.namedItem('cnpj') as HTMLInputElement).value,
      category: (form.elements.namedItem('category') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
    };
    onAddSupplier(newSupplier);
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setIsModalOpen(true);
  };

  const inputClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-3.5 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-[var(--text-muted)]";

  return (
    <div ref={pageRef} className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-[var(--text-header)] tracking-tight">Fornecedores</h2>
          <p className="text-[var(--text-muted)] font-medium text-sm">Gestão de parceiros e prestadores de serviço.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="bg-[var(--bg-card)] text-[var(--text-main)] px-6 py-3.5 rounded-[24px] font-black border border-[var(--border)] flex items-center gap-3 hover:bg-[var(--bg-card-alt)] transition-all shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
            <span className="text-sm">{isExporting ? 'Exportando...' : 'PDF'}</span>
          </button>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportCSV}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[var(--bg-card)] text-[var(--text-main)] px-6 py-3.5 rounded-[24px] font-black border border-[var(--border)] flex items-center gap-3 hover:bg-[var(--bg-card-alt)] transition-all shadow-sm"
          >
            <FileUp size={20} strokeWidth={3} /> <span className="text-sm">Importar CSV</span>
          </button>
          <button 
            onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
            className="bg-[var(--bg-header)] text-[var(--text-header)] px-8 py-3.5 rounded-[24px] font-black flex items-center gap-3 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all shadow-2xl shadow-[var(--bg-header)]/20"
          >
            <Plus size={20} strokeWidth={3} /> <span className="text-sm">Novo Fornecedor</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, CNPJ ou categoria técnica..." 
            className="w-full pl-14 pr-6 py-4.5 bg-[var(--bg-card-alt)] text-[var(--text-main)] border border-[var(--border)] rounded-[20px] focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-muted)] font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredSuppliers.map(s => (
          <div key={s.id} className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm hover:shadow-2xl hover:shadow-[var(--accent)]/5 hover:-translate-y-1.5 transition-all group flex items-start justify-between">
            <div className="flex gap-6">
              <div className="p-5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] rounded-[24px] transition-colors shadow-inner">
                <Truck size={32} />
              </div>
              <div>
                <h3 className="font-black text-[var(--text-header)] text-xl leading-tight mb-1 tracking-tight">{s.name}</h3>
                <p className="text-[10px] font-black text-[var(--accent)] uppercase mb-4 tracking-[0.2em]">{s.category}</p>
                <div className="space-y-2">
                  <div className="flex items-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    <FileText size={14} className="mr-2 text-[var(--text-muted)]/50" /> {s.cnpj || 'Sem CNPJ'}
                  </div>
                  <div className="flex items-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    <Phone size={14} className="mr-2 text-[var(--text-muted)]/50" /> {s.phone}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => handleEdit(s)} className="p-3 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl transition-all"><Edit size={18} /></button>
              <button onClick={() => onDeleteSupplier(s.id)} className="p-3 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {filteredSuppliers.length === 0 && (
          <div className="lg:col-span-2 py-20 text-center text-[var(--text-muted)] italic font-black uppercase tracking-widest text-xs bg-[var(--bg-card-alt)] rounded-[40px] border-2 border-dashed border-[var(--border)]">
            Nenhum fornecedor encontrado.
          </div>
        )}
      </div>

      {/* New Fornecedor Drawer */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setIsModalOpen(false); setEditingSupplier(null); }}
                className="fixed inset-0 bg-[var(--bg-header)]/40 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--bg-card)] shadow-2xl z-[110] flex flex-col border-l border-[var(--border)]"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">{editingSupplier ? 'Atualize os dados do parceiro.' : 'Cadastre parceiros estratégicos.'}</p>
                  </div>
                  <button 
                    onClick={() => { setIsModalOpen(false); setEditingSupplier(null); }}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Razão Social / Nome Fantasia</label>
                    <input required name="name" type="text" placeholder="Ex: Silva Construções Ltda" className={inputClass} defaultValue={editingSupplier?.name || ''} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">CNPJ ou CPF</label>
                    <input name="cnpj" type="text" placeholder="00.000.000/0001-00" className={inputClass} defaultValue={editingSupplier?.cnpj || ''} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Categoria Técnica</label>
                    <input required name="category" type="text" placeholder="Ex: Hidráulica" className={inputClass} defaultValue={editingSupplier?.category || ''} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Contato / Celular</label>
                    <input required name="phone" type="text" placeholder="(11) 99999-9999" className={inputClass} defaultValue={editingSupplier?.phone || ''} />
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => { setIsModalOpen(false); setEditingSupplier(null); }}
                      className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-[var(--bg-header)] text-[var(--text-header)] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[var(--bg-header)]/20 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all"
                    >
                      {editingSupplier ? 'Salvar Alterações' : 'Salvar Fornecedor'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default FornecedoresPage;
