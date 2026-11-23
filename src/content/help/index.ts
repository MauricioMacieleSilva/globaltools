// Manual do Globinho.
//
// Fonte única de ajuda do sistema: alimenta a Central de Ajuda (/ajuda) e o Zé,
// que consulta estes artigos para explicar como usar cada tela.
// Ao mudar uma tela, atualize o artigo dela aqui.
//
// `pages`: telas (PageKeys) que dão acesso ao artigo. Vazio = todos podem ver.

export interface HelpArticle {
  slug: string;
  title: string;
  module: string;
  /** Endereço da tela no sistema (quando existe) */
  route?: string;
  /** Telas que liberam este artigo. Vazio/ausente = todos */
  pages?: string[];
  screenshot?: string;
  intro: string;
  access: string;
  steps: { title: string; description: string }[];
  /** Regras: o que o sistema faz/exige em cada situação */
  rules?: string[];
  faq?: { q: string; a: string }[];
  tips?: string[];
  troubleshooting?: { problem: string; solution: string }[];
  /** Palavras que as pessoas usam para procurar este assunto */
  keywords?: string[];
}

export const helpArticles: HelpArticle[] = [
  {
    slug: 'introducao',
    title: 'Primeiros passos',
    module: 'Começando',
    intro:
      'O Globinho reúne as ferramentas da Global Aço: Dashboard Comercial, CRM, Clientes, Fábrica (produção, compras e estoque), Fretes, Política Comercial, Corte Perfil, Corte Blank, Treinamentos, Chamados e a administração. Cada pessoa vê no menu só as telas liberadas para o seu perfil.',
    access: 'Todos os usuários.',
    steps: [
      { title: 'Acesse', description: 'Abra globinho.vercel.app no navegador (computador ou celular) e entre com seu e-mail e senha.' },
      { title: 'Primeiro acesso', description: 'Quem recebe um acesso novo entra com a senha temporária enviada pelo administrador. O sistema pede para criar uma senha nova (mínimo de 6 caracteres) antes de continuar.' },
      { title: 'Menu lateral', description: 'À esquerda ficam as telas liberadas para você. O ícone no topo do menu recolhe/expande. "Sair" fica no fim do menu.' },
      { title: 'Seu avatar', description: 'No canto superior direito: trocar sua foto (clique na foto), ligar/desligar o "Design Moderno" e "Instalar no celular".' },
      { title: 'Zé', description: 'O botão "Pergunte ao Zé" fica no canto inferior direito de todas as telas (atalho Ctrl+J). Ele responde dúvidas sobre o sistema e consulta os dados que você pode ver.' },
    ],
    rules: [
      'Os dados comerciais e da fábrica vêm do ERP por uma planilha que é atualizada várias vezes ao dia. Por isso um pedido lançado agora no ERP pode levar um tempo para aparecer no Globinho. O horário da última atualização aparece nas telas ("Atualizado HH:MM").',
      'As telas que cada pessoa vê dependem do perfil de acesso (Admin, Comercial, Operacional, SDR, Financeiro, Visitante) e de liberações extras feitas pelo administrador.',
    ],
    faq: [
      { q: 'Esqueci minha senha', a: 'Na tela de login clique em "Esqueci minha senha" e informe o e-mail: chega um link para criar uma senha nova. Se o e-mail não chegar, peça ao administrador para gerar uma senha temporária em Administração > usuário > "Senha e Acesso".' },
      { q: 'Por que não vejo uma tela no menu?', a: 'A tela não está liberada para o seu perfil. Peça ao administrador: ele pode liberar como "extra" só para você, sem mudar o perfil.' },
      { q: 'Como instalo no celular?', a: 'Abra o Globinho no navegador do celular, toque no seu avatar e em "Instalar no celular". Ele vira um ícone na tela inicial, como um aplicativo.' },
      { q: 'O sistema está lento ou travou no carregamento', a: 'Aguarde alguns segundos: depois de 12 s a tela de carregamento mostra o botão "Recarregar". Se continuar, saia e entre de novo.' },
    ],
    keywords: ['login', 'senha', 'acesso', 'menu', 'instalar', 'celular', 'app', 'primeiro acesso', 'atualização', 'planilha', 'erp'],
  },
  {
    slug: 'perfis-acesso',
    title: 'Perfis de acesso e telas liberadas',
    module: 'Começando',
    intro: 'Cada usuário tem um perfil que define as telas que aparecem no menu e se pode só ver ou também editar.',
    access: 'Todos (configuração só pelo Admin).',
    steps: [
      { title: 'Admin', description: 'Vê e edita tudo, inclusive Administração e Configuração de Relatórios.' },
      { title: 'Comercial', description: 'Dashboard, CRM, Clientes, Fábrica (produção e estoque, só leitura), Fretes, Política Comercial (leitura), Corte Perfil, Corte Blank, Treinamentos e Chamados.' },
      { title: 'Operacional', description: 'Dashboard, Clientes, Fábrica, Corte Perfil, Corte Blank e Chamados.' },
      { title: 'SDR (pré-vendas)', description: 'Dashboard, CRM, Clientes, Política Comercial (leitura), Corte Perfil, Corte Blank, Treinamentos e Chamados.' },
      { title: 'Financeiro', description: 'Chamados (para responder as solicitações).' },
      { title: 'Visitante', description: 'Consulta Dashboard, Clientes, Fábrica, Cortes e Treinamentos, sem editar; pode abrir chamados.' },
    ],
    rules: [
      'O administrador pode liberar telas extras para uma pessoa específica sem mudar o perfil dela (Administração > usuário > "Telas Liberadas").',
      'A lista acima é o padrão de cada perfil; o administrador pode alterá-la em Administração > "Telas por Perfil".',
      'O Zé segue as mesmas liberações: só consulta dados das telas que a pessoa pode ver.',
    ],
    faq: [
      { q: 'Quais telas eu tenho?', a: 'As que aparecem no seu menu lateral. O Zé também sabe dizer quais áreas estão liberadas para você.' },
      { q: 'Consigo ver mas não consigo editar', a: 'Seu perfil tem acesso de leitura nessa tela. Para editar, o administrador precisa liberar a edição.' },
    ],
    keywords: ['perfil', 'permissão', 'acesso negado', 'liberar', 'tela', 'role', 'sdr', 'operacional', 'visitante', 'financeiro'],
  },
  {
    slug: 'dashboard',
    title: 'Dashboard Comercial',
    module: 'Comercial',
    route: '/dashboard-comercial',
    pages: ['dashboard'],
    screenshot: '/help/screens/dashboard.png',
    intro: 'Visão das vendas: faturamento, orçamentos, meta do mês, ranking de vendedores e clientes, classes de produto, perdidos e orçamentos em aberto.',
    access: 'Perfis com a tela Dashboard (Admin, Comercial, Operacional, SDR, Visitante).',
    steps: [
      { title: 'Filtros', description: 'No topo: Ano, Mês, UF, Classe e Vendedor. "Limpar" volta ao padrão (mês atual). Os filtros valem para todos os cards e gráficos.' },
      { title: 'Card Faturamento', description: 'Faturado (com % da meta), Peso, Nº de clientes, Ticket Médio e R$/kg. Clique no card para ver a lista de pedidos faturados e "Exportar Excel".' },
      { title: 'Card Orçamento', description: 'Valor, peso e clientes dos orçamentos do período, com ticket médio e R$/kg.' },
      { title: 'Orçamentos em Aberto', description: 'Total de orçamentos em aberto por vendedor (valor e participação).' },
      { title: 'Fat. Diário', description: 'Gráfico de faturado x pedido. Na visão por mês, clique numa barra para abrir os dias daquele mês; "← Voltar" retorna. Passe o mouse (ou toque) na barra para ver os valores.' },
      { title: 'Rankings', description: 'Top 5 Vendedores e Top Clientes do período, e Top Classes (participação de cada classe de produto).' },
      { title: 'Indicadores laterais', description: 'Meta do Mês (barra de progresso e dias restantes), Ticket Médio, R$/kg e Clientes Novos.' },
      { title: 'Aba Perdidos', description: 'Valor perdido, pedidos, clientes e peso; motivos de perda, perdidos por vendedor, por classe, evolução no tempo, insights e a tabela detalhada.' },
      { title: 'Aba Orçamentos', description: 'Orçamentos em aberto com temperatura (⭐ a ⭐⭐⭐⭐⭐), busca e comentários por orçamento.' },
      { title: 'Modo TV e tela cheia', description: 'O botão de monitor abre o carrossel de painéis (CRM e Dashboard) para TV; o de tela cheia esconde o menu.' },
    ],
    rules: [
      'Faturado = notas emitidas + pedidos com faturamento, pela data de emissão (emitidas) ou data de início (pedidos).',
      'Ticket Médio do Dashboard = valor ÷ número de clientes (não por pedido).',
      'Perdidos usam a data em que o orçamento foi perdido.',
      'Pedidos "excluídos dos indicadores" não entram em nenhum número. O ícone no card Faturamento mostra a lista; só o Admin inclui ou remove pedidos dela (com motivo).',
      'A meta mensal é cadastrada pelo Admin (Administração > Metas). Se o mês não tiver meta cadastrada, o sistema usa R$ 2.000.000.',
    ],
    faq: [
      { q: 'O número do Dashboard está diferente do ERP', a: 'Veja o horário de "Atualizado" (os dados chegam do ERP algumas vezes ao dia), os filtros aplicados e se o pedido está na lista de excluídos dos indicadores.' },
      { q: 'Como exporto os pedidos faturados?', a: 'Clique no card Faturamento e use "Exportar Excel" na janela que abre.' },
      { q: 'O que é a temperatura do orçamento?', a: '⭐⭐⭐⭐⭐ Muito Forte (cliente decidido), ⭐⭐⭐⭐ Forte (negociação ativa), ⭐⭐⭐ Mediana (houve proposta), ⭐⭐ Fraca (pouca clareza), ⭐ Muito Fraca (contato inicial ou desinteressado).' },
      { q: 'Como mudo a meta?', a: 'Somente o Admin: Administração > aba Metas, ou a engrenagem no gráfico de faturamento.' },
    ],
    keywords: ['faturamento', 'faturado', 'meta', 'ranking', 'vendedor', 'ticket', 'r$/kg', 'perdidos', 'orçamentos', 'modo tv', 'exportar', 'excel'],
  },
  {
    slug: 'crm-kanban',
    title: 'CRM: funil de leads (Kanban)',
    module: 'CRM',
    route: '/crm',
    pages: ['crm'],
    screenshot: '/help/screens/crm-kanban.png',
    intro: 'O funil comercial. Cada coluna é uma etapa: Lead → Contato → Bastão → Oportunidade → Proposta → Pedido. Arraste o card para mudar de etapa; clique nele para abrir os detalhes.',
    access: 'Admin, Comercial e SDR.',
    steps: [
      { title: 'Novo lead', description: 'Botão "Novo Lead" no topo (no celular, o botão "+" redondo). Busque antes por nome, CNPJ ou telefone para não duplicar. Empresa e telefone são obrigatórios.' },
      { title: 'Mover de etapa', description: 'Arraste o card para a coluna seguinte. Algumas etapas pedem informações antes (veja as regras).' },
      { title: 'Abrir o card', description: 'Mostra dados do lead, histórico, notas, anexos e as ações: Registrar Contato, tentativa sem sucesso, Agendar follow-up, Agendar visita/reunião, Abrir chamado para o Financeiro, Análise de crédito, vincular pedido, editar e marcar como perdido.' },
      { title: 'Registrar contato', description: 'Descreva o que foi conversado. Cada contato conta para as metas diárias. "Tentativa sem sucesso" registra quando não conseguiu falar.' },
      { title: 'Filtros', description: 'Busca (empresa, contato, CNPJ, telefone, cidade, produto, nº do orçamento), vendedor, origem e data.' },
      { title: 'Leads parados', description: 'Um alerta lista leads sem contato há 2 dias ou mais. Dá para mover vários de uma vez para a Carteira.' },
    ],
    rules: [
      'Lead → Contato: o sistema pede a descrição do primeiro contato.',
      'Para ir para Bastão é obrigatório ter: Empresa, CNPJ, Nome do Contato, Telefone, Origem, Ramo de Atuação, UF, Cidade e Produto de Interesse. Faltando algo, o card abre para você completar.',
      'Bastão não tem volta: o lead fica travado até um gestor (Admin ou Comercial) atribuir o vendedor, o que leva o lead para Oportunidade.',
      'Depois de Oportunidade, só Admin/Comercial podem voltar o lead para etapas anteriores.',
      'Proposta e Pedido exigem vincular o número do orçamento/pedido do ERP (se ainda não estiver vinculado).',
      'Análise de crédito (etapa Crédito): exige descrição e anexo, e CNPJ válido. O pedido vai por e-mail ao Financeiro, que responde com parecer: Aprovado, Precisa de mais informações ou Pagamento antecipado.',
      'Marcar como perdido exige um motivo. Motivos não definitivos (ex.: "Sem resposta", "Projeto/Obra adiado") obrigam a agendar um follow-up; motivos definitivos (ex.: "Empresa Fechada/Inativa", "Lead já é cliente") encerram o lead.',
      'Leads com follow-up agendado para o futuro somem do Kanban e voltam sozinhos na data marcada.',
      'Cards em Pedido saem do Kanban no mês seguinte ao fechamento.',
      'Vendedores veem por padrão os próprios leads; o Admin vê todos.',
    ],
    faq: [
      { q: 'Não consigo passar o bastão', a: 'Falta algum campo obrigatório (Empresa, CNPJ, Contato, Telefone, Origem, Ramo, UF, Cidade, Produto de Interesse). O aviso vermelho diz quais; o card abre para completar.' },
      { q: 'Não consigo mover o lead de Bastão', a: 'Só Admin ou Comercial atribuem o vendedor e tiram o lead do Bastão.' },
      { q: 'O lead sumiu do Kanban', a: 'Ou ele tem follow-up agendado para frente (volta na data), ou foi marcado como perdido (veja em Leads Perdidos), ou é um Pedido de mês anterior, ou o filtro de vendedor/origem/data está escondendo.' },
      { q: 'Como recupero um lead perdido?', a: 'Abra Leads Perdidos e use "Reativar", ou em Minha Carteira use "Iniciar Novo Atendimento".' },
      { q: 'O lead é de outro vendedor', a: 'Ao tentar mexer, o sistema oferece "Solicitar transferência". Admin/Comercial podem transferir direto.' },
    ],
    troubleshooting: [
      { problem: 'CNPJ inválido', solution: 'Digite os 14 números do CNPJ (com ou sem pontuação). O sistema confere os dígitos verificadores.' },
      { problem: 'Anexo obrigatório na análise de crédito', solution: 'Anexe ao menos um documento (contrato social, cartão CNPJ, etc.) antes de enviar.' },
    ],
    keywords: ['lead', 'kanban', 'funil', 'bastão', 'passagem de bastão', 'oportunidade', 'proposta', 'pedido', 'perdido', 'follow-up', 'contato', 'crédito', 'análise financeira', 'transferir'],
  },
  {
    slug: 'crm-abas',
    title: 'CRM: outras abas',
    module: 'CRM',
    route: '/crm',
    pages: ['crm'],
    intro: 'Além do Kanban, o CRM tem Lista, Agenda, Dashboard, Prospecção, Minha Carteira, Bastão, Concorrência e Relatório.',
    access: 'Admin, Comercial e SDR.',
    steps: [
      { title: 'Lista', description: 'Todos os leads em tabela, com busca, filtro de status e período e ordenação por coluna.' },
      { title: 'Agenda', description: 'Calendário de visitas e reuniões (mês ou semana). Clique para editar; botão "Hoje" volta ao dia atual.' },
      { title: 'Dashboard', description: 'Contatos e visitas por dia, funil, contatos por vendedor, origens, ramos, cidades, produtos de interesse, motivos de perda e análises financeiras pendentes.' },
      { title: 'Prospecção', description: 'Defina critérios (ramos, regiões, produtos) para a IA buscar empresas compradoras de aço; revise os resultados e use "Atender" para puxar para a sua lista. Também importa leads de planilha Excel (mapeando as colunas).' },
      { title: 'Minha Carteira', description: 'Seus leads com totais (abertos, fechados, perdidos), transferência para outro vendedor, "Iniciar Novo Atendimento" para leads antigos e exportação em Excel.' },
      { title: 'Bastão', description: 'Histórico das passagens de bastão (SDR → vendedor).' },
      { title: 'Concorrência', description: 'Propostas de concorrentes anexadas aos leads, com busca por concorrente, cliente ou material.' },
      { title: 'Relatório', description: 'Funil atual, desempenho por vendedor, leads sem atendimento há mais de 24 h e propostas em aberto.' },
    ],
    faq: [
      { q: 'Como importo uma lista de leads?', a: 'CRM > Prospecção > importação de Excel: escolha o arquivo, dê um nome à lista e ligue as colunas (no mínimo Empresa ou Telefone).' },
      { q: 'Como agendo uma visita?', a: 'Abra o card do lead e use agendar visita/reunião (data e local obrigatórios). Ela aparece na Agenda.' },
      { q: 'Como anexo a proposta do concorrente?', a: 'No card do lead, em Anexos, escolha o tipo "Proposta Concorrência" e informe o concorrente. Arquivos de até 10 MB.' },
    ],
    keywords: ['agenda', 'visita', 'reunião', 'prospecção', 'importar', 'excel', 'carteira', 'concorrência', 'relatório crm', 'lista de leads'],
  },
  {
    slug: 'clientes',
    title: 'Central de Clientes',
    module: 'Comercial',
    route: '/clientes',
    pages: ['clientes'],
    screenshot: '/help/screens/clientes.png',
    intro: 'Base de clientes com indicadores, histórico de pedidos, curva ABC e relatório por vendedor.',
    access: 'Admin, Comercial, Operacional, SDR e Visitante (edição conforme perfil).',
    steps: [
      { title: 'Aba Clientes', description: 'Totais (clientes, ativos, inativos, faturamento, ticket médio) e a lista. Busque por cliente ou produto (ex.: "1,95") e filtre por vendedor. Abra um cliente para ver o histórico de pedidos e registrar follow-ups.' },
      { title: 'Aba Análise', description: 'Curva ABC e perfil dos clientes por faturamento e quantidade.' },
      { title: 'Aba Relatório', description: 'Relatório por vendedor com orçado x realizado, vínculo de vendedor ao cliente e "Exportar Excel".' },
    ],
    rules: [
      'Cliente ativo = comprou nos últimos 3 meses; os demais aparecem como inativos.',
      'Curva ABC: A = clientes que somam até 80% do faturamento, B = de 80% a 95%, C = o restante.',
    ],
    faq: [
      { q: 'Como vejo tudo que um cliente comprou?', a: 'Na aba Clientes, abra o cliente para ver o histórico de pedidos. Ou pergunte ao Zé: "histórico do cliente X".' },
      { q: 'A exportação diz para aguardar', a: 'Espere terminar de carregar os dados reais antes de exportar.' },
    ],
    keywords: ['cliente', 'histórico', 'abc', 'curva abc', 'ativo', 'inativo', 'follow-up cliente', 'relatório de clientes'],
  },
  {
    slug: 'producao',
    title: 'Fábrica: produção, materiais e compras',
    module: 'Operações',
    route: '/producao',
    pages: ['producao'],
    intro: 'Acompanhamento dos pedidos em produção (vindos do ERP), resumo de materiais, materiais pendentes e necessidade de compras.',
    access: 'Admin, Comercial, Operacional e Visitante.',
    steps: [
      { title: 'Aba Produção', description: 'Indicadores (total de pedidos, quantidade, No Prazo, Atrasados, A Programar, Finalizados) e a tabela de pedidos com busca, filtros e ordenação por pedido, cliente, % concluído, prazo, status e dias de atraso.' },
      { title: 'Exportar e enviar', description: '"Exportar PDF" gera o relatório da tela; o botão de relatório envia o relatório de produção por e-mail.' },
      { title: 'Ocultar pedidos', description: 'Pedidos podem ser ocultados da lista (com motivo) e consultados/reexibidos no botão de pedidos ocultos.' },
      { title: 'Aba Resumo', description: 'Materiais por espessura e outros materiais, somando o que está nas ordens.' },
      { title: 'Aba Materiais', description: 'Resumo dos materiais pendentes, com filtro "só atrasados" e detalhe por material.' },
      { title: 'Aba Compras', description: 'Necessidade de compras: quanto cada material precisa, quanto há em estoque, quanto falta comprar e a urgência (atraso, prazo, a programar).' },
      { title: 'Aba Estoque', description: 'Veja o artigo Estoque.' },
    ],
    rules: [
      'Os dados da produção vêm da planilha do ERP, atualizada várias vezes ao dia ("Última atualização" no topo, com botão para recarregar).',
      'Quando um pedido passa para FINALIZADO, o sistema envia e-mail de aviso automaticamente.',
    ],
    faq: [
      { q: 'Como sei se um pedido está atrasado?', a: 'Na aba Produção, veja o status e a coluna de dias de atraso, ou o indicador Atrasados. O Zé também responde "o pedido 1234 está atrasado?".' },
      { q: 'O que preciso comprar?', a: 'Aba Compras: mostra o que falta por material, já descontando o estoque.' },
    ],
    keywords: ['fábrica', 'produção', 'op', 'ordem de produção', 'atrasado', 'prazo', 'pcp', 'finalizado', 'compras', 'materiais', 'pendências'],
  },
  {
    slug: 'estoque',
    title: 'Estoque',
    module: 'Operações',
    route: '/producao',
    pages: ['estoque', 'producao'],
    intro: 'Controle de itens em estoque por categoria, com entradas, saídas, fotos, histórico e relatório por e-mail. Fica na aba Estoque da tela Fábrica.',
    access: 'Quem tem a tela Fábrica vê; editar depende da liberação de Estoque.',
    steps: [
      { title: 'Categoria', description: 'Escolha a categoria (abas no computador, lista no celular) e busque por descrição ou localização.' },
      { title: 'Entrada', description: 'Botão verde "Entrada": cadastra ou soma um item (descrição, quantidade, unidade, localização, observações e foto).' },
      { title: 'Saída', description: 'Botão vermelho "Saída": escolha o item, a quantidade e o motivo (obrigatório).' },
      { title: 'Histórico', description: 'Mostra todas as movimentações, com quem fez e quando.' },
      { title: 'Relatório', description: 'Envia o relatório de estoque por e-mail.' },
    ],
    rules: [
      'Não é possível dar saída maior que a quantidade disponível; o sistema avisa quanto há.',
      'Fotos de até 5 MB (dá para tirar pela câmera do celular).',
      'Nas telas de Corte, os indicadores 🟢🟡🔴 mostram se o material/perfil está disponível no estoque.',
    ],
    faq: [
      { q: 'Errei uma saída', a: 'Faça uma entrada com a quantidade para corrigir. O histórico mantém as duas movimentações.' },
    ],
    keywords: ['estoque', 'entrada', 'saída', 'bobina', 'item', 'quantidade', 'histórico de estoque', 'inventário'],
  },
  {
    slug: 'fretes',
    title: 'Controle de Fretes',
    module: 'Operações',
    route: '/fretes',
    pages: ['fretes', 'producao'],
    screenshot: '/help/screens/fretes.png',
    intro: 'Registro dos fretes por pedido/NF com aprovação e cálculo de R$/ton.',
    access: 'A tela aparece para quem tem a Fábrica; criar e editar fretes exige a liberação de Fretes (Comercial e Admin).',
    steps: [
      { title: 'Novo Frete', description: 'Informe cliente, pedido(s) e NFs, transportadora, valor, peso, cidade de entrega e datas de embarque e entrega.' },
      { title: 'Enviar para aprovação', description: 'O frete nasce como Rascunho. Use "Enviar para Aprovação" e ele fica "Aguardando Aprovação".' },
      { title: 'Aprovar ou rejeitar', description: 'Admin ou Comercial aprovam/rejeitam os pendentes.' },
      { title: 'Transportadoras', description: 'Botão para cadastrar, editar e desativar transportadoras.' },
      { title: 'Histórico', description: 'Lista completa dos fretes registrados.' },
    ],
    rules: [
      'Status: Rascunho → Aguardando Aprovação → Aprovado ou Rejeitado.',
      'R$/ton = valor do frete ÷ peso em toneladas.',
      'Só o Admin exclui fretes.',
    ],
    faq: [
      { q: 'Quem aprova o frete?', a: 'Usuários Admin ou Comercial, nos fretes com status Aguardando Aprovação.' },
    ],
    keywords: ['frete', 'transportadora', 'nf', 'aprovação', 'r$/ton', 'entrega', 'embarque'],
  },
  {
    slug: 'politica-comercial',
    title: 'Política Comercial',
    module: 'Comercial',
    route: '/politica-comercial',
    pages: ['politica'],
    screenshot: '/help/screens/politica-comercial.png',
    intro: 'Tabelas de preço, alçada de descontos por volume e simulador de preço final.',
    access: 'Admin, Comercial e SDR (alterar preços: Admin).',
    steps: [
      { title: 'Descontos por volume', description: 'Mostra as faixas de peso e o desconto máximo de cada uma. Acima disso precisa aprovação da gestão. O Admin edita as faixas.' },
      { title: 'Tabelas de preço', description: 'Preços por categoria. Em Perfis há tabela Padrão e Especial por espessura (R$/kg); nas demais, preço por material. Busque pela descrição.' },
      { title: 'Simulador de Preço', description: 'Informe preço de tabela (por kg ou m²), ICMS, peso, condição de pagamento, % desconto, % financeiro e frete: mostra o preço final e o R$/kg. Tem a tabela de ICMS interestadual.' },
      { title: 'Outros', description: 'Exportar a tabela em Excel, Histórico de Ajustes de preço, Ajuste de Preço em massa (Admin) e Transportadoras e Regiões de Atendimento.' },
    ],
    faq: [
      { q: 'Qual o desconto máximo que posso dar?', a: 'Depende da faixa de peso do pedido na Política de Descontos por Volume. Acima do máximo da faixa, precisa aprovação da gestão. O Zé consulta as faixas atuais.' },
      { q: 'Como calculo o preço final com ICMS e frete?', a: 'Use o Simulador de Preço na própria tela, ou peça ao Zé com os valores.' },
    ],
    keywords: ['preço', 'tabela', 'desconto', 'alçada', 'simulador', 'icms', 'perfil', 'r$/kg', 'ajuste de preço'],
  },
  {
    slug: 'corte-perfil',
    title: 'Corte Perfil',
    module: 'Cálculo',
    route: '/corte-perfil',
    pages: ['corteperfil'],
    screenshot: '/help/screens/corte-perfil.png',
    intro: 'Calcula desenvolvimento, peso e aproveitamento de perfis (U/Z, L, Cartola e versões enrijecidas e semi-enrijecidas) e otimiza o corte das tiras na bobina.',
    access: 'Admin, Comercial, Operacional, SDR e Visitante.',
    steps: [
      { title: 'Escolha o perfil', description: 'Abas: U/Z, L, U/Z Enrij., U/Z Semi-Enrij., Cartola, Cart. Enrij. e Cart. Semi-Enrij.' },
      { title: 'Preencha as linhas', description: 'Espessura, abas/base, comprimento, largura da bobina, quantidade e %P (perda). "Adicionar Linha" para mais peças.' },
      { title: 'Resumo', description: 'Peso total, peso de perda e consolidado de todas as abas.' },
      { title: 'Otimizado', description: 'Combina as tiras na largura da bobina para reduzir a sobra e mostra a visualização do corte.' },
      { title: 'Salvar e exportar', description: '"Salvar resumo" guarda o cálculo com nome (ex.: obra do cliente); "Resumos salvos" reabre ou exclui. Exporta em PDF e Excel.' },
      { title: 'Catálogos', description: '"Perfis Padrão" (U e UE com medidas prontas, com PDF) e "Perfiladeira" (perfis que a perfiladeira produz).' },
    ],
    rules: [
      'O cálculo de peso usa densidade de 0,000008 kg/mm³ e desconta as dobras automaticamente.',
      'A perda padrão (%P) é 103%.',
      'Os indicadores 🟢🟡🔴 mostram se há o material ou alternativa no estoque.',
    ],
    keywords: ['corte', 'perfil', 'u', 'z', 'cartola', 'enrijecido', 'desenvolvimento', 'bobina', 'tiras', 'aproveitamento', 'peso do perfil', 'perfiladeira'],
  },
  {
    slug: 'corte-blank',
    title: 'Corte Blank',
    module: 'Cálculo',
    route: '/corte-blank',
    pages: ['corteblank'],
    intro: 'Simula o corte de peças retangulares em uma chapa e mostra o aproveitamento.',
    access: 'Admin, Comercial, Operacional, SDR e Visitante.',
    steps: [
      { title: 'Configuração', description: 'Medidas e espessura da chapa.' },
      { title: 'Peças', description: 'Cadastre cada peça (nome, medidas e quantidade) e clique em "Gerar Simulação".' },
      { title: 'Visualização', description: 'Mapa de como as peças ficam na chapa, com "Baixar PDF".' },
      { title: 'Relatório', description: 'Aproveitamento (%), áreas, pesos e detalhamento por peça, com PDF.' },
    ],
    keywords: ['blank', 'chapa', 'corte de chapa', 'aproveitamento', 'peças', 'plano de corte'],
  },
  {
    slug: 'chamados',
    title: 'Chamados para o Financeiro',
    module: 'Comercial',
    route: '/chamados',
    pages: ['chamados'],
    screenshot: '/help/screens/chamados.png',
    intro: 'Solicitações ao Financeiro com prazo de atendimento (SLA): análise de crédito, parametrização fiscal, devolução de NF, validação de cadastro e pré-análise.',
    access: 'Todos os perfis com a tela Chamados; o Financeiro responde.',
    steps: [
      { title: 'Novo Chamado', description: 'Título, categoria, descrição e os dados do cliente (nome, CNPJ, valor quando for crédito). Também dá para abrir pelo card do lead no CRM.' },
      { title: 'Acompanhar', description: 'Cada chamado tem número (TKT-…), prioridade, categoria, status e o tempo de SLA restante. Busque pelo campo "Buscar chamado".' },
      { title: 'Resposta', description: 'O Financeiro muda para Em Andamento e conclui com o parecer. Na Pré-Análise informa o score e as considerações.' },
      { title: 'Cancelar ou reabrir', description: 'Chamados podem ser cancelados, e concluídos/cancelados podem ser reabertos.' },
    ],
    rules: [
      'SLA por categoria: Parametrização fiscal 1 h; Validação de cadastro novo 2 h; Pré-Análise 2 h; Análise de crédito até R$ 20 mil 4 h; Análise de crédito acima de R$ 20 mil 8 h; Devolução de NF 8 h.',
      'O SLA conta só em horário comercial: segunda a sexta, das 8h às 17h45.',
      'Status: Aberto, Em Andamento, Concluído, Cancelado; passa do prazo = Em Atraso.',
      'Pareceres de crédito: Aprovado, Precisa de mais informações ou Pagamento antecipado (só à vista ou cartão).',
      'Todo chamado aberto gera e-mail com o número [TKT-…] no assunto.',
    ],
    faq: [
      { q: 'Não consigo abrir o chamado pelo CRM', a: 'O lead precisa ter os dados exigidos (como CNPJ válido). A mensagem diz o que falta cadastrar no lead.' },
      { q: 'Quanto tempo o financeiro tem para responder?', a: 'Depende da categoria (de 1 h a 8 h úteis), contando só seg–sex das 8h às 17h45.' },
    ],
    keywords: ['chamado', 'ticket', 'financeiro', 'crédito', 'sla', 'serasa', 'pré-análise', 'parecer', 'devolução', 'fiscal', 'cadastro'],
  },
  {
    slug: 'treinamentos',
    title: 'Treinamentos',
    module: 'Conhecimento',
    route: '/treinamentos',
    pages: ['treinamentos'],
    screenshot: '/help/screens/treinamentos.png',
    intro: 'Biblioteca de materiais de capacitação em PDF (integração, ecossistema, playbook de pré-venda, fluxo comercial).',
    access: 'Perfis com a tela Treinamentos.',
    steps: [
      { title: 'Filtrar', description: 'Escolha a categoria no topo (Geral, Comercial…).' },
      { title: 'Abrir', description: 'Clique no card: o PDF abre em modo apresentação em tela cheia.' },
      { title: 'Novo Treinamento', description: 'O Admin adiciona, edita ou remove materiais (título, descrição, categoria e arquivo).' },
    ],
    keywords: ['treinamento', 'capacitação', 'pdf', 'playbook', 'integração', 'onboarding'],
  },
  {
    slug: 'assistente',
    title: 'Zé, o assistente',
    module: 'Conhecimento',
    route: '/assistente-global',
    screenshot: '/help/screens/assistente.png',
    intro: 'O Zé responde dúvidas sobre como usar o Globinho e consulta os dados da empresa (vendas, clientes, pedidos, orçamentos, CRM, produção, estoque, preços, fretes e chamados), sempre dentro do que você pode ver.',
    access: 'Todos os usuários.',
    steps: [
      { title: 'Abrir', description: 'Botão "Pergunte ao Zé" no canto inferior direito de qualquer tela, ou Ctrl+J. O ícone de expandir abre em tela cheia.' },
      { title: 'Perguntar', description: 'Escreva do seu jeito: "quanto faturamos este mês?", "como passo o bastão?", "o pedido 12838 já foi produzido?".' },
      { title: 'Tutorial na tela', description: 'Peça "me mostra como funciona esta tela" e o Zé abre o tutorial guiado da tela atual (quando existe).' },
      { title: 'Nova conversa', description: '"Nova conversa" limpa o histórico. A conversa continua ao trocar de tela.' },
      { title: 'Por voz', description: 'Na tela cheia do Zé, a aba "Por voz" permite conversar falando.' },
    ],
    rules: [
      'O Zé só consulta: não cria, altera nem apaga nada. Ele explica onde fazer.',
      'Ele só vê os dados das telas liberadas para o seu perfil.',
    ],
    keywords: ['zé', 'assistente', 'ia', 'chat', 'pergunta', 'tutorial', 'tour', 'ajuda'],
  },
  {
    slug: 'central-precos',
    title: 'Central de Preços',
    module: 'Conhecimento',
    pages: ['centralprecos'],
    intro: 'Atalho no menu que abre a Central de Preços (sistema externo) em outra aba do navegador.',
    access: 'Conforme liberação.',
    steps: [
      { title: 'Abrir', description: 'Clique em "Central de Preços" no menu lateral; abre em nova aba.' },
    ],
    keywords: ['central de preços', 'preços externos'],
  },
  {
    slug: 'admin-usuarios',
    title: 'Administração: usuários e acessos',
    module: 'Administração',
    route: '/admin/usuarios',
    pages: ['usuarios'],
    intro: 'Criação de usuários, perfis, telas liberadas, carteiras, metas e configurações do CRM.',
    access: 'Somente Admin.',
    steps: [
      { title: 'Novo usuário', description: 'Botão "Novo Usuário": nome, e-mail e perfil. O sistema cria o acesso com senha temporária e mostra uma mensagem pronta para copiar e enviar à pessoa. No primeiro login ela cria a própria senha.' },
      { title: 'Editar usuário', description: 'Abra o usuário: aba "Dados do Perfil" (nome, departamento, foto, perfil de acesso), "Telas Liberadas" e "Senha e Acesso".' },
      { title: 'Telas Liberadas', description: 'As telas do perfil aparecem travadas; ligue "Extra" para liberar outras só para essa pessoa. "Seguir só o perfil" remove os extras.' },
      { title: 'Senha e Acesso', description: 'Gera nova senha temporária ou repassa o e-mail genérico (ex.: comercial3) para outra pessoa, trocando o nome.' },
      { title: 'Abas', description: 'Usuários, Metas (meta mensal de faturamento e metas diárias por vendedor), Carteiras (atribuir leads e clientes a responsáveis), Telas por Perfil e Config. de Leads (origens, ramos, motivos de perda, qualificação e alerta de leads parados).' },
      { title: 'Atualizar Acessos', description: 'Força todos a recarregarem as permissões.' },
    ],
    rules: [
      'Status do usuário: Ativo = entrou nos últimos 7 dias; Inativo = não entra há mais tempo; Nunca acessou.',
      'Excluir usuário pede confirmação e não tem volta.',
    ],
    keywords: ['usuário', 'criar usuário', 'senha temporária', 'perfil', 'permissão', 'telas', 'extra', 'carteira', 'metas', 'origem', 'motivo de perda', 'admin'],
  },
  {
    slug: 'admin-relatorios',
    title: 'Configuração de Relatórios',
    module: 'Administração',
    route: '/admin/relatorios',
    pages: ['relatorios'],
    intro: 'Relatórios automáticos por e-mail (diário, mensal, produção, estoque e compras) e histórico de envios.',
    access: 'Somente Admin.',
    steps: [
      { title: 'Configurações', description: 'Para cada relatório: destinatários, dias e horários de envio. Dá para enviar na hora ou pré-visualizar.' },
      { title: 'Fechamento mensal', description: 'Gera e envia o relatório de fechamento do mês (com prévia).' },
      { title: 'Histórico de Envios', description: 'Lista dos relatórios enviados e se deram certo.' },
    ],
    keywords: ['relatório', 'relatórios', 'e-mail', 'email', 'envio automático', 'agendamento', 'destinatário', 'fechamento mensal'],
  },
];

