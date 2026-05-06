## Documentação Completa do Sistema Global Tools

Vou montar uma documentação profissional cobrindo **todas as páginas e abas** do sistema, em **dois formatos complementares**:

1. **PDF ilustrado para download** — manual completo, com prints reais de cada tela, pronto para imprimir, compartilhar com novos colaboradores ou consultar offline.
2. **Central de Ajuda dentro do sistema** — nova página `/ajuda` no menu lateral, com busca, navegação por módulo, screenshots e passo a passo, sempre disponível para consulta posterior.

Os dois formatos compartilham o mesmo conteúdo, então qualquer atualização futura é feita em um único lugar.

---

### Estrutura da documentação (mesma em PDF e na Central)

**1. Introdução**
- O que é o Global Tools, primeiro acesso, login, recuperação de senha, instalação como app (PWA mobile/desktop), troca de tema, menu do avatar.

**2. Dashboard Comercial** (`/dashboard-comercial`)
- KPIs, Top Clientes, modo TV, atualização automática, filtros.

**3. CRM** (`/crm`) — módulo mais extenso, dividido por aba
- Kanban (estágios, drag-and-drop, regras de movimentação, badges)
- Lista de Leads (filtros, paginação, busca por telefone/empresa/origem)
- Minha Carteira
- Prospecção e Revisão de Prospecção (BrasilAPI, CNAE)
- Visitas (calendário, agendamento, conflitos)
- Bastão / Handoff (SDR → Vendedor)
- Dashboard CRM e Metas
- Análise Financeira / Pré-Análise (chamados financeiros)
- Anexos, Propostas de Concorrentes, Reaberturas, Transferências

**4. Pré-Vendas** (`/pre-vendas`) — KPIs, status, novo lead, filtros, tabela
**5. Pipeline** (`/pipeline`) — etapas, lead time, filtros, conversão
**6. Clientes** (`/clientes`) — Análise ABC, Base, Orçamentos, Follow-ups, Relatório
**7. Produção** (`/producao`) — Ordens, Resumo, Pendências, Notificações, Indicadores

**8. Estoque** (aba dentro de Produção)
- Categorias (Perfis, Tubos, Laminados, etc.), Entrada, Saída, Histórico, Relatório por e-mail, indicadores de disponibilidade.

**9. Política Comercial** (`/politica-comercial`) — Tabela de Preços, Perfis, Descontos, Simulador, Transportadoras
**10. Corte Perfil** (`/corte-perfil`) — Perfis U/L/Cartola, otimização bin-packing, integração estoque, salvar resumos
**11. Corte Blank** (`/corte-blank`) — Configuração da chapa, lista de peças, mapa de corte, relatório de aproveitamento
**12. Fretes** (`/fretes`) — Cadastro, vínculo com pedidos, fluxo de aprovação (rascunho → pendente → aprovado), histórico, R$/ton
**13. Chamados** (`/chamados`) — Abertura, categorias (incluindo Pré-Análise/Serasa), CNPJ válido obrigatório, anexo obrigatório, SLA em horário comercial, respostas, e-mails
**14. Treinamentos** (`/treinamentos`) — PDFs em modo apresentação, fullscreen
**15. Assistente Global** (`/assistente-global`) — Chat de texto e voz com Zé da Global
**16. Reuniões e Central de Preços** — links externos do menu

**17. Administração** (`/admin/*`)
- Usuários (convites, papéis, permissões individuais e padrão por perfil, exclusão)
- Gestão de Conhecimento (artigos, categorias, upload, analytics)
- Configuração de Relatórios (e-mail diário, dias úteis, metas, agendamentos)
- Metas de vendedores, Leads bloqueados, Pedidos excluídos, Configurações diversas

**18. Notificações** — sino de IA, alertas em tempo real, lembretes unificados
**19. Tour interativo** — botão de tour por página, sistema de avaliação 5 estrelas
**20. Glossário e FAQ** — termos (SDR, Bastão, OP, Prazo Comercial), perguntas frequentes, troubleshooting

---

### Como cada página é documentada

Para cada tela, o mesmo padrão visual:

```text
┌─────────────────────────────────────────┐
│  [SCREENSHOT REAL DA TELA - anotada]    │
└─────────────────────────────────────────┘
  ① O que é esta página
  ② Quem tem acesso (perfis/permissões)
  ③ Passo a passo das ações principais
       1. Clique em ...
       2. Preencha ...
       3. Confirme ...
  ④ Dicas e atalhos
  ⑤ Erros comuns e como resolver
```

Screenshots reais serão capturados navegando o sistema autenticado, em viewport desktop e, quando relevante, mobile. Telas com dados sensíveis (CNPJ, e-mails, valores) serão desfocadas/anonimizadas.

---

### Detalhes técnicos da entrega

**Central de Ajuda no sistema**
- Nova rota `/ajuda` registrada em `App.tsx` e em `SYSTEM_PAGES` (`useUserPermissions.ts`).
- Item no menu lateral (`AppSidebar.tsx`) com ícone de livro/ajuda — visível para todos os usuários autenticados.
- Layout: barra de busca no topo + sidebar com módulos (CRM, Produção, Estoque, etc.) + área principal renderizando o artigo selecionado.
- Conteúdo armazenado como **MDX/Markdown estático** em `src/content/help/` (uma pasta por módulo, um arquivo por página/aba). Isso permite versionamento via Git e fácil edição futura, sem necessidade de banco.
- Componentes reutilizados do design system (Tabs, Card, Accordion). Imagens em `public/help/` para carregamento rápido.
- Botão "Baixar manual em PDF" no topo, apontando para o PDF gerado (hospedado em `public/manual-global-tools.pdf`).
- Busca client-side simples (filtro por título/conteúdo).

**PDF**
- Gerado por script Node usando `docx-js` → conversão final para PDF, ou diretamente via PDFKit/Puppeteer renderizando os mesmos arquivos MDX. Saída em `/mnt/documents/manual-global-tools.pdf` e copiada para `public/` para servir do app.
- Capa com logo, índice clicável, cabeçalho/rodapé com paginação, paleta da marca (azul #2563eb), tipografia consistente.
- ~80–120 páginas estimadas dada a abrangência.

**Captura de screenshots**
- Usar `browser--navigate_to_sandbox` + `browser--screenshot` autenticado, percorrendo cada rota.
- Salvar em `public/help/<modulo>/<tela>.png`.
- Anotações (setas, números, destaques) feitas programaticamente com Pillow (Python) sobre os PNGs.

---

### Plano de execução em fases

Por causa do volume, vou entregar em **3 fases incrementais** (cada uma já utilizável):

**Fase 1 — Fundação + módulos comerciais** (mais usados)
- Estrutura da Central de Ajuda no sistema (rota, menu, layout, busca).
- Conteúdo + screenshots: Introdução, Dashboard, CRM (todas as abas), Pré-Vendas, Pipeline, Clientes, Chamados.
- Primeira versão do PDF cobrindo essas seções.

**Fase 2 — Produção e ferramentas operacionais**
- Conteúdo + screenshots: Produção, Estoque, Política Comercial, Corte Perfil, Corte Blank, Fretes.
- PDF atualizado.

**Fase 3 — Administração, recursos transversais e finalização**
- Conteúdo + screenshots: Administração completa, Treinamentos, Assistente, Reuniões, Central de Preços, Notificações, Tour, Glossário/FAQ.
- PDF final consolidado, índice revisado, QA visual de todas as páginas.

Ao final de cada fase você recebe a Central de Ajuda funcionando com o que já foi documentado e o PDF parcial, podendo dar feedback antes de seguir.

---

### Pontos para confirmar antes de começar

- **Anonimização**: posso desfocar nomes de clientes/CNPJs/valores reais nos screenshots, ou prefere usar dados de teste (criar leads/pedidos fake só para os prints)?
- **Tom**: prefere linguagem mais formal ("o usuário deve clicar...") ou mais direta ("clique em...")? Sugiro a segunda, mais didática.
- **Acesso à Central**: liberada para todos os autenticados, ou também para visitantes não logados (página pública)?

Pode aprovar o plano que eu inicio pela Fase 1.