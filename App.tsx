
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Home, Users, Box, ChevronDown, 
  ChevronUp, BarChart3, Settings, LogOut, PlusCircle, Menu, X as CloseIcon,
  FileText
} from 'lucide-react';
import { auth, db, isConfigured } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, onSnapshot, doc, setDoc, updateDoc, 
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
import QuotesPage from './pages/inventory/QuotesPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import TeamsPage from './pages/TeamsPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import { 
  Property, Expense, InventoryItem, StockMovement, Supplier, 
  Warehouse, UserAccount, UserRole, Team, PermissionModule, 
  PermissionAction, UserPermissions, PropertyStatus, PropertyLog, 
  MovementType, ExpenseCategory, Quote, QuoteStatus
} from './types';

const INITIAL_PERMISSIONS: UserPermissions = {
  properties: ['view', 'edit', 'delete'],
  inventory: ['view', 'edit', 'delete'],
  finances: ['view', 'edit', 'delete'],
  teams: ['view', 'edit', 'delete'],
  reports: ['view', 'edit', 'delete']
};

const SidebarItem = ({ to, icon: Icon, label, active, visible = true, onClick }: { to?: string, icon: any, label: string, active: boolean, visible?: boolean, onClick?: () => void }) => {
  if (!visible) return null;
  const content = (
    <div className={`flex items-center space-x-3 p-3 rounded-xl transition-all cursor-pointer ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`} onClick={onClick}>
      <Icon size={18} />
      <span className="font-medium text-sm flex-1">{label}</span>
    </div>
  );
  return to ? <Link to={to} onClick={onClick}>{content}</Link> : content;
};

