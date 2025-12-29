import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { WizardData, OperationType, DocumentItem } from '../types';
import { analyzeNCM } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

interface WizardProps {
  type: OperationType;
}

export const Wizard: React.FC<WizardProps> = ({ type }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDocType, setActiveDocType] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>({
    operationType: type,
    originCountry: '',
    destinationCountry: '',
    productName: '',
    ncmCode: '',
    files: [],
    totalValue: 0,
    estimatedTaxes: 0
  });

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 4));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSmartAnalyze = async () => {
    if (!data.productName) return;
    setLoadingAnalysis(true);
    const result = await analyzeNCM(data.productName);
    setAiTip(result);
    setLoadingAnalysis(false);
  };

  const handleFileSelect = (docType: string) => {
    setActiveDocType(docType);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !activeDocType) return;
    
    const file = e.target.files[0];
    setUploadingDoc(activeDocType);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não logado");

        const sanitizeStr = (str: string) => {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
        }

        const rawExt = file.name.split('.').pop() || 'pdf';
        const fileExt = sanitizeStr(rawExt);
        const docNameClean = activeDocType.replace(/\s/g, '_');
        
        const fileName = `${user.id}/${Date.now()}_${docNameClean}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('navix')
            .upload(fileName, file);

        if (uploadError) {
          console.error("Storage Error Details:", uploadError);
          throw new Error(`Erro no Upload: ${uploadError.message}. Verifique se você criou as políticas de Storage no SQL Editor.`);
        }

        const newDoc: DocumentItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: activeDocType,
            type: fileExt || 'PDF',
            date: new Date().toLocaleDateString(),
            status: 'Enviado',
            url: fileName,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        };

        setData(prev => ({
            ...prev,
            files: [...prev.files.filter(f => f.name !== activeDocType), newDoc]
        }));

    } catch (error: any) {
        console.error("Upload process error:", error);
        alert(error.message);
    } finally {
        setUploadingDoc(null);
        setActiveDocType(null);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const code = `${type === 'import' ? 'IMP' : 'EXP'}-${Math.floor(Math.random() * 1000)}`;
        
        const { data: process, error: processError } = await supabase
            .from('processes')
            .insert([{
                user_id: user.id,
                type: data.operationType,
                code: code,
                product: data.productName,
                origin: data.originCountry,
                destination: data.destinationCountry,
                status: 'Em análise',
                progress: 10
            }])
            .select()
            .single();

        if (processError) {
            throw new Error(`Erro ao criar processo: ${processError.message}. Você rodou o script SQL de RLS?`);
        }

        if (data.files.length > 0) {
            const docsToInsert = data.files.map(doc => ({
                user_id: user.id,
                process_id: process.id,
                name: doc.name,
                type: doc.type,
                status: 'Pendente',
                url: doc.url,
                date: new Date().toISOString()
            }));
            
            const { error: docError } = await supabase.from('documents').insert(docsToInsert);
            if (docError) {
                console.error("Docs Insert Error:", docError);
                alert(`Processo criado, mas erro ao salvar metadados dos documentos: ${docError.message}`);
            }
        }

        await supabase.from('notifications').insert([{
            user_id: user.id,
            title: 'Novo Processo Criado',
            message: `O processo ${code} de ${data.productName} foi iniciado com sucesso.`,
            type: 'success'
        }]);

        alert('Operação registrada com sucesso!');
        navigate('/dashboard');

    } catch (error: any) {
        console.error("Finalization error:", error);
        alert(error.message);
    } finally {
        setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-between mb-8 px-4">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex flex-col items-center relative z-10">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step >= s ? 'bg-navix-600 text-white shadow-lg shadow-navix-500/30 ring-2 ring-white' : 'bg-gray-100 text-gray-400 ring-2 ring-white'
            }`}
          >
            {s}
          </div>
          <span className={`text-[10px] mt-2 font-semibold tracking-wide ${step >= s ? 'text-navix-800' : 'text-gray-400'}`}>
            {s === 1 ? 'Dados' : s === 2 ? 'Docs' : s === 3 ? 'Pgto' : 'Fim'}
          </span>
        </div>
      ))}
      <div className="absolute left-8 right-8 h-1 bg-gray-100 top-[18px] -z-0 rounded-full overflow-hidden">
        <div
          className="h-full bg-navix-600 transition-all duration-500 ease-out"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-24 max-w-lg mx-auto">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={onFileChange}
      />

      <div className="px-5 mb-6 pt-2">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-slate-500 mb-4 px-2 py-1 -ml-2 rounded-lg active:bg-slate-100">
          <Icons.ArrowLeft size={20} className="mr-1" /> <span className="text-sm font-medium">Voltar</span>
        </button>
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">Nova {type === 'import' ? 'Importação' : 'Exportação'}</h1>
        <p className="text-slate-500 text-sm mt-1">Preencha os dados do processo.</p>
      </div>

      <div className="px-1 relative mb-6">
        {renderProgressBar()}
      </div>

      <div className="px-5">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800">Detalhes da Operação</h2>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Produto Principal</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-navix-500 focus:border-navix-500 focus:outline-none transition-all text-sm font-medium"
                    placeholder="Ex: Soja, Eletrônicos..."
                    value={data.productName}
                    onChange={(e) => setData({...data, productName: e.target.value})}
                  />
                  <button 
                    onClick={handleSmartAnalyze}
                    disabled={loadingAnalysis || !data.productName}
                    className="p-3.5 bg-navix-100 text-navix-700 rounded-2xl hover:bg-navix-200 active:scale-95 transition-all"
                  >
                   {loadingAnalysis ? <Icons.Clock className="animate-spin" size={22} /> : <Icons.Search size={22} />}
                  </button>
                </div>
                {aiTip && (
                  <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex gap-3 leading-relaxed">
                    <Icons.TrendingUp size={18} className="shrink-0 mt-0.5" />
                    <p>{aiTip}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Origem</label>
                    <input 
                        type="text" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-navix-500 transition-all text-sm font-medium"
                        placeholder="País"
                        value={data.originCountry}
                        onChange={(e) => setData({...data, originCountry: e.target.value})}
                    />
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Destino</label>
                    <input 
                        type="text" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-navix-500 transition-all text-sm font-medium"
                        placeholder="País"
                        value={data.destinationCountry}
                        onChange={(e) => setData({...data, destinationCountry: e.target.value})}
                    />
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">NCM (Código Fiscal)</label>
                <input 
                  type="text"
                  inputMode="numeric" 
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-navix-500 transition-all text-sm font-medium"
                  placeholder="0000.00.00"
                  value={data.ncmCode}
                  onChange={(e) => setData({...data, ncmCode: e.target.value})}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Documentação</h2>
              
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-3">
                <Icons.AlertCircle className="text-orange-500 shrink-0" size={22} />
                <p className="text-xs text-orange-800 font-medium leading-relaxed">Clique nos itens para fazer o upload do arquivo.</p>
              </div>

              <div className="space-y-3">
                {['Commercial Invoice', 'Packing List', 'Bill of Lading'].map((docName, idx) => {
                  const isUploaded = data.files.some(f => f.name === docName);
                  const isUploading = uploadingDoc === docName;

                  return (
                    <div 
                        key={idx} 
                        onClick={() => handleFileSelect(docName)}
                        className={`border-2 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer group ${
                            isUploaded ? 'border-emerald-200 bg-emerald-50/50' : 'border-dashed border-slate-200 active:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition-colors ${isUploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-500 group-hover:bg-slate-100'}`}>
                            {isUploading ? <Icons.Clock className="animate-spin" size={24} /> : <Icons.FileText size={24} />}
                        </div>
                        <div>
                            <p className={`font-semibold text-sm ${isUploaded ? 'text-emerald-900' : 'text-slate-700'}`}>{docName}</p>
                            <p className={`text-[10px] font-medium mt-0.5 ${isUploaded ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isUploaded ? 'Arquivo anexado' : isUploading ? 'Enviando...' : 'Toque para enviar (PDF)'}
                            </p>
                        </div>
                        </div>
                        <div className={`p-2 rounded-lg ${isUploaded ? 'text-emerald-600' : 'bg-navix-50 text-navix-600'}`}>
                            {isUploaded ? <Icons.CheckCircle size={20} className="fill-current" /> : <Icons.Upload size={20} strokeWidth={2.5} />}
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Previsão Financeira</h2>
              
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
                <div className="flex justify-between text-sm text-slate-600 font-medium">
                  <span>Valor da Carga</span>
                  <span>$ 10,000.00</span>
                </div>
                 <div className="flex justify-between text-sm text-slate-600 font-medium">
                  <span>Frete Internacional</span>
                  <span>$ 1,200.00</span>
                </div>
                 <div className="flex justify-between text-sm text-slate-600 font-medium">
                  <span>Impostos Estimados</span>
                  <span>$ 850.00</span>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between text-lg font-bold text-slate-900">
                  <span>Total Estimado</span>
                  <span>$ 12,050.00</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <Icons.CheckCircle className="text-emerald-500 mt-0.5" size={20} />
                <p className="text-xs text-emerald-800 font-medium leading-relaxed">Cotação do Dólar garantida por 15 min via Navix Wallet.</p>
              </div>
            </div>
          )}

          {step === 4 && (
             <div className="space-y-6 text-center pt-2">
              <div className="w-24 h-24 bg-gradient-to-tr from-navix-100 to-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-navix-50">
                 <Icons.Ship className="text-navix-600" size={48} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Tudo Pronto!</h2>
                <p className="text-slate-500 text-sm px-2 mt-2 leading-relaxed">
                    Sua operação de <strong>{data.productName || 'Carga Geral'}</strong> está pronta para ser registrada.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-3 border border-slate-100">
                <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                   <Icons.CheckCircle size={18} className="text-emerald-500" /> {data.files.length} Documentos anexados
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                   <Icons.CheckCircle size={18} className="text-emerald-500" /> Previsão de taxas concluída
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-100 flex gap-4">
            {step > 1 && (
              <button 
                onClick={handleBack}
                className="flex-1 py-4 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 active:scale-95 transition-all"
              >
                Voltar
              </button>
            )}
            <button 
              onClick={step === 4 ? handleFinish : handleNext}
              disabled={loading || uploadingDoc !== null}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2
                ${loading || uploadingDoc !== null ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-navix-600 text-white shadow-navix-500/30 hover:bg-navix-700 active:scale-95'}
              `}
            >
              {loading && <Icons.Clock className="animate-spin" size={20} />}
              {step === 4 ? (loading ? 'Registrando...' : 'Finalizar Registro') : 'Próximo'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
