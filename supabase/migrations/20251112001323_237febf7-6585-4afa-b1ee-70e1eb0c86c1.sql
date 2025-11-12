-- ==========================================
-- ENUMS E TIPOS
-- ==========================================

-- Enum para roles de usuários
CREATE TYPE public.user_role AS ENUM ('admin', 'comercial', 'operacional', 'visitante', 'sdr');

-- Enum para status de leads
CREATE TYPE public.lead_status AS ENUM ('novo', 'qualificado', 'contatado', 'proposta', 'negociacao', 'ganho', 'perdido');

-- Enum para status de orçamentos
CREATE TYPE public.orcamento_status AS ENUM ('aberto', 'enviado', 'aprovado', 'perdido', 'cancelado');

-- Enum para status de pedidos
CREATE TYPE public.pedido_status AS ENUM ('pendente', 'producao', 'finalizado', 'entregue', 'cancelado');

-- Enum para status de produção
CREATE TYPE public.producao_status AS ENUM ('aguardando', 'em_producao', 'finalizado', 'pausado');

-- Enum para tipos de acesso
CREATE TYPE public.access_type AS ENUM ('view', 'edit');

-- ==========================================
-- TABELA: user_profiles
-- ==========================================
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT,
  is_external BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: user_roles (SEPARADA POR SEGURANÇA)
-- ==========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'visitante',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: user_permissions
-- ==========================================
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  page_key TEXT NOT NULL,
  access_type access_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id),
  UNIQUE(user_id, page_key, access_type)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: user_invitations
-- ==========================================
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.user_profiles(id) NOT NULL,
  role user_role NOT NULL DEFAULT 'visitante',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: clientes
-- ==========================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  segmento TEXT,
  classificacao_abc TEXT CHECK (classificacao_abc IN ('A', 'B', 'C')),
  vendedor_id UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_clientes_vendedor ON public.clientes(vendedor_id);
CREATE INDEX idx_clientes_classificacao ON public.clientes(classificacao_abc);

-- ==========================================
-- TABELA: produtos
-- ==========================================
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  unidade TEXT DEFAULT 'KG',
  preco_base DECIMAL(10,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria);

-- ==========================================
-- TABELA: leads
-- ==========================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lead TEXT UNIQUE,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT,
  cliente_telefone TEXT,
  cliente_cnpj TEXT,
  empresa TEXT,
  origem TEXT,
  produto_interesse TEXT,
  valor_estimado DECIMAL(10,2),
  status lead_status NOT NULL DEFAULT 'novo',
  temperatura INTEGER CHECK (temperatura BETWEEN 0 AND 100),
  qualificacao_score INTEGER CHECK (qualificacao_score BETWEEN 0 AND 100),
  especialista_id UUID REFERENCES public.user_profiles(id),
  vendedor_id UUID REFERENCES public.user_profiles(id),
  observacoes TEXT,
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_fechamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_especialista ON public.leads(especialista_id);
CREATE INDEX idx_leads_vendedor ON public.leads(vendedor_id);
CREATE INDEX idx_leads_data_abertura ON public.leads(data_abertura);

-- ==========================================
-- TABELA: lead_history
-- ==========================================
CREATE TABLE public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id),
  acao TEXT NOT NULL,
  status_anterior lead_status,
  status_novo lead_status,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lead_history_lead ON public.lead_history(lead_id);
CREATE INDEX idx_lead_history_data ON public.lead_history(created_at DESC);

-- ==========================================
-- TABELA: lead_qualification_config
-- ==========================================
CREATE TABLE public.lead_qualification_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criterio TEXT NOT NULL,
  peso INTEGER NOT NULL CHECK (peso >= 0 AND peso <= 100),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_qualification_config ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: follow_ups
