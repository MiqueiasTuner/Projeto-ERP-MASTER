import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { UserRole } from '../types';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const trimmedEmail = email.trim();
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          name: name,
          email: trimmedEmail,
          role: UserRole.ADMIN,
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

        // Notify admin (Miqueias) via Firestore collection
        await addDoc(collection(db, 'registration_requests'), {
          userId: userCredential.user.uid,
          userName: name,
          companyName: companyName,
          userEmail: trimmedEmail,
          timestamp: new Date().toISOString(),
          status: 'pending',
          notifyEmail: 'miqueiasyout@gmail.com'
        });
        
        setSuccess(true);
      }
    } catch (err: any) {
      const msg = err.code || err.message;
      if (msg.includes('auth/email-already-in-use')) {
        setError('Este e-mail já está cadastrado. Tente fazer login.');
      } else if (msg.includes('auth/operation-not-allowed')) {
        setError('O cadastro por e-mail não está ativado no Firebase. Por favor, ative-o no Console do Firebase.');
      } else if (msg.includes('auth/weak-password')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta. Tente novamente mais tarde.');
      }
      console.error('Sign up error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-[var(--bg-card)] text-[var(--text-main)] pl-12 pr-12 py-4 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all font-medium placeholder:text-[var(--text-muted)]";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-[var(--bg-card)] p-10 sm:p-12 rounded-[40px] shadow-2xl border border-[var(--border)] flex flex-col items-center">
            <div className="bg-emerald-500/20 p-6 rounded-full mb-8 text-emerald-500">
              <CheckCircle2 size={64} />
            </div>
            <h2 className="text-3xl font-black text-[var(--text-header)] mb-4 tracking-tight">Cadastro Realizado!</h2>
            <p className="text-[var(--text-muted)] font-medium mb-10 leading-relaxed text-lg">
              Bem-vindo ao time, <strong className="text-[var(--text-header)]">{name}</strong>! Seu acesso ao portal Master Imóveis foi criado com sucesso.
            </p>
            <div className="w-full">
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-[var(--accent)] text-[var(--accent-text)] py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-yellow-500/20 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <span>Acessar o Portal</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)] overflow-hidden">
      {/* Left Side: Branding & Image (Hidden on Mobile) */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[var(--bg-sidebar)]"
      >
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 scale-110 hover:scale-100 transition-transform duration-[10s]"
          alt="Modern Building"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-sidebar)]/80 to-[var(--bg-main)]/90" />
        
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-[var(--bg-sidebar)] p-2 rounded-2xl shadow-2xl overflow-hidden w-20 h-20 flex items-center justify-center border border-[var(--accent)]/20">
                <img src="https://i.postimg.cc/jsxKRsym/sale-(1).png" alt="Sintese ERP" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-[var(--text-header)] tracking-tighter leading-none">Sintese <span className="text-[var(--accent)]">ERP</span></h1>
              <p className="text-[var(--accent)]/80 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Gestão de Obras e Imóveis</p>
            </div>
          </div>
          
          <div>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-5xl font-black text-[var(--text-header)] leading-tight mb-6"
            >
              Junte-se à <br /> Revolução <br /> Imobiliária.
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-[var(--text-muted)] text-lg font-medium max-w-md leading-relaxed"
            >
              Crie sua conta e tenha acesso às ferramentas mais avançadas de análise de leilões e gestão de ativos do mercado.
            </motion.p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[5,6,7,8].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[var(--border)] bg-[var(--bg-card-alt)] flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="User" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
            <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
              Faça parte de um ecossistema vencedor
            </p>
          </div>
        </div>
      </motion.div>

      {/* Right Side: Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-[var(--bg-main)] relative">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10 text-center">
            <div className="relative mb-6">
              <div className="absolute -inset-2 bg-[var(--accent)] rounded-3xl blur opacity-20"></div>
              <div className="relative bg-[var(--bg-sidebar)] p-3 rounded-3xl shadow-2xl overflow-hidden w-28 h-28 flex items-center justify-center border border-[var(--accent)]/10">
                <img src="https://i.postimg.cc/jsxKRsym/sale-(1).png" alt="Sintese ERP" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-[var(--text-header)] tracking-tighter mb-2">Sintese <span className="text-[var(--accent)]">ERP</span></h1>
            <p className="text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] text-[10px]">Gestão de Obras e Imóveis</p>
          </div>

          <div className="bg-[var(--bg-card)] lg:bg-transparent p-8 sm:p-10 lg:p-0 rounded-[32px] shadow-2xl shadow-black/20 lg:shadow-none border border-[var(--border)] lg:border-none">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-[var(--text-header)] mb-2 tracking-tight">Criar Conta</h2>
              <p className="text-[var(--text-muted)] font-medium">Preencha os dados abaixo para começar.</p>
            </div>

            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 overflow-hidden"
              >
                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-500 leading-relaxed">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Seu nome aqui" 
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nome da Empresa</label>
                <div className="relative group">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Ex: Master Imóveis Ltda" 
                    className={inputClass}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                  <input 
                    type="email" 
                    autoComplete="email"
                    placeholder="ex: voce@masterimoveis.com" 
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Senha de Acesso</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres" 
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-header)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[var(--accent)] text-[var(--accent-text)] py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-yellow-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Criar Minha Conta</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
              <p className="text-xs font-bold text-[var(--text-muted)]">
                Já possui uma conta? <Link to="/login" className="text-[var(--accent)] hover:underline">Faça login</Link>
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <ShieldCheck size={16} />
              <p className="text-[10px] font-bold uppercase tracking-widest">Cadastro Seguro e Criptografado</p>
            </div>
            
            <div className="text-center">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-relaxed">
                © 2026 Sintese ERP. <br />
                todos os direitos reservados Sintese Web
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUpPage;
