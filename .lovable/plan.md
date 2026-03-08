

# Plano: Refinamento do CRM -- Regras de Negocio, Enriquecimento e Agenda

## 1. Restricao de Contato Unico por Cliente/Dia

No `registerContact` (LeadDrawer) e no `updateLeadStatus` (CRM.tsx), antes de inserir atividade `contato_inicial`, consultar `lead_activities` filtrando por `lead_id` + `activity_type = 'contato_inicial'` + `created_at >= hoje 00:00`. Se ja existir, exibir toast de aviso e bloquear.

## 2. Motivos de Perda Gerenciaveis

**Migracao**: Criar tabela `crm_loss_reasons` (id, name, is_active, display_order, created_at).
- RLS: admins gerenciam, authenticated visualizam.
- Seed com motivos atuais (hardcoded hoje no `LostDealsDialog`).

**UI**: No `LostDealsDialog`, carregar motivos do banco. Adicionar botao "+" para criar novo motivo inline (igual ao padrao de origens no NewLeadDialog).

## 3. Visita/Reuniao com Data e Local

**Migracao**: Criar tabela `crm_visits` (id, lead_id, visit_date timestamptz, location text, notes text, user_id, created_at).
- RLS: comercial/admin/sdr gerenciam e visualizam.

**UI**: Ao mover lead para `visita_reuniao` (drag-drop ou botao), abrir dialog pedindo data e local antes de confirmar. Salvar em `crm_visits` e registrar atividade.

## 4. Enriquecimento do Lead Apos Primeiro Contato

**Migracao**: Criar tabelas de lookup gerenciaveis:
- `crm_business_sectors` (id, name, is_active, created_at) -- ramos de atuacao
- `crm_product_interests` (id, name, is_active, created_at) -- produtos de interesse

Adicionar colunas na tabela `leads`:
- `ramo_atuacao text`
- `regime_tributario text` (valores: Simples Nacional, Lucro Presumido, Lucro Real)

**UI**: No `LeadDrawer`, apos status `contato_feito` ou superior, exibir secao "Enriquecer Cadastro" com:
- Ramo de atuacao (select + botao "+" para adicionar novo)
- Produto de interesse (select + botao "+" para adicionar novo)
- CNPJ (input com mascara)
- Regime tributario (select fixo: Simples Nacional, Lucro Presumido, Lucro Real)
- Botao salvar que atualiza o lead

## 5. Gestao de Leads (Edicao Completa)

No `LeadDrawer`, adicionar botao "Editar Lead" que abre dialog/formulario completo permitindo alterar todos os campos (nome, empresa, telefone, email, origem, produto, CNPJ, ramo, regime). Salva via update no banco.

## 6. Card do Kanban Refinado

Atualizar `KanbanCard.tsx`:
- Nome do cliente (destaque)
- Ultima atividade registrada (query mais recente de `lead_activities` -- texto curto)
- Se tiver visita agendada em `crm_visits`, exibir data com icone de calendario
- Remover valor estimado e "Sem valor"

## 7. Agenda Visual de Visitas/Reunioes

**Nova aba "Agenda"** no Tabs do CRM (ao lado de Kanban, Lista, Performance).

Componente `VisitCalendar.tsx`:
- Carregar `crm_visits` com join no `leads` (nome do cliente)
- Exibir em formato de lista agrupada por data (proximos 30 dias)
- Cards com: data/hora, cliente, local, status do lead
- Click no card abre o LeadDrawer do lead correspondente
- Indicador visual para visitas de hoje (destaque)

## Resumo de Arquivos

**Migracoes SQL**:
- Criar `crm_loss_reasons`, `crm_visits`, `crm_business_sectors`, `crm_product_interests`
- ALTER TABLE leads ADD `ramo_atuacao`, `regime_tributario`

**Criar**:
- `src/components/crm/VisitScheduleDialog.tsx` -- dialog data+local ao agendar visita
- `src/components/crm/LeadEnrichForm.tsx` -- formulario de enriquecimento no drawer
- `src/components/crm/LeadEditDialog.tsx` -- edicao completa do lead
- `src/components/crm/VisitCalendar.tsx` -- agenda visual (nova aba)

**Modificar**:
- `src/components/crm/LeadDrawer.tsx` -- validacao contato/dia, enriquecimento, edicao, visitas
- `src/components/crm/LostDealsDialog.tsx` -- motivos dinamicos do banco + adicionar novo
- `src/components/crm/KanbanCard.tsx` -- exibir ultima acao e data de visita
- `src/pages/CRM.tsx` -- interceptar visita_reuniao para dialog, nova aba Agenda
- `src/components/crm/KanbanBoard.tsx` -- passar dados de visitas/atividades