const SidebarGroup = ({ label, icon: Icon, children, active, visible = true }: { label: string, icon: any, children?: React.ReactNode, active: boolean, visible?: boolean }) => {
  const [isOpen, setIsOpen] = useState(active);
  if (!visible) return null;
  return (
    <div className="space-y-1">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 p-3 rounded-xl transition-colors cursor-pointer ${
          active && !isOpen ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon size={18} />
        <span className="font-medium text-sm flex-1">{label}</span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {isOpen && <div className="pl-9 space-y-1 animate-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );
};

const ProtectedLayout = ({ children, currentUser, onLogout }: { children?: React.ReactNode, currentUser: UserAccount, onLogout: () => void }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const hasPermission = (module: PermissionModule, action: PermissionAction): boolean => {
    if (currentUser.role === UserRole.MASTER) return true;
    return currentUser.permissions?.[module]?.includes(action) || false;
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden" onClick={closeSidebar} />}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-white flex flex-col p-6 z-40 transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen lg:overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-10 px-2 group">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl group-hover:rotate-12 transition-transform"><Building2 size={24} /></div>
            <div>
              <h1 className="text-lg font-black leading-none">Master Imóveis</h1>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Portal ERP</span>
            </div>
          </div>
          <button className="lg:hidden p-2 text-slate-400" onClick={closeSidebar}><CloseIcon size={24} /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} onClick={closeSidebar} />
          <div className="pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Gestão Operacional</div>
          <SidebarItem to="/imoveis" icon={Home} label="Imóveis" active={location.pathname.startsWith('/imoveis')} visible={hasPermission('properties', 'view')} onClick={closeSidebar} />
          <SidebarGroup label="Estoque" icon={Box} active={location.pathname.startsWith('/estoque')} visible={hasPermission('inventory', 'view')}>
            <Link to="/estoque/insumos" onClick={closeSidebar} className={`block py-2 text-xs font-medium ${location.pathname === '/estoque/insumos' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>• Insumos</Link>
            <Link to="/estoque/movimentos" onClick={closeSidebar} className={`block py-2 text-xs font-medium ${location.pathname === '/estoque/movimentos' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>• Movimentos</Link>
            <Link to="/estoque/fornecedores" onClick={closeSidebar} className={`block py-2 text-xs font-medium ${location.pathname === '/estoque/fornecedores' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>• Fornecedores</Link>
            <Link to="/estoque/orcamentos" onClick={closeSidebar} className={`block py-2 text-xs font-medium ${location.pathname === '/estoque/orcamentos' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>• Orçamentos</Link>
          </SidebarGroup>
          <div className="pt-6 pb-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estratégico</div>
          <SidebarItem to="/relatorios" icon={BarChart3} label="Relatórios" active={location.pathname === '/relatorios'} visible={hasPermission('reports', 'view')} onClick={closeSidebar} />
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
          <div className="px-3 py-3.5 bg-slate-800/50 rounded-2xl text-[11px] font-bold uppercase truncate border border-slate-800">{currentUser.name}</div>
          <SidebarItem to="/configuracoes" icon={Settings} label="Ajustes" active={location.pathname === '/configuracoes'} onClick={closeSidebar} />
          <button onClick={onLogout} className="flex items-center space-x-3 p-3 w-full rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"><LogOut size={18} /> <span className="font-medium text-sm">Sair</span></button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        <header className="lg:hidden bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center space-x-3"><div className="bg-blue-600 p-1.5 rounded-lg text-white"><Building2 size={20} /></div><span className="font-black text-slate-900 tracking-tight">Master Imóveis</span></div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"><Menu size={24} /></button>
        </header>
        <main className="flex-1 p-6 lg:p-10 overflow-x-hidden"><div className="max-w-7xl mx-auto">{children}</div></main>
      </div>
    </div>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
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

    const collections = [
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
    ];

    const unsubscribes = collections.map(({ name, setter }) => {
      return onSnapshot(collection(db, name), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[];
        setter(data);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [session]);

  const currentUser: UserAccount = users.find(u => u.email === session?.email) || {
    id: session?.uid || 'loading',
    name: session?.displayName || 'Usuário',
    email: session?.email || '',
    role: UserRole.MASTER, 
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
    if (id && properties.some(item => item.id === id)) {
      await updateDoc(doc(db, 'properties', id), data as any);
    } else {
      await addDoc(collection(db, 'properties'), data as any);
    }
  };

  const deleteProperty = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este imóvel?")) return;
    await deleteDoc(doc(db, 'properties', id));
    navigate('/imoveis');
  };

  const deleteInventoryItem = async (id: string) => {
    if (!window.confirm("Deseja excluir este insumo?")) return;
    await deleteDoc(doc(db, 'inventory', id));
  };

  const addSupplier = async (s: Supplier) => {
    const { id, ...data } = s;
    await addDoc(collection(db, 'suppliers'), data as any);
  };

  const deleteSupplier = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este fornecedor?")) return;
    await deleteDoc(doc(db, 'suppliers', id));
  };

  const addWarehouse = async (w: Warehouse) => {
    const { id, ...data } = w;
    await addDoc(collection(db, 'warehouses'), data as any);
  };

  const deleteWarehouse = async (id: string) => {
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
      await updateDoc(doc(db, 'inventory', item.id), { currentStock: newStock });
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
    await updateDoc(doc(db, 'quotes', id), { status });
  };

  const deleteQuote = async (id: string) => {
    if (!window.confirm("Deseja excluir este orçamento?")) return;
    await deleteDoc(doc(db, 'quotes', id));
  };

  const purchaseQuote = async (quote: Quote) => {
    if (!window.confirm("Deseja confirmar a compra e atualizar o estoque?")) return;
    
    const batch = writeBatch(db);
    
    // 1. Update quote status
    batch.update(doc(db, 'quotes', quote.id), { status: QuoteStatus.CONCLUIDO });
    
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
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Carregando Master Imóveis...</p>
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
        <Route path="/" element={<Dashboard properties={properties} expenses={expenses} />} />
        <Route path="/imoveis" element={<PropertyList properties={properties} expenses={expenses} onUpdateStatus={async (id, status) => { await updateDoc(doc(db, 'properties', id), { status }); }} onDeleteProperty={deleteProperty} />} />
        <Route path="/imovel/:id" element={<PropertyDetails properties={properties} expenses={expenses} logs={logs} onAddExpense={addExpense} onDeleteExpense={async (id) => { await deleteDoc(doc(db, 'expenses', id)); }} onDeleteProperty={deleteProperty} />} />
        <Route path="/novo" element={<PropertyForm properties={properties} onSave={saveProperty} />} />
        <Route path="/editar/:id" element={<PropertyForm properties={properties} onSave={saveProperty} />} />
        <Route path="/estoque/insumos" element={<InsumosPage items={inventory} setItems={async (items) => { /* Firestore handles this via onSnapshot */ }} onDeleteItem={deleteInventoryItem} />} />
        <Route path="/estoque/movimentos" element={<MovimentosPage movements={movements} items={inventory} suppliers={suppliers} properties={properties} onAddMovement={handleAddMovement} />} />
        <Route path="/estoque/fornecedores" element={<FornecedoresPage suppliers={suppliers} onAddSupplier={addSupplier} onDeleteSupplier={deleteSupplier} />} />
        <Route path="/estoque/almoxarifados" element={<AlmoxarifadosPage warehouses={warehouses} onAddWarehouse={addWarehouse} onDeleteWarehouse={deleteWarehouse} />} />
        <Route path="/estoque/orcamentos" element={<QuotesPage quotes={quotes} suppliers={suppliers} inventory={inventory} onAddQuote={addQuote} onUpdateQuoteStatus={updateQuoteStatus} onDeleteQuote={deleteQuote} onPurchaseQuote={purchaseQuote} />} />
        <Route path="/relatorios" element={<ReportsPage properties={properties} expenses={expenses} inventory={inventory} />} />
        <Route path="/equipe" element={<TeamsPage currentUser={currentUser} users={users} setUsers={setUsers} teams={teams} setTeams={setTeams} />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
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
