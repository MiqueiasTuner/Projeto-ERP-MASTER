
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ShieldAlert, CheckCircle2, XCircle, 
  Search, Filter, ArrowRight, MoreVertical, ShieldCheck,
  BarChart3, Globe, Lock, Unlock, Mail, Phone, Calendar,
  Plus, Settings, User, Eye
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, getDocs, setDoc } from 'firebase/firestore';
import { UserAccount, UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../src/lib/firestore-errors';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate } from '../utils';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserAccount));
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      console.error("Error fetching users:", err);
      setLoading(false);
    });

    return () => {
      unsubUsers();
    };
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { active: !currentStatus });
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Erro ao atualizar status do usuário.");
    }
  };

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.ADMIN });

  const handleCreateUser = async () => {
    try {
      const userRef = doc(collection(db, 'users'));
      await setDoc(userRef, {
        id: userRef.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
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
      setNewUser({ name: '', email: '', role: UserRole.ADMIN });
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Erro ao criar usuário.");
    }
  };

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
          <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">Gestão Global de Usuários Sintese ERP</p>
        </div>
        
        <button 
          onClick={() => setIsUserModalOpen(true)}
          className="bg-[var(--accent)] text-[var(--accent-text)] px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={64} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Total de Usuários</p>
          <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{users.length}</h3>
        </div>
        <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={64} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Usuários Ativos</p>
          <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{users.filter(u => u.active).length}</h3>
        </div>
        <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border)] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <ShieldAlert size={64} className="text-rose-500" />
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Usuários Inativos</p>
          <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{users.filter(u => !u.active).length}</h3>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail do usuário..."
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
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Papel</th>
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.map((user) => (
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
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="p-20 text-center">
            <Search size={48} className="text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
            <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">Nenhum resultado encontrado.</p>
          </div>
        )}
      </div>

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
