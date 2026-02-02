

# Sistema de Tutorial Interativo - Guia na Tela

## Visao Geral

Implementar um sistema de tutorial guiado passo-a-passo que aponta diretamente para os elementos na tela, explicando cada funcionalidade. O tutorial sera ativado por um botao de ajuda sempre visivel e podera ser acessado a qualquer momento.

## Tecnologia Escolhida

**Driver.js** - Biblioteca leve (~5kb) especializada em product tours interativos.

Vantagens:
- Destaca elementos com overlay escuro
- Setas apontando para cada elemento
- Navegacao proximo/anterior
- Suporte a progresso visual
- Nao depende de framework especifico
- Otimo suporte mobile

## Funcionamento do Usuario

1. Botao de ajuda (icone "?") fixo no canto inferior esquerdo em todas as telas
2. Ao clicar, inicia o tour da pagina atual
3. Cada passo destaca um elemento e mostra explicacao
4. Usuario pode navegar com "Proximo", "Anterior" ou "Pular"
5. Barra de progresso mostra quantos passos restam

## Arquitetura

### Estrutura de Arquivos

```text
src/
  components/
    tour/
      TourProvider.tsx       # Contexto global do tour
      TourButton.tsx         # Botao flutuante de ajuda
      tourSteps/
        index.ts             # Exporta todos os steps
        dashboardSteps.ts    # Steps do Dashboard Comercial
        preVendasSteps.ts    # Steps do Pre-Vendas
        pipelineSteps.ts     # Steps do Pipeline
        clientesSteps.ts     # Steps do Clientes
        producaoSteps.ts     # Steps do Producao
        politicaSteps.ts     # Steps da Politica Comercial
        cortePerfilSteps.ts  # Steps do Corte Perfil
        corteBlankSteps.ts   # Steps do Corte Blank
        assistenteSteps.ts   # Steps do Assistente Global
        sidebarSteps.ts      # Steps do menu lateral
  hooks/
    useTour.ts               # Hook para usar o tour
```

### Fluxo de Dados

```text
TourProvider (App.tsx)
       |
       v
   TourButton (visivel em todas paginas)
       |
       v
   useLocation() -> detecta pagina atual
       |
       v
   tourSteps[pagina] -> carrega passos da pagina
       |
       v
   driver.drive() -> inicia o tour
```

## Detalhamento dos Tours por Pagina

### 1. Menu Lateral (Sidebar)

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Logo Global Aco | Sua Central de Ferramentas | Aqui voce encontra todas as ferramentas da Global Aco. Clique no menu para expandir ou recolher. |
| 2 | Dashboard Comercial | Dashboard de Vendas | Acompanhe o desempenho de vendas, faturamento, metas e indicadores da equipe comercial. |
| 3 | Pre-Vendas | Gestao de Leads | Cadastre e gerencie leads, registre contatos e encaminhe para a equipe comercial. |
| 4 | Pipeline | Pipeline de Vendas | Acompanhe leads qualificados em negociacao, veja status e historico de cada oportunidade. |
| 5 | Clientes | Central de Clientes | Consulte a base de clientes, historico de compras e analise ABC. |
| 6 | Producao | Acompanhamento de Producao | Veja o status dos pedidos em producao, materiais pendentes e estoque. |
| 7 | Politica Comercial | Tabelas de Precos | Consulte precos por categoria, simule formacao de precos e descontos. |
| 8 | Corte Perfil | Calculadora de Perfis | Calcule cortes de perfis U, L, Cartola e otimize o aproveitamento das chapas. |
| 9 | Corte Blank | Calculadora de Blanks | Otimize o corte de pecas em chapas, minimizando perdas de material. |
| 10 | Assistente Global | Ze da Global | Converse com a IA para tirar duvidas sobre processos, produtos e politicas. |

