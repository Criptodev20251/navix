import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Wizard } from './components/Wizard';
import { Login } from './components/Login';
import { Icons } from './components/Icons';
import { OperationType, DocumentItem, Transaction, Notification } from './types';
import { supabase } from './services/supabaseClient';

// --- Components for routes ---

const Documents = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (data) setDocs(data as DocumentItem[]);
    } catch (e) { console.error(e) } finally { setLoading(false) }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;
    const file = e.target.files[0];
    setUploading(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não logado");

        const sanitizeName = (name: string) => {
          return name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9.-]/g, "_");
        };

        const fileExt = file.name.split('.').pop();
        const cleanName = sanitizeName(file.name);
        const fileName = `${user.id}/${Date.now()}_${cleanName}`;

        // 1. Storage Upload
        const { error: uploadError } = await supabase.storage
            .from('navix')
            .upload(fileName, file);
        
        if (uploadError) {
          if (uploadError.message.includes('row-level security') || (uploadError as any).code === '42501') {
            throw new Error("Erro de RLS (Storage): Permissão negada no bucket 'navix'.");
          }
          throw uploadError;
        }

        // 2. DB Insert
        const newDoc = {
            user_id: user.id,
            name: file.name.split('.')[0],
            type: fileExt || 'FILE',
            date: new Date().toISOString(),
            status: 'Pendente',
            url: fileName
        };

        const { error: dbError } = await supabase.from('documents').insert([newDoc]);
        
        if (dbError) {
            if (dbError.code === '42501' || dbError.message.includes('row-level security')) {
                 throw new Error("Erro de RLS (Tabela Documents): Rode o script SQL no Supabase para liberar o acesso.");
            }
            throw dbError;
        }

        await fetchDocs();
        alert('Documento enviado com sucesso!');

    } catch (error: any) {
        console.error(error);
        alert('Erro: ' + (error.message || 'Tente novamente'));
    } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (path: string | undefined, name: string) => {
    if (!path) return;
    try {
        if (!path.includes('/')) {
            alert('Visualização indisponível para arquivos de exemplo.');
            return;
        }

        const { data, error } = await supabase.storage
            .from('navix')
            .createSignedUrl(path, 60);

        if (error) throw error;

        if (data?.signedUrl) {
            window.open(data.signedUrl, '_blank');
        }
    } catch (error: any) {
        console.error(error);
        alert('Erro ao abrir documento: ' + error.message);
    }
  };

  return (
    <div className="p-5 pb-24 max-w-lg mx-auto pt-12">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Serviços</h1>
        <button 
            onClick={handleUploadClick}
            disabled={uploading}
            className="p-2 bg-navix-600 rounded-full text-white shadow-lg shadow-navix-500/30 active:scale-95 transition-transform disabled:opacity-50"
        >
            {uploading ? <Icons.Clock className="animate-spin" size={24} /> : <Icons.Plus size={24} />}
        </button>
      </div>
      
      <div className="flex gap-3 mb-6">
        <div className="bg-gray-100 flex-1 flex items-center px-4 rounded-full">
          <Icons.Search size={20} className="text-gray-500" />
          <input placeholder="Buscar serviços..." className="w-full p-3.5 focus:outline-none text-sm font-medium bg-transparent" />
        </div>
      </div>

      <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
             <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Icons.FileText size={24} /></div>
             <div className="flex-1">
                <h3 className="font-bold text-slate-900">Central de Documentos</h3>
                <p className="text-xs text-slate-500">Gerencie faturas e certificados</p>
             </div>
             <Icons.ArrowRight size={20} className="text-gray-300" />
          </div>
      </div>
      
      <h3 className="text-lg font-bold text-black mt-8 mb-4">Arquivos Recentes</h3>
      <div className="space-y-3">
        {loading ? <p className="text-center text-gray-400 py-4"><Icons.Clock className="animate-spin mx-auto" /></p> : docs.length === 0 ? <p className="text-center text-gray-400 py-4">Nenhum documento.</p> : docs.map(doc => (
          <div key={doc.id} onClick={() => handleDownload(doc.url, doc.name)} className="bg-white p-0 rounded-2xl flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors pr-2">
            <div className="flex items-center gap-4">
               <div className="p-2 rounded-lg bg-gray-100 text-gray-500">
                 <Icons.FileText size={20} strokeWidth={2} />
               </div>
               <div>
                 <h4 className="font-bold text-slate-800 text-sm leading-tight mb-0.5">{doc.name}</h4>
                 <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                   <span>{new Date(doc.date).toLocaleDateString()}</span>
                   {doc.url && doc.url.includes('/') && <span className="text-navix-500">• PDF</span>}
                 </div>
               </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg tracking-wide
                ${doc.status === 'Validado' ? 'text-emerald-600 bg-emerald-50' : 
                  doc.status === 'Rejeitado' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50'}`}>
                {doc.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Payments = () => {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
            if (data) setBalance(data.balance);
        } catch(e) { console.error(e) } finally { setLoading(false) }
    };

    const handleTransaction = async (type: 'deposit' | 'pay') => {
        const amount = 1000;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const newBalance = type === 'deposit' ? balance + amount : balance - amount;
            if (newBalance < 0) {
                alert('Saldo insuficiente');
                return;
            }

            // Update Profile
            const { error: profileError } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);
            if (profileError) throw profileError;
            
            // Insert Transaction
            const { error: txError } = await supabase.from('transactions').insert([{
                user_id: user.id,
                description: type === 'deposit' ? 'Depósito via PIX' : 'Pagamento de Taxa',
                amount: amount,
                type: type === 'deposit' ? 'credit' : 'debit',
                category: type === 'deposit' ? 'Deposit' : 'Tax'
            }]);

            if (txError) throw txError;

            setBalance(newBalance);
            alert(type === 'deposit' ? 'R$ 1.000,00 adicionado!' : 'Pagamento realizado!');
        } catch(e: any) { 
            console.error(e); 
            if (e.code === '42501' || e.message?.includes('row-level security')) {
                alert('Erro de RLS: Você precisa rodar o script SQL de permissões no Supabase para atualizar saldos ou inserir transações.');
            } else {
                alert('Erro na transação: ' + e.message); 
            }
        }
    };

  return (
    <div className="p-5 pb-24 max-w-lg mx-auto pt-12">
        <button onClick={() => navigate(-1)} className="mb-4 text-black"><Icons.ArrowLeft /></button>
      <h1 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Carteira</h1>
      
      <div className="bg-black rounded-3xl p-7 text-white shadow-2xl mb-8 relative overflow-hidden">
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/10">
             <Icons.Briefcase size={22} className="text-white" />
          </div>
          <Icons.Shield size={24} className="text-gray-400" />
        </div>

        <p className="text-gray-400 text-sm font-medium mb-1 relative z-10">Navix Cash</p>
        <h2 className="text-4xl font-bold tracking-tight mb-8 relative z-10">
            {loading ? '...' : `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        </h2>

        <div className="flex gap-3 relative z-10">
           <button onClick={() => handleTransaction('deposit')} className="flex-1 bg-white text-black py-3 rounded-full text-sm font-bold transition-all active:scale-95">
             Adicionar (+1k)
           </button>
           <button onClick={() => handleTransaction('pay')} className="flex-1 bg-white/10 text-white py-3 rounded-full text-sm font-bold transition-all active:scale-95">
             Pagar (-1k)
           </button>
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({data: {user}}) => {
        if(user) {
            const {data} = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(data);
        }
    })
  }, [])

  return (
    <div className="p-5 max-w-lg mx-auto pt-12">
       <h1 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Conta</h1>
       <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
             <img src="https://picsum.photos/200/200" alt="User" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{profile?.company_name || 'Usuário Navix'}</h2>
            <div className="flex items-center gap-1 bg-gray-100 w-fit px-2 py-1 rounded-lg mt-1">
                <Icons.Star size={12} className="text-black" fill="black" />
                <span className="text-xs font-bold">4.98</span>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <Icons.Settings size={24} className="text-black" />
                <span className="text-xs font-bold text-gray-600">Ajustes</span>
            </div>
             <div className="bg-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <Icons.MessageCircle size={24} className="text-black" />
                <span className="text-xs font-bold text-gray-600">Ajuda</span>
            </div>
             <div className="bg-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <Icons.Briefcase size={24} className="text-black" />
                <span className="text-xs font-bold text-gray-600">Legal</span>
            </div>
       </div>

       <div className="space-y-1">
         <div className="pt-6 pb-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 pl-1">Desenvolvido por</h3>
            <div className="flex gap-3">
                <button className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3 active:scale-95 transition-transform text-left">
                    <div className="w-10 h-10 rounded-full bg-navix-100 flex items-center justify-center text-navix-600 font-bold text-sm">SB</div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Sâmeque Batista</p>
                        <p className="text-[10px] text-slate-500 font-medium">Developer</p>
                    </div>
                </button>
                <button className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3 active:scale-95 transition-transform text-left">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">JP</div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">João Paulo</p>
                        <p className="text-[10px] text-slate-500 font-medium">Developer</p>
                    </div>
                </button>
            </div>
         </div>

          <button 
            onClick={async () => {
                await supabase.auth.signOut();
                navigate('/login');
            }}
            className="w-full py-4 mt-2 text-red-500 font-medium flex items-center gap-4 border-t border-gray-100 pt-6 active:opacity-70"
          >
            <Icons.LogOut size={20} /> Sair
          </button>
       </div>
    </div>
  );
};

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    useEffect(() => {
        supabase.auth.getUser().then(async ({data: {user}}) => {
            if(user) {
                const {data} = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', {ascending: false});
                if(data) setNotifications(data as Notification[]);
            }
        });
    }, []);

    return (
        <div className="p-5 max-w-lg mx-auto pt-12">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">Atividade</h1>
            
            <div className="space-y-6">
                {notifications.length === 0 ? <p className="text-gray-400">Nenhuma notificação</p> : notifications.map((n, i) => (
                    <div key={i} className="flex gap-4 items-start">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-black'}`}>
                             <Icons.Bell size={20} />
                        </div>
                        <div className="flex-1 border-b border-gray-100 pb-6">
                            <h3 className="font-bold text-slate-900 text-base mb-1">{n.title}</h3>
                            <p className="text-sm text-gray-500 mb-1">{n.message}</p>
                            <p className="text-xs text-gray-400 font-medium">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// --- Screens ---

const Splash = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setTimeout(() => {
            if (session) navigate('/dashboard');
            else navigate('/login');
        }, 2000);
    };
    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <div className="z-10 text-center animate-pulse">
        <h1 className="text-5xl font-bold text-white tracking-tight mb-2">Navix</h1>
      </div>
    </div>
  );
};

const MainApp = () => {
  const [mode, setMode] = useState<OperationType>('import');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Area */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard mode={mode} setMode={setMode} />} />
              <Route path="/wizard" element={<Wizard type={mode} />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<NotificationCenter />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
};

export default MainApp;
