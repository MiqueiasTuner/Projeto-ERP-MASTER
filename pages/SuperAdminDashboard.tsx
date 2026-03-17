
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building2, ShieldAlert, CheckCircle2, XCircle, 
  Search, Filter, ArrowRight, MoreVertical, ShieldCheck,
  BarChart3, Globe, Lock, Unlock, Mail, Phone, Calendar,
  Plus, Settings, User, Eye
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, getDocs, setDoc } from 'firebase/firestore';
import { UserAccount, Organization, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate } from '../utils';

const SuperAdminDashboard = ({ onViewOrg }: { onViewOrg: (orgId: string) => void }) => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'organizations' | 'users'>('organizations');

  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [limits, setLimits] = useState({ maxUsers: 0, maxProperties: 0 });

  useEffect(() => {
    const unsubOrgs = onSnapshot(collection(db, 'organizations'), (snapshot) => {
      const orgsData = snapshot.docs.map(doc => ({ ...doc.data() } as Organization));
      setOrganizations(orgsData);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserAccount));
      setUsers(usersData);
      setLoading(false);
    });

    return () => {
      unsubOrgs();
      unsubUsers();
    };
  }, []);

  const toggleOrgStatus = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await updateDoc(doc(db, 'organizations', orgId), { status: newStatus });
      
      // Also block/unblock all users in this organization
      const orgUsers = users.filter(u => u.organizationId === orgId);
      for (const user of orgUsers) {
        await updateDoc(doc(db, 'users', user.id), { active: newStatus === 'active' });
      }
    } catch (error) {
      console.error("Error updating organization status:", error);
      alert("Erro ao atualizar status da organização.");
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { active: !currentStatus });
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Erro ao atualizar status do usuário.");
    }
  };

  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', ownerEmail: '', plan: 'free' });
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.ADMIN, organizationId: '' });

  const handleCreateOrg = async () => {
    try {
      const orgRef = doc(collection(db, 'organizations'));
      await setDoc(orgRef, {
        id: orgRef.id,
        name: newOrg.name,
        ownerEmail: newOrg.ownerEmail,
        plan: newOrg.plan,
        status: 'active',
        maxUsers: 5,
        maxProperties: 50,
        createdAt: new Date().toISOString()
      });
      setIsOrgModalOpen(false);
      setNewOrg({ name: '', ownerEmail: '', plan: 'free' });
    } catch (error) {
      console.error("Error creating organization:", error);
      alert("Erro ao criar organização.");
    }
  };

  const handleCreateUser = async () => {
    try {
      // Note: This only creates the Firestore document. 
      // The user will still need to sign up or be invited via Auth.
      // For a real ERP, we'd use a cloud function or admin SDK to create the Auth user.
      const userRef = doc(collection(db, 'users'));
      await setDoc(userRef, {
        id: userRef.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        organizationId: newUser.organizationId,
        active: true,
        createdAt: new Date().toISOString(),
        permissions: {
          properties: ['view', 'edit', 'delete'],
          inventory: ['view', 'edit', 'delete'],
          finances: ['view', 'edit', 'delete'],
          teams: ['view', 'edit', 'delete'],
          reports: ['view', 'edit', 'delete']
        }
      });
      setIsUserModalOpen(false);
      setNewUser({ name: '', email: '', role: UserRole.ADMIN, organizationId: '' });
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Erro ao criar usuário.");
    }
  };

  const handleUpdateLimits = async () => {
    if (!selectedOrg) return;
    try {
      await updateDoc(doc(db, 'organizations', selectedOrg.id), {
        maxUsers: Number(limits.maxUsers),
        maxProperties: Number(limits.maxProperties)
      });
      setIsLimitModalOpen(false);
      setSelectedOrg(null);
    } catch (error) {
      console.error("Error updating limits:", error);
      alert("Erro ao atualizar limites.");
    }
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-slate-800 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight mb-2">Painel de Controle Master</h2>
          <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">Gestão Global do Ecossistema Sintese ERP</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border)] shadow-sm">
          <button 
            onClick={() => setActiveTab('organizations')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'organizations' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-yellow-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Organizações
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'users' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-yellow-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Usuários
          </button>
        </div>

        <button 
          onClick={() => activeTab === 'organizations' ? setIsOrgModalOpen(true) : setIsUserModalOpen(true)}
          className="bg-[var(--accent)] text-[var(--accent-text)] px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={20} />
          {activeTab === 'organizations' ? 'Nova Empresa' : 'Novo Usuário'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Building2 size={64} className="text-[var(--accent)]" />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Total de Empresas</p>
          <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{organizations.length}</h3>
        </div>
        <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={64} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Usuários Ativos</p>
          <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{users.filter(u => u.active).length}</h3>
        </div>
        <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <ShieldAlert size={64} className="text-rose-500" />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Contas Bloqueadas</p>
          <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{organizations.filter(o => o.status === 'blocked').length}</h3>
        </div>
        <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Globe size={64} className="text-blue-500" />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Acessos Hoje</p>
          <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{Math.floor(users.length * 0.4)}</h3>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
          <input 
            type="text" 
            placeholder={`Buscar por ${activeTab === 'organizations' ? 'empresa ou e-mail do dono' : 'nome ou e-mail do usuário'}...`}
            className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] pl-14 pr-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-card-alt)] border-bottom border-[var(--border)]">
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  {activeTab === 'organizations' ? 'Organização' : 'Usuário'}
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  {activeTab === 'organizations' ? 'Plano / Limites' : 'Papel / Empresa'}
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {activeTab === 'organizations' ? (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-[var(--bg-card-alt)]/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-600 border border-yellow-500/20">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <p className="font-black text-[var(--text-main)]">{org.name}</p>
                          <p className="text-xs text-[var(--text-muted)] font-bold">{org.ownerEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        org.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {org.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">{org.plan || 'Free'}</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold">
                        {org.maxUsers || 0} Usuários / {org.maxProperties || 0} Imóveis
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            onViewOrg(org.id);
                            navigate('/');
                          }}
                          className="p-3 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                          title="Visualizar como Organização"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedOrg(org);
                            setLimits({ maxUsers: org.maxUsers || 0, maxProperties: org.maxProperties || 0 });
                            setIsLimitModalOpen(true);
                          }}
                          className="p-3 bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                          title="Editar Limites"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => toggleOrgStatus(org.id, org.status)}
                          className={`p-3 rounded-xl transition-all ${
                            org.status === 'active' 
                              ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' 
                              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                          }`}
                          title={org.status === 'active' ? 'Bloquear Organização' : 'Ativar Organização'}
                        >
                          {org.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--bg-card-alt)]/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-600 border border-slate-500/20">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} className="w-full h-full object-cover rounded-2xl" alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-[var(--text-main)]">{user.name}</p>
                          <p className="text-xs text-[var(--text-muted)] font-bold">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        user.active 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">{user.role}</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold truncate max-w-[150px]">
                        {organizations.find(o => o.id === user.organizationId)?.name || 'N/A'}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {user.role !== UserRole.SUPER_ADMIN && (
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.active)}
                          className={`p-3 rounded-xl transition-all ${
                            user.active 
                              ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' 
                              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                          }`}
                          title={user.active ? 'Bloquear Usuário' : 'Ativar Usuário'}
                        >
                          {user.active ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {(activeTab === 'organizations' ? filteredOrgs : filteredUsers).length === 0 && (
          <div className="p-20 text-center">
            <Search size={48} className="text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
            <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">Nenhum resultado encontrado.</p>
          </div>
        )}
      </div>

      {/* Limit Modal */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLimitModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] rounded-[40px] border border-[var(--border)] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--border)] bg-[var(--bg-card-alt)]">
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Limites da Organização</h3>
                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">{selectedOrg?.name}</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Máximo de Usuários</label>
                  <input 
                    type="number" 
                    value={limits.maxUsers}
                    onChange={(e) => setLimits({ ...limits, maxUsers: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Máximo de Imóveis</label>
                  <input 
                    type="number" 
                    value={limits.maxProperties}
                    onChange={(e) => setLimits({ ...limits, maxProperties: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                  />
                </div>
              </div>

              <div className="p-8 bg-[var(--bg-card-alt)] border-t border-[var(--border)] flex gap-4">
                <button 
                  onClick={() => setIsLimitModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateLimits}
                  className="flex-1 bg-[var(--accent)] text-[var(--accent-text)] py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Org Modal */}
      <AnimatePresence>
        {isOrgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrgModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] rounded-[40px] border border-[var(--border)] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--border)] bg-[var(--bg-card-alt)]">
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Nova Organização</h3>
                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Cadastrar nova empresa no Sintese ERP</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <input 
                    type="text" 
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                    placeholder="Ex: Master Imóveis"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">E-mail do Proprietário</label>
                  <input 
                    type="email" 
                    value={newOrg.ownerEmail}
                    onChange={(e) => setNewOrg({ ...newOrg, ownerEmail: e.target.value })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                    placeholder="exemplo@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Plano</label>
                  <select 
                    value={newOrg.plan}
                    onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="p-8 bg-[var(--bg-card-alt)] border-t border-[var(--border)] flex gap-4">
                <button 
                  onClick={() => setIsOrgModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateOrg}
                  className="flex-1 bg-[var(--accent)] text-[var(--accent-text)] py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Criar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] rounded-[40px] border border-[var(--border)] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--border)] bg-[var(--bg-card-alt)]">
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Novo Usuário</h3>
                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Cadastrar novo usuário no sistema</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                    placeholder="Nome do usuário"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">E-mail</label>
                  <input 
                    type="email" 
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Organização</label>
                  <select 
                    value={newUser.organizationId}
                    onChange={(e) => setNewUser({ ...newUser, organizationId: e.target.value })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                  >
                    <option value="">Selecione uma empresa</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Papel</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-6 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-black"
                  >
                    <option value={UserRole.ADMIN}>Administrador</option>
                    <option value={UserRole.OPERADOR}>Operador</option>
                    <option value={UserRole.BROKER}>Corretor</option>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="p-8 bg-[var(--bg-card-alt)] border-t border-[var(--border)] flex gap-4">
                <button 
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateUser}
                  className="flex-1 bg-[var(--accent)] text-[var(--accent-text)] py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Criar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminDashboard;
