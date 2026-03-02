
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, User, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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
      // 1. Criar usuário no Auth
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      
      if (userCredential.user) {
        // 2. Atualizar perfil no Auth
        await updateProfile(userCredential.user, {
          displayName: name
        });

        // 3. Criar documento na coleção 'users'
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
        setError('Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.');
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

  const inputClass = "w-full bg-slate-50 text-slate-900 pl-12 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 animate-in fade-in duration-700">
        <div className="w-full max-w-md text-center">
          <div className="bg-white p-8 sm:p-12 rounded-[32px] sm:rounded-[40px] shadow-2xl border border-slate-100 flex flex-col items-center">
            <div className="bg-emerald-100 p-4 rounded-3xl mb-6 text-emerald-600">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">E-mail Enviado!</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm sm:text-base">
              Quase lá! Enviamos um link de confirmação para <strong className="text-slate-900">{email}</strong>. Por favor, verifique sua caixa de entrada e spam para ativar seu acesso.
            </p>
            <div className="w-full space-y-4">
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
              >
                Voltar para Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-2xl shadow-blue-500/40 mb-6">
            <Building2 size={40} className="text-white sm:w-12 sm:h-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">Master Imóveis</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Crie seu acesso ao portal</p>
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100">
          <h2 className="text-xl font-black text-slate-900 mb-6 sm:mb-8 tracking-tight">Cadastrar-se</h2>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
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
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" 
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
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="No mínimo 6 caracteres" 
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <span className="text-[10px] font-bold uppercase">Ocultar</span> : <span className="text-[10px] font-bold uppercase">Mostrar</span>}
                </button>
              </div>
            </div>

            <div className="pt-2 sm:pt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
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
              Já possui uma conta? <Link to="/login" className="text-blue-600 hover:underline">Faça login</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 flex items-center justify-center gap-2 text-slate-400">
          <ShieldCheck size={16} />
          <p className="text-[10px] font-bold uppercase tracking-widest">Cadastro Seguro via Firebase</p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