-- ==========================================
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  orcamento_id UUID,
  tipo TEXT NOT NULL CHECK (tipo IN ('lead', 'orcamento', 'cliente')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_agendada TIMESTAMPTZ NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_follow_ups_lead ON public.follow_ups(lead_id);
CREATE INDEX idx_follow_ups_user ON public.follow_ups(user_id);
CREATE INDEX idx_follow_ups_data ON public.follow_ups(data_agendada);
CREATE INDEX idx_follow_ups_concluido ON public.follow_ups(concluido);

-- ==========================================
-- TABELA: orcamentos
-- ==========================================
CREATE TABLE public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orcamento TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  lead_id UUID REFERENCES public.leads(id),
  vendedor_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  status orcamento_status NOT NULL DEFAULT 'aberto',
  valor_total DECIMAL(12,2) NOT NULL,
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  valor_desconto DECIMAL(12,2) DEFAULT 0,
  valor_final DECIMAL(12,2) NOT NULL,
  observacoes TEXT,
  validade_dias INTEGER DEFAULT 30,
  data_emissao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_validade TIMESTAMPTZ,
  data_aprovacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orcamentos_cliente ON public.orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_vendedor ON public.orcamentos(vendedor_id);
CREATE INDEX idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX idx_orcamentos_data_emissao ON public.orcamentos(data_emissao DESC);

-- ==========================================
-- TABELA: orcamento_itens
-- ==========================================
CREATE TABLE public.orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id),
  produto_codigo TEXT NOT NULL,
  produto_nome TEXT NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_total DECIMAL(12,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orcamento_itens_orcamento ON public.orcamento_itens(orcamento_id);

-- ==========================================
-- TABELA: pedidos
-- ==========================================
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  orcamento_id UUID REFERENCES public.orcamentos(id),
  cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
  vendedor_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  status pedido_status NOT NULL DEFAULT 'pendente',
  valor_total DECIMAL(12,2) NOT NULL,
  data_pedido TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_entrega_prevista TIMESTAMPTZ,
  data_entrega_realizada TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_vendedor ON public.pedidos(vendedor_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_data ON public.pedidos(data_pedido DESC);

-- ==========================================
-- TABELA: pedido_itens
-- ==========================================
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id),
  produto_codigo TEXT NOT NULL,
  produto_nome TEXT NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pedido_itens_pedido ON public.pedido_itens(pedido_id);

-- ==========================================
-- TABELA: cancelamentos
-- ==========================================
CREATE TABLE public.cancelamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  numero_pedido TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  motivo TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_cancelamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cancelamentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cancelamentos_pedido ON public.cancelamentos(pedido_id);
CREATE INDEX idx_cancelamentos_data ON public.cancelamentos(data_cancelamento DESC);

-- ==========================================
-- TABELA: devolucoes
-- ==========================================
CREATE TABLE public.devolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  numero_pedido TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  motivo TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_devolucao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_devolucoes_pedido ON public.devolucoes(pedido_id);
CREATE INDEX idx_devolucoes_data ON public.devolucoes(data_devolucao DESC);

-- ==========================================
-- TABELA: metas_vendas
-- ==========================================
CREATE TABLE public.metas_vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID REFERENCES public.user_profiles(id),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  meta_mensal DECIMAL(12,2) NOT NULL,
  meta_diaria DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vendedor_id, mes, ano)
);

ALTER TABLE public.metas_vendas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_metas_vendedor ON public.metas_vendas(vendedor_id);
CREATE INDEX idx_metas_periodo ON public.metas_vendas(ano, mes);

-- ==========================================
-- TABELA: ordens_producao
-- ==========================================
CREATE TABLE public.ordens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_op TEXT NOT NULL UNIQUE,
  pedido_id UUID REFERENCES public.pedidos(id),
  produto_id UUID REFERENCES public.produtos(id),
  quantidade DECIMAL(10,2) NOT NULL,
  status producao_status NOT NULL DEFAULT 'aguardando',
  data_inicio TIMESTAMPTZ,
  data_fim_prevista TIMESTAMPTZ,
  data_fim_realizada TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ordens_producao_pedido ON public.ordens_producao(pedido_id);
CREATE INDEX idx_ordens_producao_status ON public.ordens_producao(status);

-- ==========================================
-- TABELA: tabela_precos
-- ==========================================
CREATE TABLE public.tabela_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  categoria_cliente TEXT,
  volume_minimo DECIMAL(10,2),
  volume_maximo DECIMAL(10,2),
  preco DECIMAL(10,2) NOT NULL,
  valido_de TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valido_ate TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tabela_precos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tabela_precos_produto ON public.tabela_precos(produto_id);

