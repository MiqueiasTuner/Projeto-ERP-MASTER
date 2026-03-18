
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Plus, Shield, Trash2, Edit, UserPlus, Mail, 
  Briefcase, UserCircle, Key, Check, X, ShieldAlert, Building2
} from 'lucide-react';
import { UserAccount, UserRole, Team, UserPermissions, PermissionAction, PermissionModule } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, firebaseConfig, auth } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../src/lib/firestore-errors';

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
  reports: ['view'],
  brokers: []
};

const TeamsPage = ({ currentUser, users, setUsers, teams, setTeams }: TeamsPageProps) => {
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{ id: string, type: 'user' | 'team', name: string } | null>(null);

  // Fix: Ensure isMaster is robust and handles case sensitivity or whitespace
  const userEmail = currentUser.email?.toLowerCase().trim();
  const isMaster = currentUser.role === UserRole.ADMIN || userEmail === 'miqueiasyout@gmail.com';
  const isMasterUser = userEmail === 'miqueiasyout@gmail.com';

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      alert("Erro: O banco de dados não está configurado corretamente.");
      return;
    }
    if (!isMaster) {
      alert("Erro: Você não tem permissão para criar novos acessos.");
      return;
    }
    const form = e.target as HTMLFormElement;
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value as UserRole;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    
    try {
      // 0. Check if email already exists in Firestore to give a better error
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        alert("Erro: Já existe um usuário cadastrado com este e-mail no banco de dados.");
        return;
      }

      // 1. Create Auth User
      let secondaryApp;
      try {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryUser');
      } catch (e) {
        secondaryApp = getApp('SecondaryUser');
      }
      
      const secondaryAuth = getAuth(secondaryApp);
      let authUid = '';
      
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        authUid = userCredential.user.uid;
        await signOut(secondaryAuth);
      } catch (authError: any) {
        console.error("Error creating auth user:", authError);
        if (authError.code === 'auth/email-already-in-use') {
          alert("Erro: Este e-mail já está em uso por outra conta no Firebase. Por favor, use outro e-mail.");
        } else if (authError.code === 'auth/weak-password') {
          alert("Erro: A senha é muito fraca. Use pelo menos 6 caracteres.");
        } else if (authError.code === 'auth/invalid-email') {
          alert("Erro: O e-mail informado é inválido.");
        } else {
          alert(`Erro ao criar conta de acesso (Auth): ${authError.message}`);
        }
        try { await deleteApp(secondaryApp); } catch (e) {}
        return;
      }
      try { await deleteApp(secondaryApp); } catch (e) {}

      const newUser: UserAccount = {
        id: authUid,
        name: name,
        email: email,
        role: role,
        teamId: (form.elements.namedItem('teamId') as HTMLSelectElement).value || undefined,
        active: true,
        permissions: role === UserRole.ADMIN ? {
          properties: ['view', 'edit', 'delete'],
          inventory: ['view', 'edit', 'delete'],
          finances: ['view', 'edit', 'delete'],
          teams: ['view', 'edit', 'delete'],
          reports: ['view', 'edit', 'delete'],
          brokers: ['view', 'edit', 'delete']
        } : { ...DEFAULT_COLLAB_PERMISSIONS }
      };

      console.log("Attempting to save user to Firestore:", newUser);
      try {
        await setDoc(doc(db, 'users', authUid), newUser);
        console.log("User saved successfully to Firestore");
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.CREATE, `users/${authUid}`);
      }
      
      setIsUserModalOpen(false);
      alert("Usuário criado com sucesso!");
    } catch (error: any) {
      console.error("Error adding user to database:", error);
      alert(`Erro ao salvar usuário no banco de dados: ${error.message}`);
    }
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      alert("Erro: O banco de dados não está configurado corretamente.");
      return;
    }
    if (!isMaster) {
      alert("Erro: Você não tem permissão para atualizar usuários.");
      return;
    }
    if (!editingUser) return;
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value as UserRole;
    const teamId = (form.elements.namedItem('teamId') as HTMLSelectElement).value || undefined;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const updatedData: any = {
        name,
        email,
        role,
        teamId
      };

      try {
        await setDoc(doc(db, 'users', editingUser.id), updatedData, { merge: true });
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.UPDATE, `users/${editingUser.id}`);
      }

      if (password) {
        alert("Aviso: A alteração de senha via painel administrativo requer privilégios elevados. O usuário deve usar a opção 'Esqueci minha senha' ou o administrador deve resetar via console Firebase.");
      }

      setIsEditUserModalOpen(false);
      setEditingUser(null);
      alert("Usuário atualizado com sucesso!");
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert(`Erro ao atualizar usuário: ${error.message}`);
    }
  };

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      alert("Erro: O banco de dados não está configurado corretamente.");
      return;
    }
    if (!isMaster) {
      alert("Erro: Você não tem permissão para criar departamentos.");
      return;
    }
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
      handleFirestoreError(error, OperationType.CREATE, 'teams');
      console.error("Error adding team:", error);
    }
  };

  const updateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      alert("Erro: O banco de dados não está configurado corretamente.");
      return;
    }
    if (!isMaster) {
      alert("Erro: Você não tem permissão para atualizar departamentos.");
      return;
    }
    if (!selectedTeam) return;
    const form = e.target as HTMLFormElement;
    
    const updatedTeam = {
      name: (form.elements.namedItem('teamName') as HTMLInputElement).value,
      description: (form.elements.namedItem('teamDescription') as HTMLInputElement).value,
    };

    try {
      await setDoc(doc(db, 'teams', selectedTeam.id), updatedTeam, { merge: true });
      setIsEditTeamModalOpen(false);
      setSelectedTeam(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${selectedTeam.id}`);
      console.error("Error updating team:", error);
    }
  };

  const handleDeleteClick = (id: string, type: 'user' | 'team', name: string) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    setDeleteConfig({ id, type, name });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfig || !db) return;
    
    try {
      if (deleteConfig.type === 'user') {
        await deleteDoc(doc(db, 'users', deleteConfig.id));
      } else {
        const usersInTeam = users.filter(u => u.teamId === deleteConfig.id);
        if (usersInTeam.length > 0) {
          alert(`Não é possível excluir: existem ${usersInTeam.length} usuários vinculados a este departamento.`);
          setIsDeleteModalOpen(false);
          return;
        }
        await deleteDoc(doc(db, 'teams', deleteConfig.id));
      }
      setIsDeleteModalOpen(false);
      setDeleteConfig(null);
    } catch (error) {
      console.error("Error deleting:", error);
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

  const inputClass = "w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-3.5 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-medium placeholder:text-[var(--text-muted)]";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-[var(--text-header)] tracking-tight">Equipe e Acessos</h2>
          <p className="text-[var(--text-muted)] font-medium">Controle de governança e estrutura organizacional.</p>
        </div>
        <div className="flex gap-4">
          {isMaster && (
            <>
              {activeTab === 'users' ? (
                <button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="bg-[var(--accent)] text-[var(--accent-text)] px-8 py-3.5 rounded-[24px] font-black text-sm hover:opacity-90 transition-all shadow-2xl shadow-yellow-500/20 flex items-center gap-3"
                >
                  <UserPlus size={20} strokeWidth={3} /> <span>Novo Acesso</span>
                </button>
              ) : (
                <button 
                  onClick={() => setIsTeamModalOpen(true)}
                  className="bg-[var(--accent)] text-[var(--accent-text)] px-8 py-3.5 rounded-[24px] font-black text-sm hover:opacity-90 transition-all shadow-2xl shadow-yellow-500/20 flex items-center gap-3"
                >
                  <Plus size={20} strokeWidth={3} /> <span>Novo Departamento</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-[var(--border)]">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-10 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'users' ? 'text-[var(--accent)] border-b-4 border-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
        >
          Usuários
        </button>
        <button 
          onClick={() => setActiveTab('teams')}
          className={`px-10 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'teams' ? 'text-[var(--accent)] border-b-4 border-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
        >
          Departamentos
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {users.map(u => {
            const team = teams.find(t => t.id === u.teamId);
            return (
              <div key={u.id} className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm group hover:shadow-2xl hover:-translate-y-1.5 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-[24px] bg-[var(--bg-card-alt)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] transition-colors shadow-inner">
                    <UserCircle size={36} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {isMaster && (
                      <button 
                        onClick={() => { setEditingUser(u); setIsEditUserModalOpen(true); }}
                        className="p-2.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl"
                        title="Editar Usuário"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    {isMasterUser && u.role !== UserRole.ADMIN && (
                      <button 
                        onClick={() => { setSelectedUser(u); setIsPermModalOpen(true); }}
                        className="p-2.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl"
                        title="Gerenciar Permissões"
                      >
                        <Key size={18} />
                      </button>
                    )}
                    {isMasterUser && u.id !== currentUser.id && (
                      <button 
                        onClick={() => handleDeleteClick(u.id, 'user', u.name)}
                        className="p-2.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-rose-600 rounded-xl"
                        title="Excluir Usuário"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-black text-[var(--text-header)] text-xl mb-1 tracking-tight">{u.name}</h3>
                <p className="text-xs font-bold text-[var(--text-muted)] mb-4">{u.email}</p>
                {team && (
                  <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest bg-yellow-500/10 px-3 py-1 rounded-xl inline-block border border-yellow-500/20">
                    {team.name}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--bg-card-alt)]">
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-amber-500/10 text-amber-500' : 'bg-[var(--bg-header)] text-[var(--text-header)]'}`}>
                    {u.role}
                  </span>
                  <div className="flex -space-x-2">
                    {u.permissions && Object.keys(u.permissions).map(mod => (
                      u.permissions[mod as PermissionModule]?.length > 0 && (
                        <div key={mod} className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] shadow-sm" title={mod} />
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
              <div key={t.id} className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border)] shadow-sm group hover:shadow-2xl hover:-translate-y-1.5 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-[24px] bg-yellow-500/10 flex items-center justify-center text-yellow-600 shadow-inner group-hover:bg-yellow-600 group-hover:text-white transition-all">
                    <Building2 size={36} />
                  </div>
                  {isMaster && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => {
                          setSelectedTeam(t);
                          setIsEditTeamModalOpen(true);
                        }}
                        className="p-2.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-yellow-600 rounded-xl"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(t.id, 'team', t.name)} 
                        className="p-2.5 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-rose-600 rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="font-black text-[var(--text-header)] text-xl mb-2 tracking-tight">{t.name}</h3>
                <p className="text-xs font-bold text-[var(--text-muted)] min-h-[32px] line-clamp-2">{t.description}</p>
                <div className="mt-8 pt-6 border-t border-[var(--bg-card-alt)] flex items-center justify-between">
                  <div className="flex items-center text-[var(--text-main)] gap-2">
                    <Users size={16} className="text-yellow-600" />
                    <span className="text-xs font-black">{memberCount} {memberCount === 1 ? 'Membro' : 'Membros'}</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-xl">Ativo</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer de Permissões */}
      <AnimatePresence>
        {isPermModalOpen && selectedUser && selectedUser.permissions && (
          <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPermModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-[var(--bg-card)] shadow-2xl flex flex-col h-full"
            >
              <div className="p-8 bg-[var(--bg-header)] text-[var(--text-header)] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-600 rounded-2xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Privilégios: {selectedUser.name}</h3>
                    <p className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest">Controle de Segurança ERP</p>
                  </div>
                </div>
                <button onClick={() => setIsPermModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] border-b border-[var(--border)]">
                      <th className="py-5">Módulo</th>
                      <th className="py-5 text-center">Visualizar</th>
                      <th className="py-5 text-center">Editar/Criar</th>
                      <th className="py-5 text-center">Excluir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {([
                      { id: 'properties', label: 'Ativos Imobiliários' },
                      { id: 'inventory', label: 'Gestão de Estoque' },
                      { id: 'finances', label: 'Engenharia Financeira' },
                      { id: 'teams', label: 'Governança/Equipe' },
                      { id: 'reports', label: 'Business Intelligence' },
                      { id: 'brokers', label: 'Gestão de Corretores' }
                    ] as const).map(mod => (
                      <tr key={mod.id} className="hover:bg-[var(--bg-card-alt)] transition-colors">
                        <td className="py-5 font-black text-[var(--text-main)] text-sm tracking-tight">{mod.label}</td>
                        {(['view', 'edit', 'delete'] as const).map(act => (
                          <td key={act} className="py-5 text-center">
                            <button 
                              onClick={() => togglePermission(mod.id, act)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all ${
                                selectedUser.permissions[mod.id]?.includes(act) 
                                  ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/30' 
                                  : 'bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:bg-[var(--border)]'
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

              <div className="p-8 border-t border-[var(--border)] bg-[var(--bg-card-alt)]/50 flex justify-end">
                <button 
                  onClick={() => setIsPermModalOpen(false)}
                  className="bg-[var(--bg-header)] text-[var(--text-header)] px-12 py-4 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-2xl hover:opacity-90 transition-all"
                >
                  Confirmar Acessos
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drawer Novo Usuário */}
      {createPortal(
        <AnimatePresence>
          {isUserModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsUserModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md bg-[var(--bg-card)] shadow-2xl flex flex-col h-full"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Novo Acesso</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">Cadastre um colaborador.</p>
                  </div>
                  <button 
                    onClick={() => setIsUserModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={addUser} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome Completo</label>
                    <input required name="name" type="text" placeholder="Ex: Miqueias Silva" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <input required name="email" type="email" placeholder="nome@masterimoveis.com.br" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Senha de Acesso</label>
                    <input required name="password" type="password" placeholder="••••••••" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nível de Acesso</label>
                    <select name="role" className={inputClass} disabled={!isMasterUser}>
                      <option value={UserRole.OPERADOR}>Operador</option>
                      <option value={UserRole.ADMIN}>Administrador</option>
                    </select>
                    {!isMasterUser && <p className="text-[9px] text-rose-500 mt-1 font-bold">Apenas o Master pode definir níveis de acesso.</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Departamento / Time</label>
                    <select name="teamId" className={inputClass}>
                      <option value="">Nenhum</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsUserModalOpen(false)} 
                      className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-4 bg-[var(--accent)] text-[var(--accent-text)] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 hover:opacity-90 transition-all"
                    >
                      Criar Acesso
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Drawer Editar Usuário */}
      {createPortal(
        <AnimatePresence>
          {isEditUserModalOpen && editingUser && (
            <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setIsEditUserModalOpen(false); setEditingUser(null); }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md bg-[var(--bg-card)] shadow-2xl flex flex-col h-full"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Editar Usuário</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">Atualize os dados do colaborador.</p>
                  </div>
                  <button 
                    onClick={() => { setIsEditUserModalOpen(false); setEditingUser(null); }}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={updateUser} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome Completo</label>
                    <input required name="name" type="text" defaultValue={editingUser.name} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <input required name="email" type="email" defaultValue={editingUser.email} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nova Senha (deixe em branco para não alterar)</label>
                    <input name="password" type="password" placeholder="••••••••" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nível de Acesso</label>
                    <select name="role" className={inputClass} defaultValue={editingUser.role} disabled={!isMasterUser}>
                      <option value={UserRole.OPERADOR}>Operador</option>
                      <option value={UserRole.ADMIN}>Administrador</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Departamento / Time</label>
                    <select name="teamId" className={inputClass} defaultValue={editingUser.teamId || ""}>
                      <option value="">Nenhum</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => { setIsEditUserModalOpen(false); setEditingUser(null); }} 
                      className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-4 bg-[var(--accent)] text-[var(--accent-text)] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 hover:opacity-90 transition-all"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {createPortal(
        <AnimatePresence>
          {isTeamModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsTeamModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md bg-[var(--bg-card)] shadow-2xl flex flex-col h-full"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Novo Departamento</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">Estruture sua organização.</p>
                  </div>
                  <button 
                    onClick={() => setIsTeamModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={addTeam} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Identificação do Time</label>
                    <input required name="teamName" type="text" placeholder="Ex: Engenharia e Obras" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Descrição Curta</label>
                    <input required name="teamDescription" type="text" placeholder="Ex: Responsável pelas reformas e vistorias" className={inputClass} />
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsTeamModalOpen(false)} 
                      className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-4 bg-yellow-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 hover:bg-yellow-700 transition-all"
                    >
                      Criar Departamento
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Drawer Editar Departamento */}
      {createPortal(
        <AnimatePresence>
          {isEditTeamModalOpen && selectedTeam && (
            <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditTeamModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md bg-[var(--bg-card)] shadow-2xl flex flex-col h-full"
              >
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)]">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-header)] tracking-tight">Editar Departamento</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">Atualize as informações do time.</p>
                  </div>
                  <button 
                    onClick={() => setIsEditTeamModalOpen(false)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors rounded-full hover:bg-[var(--bg-card-alt)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={updateTeam} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Identificação do Time</label>
                    <input required name="teamName" type="text" defaultValue={selectedTeam.name} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Descrição Curta</label>
                    <input required name="teamDescription" type="text" defaultValue={selectedTeam.description} className={inputClass} />
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsEditTeamModalOpen(false)} 
                      className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-4 bg-yellow-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 hover:bg-yellow-700 transition-all"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {isDeleteModalOpen && deleteConfig && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-[32px] shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-black text-[var(--text-header)] mb-2 tracking-tight">Confirmar Exclusão</h3>
              <p className="text-[var(--text-muted)] text-sm mb-8 font-medium">
                Deseja realmente excluir o {deleteConfig.type === 'user' ? 'usuário' : 'departamento'} <strong>{deleteConfig.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-header)] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TeamsPage;
