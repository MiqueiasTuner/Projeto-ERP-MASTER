
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface LoginPageProps {
  onLogin: (success: boolean) => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const trimmedEmail = email.trim();
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);

      if (userCredential.user) {
        onLogin(true);
      }
    } catch (err: any) {
      // Tradução amigável para erros comuns do Firebase
      const msg = err.code || err.message;
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        setError('E-mail ou senha incorretos. Verifique seus dados ou tente recuperar sua senha.');
      } else if (msg.includes('auth/too-many-requests')) {
        setError('Muitas tentativas seguidas. Por favor, aguarde alguns minutos antes de tentar novamente.');
      } else {
        setError('Erro ao realizar login. Tente novamente mais tarde.');
      }
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 text-slate-900 pl-12 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 sm:mb-10 text-center">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-2xl shadow-blue-500/40 mb-6">
            <Building2 size={40} className="text-white sm:w-12 sm:h-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">Master Imóveis</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Portal de Gestão Estratégica</p>
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100">
          <h2 className="text-xl font-black text-slate-900 mb-6 sm:mb-8 tracking-tight">Acesse sua conta</h2>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
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
              <div className="flex justify-between items-center ml-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Sua Senha</label>
                <button 
                  type="button" 
                  onClick={() => setError('Funcionalidade de recuperação de senha em desenvolvimento. Por favor, contate o administrador.')}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  placeholder="••••••••" 
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                className="w-full bg-slate-900 text-white py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-50 text-center">
            <p className="text-xs font-bold text-slate-400">
              Não tem uma conta? <Link to="/signup" className="text-blue-600 hover:underline">Cadastre-se agora</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-3">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium text-blue-800 leading-relaxed">
            Se for o seu primeiro acesso, clique no link de cadastro acima. Certifique-se de usar os dados enviados pelo RH da Master Imóveis.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
          <ShieldCheck size={16} />
          <p className="text-[10px] font-bold uppercase tracking-widest">Acesso Restrito via Firebase Auth</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
