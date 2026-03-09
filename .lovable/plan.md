
## Prospecção Automática de Leads via IA

### O que é e como funciona

A ideia é criar um sistema de **prospecção automática diária** onde a IA busca na internet empresas que podem se tornar clientes, com base em critérios que você configura (ramo de atuação, região, tipo de produto de aço, etc.), e cria os leads automaticamente no CRM.

### Tecnologia utilizada

O projeto já tem integração com **Perplexity** disponível como conector — é uma IA de busca em tempo real que encontra empresas e informações públicas na internet. Usaremos:

- **Perplexity API** → busca inteligente na internet por empresas potenciais
- **Lovable AI** (já incluso) → estrutura e valida os dados encontrados em formato de lead
- **Backend function** (agendada) → roda diariamente de forma automática
- **pg_cron** → dispara a função todos os dias no horário configurado
- **Nova aba no CRM** → interface para configurar critérios e ver histórico das prospecções

---

### Arquitetura

```text
[pg_cron - diário]
       ↓
[Edge Function: prospect-leads]
       ↓
[Perplexity API - busca por empresas]
       ↓
[Lovable AI - estrutura em JSON de leads]
       ↓
[Deduplica por CNPJ/nome na tabela leads]
       ↓
[Cria leads novos na tabela leads com status='lead']
       ↓
[Salva log em lead_prospecting_logs]
```

---

### O que será criado

**1. Tabela `lead_prospecting_configs`**
Armazena as configurações de busca:
- ramos de atuação alvo (ex: "construção civil", "indústria metal-mecânica")
- estados/cidades alvo
- produtos de aço de interesse
- horário de execução diária
- ativo/inativo

**2. Tabela `lead_prospecting_logs`**
Histórico de cada execução:
- data/hora
- quantos leads encontrados
- quantos foram criados (novos)
- quantos foram descartados (duplicados)
- status (sucesso / erro)

**3. Edge Function `prospect-leads`**
- Recebe os critérios de busca
- Monta queries para o Perplexity (ex: _"empresas de construção civil em São Paulo SP que compram aço"_)
- Estrutura os resultados com Lovable AI em JSON padronizado
- Deduplica contra leads já existentes (por nome/empresa)
- Insere novos leads com `status = 'lead'` e `origem = 'prospeccao_automatica'`

**4. Cron job diário**
- Executa toda manhã (horário configurável)
- Usa `pg_net` para chamar a edge function

**5. Nova aba "Prospecção" no CRM**
- Configurar critérios de busca (ramos, regiões, produtos)
- Botão "Executar agora" para testar manualmente
- Histórico de execuções com resultados
- Toggle ativar/desativar prospecção automática

---

### Fluxo na tela

```text
CRM → aba "Prospecção"
  ├── Card de configuração (ramos, cidades, produtos alvo)
  ├── Toggle "Prospecção automática ativa"
  ├── Botão "Buscar agora" (execução manual p/ teste)
  └── Tabela de histórico: data | leads encontrados | criados | status
```

Os leads criados automaticamente chegam na aba **Kanban** com a tag `prospeccao_automatica` na origem, para o time saber que vieram da busca automática.

---

### Etapas de implementação

1. Conectar o **Perplexity** como conector (o usuário precisará autorizar)
2. Criar as tabelas `lead_prospecting_configs` e `lead_prospecting_logs` via migration
3. Criar a edge function `prospect-leads`
4. Configurar o cron job diário via `pg_cron`
5. Criar o componente `ProspeccaoPanel.tsx` com configurações e histórico
6. Adicionar nova aba "Prospecção" no CRM

---

### Pré-requisito

Para a busca na internet funcionar, precisamos conectar o **Perplexity** ao projeto. Ao confirmar, já mostro o prompt de conexão.
