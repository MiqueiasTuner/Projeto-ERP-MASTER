
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Home, Users, Box, ChevronDown, 
  ChevronUp, BarChart3, Settings, LogOut, PlusCircle, Menu, X as CloseIcon,
  FileText, MessageSquare, Kanban, CalendarDays, User, Gavel, Bell, Search, Clock, Globe, ShieldAlert, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, isConfigured, firebaseConfig } from './lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { 
  collection, onSnapshot, doc, setDoc, 
  deleteDoc, addDoc, query, where, getDocs,
  writeBatch
} from 'firebase/firestore';
import { ThemeProvider, useTheme } from './src/components/ThemeProvider';
import Dashboard from './pages/Dashboard';
import PropertyList from './pages/PropertyList';
import PropertyForm from './pages/PropertyForm';
import PropertyDetails from './pages/PropertyDetails';
import InsumosPage from './pages/inventory/InsumosPage';
import MovimentosPage from './pages/inventory/MovimentosPage';
import FornecedoresPage from './pages/inventory/FornecedoresPage';
import AlmoxarifadosPage from './pages/inventory/AlmoxarifadosPage';
import ComprasPage from './pages/inventory/ComprasPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import TeamsPage from './pages/TeamsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ChatPage from './pages/ChatPage';
import KanbanPage from './pages/KanbanPage';
import CalendarPage from './pages/CalendarPage';
import AuctionPage from './pages/AuctionPage';
import BrokerManagement from './pages/brokers/BrokerManagement';
import BrokerDashboard from './pages/brokers/BrokerDashboard';
import BrokerProperties from './pages/brokers/BrokerProperties';
import BrokerPropertyDetails from './pages/brokers/BrokerPropertyDetails';
import BrokerLeads from './pages/brokers/BrokerLeads';
import PublicPropertyView from './pages/PublicPropertyView';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { 
  Property, Expense, InventoryItem, StockMovement, Supplier, 
  Warehouse, UserAccount, UserRole, Team, PermissionModule, 
  PermissionAction, UserPermissions, PropertyStatus, PropertyLog, 
  MovementType, ExpenseCategory, Quote, QuoteStatus, Task, TaskStatus,
  Auction, Alert, Broker, Lead, Proposal, Reservation, CommercialStatus,
  Organization
} from './types';

const INITIAL_PERMISSIONS: UserPermissions = {
  properties: ['view', 'edit', 'delete'],
  inventory: ['view', 'edit', 'delete'],
  finances: ['view', 'edit', 'delete'],
  teams: ['view', 'edit', 'delete'],
  reports: ['view', 'edit', 'delete'],
  brokers: ['view', 'edit', 'delete']
};

