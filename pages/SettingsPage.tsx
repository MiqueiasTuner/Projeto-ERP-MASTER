
import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Database, Trash2, DatabaseZap, CheckCircle2, AlertCircle } from 'lucide-react';
import { seedInitialData } from '../lib/seedService';

const SettingsPage = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSeed = async () => {
    if (!confirm('Deseja popular o banco de dados com dados de exemplo? Isso criará novos registros de imóveis, insumos e fornecedores.')) return;
    
    setIsSeeding(true);
    setSeedResult(null);
    const result = await seedInitialData();
    setSeedResult(result);
    setIsSeeding(false);
  };

  const clearData = () => {
    if (confirm('Tem certeza que deseja apagar todos os dados locais? Esta ação é irreversível.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ajustes do Sistema</h2>
        <p className="text-slate-500 font-medium">Configure as preferências do portal ERP.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-2">
          <button className="w-full flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-xl text-blue-600 font-bold shadow-sm">
            <User size={18} /> <span>Perfil e Conta</span>
          </button>
          <button className="w-full flex items-center space-x-3 p-3 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-all">
            <Bell size={18} /> <span>Notificações</span>
          </button>
          <button className="w-full flex items-center space-x-3 p-3 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-all">
            <Shield size={18} /> <span>Permissões</span>
          </button>
          <button className="w-full flex items-center space-x-3 p-3 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-all">
            <Database size={18} /> <span>Dados e Backup</span>
          </button>
        </aside>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg text-slate-900">Informações do Usuário</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome de Exibição</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg" defaultValue="Carlos Silva" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cargo / Função</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg" defaultValue="Administrador" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">E-mail</label>
              <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg" defaultValue="contato@masterimoveis.com.br" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <DatabaseZap size={20} className="text-blue-600" />
              Administração do Banco de Dados
            </h3>
            <p className="text-sm text-slate-500">Inicie o sistema com dados de exemplo para testes.</p>
            
            {seedResult && (
              <div className={`p-4 rounded-xl flex items-start gap-3 border ${seedResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                {seedResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                <p className="text-xs font-bold">{seedResult.message}</p>
              </div>
            )}

            <button 
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isSeeding ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <DatabaseZap size={18} />
              )}
              <span>Popular Banco de Dados (Seed)</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-rose-600">Zona de Perigo</h3>
            <p className="text-sm text-slate-500">Ações que podem resultar em perda de dados permanente.</p>
            <button 
              onClick={clearData}
              className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg font-bold hover:bg-rose-100 transition-all border border-rose-200"
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
