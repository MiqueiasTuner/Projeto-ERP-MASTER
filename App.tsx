
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Home, Users, Box, ChevronDown, 
  ChevronUp, BarChart3, Settings, LogOut, PlusCircle, Menu, X as CloseIcon,
  FileText, MessageSquare, Kanban, CalendarDays, User, Gavel, Bell
} from 'lucide-react';
import { auth, db, isConfigured } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, onSnapshot, doc, setDoc, 
  deleteDoc, addDoc, query, where, getDocs,
  writeBatch
} from 'firebase/firestore';
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
import { 
  Property, Expense, InventoryItem, StockMovement, Supplier, 
  Warehouse, UserAccount, UserRole, Team, PermissionModule, 
  PermissionAction, UserPermissions, PropertyStatus, PropertyLog, 
  MovementType, ExpenseCategory, Quote, QuoteStatus, Task,
  Auction, Alert, Broker, Lead, Proposal, Reservation
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
      active ? 'bg-[#FFD700] text-[#0A192F] shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
          active && !isOpen ? 'bg-[#FFD700]/10 text-[#FFD700]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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

const ProtectedLayout = ({ children, currentUser, onLogout }: { children: React.ReactNode, currentUser: UserAccount, onLogout: () => void }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Default open on desktop
  const location = useLocation();

  const hasPermission = (module: PermissionModule, action: PermissionAction) => {
    if (currentUser.role === UserRole.ADMIN) return true;
    return currentUser.permissions[module]?.includes(action);
  };

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const isBroker = currentUser.role === UserRole.BROKER;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top Header - YouTube Style */}
      <header className="bg-[#0A192F] border-b border-slate-800 h-16 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSidebar}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden lg:block"
          >
            <Menu size={24} />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors lg:hidden"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 bg-[#FFD700] rounded-xl blur-[2px] opacity-20"></div>
              <div className="relative bg-[#0A192F] p-1 rounded-xl border border-[#FFD700]/20 overflow-hidden w-9 h-9 flex items-center justify-center">
                <img src={currentUser.companyLogo || "https://i.postimg.cc/jsxKRsym/sale-(1).png"} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white tracking-tight leading-none text-lg">
                {currentUser.companyLogo ? (
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-0.5">Sintese ERP</span>
                ) : null}
                Sintese <span className="text-[#FFD700]">ERP</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
              <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center text-[10px] font-black text-[#0A192F]">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-slate-300 pr-2">{currentUser.name}</span>
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`fixed inset-y-0 left-0 top-16 bg-[#0A192F] text-white flex flex-col z-40 transition-all duration-300 lg:static lg:h-full ${
            isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
          } ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
        >
          <div className="lg:hidden flex justify-end p-4">
             <button onClick={closeSidebar} className="text-slate-400"><CloseIcon /></button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto py-4 px-2 custom-scrollbar overflow-x-hidden">
            {isBroker ? (
              <>
                <SidebarItem to="/corretor" icon={LayoutDashboard} label="Painel" active={location.pathname === '/corretor'} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/corretor/imoveis" icon={Home} label="Imóveis" active={location.pathname.startsWith('/corretor/imoveis') || location.pathname.startsWith('/corretor/imovel')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/corretor/leads" icon={Users} label="Meus Leads" active={location.pathname.startsWith('/corretor/leads')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/chat" icon={MessageSquare} label="Chat" active={location.pathname === '/chat'} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/calendario" icon={CalendarDays} label="Agenda" active={location.pathname === '/calendario'} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
              </>
            ) : (
              <>
                <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} onClick={closeSidebar} visible={true} collapsed={isSidebarCollapsed} />
                
                <div className={`pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Gestão Operacional</div>
                <div className={`my-2 border-t border-slate-800 mx-4 ${isSidebarCollapsed ? 'block' : 'hidden'}`} />
                
                <SidebarItem to="/imoveis" icon={Home} label="Imóveis" active={location.pathname.startsWith('/imoveis')} visible={hasPermission('properties', 'view')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/leiloes" icon={Gavel} label="Leilões" active={location.pathname.startsWith('/leiloes')} visible={hasPermission('properties', 'view')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                
                <SidebarGroup label="Estoque" icon={Box} active={location.pathname.startsWith('/estoque')} visible={hasPermission('inventory', 'view')} collapsed={isSidebarCollapsed}>
                  <Link to="/estoque/insumos" onClick={closeSidebar} className={`block py-2 text-xs font-medium whitespace-nowrap pl-2 ${location.pathname === '/estoque/insumos' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>• Insumos</Link>
                  <Link to="/estoque/movimentos" onClick={closeSidebar} className={`block py-2 text-xs font-medium whitespace-nowrap pl-2 ${location.pathname === '/estoque/movimentos' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>• Movimentos</Link>
                  <Link to="/estoque/fornecedores" onClick={closeSidebar} className={`block py-2 text-xs font-medium whitespace-nowrap pl-2 ${location.pathname === '/estoque/fornecedores' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>• Fornecedores</Link>
                  <Link to="/estoque/orcamentos" onClick={closeSidebar} className={`block py-2 text-xs font-medium whitespace-nowrap pl-2 ${location.pathname === '/estoque/orcamentos' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>• Orçamentos</Link>
                </SidebarGroup>

                <div className={`pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Estratégico</div>
                <div className={`my-2 border-t border-slate-800 mx-4 ${isSidebarCollapsed ? 'block' : 'hidden'}`} />

                <SidebarItem to="/relatorios" icon={BarChart3} label="Relatórios" active={location.pathname === '/relatorios'} visible={hasPermission('reports', 'view')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/gestao-corretores" icon={Users} label="Corretores" active={location.pathname === '/gestao-corretores'} visible={hasPermission('brokers', 'view')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                
                <div className={`pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Colaboração</div>
                <div className={`my-2 border-t border-slate-800 mx-4 ${isSidebarCollapsed ? 'block' : 'hidden'}`} />

                <SidebarItem to="/chat" icon={MessageSquare} label="Chat Interno" active={location.pathname === '/chat'} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/tarefas" icon={Kanban} label="Tarefas Internas" active={location.pathname === '/tarefas'} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/calendario" icon={CalendarDays} label="Agenda" active={location.pathname === '/calendario'} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                
                <div title="Em breve" className="opacity-50 cursor-not-allowed">
                  <SidebarItem icon={FileText} label="Ligações" active={false} visible={true} collapsed={isSidebarCollapsed} onClick={() => {}} />
                </div>

                <div className={`pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Configurações</div>
                <div className={`my-2 border-t border-slate-800 mx-4 ${isSidebarCollapsed ? 'block' : 'hidden'}`} />

                <SidebarItem to="/equipe" icon={User} label="Equipe e Acessos" active={location.pathname === '/equipe'} visible={hasPermission('teams', 'view')} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
                <SidebarItem to="/configuracoes" icon={Settings} label="Ajustes" active={location.pathname === '/configuracoes'} onClick={closeSidebar} collapsed={isSidebarCollapsed} />
              </>
            )}
            
            <button onClick={onLogout} className="flex items-center space-x-3 px-4 py-3 w-full rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-colors mt-2 group">
              <LogOut size={20} className="flex-shrink-0" /> 
              <span className={`font-medium text-sm whitespace-nowrap transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Sair</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${location.pathname === '/' ? 'bg-[#0A192F]' : 'bg-slate-50'} relative ${location.pathname === '/calendario' ? '' : 'p-6 lg:p-10'}`}>
          <div className={location.pathname === '/calendario' ? 'h-full' : 'max-w-7xl mx-auto pb-20 lg:pb-0'}>
            {children}
          </div>
          {location.pathname === '/' && (
            <footer className="mt-20 pb-10 text-center border-t border-slate-200/50 pt-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
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

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !db) return;

    const collections: any[] = [
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
    ];

    const unsubscribes = collections.map(({ name, setter }) => {
      return onSnapshot(collection(db, name), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[];
        setter(data);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [session]);

  const foundUser = users.find(u => u.email === session?.email);
  const foundBroker = brokers.find(b => b.email === session?.email);

  const currentUser: UserAccount = foundUser ? {
    ...foundUser,
    permissions: foundUser.permissions || INITIAL_PERMISSIONS
  } : foundBroker ? {
    id: foundBroker.id,
    name: foundBroker.name,
    email: foundBroker.email,
    role: UserRole.BROKER,
    active: foundBroker.active,
    permissions: { ...INITIAL_PERMISSIONS, brokers: [] }
  } : {
    id: session?.uid || 'loading',
    name: session?.displayName || 'Usuário',
    email: session?.email || '',
    role: UserRole.ADMIN, 
    active: true,
    permissions: INITIAL_PERMISSIONS
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const addLog = async (log: Omit<PropertyLog, 'id' | 'timestamp' | 'userId' | 'userName'>) => {
    await addDoc(collection(db, 'logs'), {
      ...log,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name
    });
  };

  const saveProperty = async (p: Property) => {
    const { id, ...data } = p;
    if (id) {
      await setDoc(doc(db, 'properties', id), data as any, { merge: true });
    } else {
      const docRef = doc(collection(db, 'properties'));
      await setDoc(docRef, { ...data, id: docRef.id } as any);
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

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'> & { id?: string }) => {
    if (item.id) {
      const { id, ...data } = item;
      await setDoc(doc(db, 'inventory', id), data as any, { merge: true });
    } else {
      const docRef = doc(collection(db, 'inventory'));
      await setDoc(docRef, { ...item, id: docRef.id } as any);
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
    if (s.id) {
      const { id, ...data } = s;
      await setDoc(doc(db, 'suppliers', id), data as any, { merge: true });
    } else {
      const docRef = doc(collection(db, 'suppliers'));
      const { id, ...data } = s;
      await setDoc(docRef, { ...data, id: docRef.id } as any);
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
    await addDoc(collection(db, 'warehouses'), data as any);
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
    await addDoc(collection(db, 'movements'), data as any);
    
    const item = inventory.find(i => i.id === mov.itemId);
    if (item) {
      const quantityChange = mov.type === MovementType.ENTRADA_COMPRA ? mov.quantity : -mov.quantity;
      const newStock = item.currentStock + quantityChange;
      await setDoc(doc(db, 'inventory', item.id), { currentStock: newStock }, { merge: true });
    }
  };

  const addExpense = async (e: Expense) => {
    const { id, ...data } = e;
    await addDoc(collection(db, 'expenses'), data as any);
  };

  const addQuote = async (q: Quote) => {
    const { id, ...data } = q;
    await addDoc(collection(db, 'quotes'), data as any);
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
    const { id, ...data } = b;
    const docRef = doc(collection(db, 'brokers'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const updateBroker = async (b: Broker) => {
    const { id, ...data } = b;
    await setDoc(doc(db, 'brokers', id), data, { merge: true });
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
    const docRef = doc(collection(db, 'leads'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const updateLead = async (l: Lead) => {
    const { id, ...data } = l;
    await setDoc(doc(db, 'leads', id), data, { merge: true });
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-[#0A192F] border-t-[#FFD700] rounded-full animate-spin mb-4" />
      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Carregando Sintese ERP...</p>
    </div>
  );

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={() => {}} />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <ProtectedLayout currentUser={currentUser} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard properties={properties} expenses={expenses} tasks={tasks} inventory={inventory} movements={movements} quotes={quotes} auctions={auctions} alerts={alerts} currentUser={currentUser} />} />
        <Route path="/leiloes" element={<AuctionPage auctions={auctions} properties={properties} currentUser={currentUser} />} />
        <Route path="/imoveis" element={<PropertyList properties={properties} expenses={expenses} onUpdateStatus={async (id, status) => { await setDoc(doc(db, 'properties', id), { status }, { merge: true }); }} onDeleteProperty={deleteProperty} addLog={addLog} />} />
        <Route path="/imovel/:id" element={<PropertyDetails properties={properties} expenses={expenses} logs={logs} tasks={tasks} onAddExpense={addExpense} onDeleteExpense={async (id) => { 
          if (!isMasterUser) {
            alert("Apenas o Administrador Master pode excluir registros.");
            return;
          }
          await deleteDoc(doc(db, 'expenses', id)); 
        }} onDeleteProperty={deleteProperty} />} />
        <Route path="/novo" element={<PropertyForm properties={properties} onSave={saveProperty} />} />
        <Route path="/editar/:id" element={<PropertyForm properties={properties} onSave={saveProperty} />} />
        <Route path="/estoque/insumos" element={<InsumosPage items={inventory} movements={movements} onDeleteItem={deleteInventoryItem} onAddItem={addInventoryItem} />} />
        <Route path="/estoque/movimentos" element={<MovimentosPage movements={movements} items={inventory} suppliers={suppliers} properties={properties} onAddMovement={handleAddMovement} />} />
        <Route path="/estoque/fornecedores" element={<FornecedoresPage suppliers={suppliers} onAddSupplier={addSupplier} onDeleteSupplier={deleteSupplier} />} />
        <Route path="/estoque/almoxarifados" element={<AlmoxarifadosPage warehouses={warehouses} onAddWarehouse={addWarehouse} onDeleteWarehouse={deleteWarehouse} />} />
        <Route path="/estoque/orcamentos" element={<ComprasPage quotes={quotes} suppliers={suppliers} inventory={inventory} properties={properties} onAddQuote={addQuote} onUpdateQuoteStatus={updateQuoteStatus} onDeleteQuote={deleteQuote} onPurchaseQuote={purchaseQuote} />} />
        <Route path="/relatorios" element={<ReportsPage properties={properties} expenses={expenses} inventory={inventory} />} />
        <Route path="/equipe" element={<TeamsPage currentUser={currentUser} users={users} setUsers={setUsers} teams={teams} setTeams={setTeams} />} />
        <Route path="/chat" element={<ChatPage currentUser={currentUser} />} />
        <Route path="/tarefas" element={<KanbanPage currentUser={currentUser} users={users} teams={teams} properties={properties} />} />
        <Route path="/calendario" element={<CalendarPage currentUser={currentUser} />} />
        <Route path="/configuracoes" element={<SettingsPage currentUser={currentUser} />} />
        
        {/* Broker Routes */}
        <Route path="/gestao-corretores" element={<BrokerManagement brokers={brokers} leads={leads} onAddBroker={addBroker} onUpdateBroker={updateBroker} onDeleteBroker={deleteBroker} />} />
        <Route path="/corretor" element={<BrokerDashboard leads={leads.filter(l => l.brokerId === currentUser.id)} properties={properties} />} />
        <Route path="/corretor/imoveis" element={<BrokerProperties properties={properties} />} />
        <Route path="/corretor/imovel/:id" element={<BrokerPropertyDetails properties={properties} onAddLead={addLead} currentUser={currentUser} />} />
        <Route path="/corretor/leads" element={<BrokerLeads leads={leads.filter(l => l.brokerId === currentUser.id)} properties={properties} onUpdateLead={updateLead} />} />
        
        <Route path="*" element={<Navigate to={currentUser.role === UserRole.BROKER ? "/corretor" : "/"} />} />
      </Routes>
    </ProtectedLayout>
  );
};

const App = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;
