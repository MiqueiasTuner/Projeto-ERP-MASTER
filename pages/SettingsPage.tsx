
import React, { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, Database, Trash2, DatabaseZap, CheckCircle2, AlertCircle, Save, Building } from 'lucide-react';
import { seedInitialData } from '../lib/seedService';
import { UserAccount } from '../types';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const SettingsPage = ({ currentUser }: { currentUser: UserAccount }) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    email: currentUser.email || '',
    role: currentUser.role || '',
    photoUrl: currentUser.photoUrl || '',
    companyLogo: currentUser.companyLogo || ''
  });

  useEffect(() => {
    setFormData({
      name: currentUser.name || '',
      email: currentUser.email || '',
      role: currentUser.role || '',
      photoUrl: currentUser.photoUrl || '',
      companyLogo: currentUser.companyLogo || ''
    });
  }, [currentUser]);

  const handleSeed = async () => {
    if (!confirm('Deseja popular o banco de dados com dados de exemplo? Isso criará novos registros de imóveis, insumos e fornecedores.')) return;
    
    setIsSeeding(true);
    setSeedResult(null);
    const result = await seedInitialData();
    setSeedResult(result);
    setIsSeeding(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `logos/user-${currentUser.id}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setFormData(prev => ({ ...prev, companyLogo: downloadURL }));
      setSaveMessage('Logo atualizada com sucesso!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Error uploading logo:", error);
      setSaveMessage('Erro ao fazer upload da logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // Update User Profile
      await setDoc(doc(db, 'users', currentUser.id), {
        name: formData.name,
        photoUrl: formData.photoUrl,
        companyLogo: formData.companyLogo,
        email: currentUser.email,
        role: currentUser.role,
        active: currentUser.active,
        permissions: currentUser.permissions
      }, { merge: true });

      setSaveMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      setSaveMessage('Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearData = () => {
    if (confirm('Tem certeza que deseja apagar todos os dados locais? Esta ação é irreversível.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ajustes do Sistema</h2>
        <p className="text-slate-500 font-medium">Configure as preferências do portal ERP.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-2">
          <button className="w-full flex items-center space-x-3 p-4 bg-white border border-slate-200 rounded-2xl text-blue-600 font-bold shadow-sm">
            <User size={18} /> <span>Perfil e Conta</span>
          </button>
          <button className="w-full flex items-center space-x-3 p-4 text-slate-500 font-medium hover:bg-slate-100 rounded-2xl transition-all">
            <Bell size={18} /> <span>Notificações</span>
          </button>
          <button className="w-full flex items-center space-x-3 p-4 text-slate-500 font-medium hover:bg-slate-100 rounded-2xl transition-all">
            <Shield size={18} /> <span>Permissões</span>
          </button>
          <button className="w-full flex items-center space-x-3 p-4 text-slate-500 font-medium hover:bg-slate-100 rounded-2xl transition-all">
            <Database size={18} /> <span>Dados e Backup</span>
          </button>
        </aside>

        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-900 tracking-tight">Informações do Usuário</h3>
              {saveMessage && (
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${saveMessage.includes('Erro') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {saveMessage}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={32} />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Foto</label>
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.photoUrl} 
                  onChange={e => setFormData({...formData, photoUrl: e.target.value})}
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Função</label>
                <input 
                  disabled
                  type="text" 
                  className={`${inputClass} opacity-60 cursor-not-allowed`} 
                  value={formData.role} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
              <input 
                disabled
                type="email" 
                className={`${inputClass} opacity-60 cursor-not-allowed`} 
                value={formData.email} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo da Empresa (Upload)</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.companyLogo ? (
                    <img src={formData.companyLogo} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                  ) : (
                    <Building size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:bg-slate-50 transition-all">
                    <span>{isUploading ? 'Enviando...' : 'Selecionar Arquivo'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Recomendado: 512x512px (PNG ou JPG)</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
              <DatabaseZap size={24} className="text-blue-600" />
              Administração de Dados
            </h3>
            <p className="text-sm text-slate-500 font-medium">Inicie o sistema com dados de exemplo para testes rápidos.</p>
            
            {seedResult && (
              <div className={`p-4 rounded-2xl flex items-start gap-3 border ${seedResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                {seedResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                <p className="text-xs font-bold">{seedResult.message}</p>
              </div>
            )}

            <button 
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isSeeding ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <DatabaseZap size={18} />
              )}
              <span>Popular Banco de Dados (Seed)</span>
            </button>
          </div>

          <div className="bg-rose-50/30 p-8 rounded-[32px] border border-rose-100 shadow-sm space-y-4">
            <h3 className="font-black text-xl text-rose-600 tracking-tight">Zona de Perigo</h3>
            <p className="text-sm text-rose-500/70 font-medium">Ações que podem resultar em perda de dados permanente.</p>
            <button 
              onClick={clearData}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-rose-600 rounded-xl font-bold hover:bg-rose-600 hover:text-white transition-all border border-rose-200 shadow-sm"
            >
              <Trash2 size={18} />
              <span>Limpar Todos os Dados Locais</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