### 2. Dashboard Comercial

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Abas Dashboard/Perdidos/Orcamentos | Navegacao por Abas | Alterne entre a visao geral de vendas, analise de orcamentos perdidos e gestao de orcamentos ativos. |
| 2 | Filtros de periodo | Filtros de Data | Selecione o periodo que deseja analisar. Voce pode escolher periodos pre-definidos ou datas personalizadas. |
| 3 | Cards de KPIs | Indicadores de Vendas | Acompanhe os principais numeros: faturamento, meta, ticket medio e quantidade de pedidos. |
| 4 | Grafico de faturamento | Faturamento Diario | Visualize a evolucao do faturamento dia a dia no periodo selecionado. |
| 5 | Card de temperatura | Temperatura dos Orcamentos | Veja a "saude" dos seus orcamentos: quentes (prontos para fechar), mornos (em negociacao) e frios (precisam de atencao). |
| 6 | Botao tela cheia | Modo Apresentacao | Clique para ver o dashboard em tela cheia, ideal para reunioes e acompanhamento em TV. |

### 3. Pre-Vendas

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Botao Novo Lead | Cadastrar Novo Lead | Clique aqui para registrar um novo lead. Preencha os dados do cliente e interesse. |
| 2 | Cards de status | Status dos Leads | Veja quantos leads estao em cada etapa: novos, em contato, qualificados, encaminhados. |
| 3 | Tabela de leads | Lista de Leads | Aqui aparecem todos os seus leads. Clique em um lead para ver detalhes ou registrar atividades. |
| 4 | Filtros | Filtros de Busca | Filtre leads por status, data, origem ou busque por nome do cliente. |
| 5 | Acoes do lead | Acoes Rapidas | Em cada lead voce pode: registrar contato, qualificar, encaminhar ao comercial ou ver historico. |

### 4. Pipeline de Vendas

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Cards de contagem | Visao Geral do Pipeline | Veja quantos leads estao em cada etapa: encaminhados, orcando, fechados e perdidos. |
| 2 | Indicador Lead Time | Tempo Medio de Conversao | Acompanhe quanto tempo em media um lead leva para ser convertido em pedido. |
| 3 | Abas de status | Etapas do Pipeline | Navegue entre as etapas: Leads (novos encaminhamentos), Orcando (em negociacao), Fechados e Perdidos. |
| 4 | Filtros | Filtros Avancados | Filtre por SDR responsavel, vendedor atribuido, periodo ou busque por cliente. |
| 5 | Tabela de leads | Lista de Oportunidades | Clique em um lead para ver qualificacao, historico de atividades e atualizar status. |
| 6 | Botao de qualificacao | Qualificar Lead | Visualize ou edite a qualificacao do lead com os criterios BANT e outras informacoes. |

### 5. Clientes

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Aba Clientes | Base de Clientes | Consulte todos os clientes com historico de compras, contatos e localizacao. |
| 2 | Aba Analise | Analise ABC | Veja a classificacao ABC dos clientes baseada em volume de compras. |
| 3 | Busca | Buscar Cliente | Digite o nome, codigo ou CNPJ para encontrar um cliente rapidamente. |
| 4 | Tabela | Lista de Clientes | Clique em um cliente para ver detalhes completos e historico de orcamentos. |

### 6. Producao

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | KPIs de producao | Indicadores de Producao | Acompanhe pedidos em producao, atrasados, peso total e status geral. |
| 2 | Aba Producao | Pedidos em Producao | Veja todos os pedidos em producao com status, prazos e responsaveis. |
| 3 | Aba Materiais | Materiais Pendentes | Consulte materiais aguardando recebimento ou em falta para producao. |
| 4 | Aba Estoque | Controle de Estoque | Gerencie o estoque, registre entradas e saidas de materiais. |
| 5 | Botao Exportar PDF | Exportar Relatorio | Gere um relatorio PDF com todos os pedidos em producao para impressao ou envio. |