-- ==========================================
-- TABELA: politica_descontos
-- ==========================================
CREATE TABLE public.politica_descontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('percentual', 'valor', 'tabela')),
  valor_desconto DECIMAL(10,2),
  percentual_desconto DECIMAL(5,2),
  volume_minimo DECIMAL(10,2),
  categoria_cliente TEXT,
  produto_categoria TEXT,
  valido_de TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valido_ate TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.politica_descontos ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: knowledge_categories
-- ==========================================
CREATE TABLE public.knowledge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  icone TEXT,
  ordem INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: knowledge_articles
-- ==========================================
CREATE TABLE public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  category_id UUID REFERENCES public.knowledge_categories(id) ON DELETE SET NULL,
  tags TEXT[],
  author_id UUID REFERENCES public.user_profiles(id),
  views INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_knowledge_articles_category ON public.knowledge_articles(category_id);
CREATE INDEX idx_knowledge_articles_author ON public.knowledge_articles(author_id);

-- ==========================================
-- TABELA: report_configs
-- ==========================================
CREATE TABLE public.report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  destinatarios TEXT[] NOT NULL,
  frequencia TEXT NOT NULL CHECK (frequencia IN ('diario', 'semanal', 'mensal')),
  hora_envio TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.report_configs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: report_history
-- ==========================================
CREATE TABLE public.report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES public.report_configs(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  destinatarios TEXT[],
  status TEXT NOT NULL CHECK (status IN ('enviado', 'erro', 'pendente')),
  erro_mensagem TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_report_history_config ON public.report_history(config_id);
CREATE INDEX idx_report_history_sent ON public.report_history(sent_at DESC);

-- ==========================================
-- TABELA: excluded_orders
-- ==========================================
CREATE TABLE public.excluded_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  motivo TEXT NOT NULL,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.excluded_orders ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: notifications
-- ==========================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  link TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_lida ON public.notifications(lida);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ==========================================
-- FUNÇÕES AUXILIARES
-- ==========================================

-- Função para verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para obter a role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Função para criar perfil de usuário automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_global_email BOOLEAN;
  user_role user_role;
BEGIN
  -- Verificar se é email do domínio Global Aço
  is_global_email := NEW.email LIKE '%@globalaco.com.br';
  
  -- Definir role padrão baseado no domínio
  user_role := CASE 
    WHEN is_global_email THEN 'operacional'::user_role
    ELSE 'visitante'::user_role
  END;
  
  -- Inserir perfil de usuário
  INSERT INTO public.user_profiles (id, email, full_name, is_external)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOT is_global_email
  );
  
  -- Inserir role do usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at em todas as tabelas relevantes
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_vendas_updated_at
  BEFORE UPDATE ON public.metas_vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ordens_producao_updated_at
  BEFORE UPDATE ON public.ordens_producao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tabela_precos_updated_at
  BEFORE UPDATE ON public.tabela_precos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_politica_descontos_updated_at
  BEFORE UPDATE ON public.politica_descontos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_categories_updated_at
  BEFORE UPDATE ON public.knowledge_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_configs_updated_at
  BEFORE UPDATE ON public.report_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- POLÍTICAS RLS
-- ==========================================

-- user_profiles: Usuários podem ver próprio perfil, admins veem todos
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.user_profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: Apenas admins podem gerenciar roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- user_permissions: Admins gerenciam, usuários veem próprias
CREATE POLICY "Users can view own permissions" ON public.user_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions" ON public.user_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- user_invitations: Quem convida pode ver, admins gerenciam tudo
CREATE POLICY "Users can view invitations they sent" ON public.user_invitations
  FOR SELECT USING (invited_by = auth.uid());

CREATE POLICY "Admins can manage all invitations" ON public.user_invitations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- clientes: Comercial e admins podem ver/editar
CREATE POLICY "Comercial can view all clients" ON public.clientes
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR
    public.has_role(auth.uid(), 'sdr')
  );

