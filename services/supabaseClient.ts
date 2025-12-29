import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcqpsxwyeccpmdtyydnw.supabase.co';
const supabaseKey = 'sb_publishable_T6TJzBbkH_-UeE4VnWKc8g_xFgBaGX2';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ==============================================================================
 * 🚀 SCRIPT DEFINITIVO PARA CORRIGIR O ERRO DE RLS (COPIE E RODAR NO SQL EDITOR)
 * ==============================================================================
 * 
 * Execute os comandos abaixo no "SQL Editor" do seu painel Supabase para
 * liberar o funcionamento do app:
 * 
 * -- 1. LIBERAR TABELAS DO BANCO DE DADOS
 * -- Isso permite que você insira e veja seus próprios processos e documentos
 * 
 * ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all for owners" ON public.profiles FOR ALL USING (auth.uid() = id);
 * 
 * ALTER TABLE IF EXISTS public.processes ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all for owners" ON public.processes FOR ALL USING (auth.uid() = user_id);
 * 
 * ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all for owners" ON public.documents FOR ALL USING (auth.uid() = user_id);
 * 
 * ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all for owners" ON public.transactions FOR ALL USING (auth.uid() = user_id);
 * 
 * ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow all for owners" ON public.notifications FOR ALL USING (auth.uid() = user_id);
 * 
 * -- 2. LIBERAR O STORAGE (UPLOAD DE ARQUIVOS)
 * -- Mesmo o bucket sendo PUBLIC, o comando de upload (INSERT) precisa de permissão RLS
 * 
 * CREATE POLICY "Permitir Upload para Usuarios Autenticados"
 * ON storage.objects FOR INSERT 
 * TO authenticated 
 * WITH CHECK (bucket_id = 'navix');
 * 
 * CREATE POLICY "Permitir Ver Arquivos para Usuarios Autenticados"
 * ON storage.objects FOR SELECT 
 * TO authenticated 
 * USING (bucket_id = 'navix');
 * 
 * CREATE POLICY "Permitir Update para Usuarios Autenticados"
 * ON storage.objects FOR UPDATE 
 * TO authenticated 
 * USING (bucket_id = 'navix');
 */
