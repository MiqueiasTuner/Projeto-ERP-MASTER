
import React, { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, Database, Trash2, DatabaseZap, CheckCircle2, AlertCircle, Save, Building, Palette, Sun, Moon, FileText, Globe, Copy, ExternalLink } from 'lucide-react';
import { seedInitialData } from '../lib/seedService';
import { UserAccount, Property, UserRole } from '../types';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadImage } from '../lib/storageService';
import { useTheme } from '../src/components/ThemeProvider';
import { CommercialService } from '../src/services/CommercialService';

const SettingsPage = ({ currentUser, properties }: { currentUser: UserAccount, properties: Property[] }) => {
  const { theme, setTheme } = useTheme();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'permissions' | 'data' | 'integrations'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const isMasterUser = currentUser.email?.toLowerCase().trim() === 'miqueiasyout@gmail.com';
  const isBroker = currentUser.role === UserRole.BROKER;

  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    email: currentUser.email || '',
    role: currentUser.role || '',
    photoUrl: currentUser.photoUrl || ''
  });

  useEffect(() => {
    setFormData({
      name: currentUser.name || '',
      email: currentUser.email || '',
      role: currentUser.role || '',
      photoUrl: currentUser.photoUrl || ''
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!storage) {
      setSaveMessage('Erro: Firebase Storage não configurado.');
      return;
    }

    setIsUploading(true);
    try {
      const path = `avatars/user-${currentUser.id}-${Date.now()}-${file.name}`;
      const downloadURL = await uploadImage(file, path);
      
      setFormData(prev => ({ ...prev, photoUrl: downloadURL }));
      setSaveMessage('Foto de perfil atualizada!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Error uploading photo:", error);
      setSaveMessage('Erro ao fazer upload da foto.');
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

  const handleExportJSON = () => {
    const json = CommercialService.getAvailablePropertiesJSON(properties);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imoveis-disponiveis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const inputClass = "w-full px-4 py-3 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-medium text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-[var(--text-header)] tracking-tight">Ajustes do Sistema</h2>
        <p className="text-[var(--text-muted)] font-medium">Configure as preferências do portal ERP.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'profile' ? 'bg-[var(--bg-card)] border border-[var(--border)] text-yellow-600 shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]'}`}
          >
            <User size={18} /> <span>Perfil e Conta</span>
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center space-x-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'notifications' ? 'bg-[var(--bg-card)] border border-[var(--border)] text-yellow-600 shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]'}`}
          >
            <Bell size={18} /> <span>Notificações</span>
          </button>
          {isMasterUser && (
            <button 
              onClick={() => setActiveTab('permissions')}
              className={`w-full flex items-center space-x-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'permissions' ? 'bg-[var(--bg-card)] border border-[var(--border)] text-yellow-600 shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]'}`}
            >
              <Shield size={18} /> <span>Permissões</span>
            </button>
          )}
          {!isBroker && (
            <button 
              onClick={() => setActiveTab('integrations')}
              className={`w-full flex items-center space-x-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'integrations' ? 'bg-[var(--bg-card)] border border-[var(--border)] text-yellow-600 shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]'}`}
            >
              <Globe size={18} /> <span>Integrações</span>
            </button>
          )}
          <button 
            onClick={() => setActiveTab('data')}
            className={`w-full flex items-center space-x-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'data' ? 'bg-[var(--bg-card)] border border-[var(--border)] text-yellow-600 shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]'}`}
          >
            <Database size={18} /> <span>Dados e Backup</span>
          </button>
        </aside>

        <div className="md:col-span-2 space-y-6">
          {activeTab === 'profile' && (
            <>
              <form onSubmit={handleSaveProfile} className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-xl text-[var(--text-header)] tracking-tight">Informações do Usuário</h3>
                  {saveMessage && (
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${saveMessage.includes('Erro') ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
                      {saveMessage}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-6 mb-8 p-6 bg-[var(--bg-card-alt)]/50 rounded-[24px] border border-[var(--border)]">
                  <div className="w-24 h-24 rounded-3xl bg-[var(--bg-card)] border-4 border-[var(--bg-card)] shadow-xl flex items-center justify-center text-[var(--text-muted)] overflow-hidden relative group">
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={40} />
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Trocar</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">Foto do Perfil</h4>
                    <p className="text-xs font-medium text-[var(--text-muted)]">Clique na imagem para fazer upload ou insira uma URL abaixo.</p>
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
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome de Exibição</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Cargo / Função</label>
                    <input 
                      disabled
                      type="text" 
                      className={`${inputClass} opacity-60 cursor-not-allowed`} 
                      value={formData.role} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">E-mail de Acesso</label>
                  <input 
                    disabled
                    type="email" 
                    className={`${inputClass} opacity-60 cursor-not-allowed`} 
                    value={formData.email} 
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-4 bg-[var(--bg-header)] text-[var(--text-header)] rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-[var(--bg-header)]/10 flex items-center justify-center gap-2"
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

              <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm space-y-6">
                <h3 className="font-black text-xl text-[var(--text-header)] tracking-tight flex items-center gap-2">
                  <Palette size={24} className="text-yellow-600" />
                  Aparência do Sistema
                </h3>
                <p className="text-sm text-[var(--text-muted)] font-medium">Personalize as cores e o tema do seu portal.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                      theme === 'dark' 
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5' 
                        : 'border-[var(--border)] bg-[var(--bg-card-alt)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-header)] flex items-center justify-center text-[var(--accent)]">
                      <Moon size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-[var(--text-header)]">Modo Dark</p>
                      <p className="text-[10px] font-medium text-[var(--text-muted)] mt-1">Secundário</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setTheme('white')}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                      theme === 'white' 
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5' 
                        : 'border-[var(--border)] bg-[var(--bg-card-alt)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-yellow-600">
                      <Sun size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-[var(--text-header)]">Modo White</p>
                      <p className="text-[10px] font-medium text-[var(--text-muted)] mt-1">Branco, Amarelo e Preto</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'integrations' && (
            <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-yellow-500/10 text-yellow-600 rounded-3xl flex items-center justify-center">
                  <Globe size={32} />
                </div>
                <div>
                  <h3 className="font-black text-2xl text-[var(--text-header)] tracking-tight">Integração com Portais</h3>
                  <p className="text-[var(--text-muted)] font-medium">Publique seus imóveis automaticamente no Grupo OLX, Zap e VivaReal.</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card-alt)] p-6 rounded-[24px] border border-[var(--border)] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-[var(--text-header)] uppercase tracking-widest">XML Feed (Padrão VivaReal)</h4>
                  <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Ativo</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                  Utilize o link abaixo para integrar com os portais. O feed é atualizado automaticamente sempre que um imóvel é colocado no status <span className="text-[var(--text-main)] font-bold">"À Venda"</span>.
                </p>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[var(--bg-card)] px-4 py-3 rounded-xl border border-[var(--border)] font-mono text-xs text-[var(--text-muted)] truncate">
                    {window.location.origin}/api/feed.xml
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/feed.xml`);
                      setSaveMessage('Link copiado!');
                      setTimeout(() => setSaveMessage(''), 3000);
                    }}
                    className="p-3 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-all"
                    title="Copiar Link"
                  >
                    <Copy size={18} />
                  </button>
                  <a 
                    href="/api/feed.xml" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-all"
                    title="Visualizar XML"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 bg-[var(--bg-card-alt)] rounded-[24px] border border-[var(--border)] flex flex-col items-center text-center gap-3">
                  <img src="https://logodownload.org/wp-content/uploads/2016/10/olx-logo-13.png" className="h-8 object-contain grayscale opacity-50" alt="OLX" referrerPolicy="no-referrer" />
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">OLX Brasil</p>
                </div>
                <div className="p-6 bg-[var(--bg-card-alt)] rounded-[24px] border border-[var(--border)] flex flex-col items-center text-center gap-3">
                  <img src="https://logodownload.org/wp-content/uploads/2019/11/zap-imoveis-logo.png" className="h-8 object-contain grayscale opacity-50" alt="Zap" referrerPolicy="no-referrer" />
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Zap Imóveis</p>
                </div>
                <div className="p-6 bg-[var(--bg-card-alt)] rounded-[24px] border border-[var(--border)] flex flex-col items-center text-center gap-3">
                  <img src="https://logodownload.org/wp-content/uploads/2019/11/vivareal-logo.png" className="h-8 object-contain grayscale opacity-50" alt="VivaReal" referrerPolicy="no-referrer" />
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">VivaReal</p>
                </div>
              </div>

              <div className="p-6 bg-blue-500/5 rounded-[24px] border border-blue-500/10">
                <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertCircle size={14} /> Como configurar?
                </h4>
                <ol className="text-xs text-blue-500/70 space-y-2 list-decimal ml-4 font-medium">
                  <li>Acesse o painel do anunciante no portal desejado.</li>
                  <li>Procure pela opção de "Integração via XML" ou "Carga de Dados".</li>
                  <li>Cole o link do feed gerado acima.</li>
                  <li>O portal passará a ler seus imóveis automaticamente a cada poucas horas.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'data' && isMasterUser && (
            <>
              <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm space-y-4">
                <h3 className="font-black text-xl text-[var(--text-header)] tracking-tight flex items-center gap-2">
                  <DatabaseZap size={24} className="text-yellow-600" />
                  Administração de Dados
                </h3>
                <p className="text-sm text-[var(--text-muted)] font-medium">Gerencie as integrações e o estado do banco de dados.</p>
                
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="flex items-center space-x-2 px-6 py-4 bg-[var(--accent)] text-[var(--accent-text)] rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50"
                  >
                    {isSeeding ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <DatabaseZap size={18} />
                    )}
                    <span>Popular Banco (Seed)</span>
                  </button>

                  <button 
                    onClick={handleExportJSON}
                    className="flex items-center space-x-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <FileText size={18} />
                    <span>Exportar JSON (Site Externo)</span>
                  </button>
                </div>
                
                {seedResult && (
                  <div className={`p-4 rounded-2xl flex items-start gap-3 border ${seedResult.success ? 'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                    {seedResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                    <p className="text-xs font-bold">{seedResult.message}</p>
                  </div>
                )}
              </div>

              <div className="bg-rose-500/5 p-8 rounded-[32px] border border-rose-500/10 shadow-sm space-y-4">
                <h3 className="font-black text-xl text-rose-500 tracking-tight">Zona de Perigo</h3>
                <p className="text-sm text-rose-500/70 font-medium">Ações que podem resultar em perda de dados permanente.</p>
                <button 
                  onClick={clearData}
                  className="flex items-center space-x-2 px-6 py-3 bg-[var(--bg-card)] text-rose-500 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 shadow-sm"
                >
                  <Trash2 size={18} />
                  <span>Limpar Todos os Dados Locais</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
