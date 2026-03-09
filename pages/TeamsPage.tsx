
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Plus, Shield, Trash2, Edit, UserPlus, Mail, 
  Briefcase, UserCircle, Key, Check, X, ShieldAlert, Building2
} from 'lucide-react';
import { UserAccount, UserRole, Team, UserPermissions, PermissionAction, PermissionModule } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface TeamsPageProps {
  currentUser: UserAccount;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
}

const DEFAULT_COLLAB_PERMISSIONS: UserPermissions = {
  properties: ['view'],
  inventory: ['view'],
  finances: [],
  teams: [],
  reports: ['view']
};

const TeamsPage = ({ currentUser, users, setUsers, teams, setTeams }: TeamsPageProps) => {
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  const isMaster = currentUser.role === UserRole.ADMIN || currentUser.email === 'miqueiasyout@gmail.com';
  const isMasterUser = currentUser.email === 'miqueiasyout@gmail.com';

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster || !db) return;
    const form = e.target as HTMLFormElement;
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value as UserRole;
    
    const newUser: Omit<UserAccount, 'id'> = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      role: role,
      teamId: (form.elements.namedItem('teamId') as HTMLSelectElement).value || undefined,
      active: true,
      permissions: role === UserRole.ADMIN ? {
        properties: ['view', 'edit', 'delete'],
        inventory: ['view', 'edit', 'delete'],
        finances: ['view', 'edit', 'delete'],
        teams: ['view', 'edit', 'delete'],
        reports: ['view', 'edit', 'delete']
      } : { ...DEFAULT_COLLAB_PERMISSIONS }
    };

    try {
      const docRef = doc(collection(db, 'users'));
      await setDoc(docRef, { ...newUser, id: docRef.id });
      setIsUserModalOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Erro ao criar usuário. Verifique as permissões.");
    }
  };

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster || !db) return;
    const form = e.target as HTMLFormElement;
    
    const newTeam: Omit<Team, 'id'> = {
      name: (form.elements.namedItem('teamName') as HTMLInputElement).value,
      description: (form.elements.namedItem('teamDescription') as HTMLInputElement).value,
    };

    try {
      const docRef = doc(collection(db, 'teams'));
      await setDoc(docRef, { ...newTeam, id: docRef.id });
      setIsTeamModalOpen(false);
    } catch (error) {
      console.error("Error adding team:", error);
      alert("Erro ao criar departamento.");
    }
  };

  const deleteTeam = async (id: string) => {
    if (!isMasterUser || !db) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    const usersInTeam = users.filter(u => u.teamId === id);
    if (usersInTeam.length > 0) {
      alert(`Não é possível excluir: existem ${usersInTeam.length} usuários vinculados a este departamento.`);
      return;
    }
    if (confirm('Deseja excluir este departamento?')) {
      try {
        await deleteDoc(doc(db, 'teams', id));
      } catch (error) {
        console.error("Error deleting team:", error);
      }
    }
  };

  const togglePermission = async (module: PermissionModule, action: PermissionAction) => {
    if (!selectedUser || !selectedUser.permissions || !db) return;
    const currentPerms = selectedUser.permissions[module] || [];
    const newPerms = currentPerms.includes(action)
      ? currentPerms.filter(a => a !== action)
      : [...currentPerms, action];

    const updatedPermissions = {
      ...selectedUser.permissions,
      [module]: newPerms
    };

    try {
      await setDoc(doc(db, 'users', selectedUser.id), {
        permissions: updatedPermissions
      }, { merge: true });
      
      const updatedUser = {
        ...selectedUser,
        permissions: updatedPermissions
      };
      setSelectedUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    } catch (error) {
      console.error("Error updating permissions:", error);
      alert("Erro ao atualizar permissões.");
    }
  };

  const inputClass = "w-full bg-slate-50 text-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Equipe e Acessos</h2>
          <p className="text-slate-500 font-medium">Controle de governança e estrutura organizacional.</p>
        </div>
        <div className="flex gap-4">
          {isMaster && (
            <>
              {activeTab === 'users' ? (
                <button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="bg-[#0A192F] text-[#FFD700] px-8 py-3.5 rounded-[24px] font-black text-sm hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center gap-3"
                >
                  <UserPlus size={20} strokeWidth={3} /> <span>Novo Acesso</span>
                </button>
              ) : (
                <button 
                  onClick={() => setIsTeamModalOpen(true)}
                  className="bg-[#0A192F] text-[#FFD700] px-8 py-3.5 rounded-[24px] font-black text-sm hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center gap-3"
                >
                  <Plus size={20} strokeWidth={3} /> <span>Novo Departamento</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-10 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'users' ? 'text-[#0A192F] border-b-4 border-[#0A192F]' : 'text-slate-400'}`}
        >
          Usuários
        </button>
        <button 
          onClick={() => setActiveTab('teams')}
          className={`px-10 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'teams' ? 'text-[#0A192F] border-b-4 border-[#0A192F]' : 'text-slate-400'}`}
        >
          Departamentos
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {users.map(u => {
            const team = teams.find(t => t.id === u.teamId);
            return (
              <div key={u.id} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm group hover:shadow-2xl hover:-translate-y-1.5 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-[#0A192F] transition-colors shadow-inner">
                    <UserCircle size={36} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {isMasterUser && u.role !== UserRole.ADMIN && (
                      <button 
                        onClick={() => { setSelectedUser(u); setIsPermModalOpen(true); }}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl"
                        title="Gerenciar Permissões"
                      >
                        <Key size={18} />
                      </button>
                    )}
                    {isMasterUser && u.id !== currentUser.id && (
                      <button 
                        onClick={() => {
                          if (confirm('Deseja realmente excluir este usuário?')) {
                            setUsers(prev => prev.filter(user => user.id !== u.id));
                          }
                        }}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl"
                        title="Excluir Usuário"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-black text-slate-900 text-xl mb-1 tracking-tight">{u.name}</h3>
                <p className="text-xs font-bold text-slate-400 mb-4">{u.email}</p>
                {team && (
                  <p className="text-[10px] font-black text-[#0A192F] uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-xl inline-block border border-blue-100">
                    {team.name}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-700' : 'bg-[#0A192F] text-white'}`}>
                    {u.role}
                  </span>
                  <div className="flex -space-x-2">
                    {u.permissions && Object.keys(u.permissions).map(mod => (
                      u.permissions[mod as PermissionModule]?.length > 0 && (
                        <div key={mod} className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" title={mod} />
                      )
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teams.map(t => {
            const memberCount = users.filter(u => u.teamId === t.id).length;
            return (
              <div key={t.id} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm group hover:shadow-2xl hover:-translate-y-1.5 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-[24px] bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Building2 size={36} />
                  </div>
                  {isMaster && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl"><Edit size={18} /></button>
                      <button onClick={() => deleteTeam(t.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                  )}
                </div>
                <h3 className="font-black text-slate-900 text-xl mb-2 tracking-tight">{t.name}</h3>
                <p className="text-xs font-bold text-slate-400 min-h-[32px] line-clamp-2">{t.description}</p>
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center text-slate-900 gap-2">
                    <Users size={16} className="text-[#0A192F]" />
                    <span className="text-xs font-black">{memberCount} {memberCount === 1 ? 'Membro' : 'Membros'}</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-xl">Ativo</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer de Permissões */}
      <AnimatePresence>
        {isPermModalOpen && selectedUser && selectedUser.permissions && createPortal(
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPermModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-[110] flex flex-col"
            >
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Privilégios: {selectedUser.name}</h3>
                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Controle de Segurança ERP</p>
                  </div>
                </div>
                <button onClick={() => setIsPermModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                      <th className="py-5">Módulo</th>
                      <th className="py-5 text-center">Visualizar</th>
                      <th className="py-5 text-center">Editar/Criar</th>
                      <th className="py-5 text-center">Excluir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {([
                      { id: 'properties', label: 'Ativos Imobiliários' },
                      { id: 'inventory', label: 'Gestão de Estoque' },
                      { id: 'finances', label: 'Engenharia Financeira' },
                      { id: 'teams', label: 'Governança/Equipe' },
                      { id: 'reports', label: 'Business Intelligence' }
                    ] as const).map(mod => (
                      <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-5 font-black text-slate-800 text-sm tracking-tight">{mod.label}</td>
                        {(['view', 'edit', 'delete'] as const).map(act => (
                          <td key={act} className="py-5 text-center">
                            <button 
                              onClick={() => togglePermission(mod.id, act)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all ${
                                selectedUser.permissions[mod.id]?.includes(act) 
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                  : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              <Check size={18} strokeWidth={4} />
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button 
                  onClick={() => setIsPermModalOpen(false)}
                  className="bg-slate-900 text-white px-12 py-4 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all"
                >
                  Confirmar Acessos
                </button>
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>

      {/* Drawer Novo Usuário */}
      <AnimatePresence mode="wait">
        {isUserModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Acesso</h3>
                  <p className="text-slate-500 text-sm font-medium">Cadastre um colaborador.</p>
                </div>
                <button 
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={addUser} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input required name="name" type="text" placeholder="Ex: Miqueias Silva" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                  <input required name="email" type="email" placeholder="nome@masterimoveis.com.br" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                  <select name="role" className={inputClass} disabled={!isMasterUser}>
                    <option value={UserRole.OPERADOR}>Operador</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
                  {!isMasterUser && <p className="text-[9px] text-rose-500 mt-1 font-bold">Apenas o Master pode definir níveis de acesso.</p>}
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Departamento / Time</label>
                  <select name="teamId" className={inputClass}>
                    <option value="">Nenhum</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsUserModalOpen(false)} 
                    className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-[#0A192F] text-[#FFD700] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
                  >
                    Criar Acesso
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* Drawer Novo Departamento */}
      <AnimatePresence mode="wait">
        {isTeamModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTeamModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Departamento</h3>
                  <p className="text-slate-500 text-sm font-medium">Estruture sua organização.</p>
                </div>
                <button 
                  onClick={() => setIsTeamModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={addTeam} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Identificação do Time</label>
                  <input required name="teamName" type="text" placeholder="Ex: Engenharia e Obras" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição Curta</label>
                  <input required name="teamDescription" type="text" placeholder="Ex: Responsável pelas reformas e vistorias" className={inputClass} />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsTeamModalOpen(false)} 
                    className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-[#0A192F] text-[#FFD700] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
                  >
                    Criar Departamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamsPage;