CREATE POLICY "Comercial can manage clients" ON public.clientes
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- produtos: Todos podem ver, comercial e admins editam
CREATE POLICY "All authenticated users can view products" ON public.produtos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Comercial can manage products" ON public.produtos
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- leads: Comercial, SDR e admins podem ver/gerenciar
CREATE POLICY "Comercial can view all leads" ON public.leads
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR
    public.has_role(auth.uid(), 'sdr')
  );

CREATE POLICY "Comercial can manage leads" ON public.leads
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR
    public.has_role(auth.uid(), 'sdr')
  );

-- lead_history: Mesmas permissões dos leads
CREATE POLICY "Comercial can view lead history" ON public.lead_history
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR
    public.has_role(auth.uid(), 'sdr')
  );

CREATE POLICY "Comercial can manage lead history" ON public.lead_history
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR
    public.has_role(auth.uid(), 'sdr')
  );

-- lead_qualification_config: Apenas admins gerenciam
CREATE POLICY "All authenticated users can view qualification config" ON public.lead_qualification_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage qualification config" ON public.lead_qualification_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- follow_ups: Usuário vê próprios, admins e comercial veem todos
CREATE POLICY "Users can view own follow ups" ON public.follow_ups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Comercial can view all follow ups" ON public.follow_ups
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY "Users can manage own follow ups" ON public.follow_ups
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comercial can manage all follow ups" ON public.follow_ups
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- orcamentos: Comercial pode ver/gerenciar
CREATE POLICY "Comercial can view all budgets" ON public.orcamentos
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY "Comercial can manage budgets" ON public.orcamentos
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- orcamento_itens: Mesmas permissões dos orçamentos
CREATE POLICY "Comercial can view budget items" ON public.orcamento_itens
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY "Comercial can manage budget items" ON public.orcamento_itens
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- pedidos: Comercial e operacional podem ver, comercial gerencia
CREATE POLICY "Authenticated users can view orders" ON public.pedidos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Comercial can manage orders" ON public.pedidos
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- pedido_itens: Mesmas permissões dos pedidos
CREATE POLICY "Authenticated users can view order items" ON public.pedido_itens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Comercial can manage order items" ON public.pedido_itens
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- cancelamentos: Comercial pode ver/gerenciar
CREATE POLICY "Comercial can view cancellations" ON public.cancelamentos
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY "Comercial can manage cancellations" ON public.cancelamentos
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- devolucoes: Comercial pode ver/gerenciar
CREATE POLICY "Comercial can view returns" ON public.devolucoes
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY "Comercial can manage returns" ON public.devolucoes
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- metas_vendas: Todos podem ver, admins e comercial gerenciam
CREATE POLICY "Authenticated users can view sales goals" ON public.metas_vendas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Comercial can manage sales goals" ON public.metas_vendas
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- ordens_producao: Operacional e admins gerenciam
CREATE POLICY "Authenticated users can view production orders" ON public.ordens_producao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operacional can manage production orders" ON public.ordens_producao
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operacional')
  );

-- tabela_precos: Todos veem, comercial e admins gerenciam
CREATE POLICY "Authenticated users can view price table" ON public.tabela_precos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Comercial can manage price table" ON public.tabela_precos
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
  );

-- politica_descontos: Todos veem, admins gerenciam
CREATE POLICY "Authenticated users can view discount policies" ON public.politica_descontos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage discount policies" ON public.politica_descontos
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- knowledge_categories: Todos veem, admins gerenciam
CREATE POLICY "Authenticated users can view knowledge categories" ON public.knowledge_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage knowledge categories" ON public.knowledge_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- knowledge_articles: Todos veem, admins e autores gerenciam
CREATE POLICY "Authenticated users can view knowledge articles" ON public.knowledge_articles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authors can manage own articles" ON public.knowledge_articles
  FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all articles" ON public.knowledge_articles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- report_configs: Admins gerenciam
CREATE POLICY "Authenticated users can view report configs" ON public.report_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage report configs" ON public.report_configs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- report_history: Admins gerenciam
CREATE POLICY "Authenticated users can view report history" ON public.report_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage report history" ON public.report_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- excluded_orders: Admins gerenciam
CREATE POLICY "Authenticated users can view excluded orders" ON public.excluded_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage excluded orders" ON public.excluded_orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- notifications: Usuários veem próprias
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);