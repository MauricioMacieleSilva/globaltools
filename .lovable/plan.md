
## Plano: Remover KPIs do topo da página CRM

### Problema
Os cards de KPIs no topo (Progresso Diário, Funil de Vendas, Perdidos) estão duplicando informações que já existem na aba Dashboard, além de ocupar espaço vertical que poderia ser usado para o Kanban e o próprio Dashboard.

### Solução
Remover completamente o componente `CRMKPIs` da página CRM principal, dando mais espaço e visibilidade ao Kanban e às demais abas.

### Alterações

**`src/pages/CRM.tsx`**
1. Remover a importação de `CRMKPIs`
2. Remover os estados relacionados apenas ao KPI se não forem usados em outras partes (`todayContacts`, `todayVisits`, `dailyGoal`, `dailyVisitsGoal`)
3. Remover a função `loadTodayStats` e `loadGoals` se não forem mais necessárias
4. Remover o bloco JSX que renderiza `<CRMKPIs ... />`
5. Ajustar o `useEffect` para não chamar funções removidas

### Resultado
- Página mais limpa e focada
- Kanban começa mais acima na tela
- Informações de KPIs continuam disponíveis na aba Dashboard
