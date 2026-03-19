import React, { useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Building2 } from 'lucide-react';

import { auth, db, isConfigured } from './lib/firebase';
import { ThemeProvider } from './src/components/ThemeProvider';
import { ProtectedLayout } from './src/components/Layout';
import { useAuth } from './src/hooks/useAuth';
import { useAppData } from './src/hooks/useAppData';
import { UserRole, PropertyStatus, CommercialStatus, UserAccount } from './types';
import { SUPER_ADMIN_EMAILS, INITIAL_PERMISSIONS } from './src/constants';

// Pages
import Dashboard from './pages/Dashboard';
import PropertyList from './pages/PropertyList';
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

const AppContent = () => {
  const { session, currentUserData, loading } = useAuth();
  const { 
    properties, expenses, inventory, movements, suppliers, warehouses, users, teams, logs, quotes, tasks, auctions, alerts, brokers, leads,
    addLog, deleteProperty, addExpense, addInventoryItem, deleteInventoryItem, handleAddMovement, addSupplier, deleteSupplier, addWarehouse, deleteWarehouse, addQuote, updateQuoteStatus, deleteQuote, purchaseQuote, addBroker, updateBroker, deleteBroker, addLead, updateLead, markPropertyAsSold
  } = useAppData(session, currentUserData);
  
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!session?.uid || !db) return;

    const userRef = doc(db, 'users', session.uid);
    
    // Set online
    updateDoc(userRef, { isOnline: true }).catch(console.error);

    // Set offline on disconnect/unload
    const handleUnload = () => {
      updateDoc(userRef, { isOnline: false }).catch(console.error);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      updateDoc(userRef, { isOnline: false }).catch(console.error);
    };
  }, [session?.uid]);

  const foundBroker = useMemo(() => brokers.find(b => b.email === session?.email), [brokers, session?.email]);

  const currentUser: UserAccount = useMemo(() => {
    if (currentUserData) {
      return {
        ...currentUserData,
        permissions: currentUserData.permissions || INITIAL_PERMISSIONS
      };
    }
    if (foundBroker) {
      return {
        id: foundBroker.id,
        name: foundBroker.name,
        email: foundBroker.email,
        role: UserRole.BROKER,
        active: foundBroker.active,
        permissions: { ...INITIAL_PERMISSIONS, brokers: [] }
      };
    }
    return {
      id: session?.uid || 'loading',
      name: session?.displayName || 'Usuário',
      email: session?.email || '',
      role: UserRole.ADMIN, 
      active: true,
      permissions: INITIAL_PERMISSIONS
    };
  }, [currentUserData, foundBroker, session]);

  const isMasterUser = useMemo(() => SUPER_ADMIN_EMAILS.includes(currentUser.email), [currentUser.email]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      navigate('/login');
    }
  };

  const brokerLeads = useMemo(() => {
    if (currentUser.role === UserRole.BROKER) {
      return leads.filter(l => l.brokerId === currentUser.id);
    }
    return leads;
  }, [leads, currentUser.id, currentUser.role]);

  const brokerProperties = useMemo(() => {
    if (currentUser.role === UserRole.BROKER) {
      return properties.filter(p => p.availableForBrokers || p.status === PropertyStatus.A_VENDA);
    }
    return properties;
  }, [properties, currentUser.role]);

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
        <p className="text-white font-black uppercase tracking-[0.2em] text-xs animate-pulse">Sintese ERP • Carregando...</p>
      </div>
    </div>
  );

  const isPublicRoute = location.pathname.startsWith('/publico/');

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

  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/publico/imovel/:id" element={<PublicPropertyView properties={properties} />} />
      </Routes>
    );
  }

  return (
    <ProtectedLayout currentUser={currentUser} onLogout={handleLogout} tasks={tasks}>
      <Routes>
        <Route path="/" element={
          currentUser.role === UserRole.BROKER 
            ? <Navigate to="/corretor" /> 
            : <Dashboard properties={properties} expenses={expenses} tasks={tasks} inventory={inventory} movements={movements} quotes={quotes} auctions={auctions} alerts={alerts} currentUser={currentUser} />
        } />
        <Route path="/leiloes" element={<AuctionPage auctions={auctions} properties={properties} currentUser={currentUser} />} />
        <Route path="/imoveis" element={<PropertyList 
          properties={properties} 
          expenses={expenses} 
          logs={logs}
          tasks={tasks}
          onAddExpense={addExpense}
          onDeleteExpense={async (id) => { 
            if (!isMasterUser) {
              alert("Apenas o Administrador Master pode excluir registros.");
              return;
            }
            if (db) await deleteDoc(doc(db, 'expenses', id)); 
          }}
          onUpdateStatus={async (id, status) => { if (db) await setDoc(doc(db, 'properties', id), { status }, { merge: true }); }} 
          onDeleteProperty={(id) => deleteProperty(id, isMasterUser)} 
          addLog={(log) => addLog(log, currentUser)} 
          currentUser={currentUser} 
        />} />
        <Route path="/imovel/:id" element={<PropertyDetails properties={properties} expenses={expenses} logs={logs} tasks={tasks} onAddExpense={addExpense} onDeleteExpense={async (id) => { 
          if (!isMasterUser) {
            alert("Apenas o Administrador Master pode excluir registros.");
            return;
          }
          if (db) await deleteDoc(doc(db, 'expenses', id)); 
        }} onDeleteProperty={(id) => deleteProperty(id, isMasterUser)} currentUser={currentUser} />} />
        <Route path="/estoque/insumos" element={<InsumosPage items={inventory} movements={movements} onDeleteItem={(id) => deleteInventoryItem(id, isMasterUser)} onAddItem={addInventoryItem} currentUser={currentUser} />} />
        <Route path="/estoque/movimentos" element={<MovimentosPage movements={movements} items={inventory} suppliers={suppliers} properties={properties} onAddMovement={handleAddMovement} currentUser={currentUser} />} />
        <Route path="/estoque/fornecedores" element={<FornecedoresPage suppliers={suppliers} onAddSupplier={addSupplier} onDeleteSupplier={(id) => deleteSupplier(id, isMasterUser)} currentUser={currentUser} />} />
        <Route path="/estoque/almoxarifados" element={<AlmoxarifadosPage warehouses={warehouses} onAddWarehouse={addWarehouse} onDeleteWarehouse={(id) => deleteWarehouse(id, isMasterUser)} currentUser={currentUser} />} />
        <Route path="/estoque/orcamentos" element={<ComprasPage quotes={quotes} suppliers={suppliers} inventory={inventory} properties={properties} onAddQuote={addQuote} onUpdateQuoteStatus={updateQuoteStatus} onDeleteQuote={(id) => deleteQuote(id, isMasterUser)} onPurchaseQuote={purchaseQuote} currentUser={currentUser} />} />
        <Route path="/relatorios" element={<ReportsPage properties={properties} expenses={expenses} inventory={inventory} tasks={tasks} auctions={auctions} brokers={brokers} leads={leads} />} />
        <Route path="/equipe" element={<TeamsPage currentUser={currentUser} users={users} setUsers={() => {}} teams={teams} setTeams={() => {}} />} />
        <Route path="/integracoes" element={<IntegrationsPage />} />
        <Route path="/chat" element={<ChatPage currentUser={currentUser} />} />
        <Route path="/tarefas" element={<KanbanPage currentUser={currentUser} users={users} teams={teams} properties={properties} />} />
        <Route path="/calendario" element={<CalendarPage currentUser={currentUser} />} />
        <Route path="/configuracoes" element={<SettingsPage currentUser={currentUser} properties={properties} />} />
        <Route path="/super-admin" element={currentUser.role === UserRole.SUPER_ADMIN ? <SuperAdminDashboard /> : <Navigate to="/" />} />
        
        <Route path="/gestao-corretores" element={<BrokerManagement brokers={brokers} leads={leads} onAddBroker={addBroker} onUpdateBroker={updateBroker} onDeleteBroker={(id) => deleteBroker(id, isMasterUser)} />} />
        <Route path="/corretor" element={<BrokerDashboard leads={brokerLeads} properties={brokerProperties} onAddLead={addLead} currentUser={currentUser} />} />
        <Route path="/corretor/imoveis" element={<BrokerProperties properties={brokerProperties} />} />
        <Route path="/corretor/imovel/:id" element={<BrokerPropertyDetails properties={brokerProperties} onAddLead={addLead} currentUser={currentUser} />} />
        <Route path="/corretor/leads" element={<BrokerLeads leads={brokerLeads} properties={brokerProperties} onUpdateLead={updateLead} onMarkAsSold={(pId, bId, sP, sD) => markPropertyAsSold(pId, bId, sP, sD, currentUser)} currentUser={currentUser} />} />
        
        <Route path="*" element={<Navigate to="/" />} />
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