### 7. Politica Comercial

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Abas de categorias | Categorias de Produtos | Navegue entre as categorias: Chapas, Perfis, Tubos, etc. Cada aba mostra os produtos daquela categoria. |
| 2 | Tabela de precos | Tabela de Precos | Consulte precos por produto. Os precos sao atualizados automaticamente via integracao. |
| 3 | Simulador | Simulador de Preco | Simule a formacao de preco considerando custo, margem, frete e descontos. |
| 4 | Politica de descontos | Politica de Descontos | Veja as regras de desconto por volume, tipo de cliente ou condicao de pagamento. |

### 8. Corte Perfil

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Abas de perfis | Tipos de Perfis | Escolha o tipo de perfil que deseja calcular: U/Z, L, U Enrijecido, Cartola, etc. |
| 2 | Campos de dimensoes | Dimensoes do Perfil | Preencha as medidas do perfil: base, abas, enrijecedores, espessura e comprimento. |
| 3 | Configuracao da chapa | Dimensoes da Chapa | Informe a largura da chapa que sera utilizada para calcular o aproveitamento. |
| 4 | Botao calcular | Calcular Corte | Clique para calcular quantas tiras cabem na chapa e qual o percentual de perda. |
| 5 | Visualizacao | Visualizacao do Corte | Veja graficamente como as tiras serao distribuidas na chapa. |
| 6 | Aba Resumo | Resumo Geral | Veja o resumo de todos os perfis calculados com peso total e perda. |
| 7 | Aba Otimizado | Aproveitamento Otimizado | Combine perfis de mesma espessura para maximizar o aproveitamento da chapa. |
| 8 | Botoes de exportacao | Exportar Dados | Exporte os calculos em PDF ou Excel para usar em orcamentos. |

### 9. Corte Blank

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Configuracao da chapa | Dimensoes da Chapa | Informe as dimensoes da chapa: largura, comprimento e espessura. |
| 2 | Lista de pecas | Adicionar Pecas | Cadastre as pecas que precisam ser cortadas com suas dimensoes e quantidades. |
| 3 | Botao otimizar | Otimizar Corte | O sistema calcula a melhor distribuicao das pecas para minimizar perdas. |
| 4 | Visualizacao | Mapa de Corte | Veja o layout otimizado mostrando como as pecas serao dispostas na chapa. |
| 5 | Relatorio | Relatorio de Aproveitamento | Confira o percentual de aproveitamento, peso utilizado e perda de material. |

### 10. Assistente Global

| Passo | Elemento | Titulo | Descricao |
|-------|----------|--------|-----------|
| 1 | Aba Chat de Texto | Chat com o Ze | Converse por texto com o Ze da Global. Faca perguntas sobre processos, produtos ou politicas. |
| 2 | Aba Conversa por Voz | Conversa por Voz | Use o microfone para conversar por voz com o assistente de IA. |
| 3 | Campo de mensagem | Digite sua Pergunta | Escreva sua duvida aqui. O Ze tem acesso a base de conhecimento da empresa. |
| 4 | Historico | Historico de Conversas | Suas conversas ficam salvas para consulta posterior. |

## Interface Visual do Tour

Quando um passo estiver ativo:

```text
+----------------------------------------------------------+
|                    (tela escurecida)                      |
|                                                           |
|     +-------------------------------------------+         |
|     |   [ELEMENTO DESTACADO COM BORDA CLARA]   |         |
|     +-------------------------------------------+         |
|                    |                                      |
|                    v                                      |
|     +-------------------------------------------+         |
|     |  Titulo do Passo                     [X]  |         |
|     +-------------------------------------------+         |
|     |                                           |         |
|     |  Descricao detalhada do que este          |         |
|     |  elemento faz e como utiliza-lo.          |         |
|     |                                           |         |
|     +-------------------------------------------+         |
|     |  [Anterior]   1/8   [Proximo]             |         |
|     +-------------------------------------------+         |
|                                                           |
+----------------------------------------------------------+
```

## Botao de Ajuda Flutuante

