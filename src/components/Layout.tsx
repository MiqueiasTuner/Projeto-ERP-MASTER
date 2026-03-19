import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Home, Users, Box, ChevronDown, 
  ChevronUp, BarChart3, Settings, LogOut, PlusCircle, Menu, X as CloseIcon,
  FileText, MessageSquare, Kanban, CalendarDays, User as UserIcon, Gavel, Bell, Search, Clock, Globe, ShieldAlert, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAccount, UserRole, Task } from '../../types';

export const SidebarItem = ({ to, icon: Icon, label, active, visible = true, onClick, collapsed = false }: { to?: string, icon: any, label: string, active: boolean, visible?: boolean, onClick?: () => void, collapsed?: boolean }) => {
  if (!visible) return null;
  const content = (
    <div className={`flex items-center space-x-3 p-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
      active ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-md' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-header)]'
    }`} onClick={onClick} title={collapsed ? label : undefined}>
      <Icon size={18} className="flex-shrink-0" />
      <span className={`font-medium text-sm flex-1 transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>{label}</span>
    </div>
  );
  return to ? <Link to={to} onClick={onClick}>{content}</Link> : content;
};

export const SidebarGroup = ({ label, icon: Icon, children, active, visible = true, collapsed = false }: { label: string, icon: any, children?: React.ReactNode, active: boolean, visible?: boolean, collapsed?: boolean }) => {
  const [isOpen, setIsOpen] = useState(active);
  if (!visible) return null;
  
  return (
    <div className="space-y-1">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
          active && !isOpen ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-header)]'
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

export const ProtectedLayout = ({ children, currentUser, onLogout, tasks = [] }: { children: React.ReactNode, currentUser: UserAccount, onLogout: () => void, tasks?: Task[] }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  const isBroker = currentUser.role === UserRole.BROKER;
  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

  const hasPermission = (module: string, action: string) => {
    if (isSuperAdmin) return true;
    if (isBroker) return module === 'properties' && action === 'view';
    return currentUser.permissions?.[module as keyof typeof currentUser.permissions]?.includes(action as any);
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", visible: !isBroker },
    { to: "/corretor", icon: LayoutDashboard, label: "Dashboard", visible: isBroker },
    { to: "/imoveis", icon: Building2, label: "Imóveis", visible: hasPermission('properties', 'view') },
    { to: "/corretor/imoveis", icon: Building2, label: "Vitrine", visible: isBroker },
    { to: "/corretor/leads", icon: Users, label: "Meus Leads", visible: isBroker },
    { to: "/leiloes", icon: Gavel, label: "Leilões", visible: true },
    { 
      label: "Estoque", 
      icon: Box, 
      visible: hasPermission('inventory', 'view'),
      children: [
        { to: "/estoque/insumos", label: "Insumos" },
        { to: "/estoque/movimentos", label: "Movimentações" },
        { to: "/estoque/fornecedores", label: "Fornecedores" },
        { to: "/estoque/almoxarifados", label: "Almoxarifados" },
        { to: "/estoque/orcamentos", label: "Orçamentos" },
      ]
    },
    { to: "/tarefas", icon: Kanban, label: "Tarefas", visible: true },
    { to: "/calendario", icon: CalendarDays, label: "Calendário", visible: true },
    { to: "/equipe", icon: Users, label: "Equipe", visible: hasPermission('teams', 'view') },
    { to: "/relatorios", icon: BarChart3, label: "Relatórios", visible: hasPermission('reports', 'view') },
    { to: "/gestao-corretores", icon: UserIcon, label: "Corretores", visible: hasPermission('brokers', 'view') },
    { to: "/chat", icon: MessageSquare, label: "Chat", visible: true },
    { to: "/integracoes", icon: Globe, label: "Integrações", visible: isSuperAdmin },
    { to: "/super-admin", icon: ShieldAlert, label: "Super Admin", visible: isSuperAdmin },
    { to: "/configuracoes", icon: Settings, label: "Configurações", visible: true },
  ];

  return (
    <div className="flex h-screen bg-[var(--bg)] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 bg-[var(--sidebar-bg)] border-r border-white/5 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                <img src="https://i.postimg.cc/jsxKRsym/sale-(1).png" className="w-full h-full object-contain" alt="Sintese ERP" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-tighter text-[var(--text-header)] leading-none">SINTESE</span>
                  <span className="text-[10px] font-bold text-[var(--accent)] tracking-[0.2em] uppercase">ERP Imobiliário</span>
                </div>
              )}
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text-header)]">
              <CloseIcon size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
            {navItems.map((item, index) => (
              item.children ? (
                <SidebarGroup 
                  key={index}
                  label={item.label}
                  icon={item.icon}
                  active={item.children.some(child => location.pathname === child.to)}
                  visible={item.visible}
                  collapsed={isSidebarCollapsed}
                >
                  {item.children.map((child, childIndex) => (
                    <SidebarItem 
                      key={childIndex}
                      to={child.to}
                      label={child.label}
                      icon={PlusCircle}
                      active={location.pathname === child.to}
                      collapsed={isSidebarCollapsed}
                    />
                  ))}
                </SidebarGroup>
              ) : (
                <SidebarItem 
                  key={index}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.to}
                  visible={item.visible}
                  collapsed={isSidebarCollapsed}
                />
              )
            ))}
          </nav>

          {/* User Profile & Collapse Toggle */}
          <div className="p-4 border-t border-white/5 space-y-2">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex w-full items-center space-x-3 p-3 rounded-xl text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-header)] transition-colors"
            >
              <Menu size={18} className="flex-shrink-0" />
              {!isSidebarCollapsed && <span className="text-sm font-medium">Recolher Menu</span>}
            </button>
            
            <div className={`flex items-center space-x-3 p-3 rounded-2xl bg-white/5 border border-white/5 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/10 flex-shrink-0">
                <UserIcon size={20} className="text-slate-300" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-header)] truncate">{currentUser.name}</p>
                  <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider truncate">{currentUser.role}</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={onLogout}
              className={`flex w-full items-center space-x-3 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {!isSidebarCollapsed && <span className="text-sm font-bold">Sair do Sistema</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-[var(--sidebar-bg)]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 z-30">
          <div className="flex items-center space-x-6 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text-header)]">
              <Menu size={24} />
            </button>
            
            <div className="hidden md:flex items-center space-x-3 bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl w-full max-w-md focus-within:border-[var(--accent)]/50 transition-all group">
              <Search size={18} className="text-[var(--text-muted)] group-focus-within:text-[var(--accent)]" />
              <input 
                type="text" 
                placeholder="Pesquisar no sistema..." 
                className="bg-transparent border-none outline-none text-sm text-[var(--text-header)] w-full placeholder:text-[var(--text-muted)]"
              />
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-[var(--text-muted)]">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Sistema Online</span>
            </div>

            <button className="relative w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-[var(--text-muted)] hover:text-[var(--text-header)] hover:bg-white/10 transition-all">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--sidebar-bg)]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