export const helpModules = Array.from(new Set(helpArticles.map((a) => a.module)));

/** Artigos que a pessoa pode ver, conforme as telas liberadas */
export function helpArticlesFor(canView: (page: string) => boolean, isAdmin: boolean): HelpArticle[] {
  if (isAdmin) return helpArticles;
  return helpArticles.filter((a) => !a.pages?.length || a.pages.some((p) => canView(p)));
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Busca simples por palavras, com peso maior para título e palavras-chave */
export function searchHelp(articles: HelpArticle[], query: string, limit = 3): HelpArticle[] {
  const STOP = new Set(['como', 'que', 'por', 'para', 'com', 'uma', 'umas', 'uns', 'dos', 'das', 'nos', 'nas', 'meu', 'minha', 'meus', 'minhas', 'esta', 'essa', 'isso', 'onde', 'qual', 'quais', 'quem', 'nao', 'sim', 'faco', 'fazer', 'consigo', 'posso', 'tem', 'ter', 'sao', 'ser', 'esta', 'tela', 'sistema', 'globinho']);
  const words = norm(query).split(/[^a-z0-9$/]+/).filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return [];
  const scored = articles.map((a) => {
    const title = norm(`${a.title} ${a.module} ${(a.keywords || []).join(' ')}`);
    const body = norm(
      [a.intro, ...a.steps.map((s) => `${s.title} ${s.description}`), ...(a.rules || []), ...(a.faq || []).map((f) => `${f.q} ${f.a}`), ...(a.tips || []), ...(a.troubleshooting || []).map((t) => `${t.problem} ${t.solution}`)].join(' '),
    );
    let score = 0;
    for (const w of words) {
      if (title.includes(w)) score += 5;
      if (body.includes(w)) score += 1;
    }
    return { a, score };
  });
  return scored.filter((s) => s.score > 0).sort((x, y) => y.score - x.score).slice(0, limit).map((s) => s.a);
}
