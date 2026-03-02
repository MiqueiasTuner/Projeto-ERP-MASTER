import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
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
          role: 'Colaborador',
          active: true,
          permissions: {
            properties: ['view'],
            inventory: ['view'],
            finances: [],
            teams: [],
            reports: ['view']
          }
        });
        
        setSuccess(true);
      }
    } catch (err: any) {
      const msg = err.code || err.message;
      if (msg.includes('auth/email-already-in-use')) {
        setError('Este e-mail já está cadastrado. Tente fazer login.');
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

  const inputClass = "w-full bg-slate-50 text-slate-900 pl-12 pr-12 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-white p-10 sm:p-12 rounded-[40px] shadow-2xl border border-slate-100 flex flex-col items-center">
            <div className="bg-emerald-100 p-6 rounded-full mb-8 text-emerald-600">
              <CheckCircle2 size={64} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Cadastro Realizado!</h2>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg">
              Bem-vindo ao time, <strong className="text-slate-900">{name}</strong>! Seu acesso ao portal Master Imóveis foi criado com sucesso.
            </p>
            <div className="w-full">
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-3"
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
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* Left Side: Branding & Image (Hidden on Mobile) */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900"
      >
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-110 hover:scale-100 transition-transform duration-[10s]"
          alt="Modern Building"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/40 to-slate-950/90" />
        
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-2xl">
              <Building2 size={32} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Master Imóveis</h1>
              <p className="text-white/60 font-bold uppercase tracking-widest text-[10px]">Portal de Gestão ERP</p>
            </div>
          </div>
          
          <div>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-5xl font-black text-white leading-tight mb-6"
            >
              Junte-se à <br /> Revolução <br /> Imobiliária.
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-white/70 text-lg font-medium max-w-md leading-relaxed"
            >
              Crie sua conta e tenha acesso às ferramentas mais avançadas de análise de leilões e gestão de ativos do mercado.
            </motion.p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[5,6,7,8].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="User" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">
              Faça parte de um ecossistema vencedor
            </p>
          </div>
        </div>
      </motion.div>

      {/* Right Side: Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-slate-50 lg:bg-white relative">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10 text-center">
            <div className="bg-emerald-600 p-4 rounded-3xl shadow-2xl shadow-emerald-500/40 mb-6">
              <Building2 size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Master Imóveis</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Crie seu acesso estratégico</p>
          </div>

          <div className="bg-white lg:bg-transparent p-8 sm:p-10 lg:p-0 rounded-[32px] shadow-2xl shadow-slate-200 lg:shadow-none border border-slate-100 lg:border-none">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Criar Conta</h2>
              <p className="text-slate-500 font-medium">Preencha os dados abaixo para começar.</p>
            </div>

            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 overflow-hidden"
              >
                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
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
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
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
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-emerald-600 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Criar Minha Conta</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-50 text-center">
              <p className="text-xs font-bold text-slate-400">
                Já possui uma conta? <Link to="/login" className="text-emerald-600 hover:underline">Faça login</Link>
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck size={16} />
              <p className="text-[10px] font-bold uppercase tracking-widest">Cadastro Seguro e Criptografado</p>
            </div>
            
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
                © 2026 Master Imóveis. <br />
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