const SidebarItem = ({ to, icon: Icon, label, active, visible = true, onClick, collapsed = false }: { to?: string, icon: any, label: string, active: boolean, visible?: boolean, onClick?: () => void, collapsed?: boolean }) => {
  if (!visible) return null;
  const content = (
    <div className={`flex items-center space-x-3 p-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
      active ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-yellow-500/20' : 'text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-header)]'
    }`} onClick={onClick} title={collapsed ? label : undefined}>
      <Icon size={18} className="flex-shrink-0" />
      <span className={`font-medium text-sm flex-1 transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>{label}</span>
    </div>
  );
  return to ? <Link to={to} onClick={onClick}>{content}</Link> : content;
};

const SidebarGroup = ({ label, icon: Icon, children, active, visible = true, collapsed = false }: { label: string, icon: any, children?: React.ReactNode, active: boolean, visible?: boolean, collapsed?: boolean }) => {
  const [isOpen, setIsOpen] = useState(active);
  if (!visible) return null;
  
  return (
    <div className="space-y-1">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 p-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
          active && !isOpen ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-header)]'
        }`}
        title={collapsed ? label : undefined}
      >
        <Icon size={18} className="flex-shrink-0" />
        <span className={`font-medium text-sm flex-1 transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>{label}</span>
        {!collapsed && (isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </div>
      {isOpen && !collapsed && <div className="pl-9 space-y-1 animate-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );
};

const ProtectedLayout = ({ children, currentUser, onLogout, tasks = [] }: { children: React.ReactNode, currentUser: UserAccount, onLogout: () => void, tasks?: Task[] }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Default open on desktop
  const [navSearchTerm, setNavSearchTerm] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const hasPermission = (module: PermissionModule, action: PermissionAction) => {
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return true;
    return currentUser.permissions[module]?.includes(action);
  };

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const isBroker = currentUser.role === UserRole.BROKER;

  const notifications = useMemo(() => {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    return tasks.filter(task => {
      if (!task.dueDate || task.status === TaskStatus.DONE) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate <= threeDaysFromNow;
    }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [tasks]);

  const unreadNotificationsCount = notifications.length;

  const menuItems = useMemo(() => {
    const items = [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', visible: !isBroker },
      { to: '/corretor', icon: LayoutDashboard, label: 'Painel', visible: isBroker },
      { to: '/imoveis', icon: Home, label: 'Imóveis', visible: !isBroker && hasPermission('properties', 'view') },
      { to: '/corretor/imoveis', icon: Home, label: 'Imóveis', visible: isBroker },
      { to: '/leiloes', icon: Gavel, label: 'Leilões', visible: !isBroker && hasPermission('properties', 'view') },
      { to: '/estoque/insumos', icon: Box, label: 'Insumos', visible: !isBroker && hasPermission('inventory', 'view') },
      { to: '/estoque/movimentos', icon: Box, label: 'Movimentos', visible: !isBroker && hasPermission('inventory', 'view') },
      { to: '/estoque/fornecedores', icon: Box, label: 'Fornecedores', visible: !isBroker && hasPermission('inventory', 'view') },
      { to: '/estoque/orcamentos', icon: Box, label: 'Orçamentos', visible: !isBroker && hasPermission('inventory', 'view') },
      { to: '/relatorios', icon: BarChart3, label: 'Relatórios', visible: !isBroker && hasPermission('reports', 'view') },
      { to: '/gestao-corretores', icon: Users, label: 'Corretores', visible: !isBroker && hasPermission('brokers', 'view') },
      { to: '/corretor', icon: LayoutDashboard, label: 'Portal Corretor', visible: !isBroker && hasPermission('brokers', 'view') },
      { to: '/corretor/leads', icon: Users, label: 'Meus Leads', visible: isBroker },
      {to: '/chat', icon: MessageSquare, label: 'Chat', visible: true},
      {to: '/tarefas', icon: Kanban, label: 'Tarefas', visible: !isBroker},
      {to: '/calendario', icon: CalendarDays, label: 'Agenda', visible: true},
      {to: '/equipe', icon: User, label: 'Equipe', visible: !isBroker && hasPermission('teams', 'view')},
      {to: '/integracoes', icon: Globe, label: 'Hub OLX', visible: !isBroker && hasPermission('properties', 'view')},
      {to: '/configuracoes', icon: Settings, label: 'Ajustes', visible: true},
      {to: '/super-admin', icon: ShieldAlert, label: 'Super Admin', visible: currentUser.role === UserRole.SUPER_ADMIN},
    ];
    return items.filter(item => item.visible && item.label.toLowerCase().includes(navSearchTerm.toLowerCase()));
  }, [isBroker, currentUser, navSearchTerm]);

  const isVisible = (label: string) => {
    return menuItems.some(item => item.label === label);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-main)] overflow-hidden">
      {/* Top Header - YouTube Style */}
      <header className="bg-[var(--bg-header)] border-b border-[var(--border)] h-16 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSidebar}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] hover:bg-white/10 rounded-full transition-colors hidden lg:block"
          >
            <Menu size={24} />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] hover:bg-white/10 rounded-full transition-colors lg:hidden"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0 group">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-[var(--accent)] to-yellow-200 rounded-2xl blur-[4px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-[var(--accent)]/10 overflow-hidden w-11 h-11 flex items-center justify-center shadow-sm">
                <img 
                  src={currentUser.companyLogo || "https://i.postimg.cc/jsxKRsym/sale-(1).png"} 
                  alt="Logo" 
                  className="w-full h-full object-contain rounded-lg" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-[var(--text-header)] tracking-tighter leading-none text-xl">
                {currentUser.companyLogo ? (
                  <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] block mb-1">Sintese ERP</span>
                ) : null}
                Sintese<span className="text-[var(--accent)]">ERP</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-2xl mx-4 lg:mx-12">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Buscar no menu..." 
              value={navSearchTerm}
              onChange={(e) => setNavSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-header)]/50 border border-[var(--border)] rounded-full py-2 pl-10 pr-4 text-sm text-[var(--text-header)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
           {/* Notifications */}
           <div className="relative">
             <button 
               onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
               className="p-2 text-[var(--text-muted)] hover:text-[var(--text-header)] hover:bg-white/10 rounded-full transition-colors relative"
             >
               <Bell size={22} />
               {unreadNotificationsCount > 0 && (
                 <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-[var(--bg-header)]">
                   {unreadNotificationsCount}
                 </span>
               )}
             </button>

             <AnimatePresence>
               {isNotificationsOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                   <motion.div 
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border)] z-50 overflow-hidden"
                   >
                     <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card-alt)]">
                       <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Notificações</h3>
                       <span className="text-[10px] font-bold text-slate-400 uppercase">{notifications.length} Pendentes</span>
                     </div>
                     <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                       {notifications.length > 0 ? (
                         notifications.map(task => (
                           <div 
                             key={task.id} 
                             onClick={() => { navigate('/tarefas'); setIsNotificationsOpen(false); }}
                             className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group"
                           >
                             <div className="flex items-start gap-3">
                               <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                 new Date(task.dueDate!) < new Date() ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                               }`} />
                               <div>
                                 <p className="text-sm font-bold text-slate-900 group-hover:text-yellow-600 transition-colors line-clamp-2">{task.title}</p>
                                 <div className="flex items-center gap-2 mt-1">
                                   <Clock size={12} className="text-slate-400" />
                                   <span className={`text-[10px] font-black uppercase tracking-widest ${
                                     new Date(task.dueDate!) < new Date() ? 'text-rose-500' : 'text-slate-500'
                                   }`}>
                                     Prazo: {new Date(task.dueDate!).toLocaleDateString('pt-BR')}
                                   </span>
                                 </div>
                               </div>
                             </div>
                           </div>
                         ))
                       ) : (
                         <div className="p-8 text-center">
                           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                             <Bell size={24} className="text-slate-300" />
                           </div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sem notificações</p>
                         </div>
                       )}
                     </div>
                     {notifications.length > 0 && (
                       <button 
                         onClick={() => { navigate('/tarefas'); setIsNotificationsOpen(false); }}
                         className="w-full p-3 text-[10px] font-black text-yellow-600 uppercase tracking-[0.2em] hover:bg-yellow-50 transition-colors border-t border-slate-100"
                       >
                         Ver todas as tarefas
                       </button>
                     )}
                   </motion.div>
                 </>
               )}
             </AnimatePresence>
           </div>

           <div className="flex items-center gap-3 px-3 py-1.5 bg-[var(--bg-header)]/50 rounded-full border border-[var(--border)] hover:bg-white/10 transition-colors cursor-pointer" onClick={() => navigate('/configuracoes')}>
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs font-black text-[var(--accent-text)] overflow-hidden border-2 border-[var(--border)]">
                {currentUser.photoUrl ? (
                  <img src={currentUser.photoUrl} alt={currentUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentUser.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <span className="hidden sm:block text-xs font-bold text-[var(--text-header)] pr-2">{currentUser.name}</span>
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`fixed inset-y-0 left-0 top-16 bg-[var(--bg-sidebar)] text-[var(--text-header)] flex flex-col z-40 transition-all duration-300 lg:static lg:h-full ${
            isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
          } ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
        >
          <div className="lg:hidden flex justify-end p-4">
             <button onClick={closeSidebar} className="text-[var(--text-muted)]"><CloseIcon /></button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto py-4 px-2 custom-scrollbar overflow-x-hidden">
            {isBroker ? (
              <>
                <SidebarItem to="/corretor" icon={LayoutDashboard} label="Painel" active={location.pathname === '/corretor'} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Painel')} />
                <SidebarItem to="/corretor/imoveis" icon={Home} label="Imóveis" active={location.pathname.startsWith('/corretor/imoveis') || location.pathname.startsWith('/corretor/imovel')} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Imóveis')} />
                <SidebarItem to="/corretor/leads" icon={Users} label="Meus Leads" active={location.pathname.startsWith('/corretor/leads')} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Meus Leads')} />
                <SidebarItem to="/chat" icon={MessageSquare} label="Chat" active={location.pathname === '/chat'} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Chat')} />
                <SidebarItem to="/calendario" icon={CalendarDays} label="Agenda" active={location.pathname === '/calendario'} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Agenda')} />
              </>
            ) : (
              <>
                <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} onClick={closeSidebar} visible={isVisible('Dashboard')} collapsed={isSidebarCollapsed} />
                
                <div className={`pt-6 pb-2 px-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Gestão Operacional</div>
                <div className={`my-2 border-t border-[var(--border)] mx-4 ${isSidebarCollapsed ? 'block' : 'hidden'}`} />
                
                <SidebarItem to="/imoveis" icon={Home} label="Imóveis" active={location.pathname.startsWith('/imoveis')} visible={isVisible('Imóveis')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/leiloes" icon={Gavel} label="Leilões" active={location.pathname.startsWith('/leiloes')} visible={isVisible('Leilões')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                
                <SidebarGroup label="Estoque" icon={Box} active={location.pathname.startsWith('/estoque')} visible={isVisible('Insumos') || isVisible('Movimentos') || isVisible('Fornecedores') || isVisible('Orçamentos')} collapsed={isSidebarCollapsed}>
                  {isVisible('Insumos') && <Link to="/estoque/insumos" onClick={closeSidebar} className={`block py-2 text-xs font-medium whitespace-nowrap pl-2 ${location.pathname === '/estoque/insumos' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-header)]'}`}>• Insumos</Link>}
                  {isVisible('Movimentos') && <Link to="/estoque/movimentos" onClick={closeSidebar} className={`block py-2 text-xs font-medium whitespace-nowrap pl-2 ${location.pathname === '/estoque/movimentos' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-header)]'}`}>• Movimentos</Link>}
                  {isVisible('Fornecedores') && <Link to="/estoque/fornecedores" onClick={closeSidebar} className={`block py-2 text-xs font-medium whitespace-nowrap pl-2 ${location.pathname === '/estoque/fornecedores' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-header)]'}`}>• Fornecedores</Link>}
                  {isVisible('Orçamentos') && <Link to="/estoque/orcamentos" onClick={closeSidebar} className={`block py-2 text-xs font-medium whitespace-nowrap pl-2 ${location.pathname === '/estoque/orcamentos' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-header)]'}`}>• Orçamentos</Link>}
                </SidebarGroup>

                <div className={`pt-6 pb-2 px-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Estratégico</div>
                <div className={`my-2 border-t border-[var(--border)] mx-4 ${isSidebarCollapsed ? 'block' : 'hidden'}`} />

                <SidebarItem to="/relatorios" icon={BarChart3} label="Relatórios" active={location.pathname === '/relatorios'} visible={isVisible('Relatórios')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/gestao-corretores" icon={Users} label="Corretores" active={location.pathname === '/gestao-corretores'} visible={isVisible('Corretores')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                
                <div className={`pt-6 pb-2 px-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Colaboração</div>
                <div className={`my-2 border-t border-[var(--border)] mx-4 ${isSidebarCollapsed ? 'block' : 'hidden'}`} />

                <SidebarItem to="/chat" icon={MessageSquare} label="Chat" active={location.pathname === '/chat'} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Chat')} />
                <SidebarItem to="/tarefas" icon={Kanban} label="Tarefas" active={location.pathname === '/tarefas'} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Tarefas')} />
                <SidebarItem to="/calendario" icon={CalendarDays} label="Agenda" active={location.pathname === '/calendario'} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Agenda')} />
                
                <div title="Em breve" className="opacity-50 cursor-not-allowed">
                  <SidebarItem icon={FileText} label="Ligações" active={false} visible={isVisible('Ligações')} collapsed={isSidebarCollapsed} onClick={() => {}} />
                </div>

                <div className={`pt-6 pb-2 px-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Configurações</div>
                <div className={`my-2 border-t border-[var(--border)] mx-4 ${isSidebarCollapsed ? 'block' : 'hidden'}`} />

                <SidebarItem to="/equipe" icon={User} label="Equipe" active={location.pathname === '/equipe'} visible={isVisible('Equipe')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/integracoes" icon={Globe} label="Hub OLX" active={location.pathname === '/integracoes'} visible={isVisible('Hub OLX')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/configuracoes" icon={Settings} label="Ajustes" active={location.pathname === '/configuracoes'} onClick={closeSidebar} collapsed={isSidebarCollapsed} visible={isVisible('Ajustes')} />
              </>
            )}
            
            <button onClick={onLogout} className="flex items-center space-x-3 px-4 py-3 w-full rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-colors mt-2 group">
              <LogOut size={20} className="flex-shrink-0" /> 
              <span className={`font-medium text-sm whitespace-nowrap transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Sair</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${location.pathname === '/' ? 'bg-[var(--bg-header)]' : 'bg-[var(--bg-main)]'} relative ${location.pathname === '/calendario' ? '' : 'p-4 lg:p-8'}`}>
          <div className={location.pathname === '/calendario' ? 'h-full' : 'max-w-[1440px] mx-auto pb-20 lg:pb-0'}>
            {children}
          </div>
          {location.pathname === '/' && (
            <footer className="mt-20 pb-10 text-center border-t border-[var(--border)] pt-10">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
                © 2026 Sintese ERP. Todos os direitos reservados Sintese Web
              </p>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Frontend Protection
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
      }
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [logs, setLogs] = useState<PropertyLog[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentUserData, setCurrentUserData] = useState<UserAccount | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [viewingOrgId, setViewingOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
      if (!user) {
        setLoading(false);
        setCurrentUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch current user data first
  useEffect(() => {
    if (!session || !db) return;
    
    const unsub = onSnapshot(doc(db, 'users', session.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const isSuperAdmin = data.email === 'miqueiasyout@gmail.com';
        setCurrentUserData({ 
          ...data, 
          id: snapshot.id,
          role: isSuperAdmin ? UserRole.SUPER_ADMIN : data.role
        } as UserAccount);
      }
      setLoading(false);
    });
    
    return () => unsub();
  }, [session]);

  useEffect(() => {
    if (!session || !db) return;
    
    const effectiveOrgId = (currentUserData?.role === UserRole.SUPER_ADMIN && viewingOrgId) 
      ? viewingOrgId 
      : (currentUserData?.organizationId || 'default');

    const unsubOrg = onSnapshot(doc(db, 'organizations', effectiveOrgId), (snapshot) => {
      if (snapshot.exists()) {
        setCurrentOrg({ ...snapshot.data(), id: snapshot.id } as Organization);
      }
    });

    const collectionsToFetch: any[] = [
      { name: 'properties', setter: setProperties },
      { name: 'expenses', setter: setExpenses },
      { name: 'inventory', setter: setInventory },
      { name: 'movements', setter: setMovements },
      { name: 'suppliers', setter: setSuppliers },
      { name: 'warehouses', setter: setWarehouses },
      { name: 'users', setter: setUsers },
      { name: 'teams', setter: setTeams },
      { name: 'logs', setter: setLogs },
      { name: 'quotes', setter: setQuotes },
      { name: 'tasks', setter: setTasks },
      { name: 'auctions', setter: setAuctions },
      { name: 'alerts', setter: setAlerts },
      { name: 'brokers', setter: setBrokers },
      { name: 'leads', setter: setLeads },
      { name: 'proposals', setter: setProposals },
      { name: 'reservations', setter: setReservations },
      { name: 'messages', setter: () => {} }, // Messages are usually handled in ChatPage, but let's ensure they are available if needed
    ];

    const unsubscribes = collectionsToFetch.map(({ name, setter }) => {
      // Se for Super Admin sem visualização específica OU se for um contexto 'default' (legado),
      // buscamos todos os dados sem o filtro de organizationId.
      const q = (currentUserData?.role === UserRole.SUPER_ADMIN && !viewingOrgId) || effectiveOrgId === 'default'
        ? query(collection(db, name))
        : query(collection(db, name), where('organizationId', '==', effectiveOrgId));

      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[];
        setter(data);
      }, (err) => {
        console.error(`Error fetching ${name}:`, err);
      });
    });

    return () => {
      unsubOrg();
      unsubscribes.forEach(unsub => unsub());
    };
  }, [session, currentUserData?.organizationId, viewingOrgId, currentUserData?.role]);

  const foundBroker = brokers.find(b => b.email === session?.email);

  const currentUser: UserAccount = currentUserData ? {
    ...currentUserData,
    permissions: currentUserData.permissions || INITIAL_PERMISSIONS
  } : foundBroker ? {
    id: foundBroker.id,
    name: foundBroker.name,
    email: foundBroker.email,
    role: UserRole.BROKER,
    organizationId: foundBroker.organizationId,
    active: foundBroker.active,
    permissions: { ...INITIAL_PERMISSIONS, brokers: [] }
  } : {
    id: session?.uid || 'loading',
    name: session?.displayName || 'Usuário',
    email: session?.email || '',
    role: UserRole.ADMIN, 
    active: true,
    organizationId: 'default',
    permissions: INITIAL_PERMISSIONS
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const addLog = async (log: Omit<PropertyLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'organizationId'>) => {
    await addDoc(collection(db, 'logs'), {
      ...log,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      organizationId: currentUser.organizationId
    });
  };

  const saveProperty = async (p: Property) => {
    const { id, ...data } = p;
    const organizationId = currentUser.organizationId || 'default';
    
    if (!id) {
      // New property, check limit
      if (currentOrg && currentOrg.maxProperties && properties.length >= currentOrg.maxProperties) {
        alert(`Limite de imóveis atingido (${currentOrg.maxProperties}). Por favor, faça um upgrade no seu plano.`);
        return;
      }
    }

    if (id) {
      await setDoc(doc(db, 'properties', id), { ...data, organizationId } as any, { merge: true });
    } else {
      const docRef = doc(collection(db, 'properties'));
      await setDoc(docRef, { ...data, id: docRef.id, organizationId } as any);
    }
  };

  const isMasterUser = currentUser.email === 'miqueiasyout@gmail.com';

  const deleteProperty = async (id: string) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este imóvel?")) return;
    await deleteDoc(doc(db, 'properties', id));
    navigate('/imoveis');
  };

  const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'organizationId'> & { id?: string }) => {
    const organizationId = currentUser.organizationId || 'default';
    if (item.id) {
      const { id, ...data } = item;
      await setDoc(doc(db, 'inventory', id), { ...data, organizationId } as any, { merge: true });
    } else {
      const docRef = doc(collection(db, 'inventory'));
      await setDoc(docRef, { ...item, id: docRef.id, organizationId } as any);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este insumo?")) return;
    await deleteDoc(doc(db, 'inventory', id));
  };

  const addSupplier = async (s: Supplier) => {
    const organizationId = currentUser.organizationId || 'default';
    if (s.id) {
      const { id, ...data } = s;
      await setDoc(doc(db, 'suppliers', id), { ...data, organizationId } as any, { merge: true });
    } else {
      const docRef = doc(collection(db, 'suppliers'));
      const { id, ...data } = s;
      await setDoc(docRef, { ...data, id: docRef.id, organizationId } as any);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja realmente excluir este fornecedor?")) return;
    await deleteDoc(doc(db, 'suppliers', id));
  };

  const addWarehouse = async (w: Warehouse) => {
    const { id, ...data } = w;
    const organizationId = currentUser.organizationId || 'default';
    await addDoc(collection(db, 'warehouses'), { ...data, organizationId } as any);
  };

  const deleteWarehouse = async (id: string) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este almoxarifado?")) return;
    await deleteDoc(doc(db, 'warehouses', id));
  };

  const handleAddMovement = async (mov: StockMovement) => {
    const { id, ...data } = mov;
    const organizationId = currentUser.organizationId || 'default';
    await addDoc(collection(db, 'movements'), { ...data, organizationId } as any);
    
    const item = inventory.find(i => i.id === mov.itemId);
    if (item) {
      const quantityChange = mov.type === MovementType.ENTRADA_COMPRA ? mov.quantity : -mov.quantity;
      const newStock = item.currentStock + quantityChange;
      await setDoc(doc(db, 'inventory', item.id), { currentStock: newStock }, { merge: true });
    }
  };

  const addExpense = async (e: Expense) => {
    const { id, ...data } = e;
    const organizationId = currentUser.organizationId || 'default';
    if (id) {
      await setDoc(doc(db, 'expenses', id), { ...data, organizationId } as any, { merge: true });
    } else {
      const docRef = doc(collection(db, 'expenses'));
      await setDoc(docRef, { ...data, id: docRef.id, organizationId } as any);
    }
  };

  const updateUser = async (u: UserAccount) => {
    const { id, ...data } = u;
    await setDoc(doc(db, 'users', id), data, { merge: true });
  };

  const addQuote = async (q: Quote) => {
    const { id, ...data } = q;
    const organizationId = currentUser.organizationId || 'default';
    await addDoc(collection(db, 'quotes'), { ...data, organizationId } as any);
  };

  const updateQuoteStatus = async (id: string, status: QuoteStatus) => {
    await setDoc(doc(db, 'quotes', id), { status }, { merge: true });
  };

  const deleteQuote = async (id: string) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este orçamento?")) return;
    await deleteDoc(doc(db, 'quotes', id));
  };

  const purchaseQuote = async (quote: Quote) => {
    if (!window.confirm("Deseja confirmar a compra e atualizar o estoque?")) return;
    
    const batch = writeBatch(db);
    
    // 1. Update quote status
    batch.update(doc(db, 'quotes', quote.id), { status: QuoteStatus.RECEBIDO });
    
    // 2. Add stock movements and update inventory
    for (const item of quote.items) {
      const movement: Omit<StockMovement, 'id'> = {
        organizationId: currentUserData?.organizationId || '',
        itemId: item.itemId,
        type: MovementType.ENTRADA_COMPRA,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        date: new Date().toISOString().split('T')[0],
        supplierId: quote.supplierId,
        description: `Compra via orçamento: ${quote.id}`
      };
      
      const movRef = doc(collection(db, 'movements'));
      batch.set(movRef, movement);
      
      const invItem = inventory.find(i => i.id === item.itemId);
      if (invItem) {
        batch.update(doc(db, 'inventory', invItem.id), {
          currentStock: invItem.currentStock + item.quantity
        });
      }
    }
    
    await batch.commit();
  };

  // Broker Module Handlers
  const addBroker = async (b: Broker) => {
    try {
      const { id, password, ...data } = b;
      
      // 0. Check if user already exists in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", b.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert("Erro: Este e-mail já está cadastrado no sistema. Utilize um e-mail diferente.");
        return;
      }

      // 1. Create Auth User using secondary app
      let secondaryApp;
      try {
        secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      } catch (e) {
        // If app already exists, use it
        secondaryApp = (await import('firebase/app')).getApp('Secondary');
      }
      
      const secondaryAuth = getAuth(secondaryApp);
      
      let authUid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, b.email, b.password!);
        authUid = userCredential.user.uid;
        await signOut(secondaryAuth);
      } catch (authError: any) {
        console.error("Error creating auth user:", authError);
        if (authError.code === 'auth/email-already-in-use') {
          alert("Erro: Este e-mail já está em uso por outra conta no Firebase. Por favor, use outro e-mail.");
        } else {
          alert(`Erro ao criar conta de acesso: ${authError.message}`);
        }
        try { await deleteApp(secondaryApp); } catch (e) {}
        return;
      }
      try { await deleteApp(secondaryApp); } catch (e) {}

      // 2. Save to brokers collection using the Auth UID as document ID
      await setDoc(doc(db, 'brokers', authUid), { 
        ...data, 
        id: authUid, 
        userId: authUid,
        organizationId: currentUser.organizationId || 'default'
      });

      // 3. Create user document
      await setDoc(doc(db, 'users', authUid), {
        id: authUid,
        name: b.name,
        email: b.email,
        role: UserRole.BROKER,
        organizationId: currentUser.organizationId || 'default',
        active: b.active,
        permissions: {
          properties: ['view'],
          inventory: [],
          finances: [],
          teams: [],
          reports: [],
          brokers: []
        }
      });
      
      alert("Corretor cadastrado com sucesso! Ele já pode logar com as credenciais definidas.");
    } catch (error: any) {
      console.error("Error adding broker:", error);
      alert(`Erro ao cadastrar corretor: ${error.message}`);
    }
  };

  const updateBroker = async (b: Broker) => {
    const { id, ...data } = b;
    await setDoc(doc(db, 'brokers', id), data, { merge: true });
    
    // Update corresponding user document if it exists
    await setDoc(doc(db, 'users', id), {
      name: b.name,
      email: b.email,
      active: b.active
    }, { merge: true });
  };

  const deleteBroker = async (id: string) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este corretor?")) return;
    await deleteDoc(doc(db, 'brokers', id));
  };

  const addLead = async (l: Lead) => {
    const { id, ...data } = l;
    const organizationId = currentUser.organizationId || 'default';
    const docRef = doc(collection(db, 'leads'));
    await setDoc(docRef, { ...data, id: docRef.id, organizationId });
  };

  const updateLead = async (l: Lead) => {
    const { id, ...data } = l;
    await setDoc(doc(db, 'leads', id), data, { merge: true });
  };

  const markPropertyAsSold = async (propertyId: string, brokerId: string, salePrice: number, saleDate: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const batch = writeBatch(db);
    
    // 1. Update property status and commercial fields
    batch.update(doc(db, 'properties', propertyId), {
      status: PropertyStatus.VENDIDO,
      commercialStatus: CommercialStatus.VENDIDO,
      responsibleBrokerId: brokerId,
      salePrice: salePrice,
      saleDate: saleDate,
      availableForBrokers: false
    });

    // 2. Add log for executive dashboard
    const logRef = doc(collection(db, 'logs'));
    const organizationId = currentUser.organizationId || 'default';
    const log: Omit<PropertyLog, 'id'> = {
      propertyId,
      organizationId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'BAIXA_VENDA',
      fromStatus: property.status,
      toStatus: PropertyStatus.VENDIDO,
      timestamp: new Date().toISOString(),
      details: `Venda registrada pelo corretor ID: ${brokerId}. Valor: ${salePrice}`
    };
    batch.set(logRef, log);

    await batch.commit();
    alert('Venda registrada com sucesso! O imóvel foi removido da vitrine.');
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl max-w-md">
          <Building2 size={48} className="text-rose-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black mb-4 uppercase tracking-tight">Configuração Necessária</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            As chaves do Firebase não foram encontradas. Por favor, configure as variáveis de ambiente no painel da plataforma para continuar.
          </p>
          <div className="space-y-2 text-left bg-slate-950/50 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-slate-500">
            <p>VITE_FIREBASE_API_KEY</p>
            <p>VITE_FIREBASE_PROJECT_ID</p>
            <p>...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120]">
      <div className="w-12 h-12 border-4 border-slate-800 border-t-yellow-500 rounded-full animate-spin mb-4" />
      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Carregando Sintese ERP...</p>
    </div>
  );

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={() => {}} />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/publico/imovel/:id" element={<PublicPropertyView properties={properties} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // Blocked Organization Screen
  if (currentOrg?.status === 'blocked' && currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="bg-rose-500/10 border border-rose-500/20 p-12 rounded-[40px] max-w-md shadow-2xl">
          <ShieldAlert size={80} className="text-rose-500 mx-auto mb-8" />
          <h1 className="text-3xl font-black mb-4 uppercase tracking-tight">Acesso Suspenso</h1>
          <p className="text-slate-400 font-medium mb-10 leading-relaxed">
            Sua organização foi temporariamente bloqueada. Por favor, entre em contato com o suporte do Sintese ERP para regularizar sua situação.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-rose-600 transition-all"
          >
            Sair do Sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedLayout currentUser={currentUser} onLogout={handleLogout} tasks={tasks}>
      {viewingOrgId && currentUser.role === UserRole.SUPER_ADMIN && (
        <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-500 sticky top-0 z-[60]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Eye size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Modo de Visualização Ativo</p>
              <p className="text-[10px] font-bold opacity-90">Você está visualizando os dados da organização: <span className="underline">{currentOrg?.name}</span></p>
            </div>
          </div>
          <button 
            onClick={() => setViewingOrgId(null)}
            className="flex items-center gap-2 bg-white text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm"
          >
            <EyeOff size={14} />
            Sair da Visualização
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard properties={properties} expenses={expenses} tasks={tasks} inventory={inventory} movements={movements} quotes={quotes} auctions={auctions} alerts={alerts} currentUser={currentUser} />} />
        <Route path="/leiloes" element={<AuctionPage auctions={auctions} properties={properties} currentUser={currentUser} />} />
        <Route path="/imoveis" element={<PropertyList properties={properties} expenses={expenses} onUpdateStatus={async (id, status) => { await setDoc(doc(db, 'properties', id), { status }, { merge: true }); }} onDeleteProperty={deleteProperty} addLog={addLog} currentUser={currentUser} />} />
        <Route path="/imovel/:id" element={<PropertyDetails properties={properties} expenses={expenses} logs={logs} tasks={tasks} onAddExpense={addExpense} onDeleteExpense={async (id) => { 
          if (!isMasterUser) {
            alert("Apenas o Administrador Master pode excluir registros.");
            return;
          }
          await deleteDoc(doc(db, 'expenses', id)); 
        }} onDeleteProperty={deleteProperty} />} />
        <Route path="/novo" element={<PropertyForm properties={properties} onSave={saveProperty} />} />
        <Route path="/editar/:id" element={<PropertyForm properties={properties} onSave={saveProperty} />} />
        <Route path="/estoque/insumos" element={<InsumosPage items={inventory} movements={movements} onDeleteItem={deleteInventoryItem} onAddItem={addInventoryItem} currentUser={currentUser} />} />
        <Route path="/estoque/movimentos" element={<MovimentosPage movements={movements} items={inventory} suppliers={suppliers} properties={properties} onAddMovement={handleAddMovement} currentUser={currentUser} />} />
        <Route path="/estoque/fornecedores" element={<FornecedoresPage suppliers={suppliers} onAddSupplier={addSupplier} onDeleteSupplier={deleteSupplier} currentUser={currentUser} />} />
        <Route path="/estoque/almoxarifados" element={<AlmoxarifadosPage warehouses={warehouses} onAddWarehouse={addWarehouse} onDeleteWarehouse={deleteWarehouse} currentUser={currentUser} />} />
        <Route path="/estoque/orcamentos" element={<ComprasPage quotes={quotes} suppliers={suppliers} inventory={inventory} properties={properties} onAddQuote={addQuote} onUpdateQuoteStatus={updateQuoteStatus} onDeleteQuote={deleteQuote} onPurchaseQuote={purchaseQuote} currentUser={currentUser} />} />
        <Route path="/relatorios" element={<ReportsPage properties={properties} expenses={expenses} inventory={inventory} tasks={tasks} auctions={auctions} brokers={brokers} leads={leads} />} />
        <Route path="/equipe" element={<TeamsPage currentUser={currentUser} users={users} setUsers={setUsers} teams={teams} setTeams={setTeams} />} />
        <Route path="/integracoes" element={<IntegrationsPage />} />
        <Route path="/chat" element={<ChatPage currentUser={currentUser} />} />
        <Route path="/tarefas" element={<KanbanPage currentUser={currentUser} users={users} teams={teams} properties={properties} />} />
        <Route path="/calendario" element={<CalendarPage currentUser={currentUser} />} />
        <Route path="/configuracoes" element={<SettingsPage currentUser={currentUser} properties={properties} />} />
        <Route path="/super-admin" element={currentUser.role === UserRole.SUPER_ADMIN ? <SuperAdminDashboard onViewOrg={setViewingOrgId} /> : <Navigate to="/" />} />
        <Route path="/publico/imovel/:id" element={<PublicPropertyView properties={properties} />} />
        
        {/* Broker Routes */}
        <Route path="/gestao-corretores" element={<BrokerManagement brokers={brokers} leads={leads} onAddBroker={addBroker} onUpdateBroker={updateBroker} onDeleteBroker={deleteBroker} />} />
        <Route path="/corretor" element={<BrokerDashboard leads={leads.filter(l => l.brokerId === currentUser.id)} properties={properties} />} />
        <Route path="/corretor/imoveis" element={<BrokerProperties properties={properties} />} />
        <Route path="/corretor/imovel/:id" element={<BrokerPropertyDetails properties={properties} onAddLead={addLead} currentUser={currentUser} />} />
        <Route path="/corretor/leads" element={<BrokerLeads leads={leads.filter(l => l.brokerId === currentUser.id)} properties={properties} onUpdateLead={updateLead} onMarkAsSold={markPropertyAsSold} />} />
        
        <Route path="*" element={<Navigate to={currentUser.role === UserRole.BROKER ? "/corretor" : "/"} />} />
      </Routes>
    </ProtectedLayout>
  );
};

const App = () => (
  <ThemeProvider>
    <HashRouter>
      <AppContent />
    </HashRouter>
  </ThemeProvider>
);

export default App;
