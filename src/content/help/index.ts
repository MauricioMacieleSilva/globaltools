export interface HelpArticle {
  slug: string;
  title: string;
  module: string;
  screenshot?: string;
  intro: string;
  access: string;
  steps: { title: string; description: string }[];
  tips?: string[];
  troubleshooting?: { problem: string; solution: string }[];
}

export const helpArticles: HelpArticle[] = [
  {
    slug: 'introducao',
    title: 'Primeiros passos',
    module: 'Começando',
    intro:
      'O Global Tools centraliza CRM, produção, estoque, cortes, fretes, política comercial e gestão administrativa da Global Aço em uma única plataforma. Este guia explica como acessar o sistema e se familiarizar com a interface.',
    access: 'Todos os colaboradores cadastrados.',
    steps: [
      { title: 'Acesse o sistema', description: 'Abra https://globaltools.lovable.app no navegador. Para colaboradores @globalaco.com.br o cadastro é liberado automaticamente.' },
      { title: 'Faça login', description: 'Informe e-mail e senha. Em "Esqueci minha senha" você recebe um link por e-mail para redefinir.' },
      { title: 'Conheça o menu lateral', description: 'À esquerda ficam todos os módulos disponíveis para o seu perfil. Clique no ícone para recolher/expandir o menu.' },
      { title: 'Cabeçalho da página', description: 'No topo aparecem o nome da página, o subtítulo e seu avatar (canto superior direito) com tema, perfil e logout.' },
      { title: 'Instale como app', description: 'No celular, abra o menu do avatar e use "Instalar app" para acesso rápido na tela inicial. No desktop, clique no ícone de instalação na barra do navegador.' },
    ],
    tips: [
      'Use o botão de tour interativo (ícone de lâmpada no canto inferior direito) em cada página para um passo a passo guiado.',
      'O sistema atualiza dados automaticamente a cada 30 minutos. Use o ícone de refresh para forçar atualização imediata.',
    ],
  },
  {
    slug: 'dashboard',
    title: 'Dashboard Comercial',
    module: 'Comercial',
    screenshot: '/help/screens/dashboard.png',
    intro: 'Visão consolidada das vendas: faturamento, orçamentos, ranking de vendedores, top clientes, meta do mês e ticket médio. É a página inicial padrão.',
    access: 'Vendedores, gestores e admin.',
    steps: [
      { title: 'Aplique filtros', description: 'No topo escolha Ano, Mês, UF, Classe e Vendedor para recortar os dados.' },
      { title: 'Leia os KPIs', description: 'Faturamento mostra valor faturado e percentual da meta. Orçamento mostra propostas em aberto. Ticket Médio e R$/kg ficam logo abaixo.' },
      { title: 'Faturamento Diário', description: 'Gráfico mostra evolução diária de Faturado vs. Pedido no mês. Use o ícone de engrenagem para ajustar exibição.' },
      { title: 'Top Vendedores e Top Clientes', description: 'Ranking com pódio (🥇🥈🥉). Clique em um nome para ver detalhes.' },
      { title: 'Modo TV', description: 'Botão de monitor (canto superior direito) ativa carrossel automático ideal para painéis de TV no escritório.' },
    ],
    tips: ['Aba "Orçamentos" abre a tela de propostas em aberto. Aba "Perdidos" mostra leads/pedidos perdidos no período.'],
  },
  {
    slug: 'crm-kanban',
    title: 'CRM — Kanban de Leads',
    module: 'CRM',
    screenshot: '/help/screens/crm-kanban.png',
    intro: 'Visualização principal do funil comercial. Cada coluna é um estágio: Lead → Contato → Bastão → Oportunidade → Fechado/Perdido. Arraste cards para mudar de etapa.',
    access: 'SDR, Comercial, Gestor Comercial e Admin.',
    steps: [
      { title: 'Crie um lead', description: 'Botão "+ Novo Lead" no topo direito. Preencha empresa, contato, telefone, origem e cidade. O sistema deduplica por nome de empresa.' },
      { title: 'Mova entre estágios', description: 'Arraste o card para a próxima coluna. O sistema pode pedir registro de atividade (ligação, WhatsApp, visita) na transição.' },
      { title: 'Abra um card', description: 'Clique para abrir o drawer com histórico, anexos, propostas, follow-ups e botões de ação.' },
      { title: 'Filtros e busca', description: 'Use a busca (telefone, empresa, contato, origem) e os seletores de estágio e origem no topo.' },
      { title: 'Modo TV e Leads Parados', description: 'Modo TV gira o quadro automaticamente. "Leads Parados" alerta sobre cards sem atividade há muitos dias.' },
    ],
    tips: [
      'Cards com ícone do Instagram vieram de Tráfego Pago.',
      'Não é possível voltar leads que já estão em "Oportunidade" sem ser gestor.',
      'Leads com follow-up futuro ficam ocultos e voltam automaticamente na data agendada.',
    ],
    troubleshooting: [
      { problem: 'Não vejo meus leads', solution: 'Confirme se o filtro padrão "Minha Carteira" está ativo. Admins veem tudo; vendedores veem apenas os próprios.' },
      { problem: 'Não consigo arrastar o card', solution: 'Pode ser uma restrição de permissão (ex: passar por "Bastão" exige perfil SDR/Gestor). Veja o aviso vermelho ao tentar.' },
    ],
  },
  {
    slug: 'crm-abas',
    title: 'CRM — demais abas',
    module: 'CRM',
    intro: 'Além do Kanban, o CRM tem 8 abas com visões e funcionalidades complementares.',
    access: 'Conforme permissões do CRM.',
    steps: [
      { title: 'Lista', description: 'Tabela paginada de todos os leads (50 por página) com filtros avançados e exportação.' },
      { title: 'Agenda', description: 'Calendário de visitas. Agende, edite e visualize conflitos. Sincroniza com lembretes.' },
      { title: 'Dashboard', description: 'KPIs do CRM: contatos por dia, conversões, funil, performance por vendedor e SDR.' },
      { title: 'Prospecção', description: 'Painel para ativar leads via BrasilAPI/CNAE. Use "Atender" para puxar para a sua carteira.' },
      { title: 'Minha Carteira', description: 'Visão exclusiva dos seus leads com solicitação de transferência e re-iniciação de leads perdidos.' },
      { title: 'Bastão', description: 'Histórico de transferências SDR → Vendedor. Mede performance do SDR.' },
      { title: 'Concorrência', description: 'Propostas concorrentes anexadas com extração automática de metadados.' },
      { title: 'Relatório', description: 'Geração de relatórios consolidados do período.' },
    ],
  },
  {
    slug: 'clientes',
    title: 'Central de Clientes',
    module: 'Comercial',
    screenshot: '/help/screens/clientes.png',
    intro: 'Base completa de clientes com indicadores, análise ABC e relatório por vendedor.',
    access: 'Comercial, Gestor e Admin.',
    steps: [
      { title: 'Aba Clientes', description: 'Lista paginada com KPIs (Total, Ativos, Inativos, Faturamento, Ticket Médio). Busque por cliente, produto ou vendedor.' },
      { title: 'Aba Análise', description: 'Curva ABC: classifica clientes em A, B e C por participação no faturamento.' },
      { title: 'Aba Relatório', description: 'Relatório consolidado por vendedor, período e categoria.' },
      { title: 'Ações por linha', description: 'Botão "Visitar" agenda visita. Botão "Follow-up" registra próxima ação.' },
    ],
  },
  {
    slug: 'producao',
    title: 'Fábrica (Produção)',
    module: 'Operações',
    intro: 'Acompanhamento de Ordens de Produção (OPs), pendências de material, indicadores e notificações automáticas.',
    access: 'Produção, Comercial e Admin.',
    steps: [
      { title: 'Aba Pedidos', description: 'Lista OPs em andamento, com prazo comercial, percentual concluído e status.' },
      { title: 'Aba Resumo', description: 'Matriz pivot por material (excluindo TUBOS, CANTONEIRAS, etc.) mostrando saldos por OP.' },
      { title: 'Aba Pendências', description: 'KPIs e tabela de materiais que dependem de OPs não finalizadas.' },
      { title: 'Aba Estoque', description: 'Veja a documentação dedicada a Estoque.' },
      { title: 'Notificações', description: 'O sistema envia e-mail quando uma OP atinge "Prazo Comercial" ou 100% concluída. Indicador "Última atualização" no topo.' },
    ],
    tips: ['Pesos exibidos em KG com separador BR. OPs mostram metro|kg conforme o item.', 'Perda padrão é 103%; admin pode ocultar OPs manualmente.'],
  },
  {
    slug: 'estoque',
    title: 'Estoque',
    module: 'Operações',
    intro: 'Gestão de itens em estoque por categoria (Perfis, Tubos, Laminados, Chapas, etc.) com entradas, saídas, histórico e relatório por e-mail.',
    access: 'Estoque, Produção e Admin.',
    steps: [
      { title: 'Selecione a categoria', description: 'No desktop, abas no topo. No celular, dropdown.' },
      { title: 'Entrada', description: 'Botão verde "Entrada" abre o cadastro do item. Para Cartolas, o sistema preenche dimensões simétricas automaticamente.' },
      { title: 'Saída', description: 'Botão vermelho "Saída" registra consumo, vinculando a quem retirou.' },
      { title: 'Histórico', description: 'Botão "Histórico" mostra todas as movimentações registradas via trigger automático.' },
      { title: 'Relatório', description: 'Envia e-mail com tabelas categorizadas por preço dinâmico.' },
    ],
    tips: ['Indicadores 🟢🟡🔴 aparecem em outras telas (ex: Corte Perfil) para sinalizar disponibilidade.'],
  },
  {
    slug: 'politica-comercial',
    title: 'Política Comercial',
    module: 'Comercial',
    screenshot: '/help/screens/politica-comercial.png',
    intro: 'Tabelas de preços por categoria, política de descontos por volume e simulador de formação de preço final.',
    access: 'Comercial, Gestor e Admin.',
    steps: [
      { title: 'Política de Descontos', description: 'Veja faixas: até 2t (2%), 2–5t (3%), 5–10t (4%), >10t (5%). Acima de 5% precisa aprovação da gestão.' },
      { title: 'Tabela de Preços', description: 'Abas por categoria (Arames, Bobinas, Perfis, Chapas, Telhas, Tubos, Laminados, Construção Civil, Blank). Adicione/edite preços com botão azul.' },
      { title: 'Simulador', description: 'Painel à direita: informe Preço da Tabela, ICMS, Peso, Condição, % Desconto, % Financeiro e Frete. Resultado mostra preço com ICMS, descontos e R$/kg.' },
      { title: 'Transportadoras', description: 'Cadastro auxiliar para uso em fretes.' },
    ],
  },
  {
    slug: 'corte-perfil',
    title: 'Corte Perfil',
    module: 'Cálculo',
    screenshot: '/help/screens/corte-perfil.png',
    intro: 'Cálculo de corte para perfis metálicos (U/Z, L, Cartola e variantes enrijecidas/semi-enrijecidas) com otimização bin-packing e integração com estoque.',
    access: 'Comercial e Admin.',
    steps: [
      { title: 'Escolha o perfil', description: 'Abas: U/Z, L, U/Z Enrij., U/Z Semi-Enrij., Cartola, Cart. Enrij., Cart. Semi-Enrij.' },
      { title: 'Preencha as dimensões', description: 'Espessura, abas, base, comprimento, largura, quantidade e %P (perda padrão 103%).' },
      { title: 'Adicionar linha', description: 'Use "+ Adicionar Linha" para múltiplas peças.' },
      { title: 'Otimizar', description: 'Aba "Otimizado" roda algoritmo FFD para combinar perfis e reduzir perda.' },
      { title: 'Resumo', description: 'Aba "Resumo" mostra peso total e peso de perda. Salve resumos para reuso.' },
      { title: 'Perfis Padrão', description: 'Botão azul no topo abre catálogo padrão "U" com tamanhos e espessuras pré-definidos.' },
    ],
    tips: ['Densidade 0,000008 e descontos de dobra são aplicados automaticamente.', 'Indicadores de estoque 🟢🟡🔴 mostram disponibilidade do item.'],
  },
  {
    slug: 'corte-blank',
    title: 'Corte Blank',
    module: 'Cálculo',
    intro: 'Otimização de corte para chapas metálicas. Define a chapa, lista as peças, e o sistema calcula o melhor layout.',
    access: 'Comercial e Admin.',
    steps: [
      { title: 'Configuração da Chapa', description: 'Informe largura, comprimento e espessura.' },
      { title: 'Lista de Peças', description: 'Cadastre cada peça com dimensões e quantidade.' },
      { title: 'Otimizar', description: 'Sistema calcula a melhor distribuição minimizando perda.' },
      { title: 'Visualização', description: 'Mapa de corte mostra como as peças serão dispostas.' },
      { title: 'Relatório', description: 'Percentual de aproveitamento, peso utilizado e perda.' },
    ],
  },
  {
    slug: 'fretes',
    title: 'Controle de Fretes',
    module: 'Operações',
    screenshot: '/help/screens/fretes.png',
    intro: 'Gestão de fretes vinculados a pedidos com fluxo de aprovação e cálculo de R$/ton.',
    access: 'Comercial, Logística e Admin.',
    steps: [
      { title: 'Novo Frete', description: 'Botão azul abre formulário. Vincule pedido(s), transportadora, valor, peso e cidade destino (IBGE API).' },
      { title: 'Fluxo de aprovação', description: 'Status: Rascunho → Pendente → Aprovado. Aprovação envia e-mail.' },
      { title: 'Histórico', description: 'Botão "Histórico" lista todos os fretes registrados em frete_historico.' },
      { title: 'Transportadoras', description: 'Botão dedicado para cadastro/edição de transportadoras.' },
      { title: 'KPIs', description: 'Total de Fretes, Valor Total, Aguardando Aprovação e Entregas Pendentes.' },
    ],
  },
  {
    slug: 'chamados',
    title: 'Chamados Financeiro',
    module: 'Comercial',
    screenshot: '/help/screens/chamados.png',
    intro: 'Abertura e acompanhamento de solicitações para o financeiro: análise de crédito, parametrização fiscal, pré-análise (Serasa) e outras.',
    access: 'Todos os usuários autenticados podem abrir chamados; Financeiro responde.',
    steps: [
      { title: 'Novo Chamado', description: 'Botão "+ Novo Chamado". Selecione lead/cliente, categoria e prioridade. Anexo é obrigatório no envio.' },
      { title: 'CNPJ válido', description: 'O CNPJ do cliente precisa ter 14 dígitos válidos. O sistema bloqueia o envio se estiver incorreto.' },
      { title: 'Categorias e SLA', description: 'Cada categoria tem SLA próprio (ex: Pré-Análise 2h). O contador roda em horário comercial (seg–sex 8h–17:45).' },
      { title: 'Acompanhe na lista', description: 'Cards mostram número (TKT-XXXXX), prioridade, categoria, SLA restante e status (Aberto, Em Andamento, Concluído, Cancelado).' },
      { title: 'Resposta do financeiro', description: 'Pré-Análise exige Score, Considerações e anexo opcional. Outras categorias retornam parecer e anexo conforme caso.' },
      { title: 'KPIs e e-mails', description: 'Painel mostra Abertos, Em Andamento, Concluídos, Fora do SLA e Taxa SLA. Todo chamado aberto envia e-mail com [TKT-XXXXX] no assunto.' },
    ],
    troubleshooting: [
      { problem: 'Não consigo enviar o chamado', solution: 'Verifique se anexou um arquivo e se o CNPJ do lead está correto (14 dígitos válidos).' },
    ],
  },
  {
    slug: 'treinamentos',
    title: 'Treinamentos',
    module: 'Conhecimento',
    screenshot: '/help/screens/treinamentos.png',
    intro: 'Biblioteca de materiais de capacitação em PDF (integração, ecossistema, playbooks, fluxos comerciais).',
    access: 'Todos os usuários autenticados.',
    steps: [
      { title: 'Filtre por categoria', description: 'Dropdown no topo direito (Geral, Comercial, etc.).' },
      { title: 'Abrir PDF', description: 'Clique no card. Sistema abre em modo apresentação fullscreen com correção de orientação.' },
      { title: 'Novo Treinamento', description: 'Admins podem subir novos PDFs pelo botão azul.' },
    ],
  },
  {
    slug: 'assistente',
    title: 'Assistente Global (Zé)',
    module: 'Conhecimento',
    screenshot: '/help/screens/assistente.png',
    intro: 'Assistente de IA com a base de conhecimento da Global Aço. Responde sobre processos, produtos e políticas via texto ou voz.',
    access: 'Todos os usuários autenticados.',
    steps: [
      { title: 'Chat de Texto', description: 'Aba padrão. Digite sua pergunta ou use as sugestões iniciais.' },
      { title: 'Conversa por Voz', description: 'Aba "Conversa por Voz" libera o microfone para diálogo em tempo real.' },
      { title: 'Limpar conversa', description: 'Ícone de lixeira ao lado do nome do Zé reinicia o chat.' },
    ],
  },
  {
    slug: 'reunioes-precos',
    title: 'Reuniões e Central de Preços',
    module: 'Conhecimento',
    intro: 'Atalhos no menu lateral para sistemas externos integrados ao ecossistema Global Aço.',
    access: 'Conforme permissão.',
    steps: [
      { title: 'Reuniões', description: 'Abre o Secretário Digital Global Aço em nova aba.' },
      { title: 'Central de Preços', description: 'Abre a plataforma externa de preços em nova aba.' },
    ],
  },
  {
    slug: 'admin-usuarios',
    title: 'Administração — Usuários',
    module: 'Administração',
    intro: 'Gestão de usuários, perfis (roles), permissões individuais e convites.',
    access: 'Apenas Admin.',
    steps: [
      { title: 'Convidar usuário', description: 'Botão "Convidar". Domínios @globalaco.com.br entram direto; externos precisam de convite.' },
      { title: 'Editar usuário', description: 'Clique no card para alterar nome, e-mail e perfil. Troca de papel é atômica no banco.' },
      { title: 'Permissões', description: 'Aba de permissões individuais sobrescreve as padrão do perfil. Existem permissões "view" e "edit".' },
      { title: 'Excluir', description: 'Confirmação dupla; remoção via Edge Function.' },
    ],
  },
  {
    slug: 'admin-relatorios',
    title: 'Administração — Relatórios',
    module: 'Administração',
    intro: 'Configuração de relatórios automáticos por e-mail (diário, mensal, estoque, produção) e metas.',
    access: 'Apenas Admin.',
    steps: [
      { title: 'Configuração', description: 'Defina destinatários, horários, dias úteis e dias específicos para Estoque.' },
      { title: 'Metas', description: 'Cadastre metas de vendas mensais e por vendedor (tabela admin_goals e crm_vendor_goals).' },
      { title: 'Pré-visualização', description: 'Botão "Preview" gera HTML do relatório antes do envio.' },
      { title: 'Histórico', description: 'Tabela com envios anteriores e status.' },
    ],
  },
];

export const helpModules = Array.from(new Set(helpArticles.map((a) => a.module)));