```text
      +-------------------------------------------+
      |              CONTEUDO DA PAGINA           |
      |                                           |
      |                                           |
      |                                           |
      |                                           |
      |                                           |
      +-------------------------------------------+
      
                                           +-----+
                                           |  ?  |  <- Botao fixo
                                           +-----+
```

Posicao: canto inferior esquerdo (para nao conflitar com outros elementos)
Estilo: circular, cor primaria, icone de interrogacao
Ao passar o mouse: tooltip "Iniciar tutorial desta pagina"

## Persistencia e Controle

- LocalStorage guarda se o usuario ja viu o tour de cada pagina
- Primeira visita: tour inicia automaticamente (opcional, pode ser desativado)
- Botao de ajuda sempre disponivel para reiniciar
- Opcao "Nao mostrar novamente" no primeiro passo

## Implementacao Tecnica

### 1. Instalacao

Adicionar dependencia `driver.js` via npm.

### 2. TourProvider

Componente que envolve o App e fornece o contexto do tour:

```text
TourProvider
  - currentPage: string (detectado via useLocation)
  - startTour(): funcao para iniciar o tour
  - hasSeenTour: boolean (verificado no localStorage)
  - setHasSeenTour: funcao para marcar como visto
```

### 3. TourButton

Botao flutuante que:
- Aparece em todas as paginas protegidas
- Ao clicar, chama startTour()
- Tooltip explicativo ao hover

### 4. Definicao de Steps

Cada arquivo de steps exporta um array no formato:

```text
{
  element: '.seletor-css-do-elemento',
  popover: {
    title: 'Titulo do Passo',
    description: 'Descricao detalhada...',
    side: 'bottom', // posicao do popover
    align: 'start'
  }
}
```

### 5. Adicionar data-tour Attributes

Para elementos que precisam ser selecionados pelo tour, adicionar atributos `data-tour`:

```text
<Button data-tour="novo-lead">Novo Lead</Button>
```

Isso permite selecionar elementos de forma confiavel mesmo se classes CSS mudarem.

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/tour/TourProvider.tsx` | Contexto e logica do tour |
| `src/components/tour/TourButton.tsx` | Botao flutuante de ajuda |
| `src/components/tour/tourSteps/index.ts` | Exporta todos os steps |
| `src/components/tour/tourSteps/dashboardSteps.ts` | Steps do Dashboard |
| `src/components/tour/tourSteps/preVendasSteps.ts` | Steps do Pre-Vendas |
| `src/components/tour/tourSteps/pipelineSteps.ts` | Steps do Pipeline |
| `src/components/tour/tourSteps/clientesSteps.ts` | Steps do Clientes |
| `src/components/tour/tourSteps/producaoSteps.ts` | Steps do Producao |
| `src/components/tour/tourSteps/politicaSteps.ts` | Steps da Politica |
| `src/components/tour/tourSteps/cortePerfilSteps.ts` | Steps do Corte Perfil |
| `src/components/tour/tourSteps/corteBlankSteps.ts` | Steps do Corte Blank |
| `src/components/tour/tourSteps/assistenteSteps.ts` | Steps do Assistente |
| `src/components/tour/tourSteps/sidebarSteps.ts` | Steps do Menu Lateral |
| `src/hooks/useTour.ts` | Hook customizado |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/App.tsx` | Adicionar TourProvider e TourButton |
| Componentes individuais | Adicionar atributos `data-tour` nos elementos relevantes |

## Ordem de Implementacao

1. Instalar driver.js
2. Criar estrutura de pastas e arquivos base
3. Implementar TourProvider com logica de rotas
4. Implementar TourButton
5. Criar steps do sidebar (menu lateral)
6. Criar steps do Dashboard Comercial
7. Adicionar data-tour nos componentes do Dashboard
8. Testar e ajustar posicionamento
9. Repetir para demais paginas
10. Adicionar persistencia no localStorage

