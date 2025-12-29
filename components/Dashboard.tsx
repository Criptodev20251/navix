import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { Process, ProcessStatus, OperationType, UserProfile } from '../types';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';
import { supabase } from '../services/supabaseClient';

interface DashboardProps {
  mode: OperationType;
  setMode: (mode: OperationType) => void;
}

const chartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Fev', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Abr', value: 2780 },
  { name: 'Mai', value: 1890 },
  { name: 'Jun', value: 2390 },
];

export const Dashboard: React.FC<DashboardProps> = ({ mode, setMode }) => {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dollarRate, setDollarRate] = useState(5.14);

  useEffect(() => {
    fetchData();
    // Simulate live dollar update
    const interval = setInterval(() => {
        setDollarRate(prev => prev + (Math.random() * 0.02 - 0.01));
    }, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/login');
            return;
        }

        // Fetch Profile for Balance
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileData) setProfile(profileData);

        // Fetch Processes based on Mode
        const { data: processData, error } = await supabase
            .from('processes')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', mode)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching processes:', error);
        if (processData) setProcesses(processData as Process[]);

    } catch (error) {
        console.error("Data load error", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Top Toggle (Uber Style) */}
      <div className="sticky top-0 bg-white z-20 pt-2 pb-2 px-4 shadow-sm border-b border-gray-50/50">
        <div className="flex gap-6 items-baseline">
          <button 
            onClick={() => setMode('import')}
            className={`text-3xl font-bold transition-colors ${mode === 'import' ? 'text-black' : 'text-gray-300 scale-95'}`}
          >
            Importação
          </button>
          <button 
            onClick={() => setMode('export')}
            className={`text-2xl font-bold transition-colors ${mode === 'export' ? 'text-black' : 'text-gray-300 scale-95'}`}
          >
            Exportação
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 mt-4">
        <div className="bg-gray-100 rounded-full flex items-center p-3.5 shadow-sm active:bg-gray-200 transition-colors">
            <Icons.Search className="text-black ml-1" size={24} strokeWidth={2.5} />
            <input 
                type="text" 
                placeholder={mode === 'import' ? "Rastrear pedido ou container..." : "Buscar processo de exportação..."}
                className="bg-transparent border-none focus:outline-none flex-1 ml-3 text-base font-medium placeholder-gray-500 text-slate-900"
            />
            <div className="bg-white rounded-full p-1.5 shadow-sm">
                <Icons.Clock size={16} className="text-black" />
            </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center mb-3">
             <h3 className="text-lg font-bold text-black">Ações Rápidas</h3>
             {profile && (
                 <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    Saldo: R$ {profile.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
             )}
        </div>
        
        <div className="grid grid-cols-4 gap-3">
            <button onClick={() => navigate('/wizard')} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-active:scale-95 transition-transform group-active:bg-gray-200">
                    <Icons.Plus size={28} className="text-black" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Novo</span>
            </button>

            <button onClick={() => navigate('/payments')} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-active:scale-95 transition-transform group-active:bg-gray-200">
                    <Icons.DollarSign size={28} className="text-black" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Cotação</span>
            </button>

            <button onClick={() => navigate('/documents')} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-active:scale-95 transition-transform group-active:bg-gray-200">
                    <Icons.FileText size={28} className="text-black" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Docs</span>
            </button>

             <button onClick={() => navigate('/notifications')} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-active:scale-95 transition-transform group-active:bg-gray-200">
                    <Icons.Briefcase size={28} className="text-black" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Serviços</span>
            </button>
        </div>
      </div>

      {/* Recent Activity List (Real Data) */}
      <div className="px-4 mt-8">
        <h3 className="text-lg font-bold text-black mb-2">Atividade Recente</h3>
        
        {loading ? (
            <div className="flex justify-center py-8"><Icons.Clock className="animate-spin text-navix-500" /></div>
        ) : processes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Nenhum processo encontrado.</p>
                <button onClick={() => navigate('/wizard')} className="text-navix-600 font-bold text-sm mt-2">Criar primeiro processo</button>
            </div>
        ) : (
            <div className="divide-y divide-gray-100">
                {processes.map((proc) => (
                    <div key={proc.id} className="py-4 flex items-center gap-4 active:bg-gray-50 -mx-4 px-4 transition-colors">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                            {proc.type === 'import' ? <Icons.Download size={20} className="text-gray-600" /> : <Icons.Upload size={20} className="text-gray-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-base truncate">{proc.product}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span className="bg-gray-100 px-1.5 rounded">{proc.code || 'N/A'}</span>
                                <span>• {proc.status}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                             <div className="bg-gray-100 px-2 py-1 rounded-lg text-xs font-bold text-gray-600 mb-1">
                                {proc.progress}%
                            </div>
                            <span className="text-[10px] text-gray-400">
                                {new Date(proc.created_at!).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Market Insights Banner */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-black mb-3">Mercado & Insights</h3>
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-end mb-4">
                <div>
                     <p className="text-xs font-bold text-navix-600 uppercase tracking-wide mb-1">Dólar Hoje</p>
                     <h4 className="text-2xl font-bold text-slate-900">
                        R$ {dollarRate.toFixed(4).replace('.', ',')} 
                        <span className="text-red-500 text-sm font-medium ml-2">▼ 0.3%</span>
                     </h4>
                </div>
                 <div className="h-10 w-24">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <Bar dataKey="value" fill="#cbd5e1" radius={[2,2,2,2]} />
                        </BarChart>
                     </ResponsiveContainer>
                 </div>
            </div>
            <p className="text-xs text-gray-500 font-medium">Melhor momento para fechar câmbio segundo nossa IA.</p>
        </div>
      </div>

    </div>
  );
};
