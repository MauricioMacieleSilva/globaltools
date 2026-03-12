

# Ajustes no CRM: Cards compactos, escala de cores, remoção de Performance, filtro do Dashboard

## 1. Cards do Kanban mais compactos (`KanbanCard.tsx`)

- Remover a linha do nome do contato (linhas 94-97)
- Reduzir padding do card de `p-3` para `p-2`
- Reduzir espaçamento interno de `space-y-1.5` para `space-y-1`
- Compactar info de ramo + localidade numa única linha inline
- Mover pedidos e valor para a mesma linha dos produtos/dias

## 2. Escala de cores por tempo em aberto (`KanbanCard.tsx`)

Adicionar uma borda lateral colorida (left border) no card baseada nos dias em aberto:

| Dias     | Cor              | Significado |
|----------|------------------|-------------|
| 0-2      | Azul (primary)   | Normal      |
| 3-5      | Laranja/Amber    | Atenção     |
| 6-9      | Laranja escuro   | Urgente     |
| 10+      | Roxo (marca)     | Crítico     |

Sem uso de vermelho, conforme padrão da marca.

## 3. Remover aba Performance (`CRM.tsx`)

- Remover o `TabsTrigger` de "performance" (linha 514-516)
- Remover o `TabsContent` de "performance" (linhas 568-571)
- Remover import de `TeamPerformance` e `PortfolioHealth` se não usados em outro lugar
- Remover import do ícone `BarChart3`

## 4. Dashboard CRM filtrado por usuário logado (`CRMDashboard.tsx`)

- Adicionar `useEffect` para inicializar `vendorFilter` com base no papel do usuário (mesmo padrão do Kanban)
- Admin/comercial: `'all'`
- Demais: `user.id`

## Detalhes técnicos

Arquivos modificados:
- `src/components/crm/KanbanCard.tsx` — layout compacto + borda colorida
- `src/pages/CRM.tsx` — remoção da aba Performance
- `src/components/crm/CRMDashboard.tsx` — inicialização do filtro por role

