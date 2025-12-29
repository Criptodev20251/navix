import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { supabase } from '../services/supabaseClient';

export const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let authResponse;
      if (isLogin) {
        authResponse = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else {
        authResponse = await supabase.auth.signUp({
          email,
          password,
        });
      }

      if (authResponse.error) throw authResponse.error;
      const user = authResponse.data.user;

      if (user) {
          // Tenta garantir que o perfil existe
          try {
              const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
              if (!profile) {
                  const { error: insertError } = await supabase.from('profiles').insert([{
                      id: user.id,
                      email: user.email,
                      company_name: 'Minha Empresa Ltda',
                      balance: 10000.00
                  }]);
                  if (insertError) {
                      console.warn("Aviso RLS: Perfil não pôde ser criado automaticamente. Verifique as políticas SQL.", insertError);
                  }
              }
          } catch (profileErr) {
              console.error("Erro ao verificar/criar perfil:", profileErr);
          }
          
          navigate('/dashboard');
      } else {
        alert('Verifique seu email para confirmar o cadastro.');
      }

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navix-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-navix-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md z-10 flex flex-col items-center">
            
            {/* Logo Section */}
            <div className="mb-8 text-center">
                <div className="w-20 h-20 bg-navix-500 rounded-2xl flex items-center justify-center shadow-lg shadow-navix-500/40 mx-auto mb-4">
                    <Icons.Ship className="text-white" size={40} />
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Navix</h1>
                <p className="text-navix-200 text-sm mt-1">Comércio Exterior Simplificado</p>
            </div>

            {/* Glass Card */}
            <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                 {/* Tabs */}
                 <div className="flex bg-slate-900/40 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => { setIsLogin(true); setError(null); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${isLogin ? 'bg-navix-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                        Login
                    </button>
                    <button 
                         onClick={() => { setIsLogin(false); setError(null); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${!isLogin ? 'bg-navix-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                        Cadastro
                    </button>
                 </div>

                 <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">Email</label>
                        <div className="relative">
                            <Icons.User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-navix-500 focus:ring-1 focus:ring-navix-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                         <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">Senha</label>
                         <div className="relative">
                            <Icons.Shield className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-navix-500 focus:ring-1 focus:ring-navix-500 transition-colors"
                            />
                         </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                             <Icons.AlertCircle size={14} />
                             {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-navix-500 hover:bg-navix-400 text-white font-semibold rounded-xl shadow-lg shadow-navix-500/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                    >
                        {loading && <Icons.Clock className="animate-spin" size={18} />}
                        {isLogin ? 'Entrar' : 'Criar Conta'}
                    </button>
                 </form>

                 <div className="mt-6 text-center">
                    <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors">
                        Esqueceu sua senha?
                    </a>
                 </div>
            </div>
            
            <div className="mt-8 text-center space-y-3">
                <p className="text-slate-500 text-xs">
                    &copy; 2024 Navix. Todos os direitos reservados.
                </p>
                
                {/* Developer Credits */}
                <div className="flex justify-center items-center gap-2 text-xs text-slate-400/80">
                    <Icons.Code size={12} />
                    <span>Devs:</span>
                    <span className="text-slate-300 hover:text-white transition-colors cursor-default">Sâmeque Batista</span>
                    <span>&</span>
                    <span className="text-slate-300 hover:text-white transition-colors cursor-default">João Paulo</span>
                </div>
            </div>
        </div>
    </div>
  );
};